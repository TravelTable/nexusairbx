const STREAM_CHANNELS = new Set(["thought", "reasoning", "explanation", "code", "content"]);
const MAX_ACTIVITY_ITEMS = 80;
const MAX_CODE_PREVIEW_CHARS = 1800;

function countLines(value = "") {
  const text = String(value || "");
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function normalizeFileEventFile(raw = {}) {
  const path = String(raw.path || `ReplicatedStorage/${raw.name || raw.id || "Script"}`);
  const name = String(raw.name || path.split("/").filter(Boolean).pop() || raw.id || "Script");
  const content = String(raw.content || "");
  return {
    id: String(raw.id || raw.fileId || path),
    name,
    path,
    placement: String(raw.placement || path.split("/")[0] || "ReplicatedStorage"),
    kind: String(raw.kind || "module"),
    language: String(raw.language || "luau"),
    purpose: String(raw.purpose || ""),
    content,
    contentHash: raw.contentHash || raw.sourceHash || "",
    status: raw.status || "writing",
    lineCount: countLines(content),
    activeAt: Number(raw.activeAt || Date.now()),
  };
}

function findFileKeyByPath(filesById, path) {
  if (!path) return "";
  return Object.keys(filesById || {}).find((key) => filesById[key]?.path === path) || "";
}

function nextActivityId(base, type) {
  return `${type}-${(base.activitySeq || 0) + 1}`;
}

function trimActivity(items = []) {
  return items.length > MAX_ACTIVITY_ITEMS ? items.slice(items.length - MAX_ACTIVITY_ITEMS) : items;
}

function recentCodePreview(content = "") {
  const text = String(content || "");
  if (text.length <= MAX_CODE_PREVIEW_CHARS) return text;
  return text.slice(text.length - MAX_CODE_PREVIEW_CHARS);
}

function appendActivity(base, entry) {
  const nextSeq = (base.activitySeq || 0) + 1;
  return {
    activitySeq: nextSeq,
    activity: trimActivity([
      ...(base.activity || []),
      {
        id: entry.id || `${entry.type}-${nextSeq}`,
        ts: entry.ts || Date.now(),
        ...entry,
      },
    ]),
  };
}

function appendOrUpdateThinking(base, text) {
  const clean = String(text || "").replace(/<\/?(thinking|progress)>/gi, "");
  if (!clean) return { activity: base.activity || [], activitySeq: base.activitySeq || 0 };
  const activity = [...(base.activity || [])];
  const last = activity[activity.length - 1];
  if (last?.type === "thinking") {
    activity[activity.length - 1] = { ...last, text: `${last.text || ""}${clean}`, ts: Date.now() };
    return { activity: trimActivity(activity), activitySeq: base.activitySeq || 0 };
  }
  return appendActivity(base, { type: "thinking", text: clean });
}

function buildFileActivity(event, file, existing = null) {
  const eventName = event?.event || "";
  if (eventName === "file_start") {
    return {
      type: "file_start",
      fileId: file.id,
      path: file.path,
      name: file.name,
      kind: file.kind,
      status: "Writing",
      text: `${existing ? "Editing" : "Creating"} ${file.path}`,
    };
  }
  if (eventName === "file_chunk") {
    return {
      id: `file-chunk-${file.id}`,
      type: "file_chunk",
      fileId: file.id,
      path: file.path,
      name: file.name,
      kind: file.kind,
      status: "Writing",
      text: `Writing ${file.path}`,
      code: recentCodePreview(file.content),
    };
  }
  if (eventName === "file_end") {
    return {
      type: "file_end",
      fileId: file.id,
      path: file.path,
      name: file.name,
      kind: file.kind,
      status: "Reviewing",
      text: `Finished writing ${file.path}`,
    };
  }
  if (eventName === "file_ready") {
    return {
      type: "file_ready",
      fileId: file.id,
      path: file.path,
      name: file.name,
      kind: file.kind,
      status: "Validated",
      text: `Validated ${file.path}`,
      code: recentCodePreview(file.content),
    };
  }
  if (eventName === "file_rename") {
    return {
      type: "file_rename",
      fileId: file?.id || event.fileId || event.id || "",
      path: event.toPath || "",
      status: "Renamed",
      text: `Renamed ${event.fromPath || "file"} to ${event.toPath || "new path"}`,
    };
  }
  if (eventName === "file_delete") {
    return {
      type: "file_delete",
      fileId: event.fileId || event.id || "",
      path: event.path || "",
      status: "Deleted",
      text: `Deleted ${event.path || "file"}`,
    };
  }
  return null;
}

function applyFileEvent(filesById, rawEvent, now = Date.now()) {
  const event = rawEvent || {};
  const next = { ...(filesById || {}) };
  const fileId = String(event.fileId || event.id || event.file?.id || event.file?.fileId || event.path || "");
  if (!fileId && !["generation_complete", "file_delete", "file_rename"].includes(event.event)) return next;

  if (event.event === "file_start") {
    const file = normalizeFileEventFile({ ...event, id: fileId, content: "", activeAt: now });
    next[file.id] = { ...(next[file.id] || {}), ...file, status: "writing", activeAt: now };
    return next;
  }

  if (event.event === "file_chunk") {
    const existing = next[fileId] || normalizeFileEventFile({ id: fileId, activeAt: now });
    const content = `${existing.content || ""}${String(event.content || "")}`;
    next[fileId] = { ...existing, content, status: "writing", lineCount: countLines(content), activeAt: now };
    return next;
  }

  if (event.event === "file_end") {
    const existing = next[fileId];
    if (existing) {
      next[fileId] = {
        ...existing,
        contentHash: event.sourceHash || existing.contentHash,
        status: "reviewing",
        lineCount: countLines(existing.content),
        activeAt: now,
      };
    }
    return next;
  }

  if (event.event === "file_ready" && event.file) {
    const file = normalizeFileEventFile({ ...event.file, status: event.file.status || "ready", activeAt: now });
    const existingKey = next[file.id] ? file.id : findFileKeyByPath(next, file.path);
    if (existingKey && existingKey !== file.id) delete next[existingKey];
    next[file.id] = file;
    return next;
  }

  if (event.event === "file_delete") {
    const key = fileId && next[fileId] ? fileId : findFileKeyByPath(next, event.path);
    if (key) delete next[key];
    return next;
  }

  if (event.event === "file_rename") {
    const key = fileId && next[fileId] ? fileId : findFileKeyByPath(next, event.fromPath);
    if (!key || !event.toPath) return next;
    const existing = next[key];
    const path = String(event.toPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    next[key] = {
      ...existing,
      path,
      name: path.split("/").filter(Boolean).pop() || existing.name,
      placement: String(event.placement || path.split("/")[0] || existing.placement || "ReplicatedStorage"),
      status: "renamed",
      activeAt: now,
    };
    return next;
  }

  return next;
}

export function createPendingStreamState() {
  return {
    thought: "",
    rawReasoning: "",
    explanation: "",
    code: "",
    content: "",
    filesById: {},
    activity: [],
    activitySeq: 0,
    activeFileId: "",
    lastFileEvent: null,
    seq: -1,
    startedAt: Date.now(),
  };
}

export function applyStreamDelta(currentState, delta) {
  const base = currentState || createPendingStreamState();
  const rawSeq = Number(delta?.seq);
  const hasSeq = Number.isFinite(rawSeq);
  if (hasSeq && rawSeq <= Number(base.seq ?? -1)) return base;

  const next = {
    ...base,
    filesById: base.filesById || {},
    activity: base.activity || [],
    activitySeq: base.activitySeq || 0,
    activeFileId: base.activeFileId || "",
    lastFileEvent: base.lastFileEvent || null,
    seq: hasSeq ? rawSeq : base.seq,
  };

  if (delta?.channel === "file_event") {
    const event = delta.event || delta;
    const before = next.filesById || {};
    next.filesById = applyFileEvent(next.filesById, event);
    const eventName = event?.event || "";
    const fileId = String(event.file?.id || event.fileId || event.id || "");
    if (fileId) next.activeFileId = eventName === "file_ready" && event.file?.id ? String(event.file.id) : fileId;
    next.lastFileEvent = eventName || null;
    const resolvedId = next.activeFileId || fileId;
    const file = next.filesById[resolvedId] || next.filesById[fileId] || (event.file ? normalizeFileEventFile(event.file) : null);
    const fileActivity = buildFileActivity(event, file, before[fileId] || null);
    if (fileActivity) {
      if (fileActivity.type === "file_chunk") {
        const activity = [...(next.activity || [])];
        const idx = activity.findIndex((item) => item.id === fileActivity.id);
        if (idx >= 0) {
          activity[idx] = { ...activity[idx], ...fileActivity, ts: Date.now() };
          next.activity = trimActivity(activity);
        } else {
          const appended = appendActivity(next, fileActivity);
          next.activity = appended.activity;
          next.activitySeq = appended.activitySeq;
        }
      } else {
        const appended = appendActivity(next, fileActivity);
        next.activity = appended.activity;
        next.activitySeq = appended.activitySeq;
      }
    }
    return next;
  }

  let channel = STREAM_CHANNELS.has(delta?.channel) ? delta.channel : "content";
  // The backend "reasoning" channel carries display-safe live work-log text;
  // accumulate it into `thought` for backward compatibility.
  if (channel === "reasoning") channel = "thought";
  let text =
    typeof delta?.text === "string"
      ? delta.text
      : typeof delta?.content === "string"
        ? delta.content
        : "";

  if (!text) return next;
  if (channel === "thought") text = text.replace(/<\/?(thinking|progress)>/gi, "");
  if (!text) return next;
  next[channel] = `${next[channel] || ""}${text}`;
  if (channel === "thought") {
    const updated = appendOrUpdateThinking(next, text);
    next.activity = updated.activity;
    next.activitySeq = updated.activitySeq;
  }
  return next;
}

export function applyReasoningDelta(currentState, delta = {}) {
  const base = currentState || createPendingStreamState();
  const text = typeof delta?.text === "string" ? delta.text : "";
  if (!text) return base;
  const seq = Number(delta?.seq);
  if (Number.isFinite(seq) && seq <= (base.rawReasoningSeq ?? base.seq ?? -1)) {
    return base;
  }
  return {
    ...base,
    rawReasoning: `${base.rawReasoning || ""}${text}`,
    rawReasoningSeq: Number.isFinite(seq) ? seq : base.rawReasoningSeq,
  };
}

export function applyStreamActivity(currentState, entry) {
  const base = currentState || createPendingStreamState();
  const next = {
    ...base,
    filesById: base.filesById || {},
    activity: base.activity || [],
    activitySeq: base.activitySeq || 0,
  };
  const type = entry?.type || "stage";
  if (type === "thinking") {
    const updated = appendOrUpdateThinking(next, entry.text || "");
    return { ...next, ...updated };
  }
  const entryId = entry?.id || nextActivityId(next, type);
  const existingIndex = entry?.id
    ? (next.activity || []).findIndex((item) => item.id === entry.id)
    : -1;
  if (existingIndex >= 0) {
    const activity = [...(next.activity || [])];
    activity[existingIndex] = {
      ...activity[existingIndex],
      ...entry,
      id: entryId,
      ts: Date.now(),
    };
    return { ...next, activity: trimActivity(activity) };
  }
  const appended = appendActivity(next, {
    id: entryId,
    type,
    text: entry?.text || "",
    status: entry?.status || "",
    path: entry?.path || "",
    kind: entry?.kind || "",
    code: entry?.code || "",
    stepType: entry?.stepType || "",
  });
  return { ...next, ...appended };
}

export function formatPendingStreamContent(state) {
  if (!state) return "";

  const explanation = state.explanation || "";
  const code = state.code || "";
  const content = state.content || "";

  if (explanation || code) {
    let out = "";
    if (explanation) out += `<explanation>${explanation}</explanation>`;
    if (code) out += `<code>${code}</code>`;
    if (content) out += content;
    return out;
  }

  return content.trim();
}

export function parsePendingStreamContent(raw = "") {
  const explanationMatch = raw.match(/<explanation>([\s\S]*?)<\/explanation>/i);
  const codeMatch = raw.match(/<code>([\s\S]*?)<\/code>/i);

  const explanation = explanationMatch?.[1]?.trim() || "";
  const code = codeMatch?.[1] || "";

  const plain = raw
    .replace(/<explanation>[\s\S]*?<\/explanation>/gi, "")
    .replace(/<code>[\s\S]*?<\/code>/gi, "")
    .trim();

  return {
    explanation,
    code,
    plain,
    hasStructured: Boolean(explanation || code),
  };
}

export function getPendingStreamSnapshot(state) {
  const base = state || createPendingStreamState();
  const files = Object.values(base.filesById || {});
  const writingCount = files.filter((file) => file.status === "writing").length;
  const reviewingCount = files.filter((file) => file.status === "reviewing").length;
  const readyCount = files.filter((file) => file.status === "ready" || file.status === "generated").length;
  return {
    thought: base.thought || "",
    rawReasoning: base.rawReasoning || "",
    explanation: base.explanation || "",
    code: base.code || "",
    content: base.content || "",
    files,
    activity: base.activity || [],
    activitySeq: base.activitySeq || 0,
    activeFileId: base.activeFileId || files.find((file) => file.status === "writing")?.id || files[files.length - 1]?.id || "",
    fileCounts: {
      discovered: files.length,
      writing: writingCount,
      reviewing: reviewingCount,
      ready: readyCount,
    },
    lastFileEvent: base.lastFileEvent || null,
    hasVisibleOutput: Boolean(base.explanation || base.code || base.content || files.length),
    hasFiles: files.length > 0,
    hasThought: Boolean(base.thought),
    hasRawReasoning: Boolean(base.rawReasoning),
    seq: Number.isFinite(Number(base.seq)) ? Number(base.seq) : -1,
    startedAt: base.startedAt || Date.now(),
  };
}
