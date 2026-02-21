function normalizeGoal(goal) {
  return String(goal || "").trim();
}

function toText(message) {
  if (!message) return "";
  const base = message.role === "user"
    ? message.content
    : (message.explanation || message.content || message.thought || "");
  return String(base || "").trim();
}

/**
 * Build a compact context block for Act execution.
 * Keeps only the latest turns and strips empty content.
 */
export function buildCompactActContext(messages = [], goal = "", options = {}) {
  const maxTurns = Number(options.maxTurns || 6);
  const history = (Array.isArray(messages) ? messages : [])
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: toText(m) }))
    .filter((m) => m.text.length > 0)
    .slice(-Math.max(1, maxTurns));

  const lines = history.map((m) => `${m.role}: ${m.text}`);
  const normalizedGoal = normalizeGoal(goal);

  if (lines.length === 0 && !normalizedGoal) return "";

  return [
    "[Context]",
    ...lines,
    "",
    "[Goal]",
    normalizedGoal || "Continue with the latest user request.",
  ].join("\n");
}
