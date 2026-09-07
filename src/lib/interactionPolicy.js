// This module chooses product behavior. It never grants Studio permissions.
const MODES = new Set(["agent", "plan", "ask", "debug"]);
const CONVERSATION_INTENTS = new Set([
  "GREETING", "GENERAL_QUESTION", "BRAINSTORMING", "EXPLANATION_REQUEST",
]);
const FOLLOW_UP = /^(?:start(?: now| build| building)?|just start(?: now)?|get started|build it|just do it|do it|go ahead|proceed|continue(?: the build)?|resume(?: the build)?|keep going|finish it|carry on|implement(?: that| the)? plan|approved|approve|yes,?\s*(?:build|proceed|go ahead))[\s.!?]*$/i;

function normalizeMode(value) {
  const mode = String(value || "agent").trim().toLowerCase();
  if (mode === "act") return "agent";
  if (!MODES.has(mode)) throw new TypeError(`Unsupported interaction mode: ${mode}`);
  return mode;
}

function normalizeFollowUp(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
    .replace(/^(?:(?:mate|bro|please|okay|ok|alright|all right|nexus)[,!:]?\s+)+/i, "")
    .replace(/\b(?:fucking|bloody|damn)\b/gi, " ")
    .replace(/\s+please[.!?]*$/i, "").replace(/\s+/g, " ").trim();
}

function isExecutionFollowUp(value) {
  return FOLLOW_UP.test(normalizeFollowUp(value));
}

function shouldUseConversationalRoute(intent) {
  // AMBIGUOUS is intentionally not here. Agent must not silently become Ask
  // merely because a short imperative escaped a regex classifier.
  return CONVERSATION_INTENTS.has(String(intent || "").toUpperCase());
}

function resolveTurnRoute({ mode, prompt = "", intent = "AMBIGUOUS", hasSavedPlan = false } = {}) {
  const selectedMode = normalizeMode(mode);
  // A word such as "start" must NEVER make Ask approve or resume a task.
  if (selectedMode === "ask") return "answer";
  if (String(intent).toUpperCase() === "CANCELLATION") return "cancel";
  if (selectedMode === "plan") {
    return hasSavedPlan && isExecutionFollowUp(prompt) ? "approve_saved_plan" : "plan";
  }
  if (isExecutionFollowUp(prompt)) return "resume_or_execute";
  if (String(intent).toUpperCase() === "PLANNING_REQUEST") return "plan";
  if (shouldUseConversationalRoute(intent)) return "answer";
  return "execute";
}

module.exports = {
  normalizeMode, normalizeFollowUp, isExecutionFollowUp,
  shouldUseConversationalRoute, resolveTurnRoute,
};
