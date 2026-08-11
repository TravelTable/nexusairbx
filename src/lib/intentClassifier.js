// Frontend mirror of backend/src/lib/intentClassifier.js. Keep the regexes and
// classification logic in sync so the /ai workspace can gate builds locally
// (zero-latency, no network round-trip) before deciding whether to converse or
// hand a clear build request straight to generation.
import { isExplicitPlanApproval } from "./planApproval";

const GREETING_RE = /^(hi|hello|hey|yo|good\s+(morning|afternoon|evening)|howdy)[.!?\s]*$/i;
const ACK_RE = /^(ok|okay|cool|nice|great|sounds good|that sounds good|thanks|thank you|understood|got it)[.!?\s]*$/i;
const CANCELLATION_RE = /^(cancel|stop|never mind|nevermind|abort|discard|don't build|do not build)\b/i;
const PLAN_APPROVAL_RE = /^(start|just start|start now|get started|start build|build it|just do it|go ahead|proceed|implement( that| the)? plan|approved|approve|yes,?\s*(build|proceed|go ahead))[\s.!]*$/i;
const CONTINUATION_RE = /^(continue|do it|apply that|apply it|finish it|carry on)[.!\s]*$/i;

const BUILD_VERBS = [
  "add",
  "build",
  "change",
  "create",
  "fix",
  "generate",
  "implement",
  "integrate",
  "make",
  "modify",
  "refactor",
  "remove",
  "update",
  "wire",
];

const SOFT_IDEA_RE = /\b(i am thinking|i'm thinking|thinking about|idea|brainstorm|what if|maybe|could we|would it make sense)\b/i;
const QUESTION_RE = /^(what|how|why|when|where|who|which|is|are|can|could|should|would|do|does|did)\b/i;
const EXPLANATION_RE = /\b(explain|describe|walk me through|how would|how does|what is|what are)\b/i;
const BUILD_REQUEST_RE = new RegExp(`\\b(${BUILD_VERBS.join("|")})\\b`, "i");
const REQUEST_DIRECTIVE_RE = /\b(please|can you|could you|i need you to|i want you to|let's|lets)\b/i;

function normalizePrompt(prompt) {
  return String(prompt || "").replace(/\s+/g, " ").trim();
}

export function classifyUserIntent(prompt) {
  const text = normalizePrompt(prompt);
  if (!text) return "AMBIGUOUS";

  if (CANCELLATION_RE.test(text)) return "CANCELLATION";
  if (PLAN_APPROVAL_RE.test(text)) return "PLAN_APPROVAL";
  if (CONTINUATION_RE.test(text)) return "CONTINUATION";
  if (GREETING_RE.test(text)) return "GREETING";
  if (ACK_RE.test(text)) return "GENERAL_QUESTION";

  const hasBuildVerb = BUILD_REQUEST_RE.test(text);
  const hasDirective = REQUEST_DIRECTIVE_RE.test(text);
  const isQuestion = QUESTION_RE.test(text) || text.endsWith("?");

  if (hasBuildVerb && (hasDirective || !isQuestion)) {
    const lower = text.toLowerCase();
    if (/\b(change|modify|update|fix|remove|refactor)\b/.test(lower)) {
      return "MODIFICATION_REQUEST";
    }
    return "BUILD_REQUEST";
  }

  if (SOFT_IDEA_RE.test(text)) return "BRAINSTORMING";
  if (EXPLANATION_RE.test(text) || isQuestion) return "EXPLANATION_REQUEST";

  return "AMBIGUOUS";
}

export function isImplementationIntent(intent) {
  return intent === "BUILD_REQUEST" || intent === "MODIFICATION_REQUEST" || intent === "REFINEMENT" || intent === "CONTINUATION";
}

const ARTIFACT_ONLY_RE = /\b(code|artifact|files?|export|download)\s+only\b|\b(do not|don't|without)\s+(push|apply|edit|change|touch)(?:\s+(?:it\s+)?(?:to|in))?\s+studio\b/i;
const PLAYTEST_RE = /\b(play\s*test|run\s+(?:a\s+)?test|test\s+(?:the\s+)?(?:game|place|experience)|start\s+(?:the\s+)?game)\b/i;
const INSPECTION_RE = /\b(inspect|audit|analy[sz]e|review|summari[sz]e|explain|list|show|see|view|visible|read|find|search|diagnose)\b|\bwhat\s+files?\b/i;
const LIVE_CONTEXT_RE = /\b(studio|current\s+(?:game|place|project|experience)|live\s+(?:game|place|project|experience)|explorer|selection|(?:this|selected|open|current)\s+(?:module\s*)?script|ServerScriptService|ServerStorage|ReplicatedStorage|StarterGui|StarterPlayer|Workspace\.[A-Za-z0-9_]+)\b/i;
const CONCEPTUAL_RE = /^(how|why)\b|\b(explain|describe|walk me through|how does|how would)\b/i;

/**
 * Classifies how a request is expected to leave the AI workspace. This is a
 * routing hint only; the server remains responsible for authorization and for
 * resolving a fresh target/capability snapshot before tool execution.
 */
export function classifyExecutionIntent(prompt, {
  studioEnabled = false,
  generatorMode = "agent_build",
} = {}) {
  const text = normalizePrompt(prompt);
  if (String(generatorMode).toLowerCase() === "quick_script") return "quick_script";
  if (ARTIFACT_ONLY_RE.test(text)) return "artifact_only";
  const userIntent = classifyUserIntent(text);
  const implementation = isImplementationIntent(userIntent);
  const mentionsLiveContext = LIVE_CONTEXT_RE.test(text);
  const liveRequested = studioEnabled || mentionsLiveContext;
  if (!implementation && INSPECTION_RE.test(text) && mentionsLiveContext) {
    return "inspect";
  }
  if (CONCEPTUAL_RE.test(text)) return "artifact_only";
  if (PLAYTEST_RE.test(text)) return "playtest";
  if (implementation && liveRequested) {
    return userIntent === "MODIFICATION_REQUEST" ? "live_fix" : "live_build";
  }
  return "artifact_only";
}

export { isExplicitPlanApproval };
