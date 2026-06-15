const STREAM_CHANNELS = new Set(["thought", "reasoning", "explanation", "code", "content"]);

function normalizeFileEventFile(raw = {}) {
  const path = String(raw.path || `ReplicatedStorage/${raw.name || raw.id || "Script"}`);
  const name = String(raw.name || path.split("/").filter(Boolean).pop() || raw.id || "Script");
  return {
    id: String(raw.id || raw.fileId || path),
    name,
    path,
    placement: String(raw.placement || path.split("/")[0] || "ReplicatedStorage"),
    kind: String(raw.kind || "module"),
    language: String(raw.language || "luau"),
    purpose: String(raw.purpose || ""),
    content: String(raw.content || ""),
    contentHash: raw.contentHash || raw.sourceHash || "",
    status: raw.status || "generating",
  };
}

function applyFileEvent(filesById, rawEvent) {
  const event = rawEvent || {};
  const next = { ...(filesById || {}) };
  const fileId = String(event.fileId || event.id || event.file?.id || event.file?.fileId || event.path || "");
  if (!fileId && event.event !== "generation_complete") return next;

  if (event.event === "file_start") {
    const file = normalizeFileEventFile({ ...event, id: fileId, content: "" });
    next[file.id] = { ...(next[file.id] || {}), ...file, status: "generating" };
    return next;
  }

  if (event.event === "file_chunk") {
    const existing = next[fileId] || normalizeFileEventFile({ id: fileId });
    const content = `${existing.content || ""}${String(event.content || "")}`;
    next[fileId] = { ...existing, content, status: "generating" };
    return next;
  }

  if (event.event === "file_end") {
    const existing = next[fileId];
    if (existing) next[fileId] = { ...existing, contentHash: event.sourceHash || existing.contentHash, status: "ready" };
    return next;
  }

  if (event.event === "file_ready" && event.file) {
    const file = normalizeFileEventFile({ ...event.file, status: event.file.status || "ready" });
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
    seq: hasSeq ? rawSeq : base.seq,
  };

  if (delta?.channel === "file_event") {
    next.filesById = applyFileEvent(next.filesById, delta.event || delta);
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
  return {
    thought: base.thought || "",
    explanation: base.explanation || "",
    code: base.code || "",
    content: base.content || "",
    files: Object.values(base.filesById || {}),
    hasVisibleOutput: Boolean(base.explanation || base.code || base.content || Object.keys(base.filesById || {}).length),
    hasFiles: Object.keys(base.filesById || {}).length > 0,
    hasThought: Boolean(base.thought),
    seq: Number.isFinite(Number(base.seq)) ? Number(base.seq) : -1,
    startedAt: base.startedAt || Date.now(),
  };
}
