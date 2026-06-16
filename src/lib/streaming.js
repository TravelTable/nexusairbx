const STREAM_CHANNELS = new Set(["thought", "reasoning", "explanation", "code", "content"]);

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

function applyFileEvent(filesById, rawEvent, now = Date.now()) {
  const event = rawEvent || {};
  const next = { ...(filesById || {}) };
  const fileId = String(event.fileId || event.id || event.file?.id || event.file?.fileId || event.path || "");
  if (!fileId && event.event !== "generation_complete") return next;

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

  return next;
}

export function createPendingStreamState() {
  return {
    thought: "",
    explanation: "",
    code: "",
    content: "",
    filesById: {},
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
    activeFileId: base.activeFileId || "",
    lastFileEvent: base.lastFileEvent || null,
    seq: hasSeq ? rawSeq : base.seq,
  };

  if (delta?.channel === "file_event") {
    const event = delta.event || delta;
    next.filesById = applyFileEvent(next.filesById, event);
    const eventName = event?.event || "";
    const fileId = String(event.file?.id || event.fileId || event.id || "");
    if (fileId) next.activeFileId = eventName === "file_ready" && event.file?.id ? String(event.file.id) : fileId;
    next.lastFileEvent = eventName || null;
    return next;
  }

  let channel = STREAM_CHANNELS.has(delta?.channel) ? delta.channel : "content";
  // The backend "reasoning" channel carries the live chain-of-thought; accumulate
  // it into `thought` (stripping the <thinking> wrapper tags).
  if (channel === "reasoning") channel = "thought";
  let text =
    typeof delta?.text === "string"
      ? delta.text
      : typeof delta?.content === "string"
        ? delta.content
        : "";

  if (!text) return next;
  if (channel === "thought") text = text.replace(/<\/?thinking>/gi, "");
  if (!text) return next;
  next[channel] = `${next[channel] || ""}${text}`;
  return next;
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
    explanation: base.explanation || "",
    code: base.code || "",
    content: base.content || "",
    files,
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
    seq: Number.isFinite(Number(base.seq)) ? Number(base.seq) : -1,
    startedAt: base.startedAt || Date.now(),
  };
}
