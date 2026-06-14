const STREAM_CHANNELS = new Set(["thought", "reasoning", "explanation", "code", "content"]);

export function createPendingStreamState() {
  return {
    thought: "",
    explanation: "",
    code: "",
    content: "",
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
    seq: hasSeq ? rawSeq : base.seq,
  };

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
    hasVisibleOutput: Boolean(base.explanation || base.code || base.content),
    hasThought: Boolean(base.thought),
    seq: Number.isFinite(Number(base.seq)) ? Number(base.seq) : -1,
    startedAt: base.startedAt || Date.now(),
  };
}
