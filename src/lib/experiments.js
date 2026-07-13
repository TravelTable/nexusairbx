const ASSIGNMENT_KEY = "nexusrbx:experiments:v1";
const VISITOR_KEY = "nexusrbx:experiments:visitor-id";
const DISABLED_KEY = "nexusrbx:experiments:disabled";
const ANON_USER_KEY = "nexusrbx:analytics:anon-user-id";

export const EXPERIMENT_IDS = Object.freeze({
  SIGNUP_GATE: "signup_first_value_gate",
  GENERATOR_DEFAULT: "generator_default_mode",
  HOMEPAGE_CTA: "homepage_cta_wording",
});

export const EXPERIMENT_DEFINITIONS = Object.freeze({
  [EXPERIMENT_IDS.SIGNUP_GATE]: {
    analyticsKey: "signup_gate",
    defaultVariant: "post_value_signup",
    envFlag: "REACT_APP_EXPERIMENT_SIGNUP_GATE_ENABLED",
    variants: [
      { id: "post_value_signup", weight: 50 },
      { id: "pre_value_signup", weight: 50 },
    ],
  },
  [EXPERIMENT_IDS.GENERATOR_DEFAULT]: {
    analyticsKey: "generator_default",
    defaultVariant: "quick_script_default",
    envFlag: "REACT_APP_EXPERIMENT_GENERATOR_DEFAULT_ENABLED",
    variants: [
      { id: "quick_script_default", weight: 50 },
      { id: "agent_build_default", weight: 50 },
    ],
  },
  [EXPERIMENT_IDS.HOMEPAGE_CTA]: {
    analyticsKey: "homepage_cta",
    defaultVariant: "generate_with_ai",
    envFlag: "REACT_APP_EXPERIMENT_HOMEPAGE_CTA_ENABLED",
    variants: [
      { id: "generate_with_ai", weight: 50 },
      { id: "script_oriented", weight: 50 },
    ],
  },
});

function storage(kind = "localStorage") {
  if (typeof window === "undefined") return null;
  try {
    const s = window[kind];
    const probe = "__nexusrbx_experiment_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch (_) {
    return null;
  }
}

function envEnabled(name) {
  return String(process.env[name] || "").toLowerCase() === "true";
}

function experimentsDisabled() {
  return envEnabled("REACT_APP_EXPERIMENTS_DISABLED") || storage("localStorage")?.getItem(DISABLED_KEY) === "true";
}

function validVariant(definition, variant) {
  return definition?.variants?.some((entry) => entry.id === variant);
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `visitor_${crypto.randomUUID()}`;
  }
  return `visitor_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function assignmentSeed() {
  const local = storage("localStorage");
  if (!local) return "server-default";
  const analyticsId = local.getItem(ANON_USER_KEY);
  if (analyticsId) return analyticsId;
  let id = local.getItem(VISITOR_KEY);
  if (!id) {
    id = randomId();
    local.setItem(VISITOR_KEY, id);
  }
  return id;
}

function readAssignments() {
  try {
    const raw = storage("localStorage")?.getItem(ASSIGNMENT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeAssignments(assignments) {
  try {
    storage("localStorage")?.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments));
  } catch (_) {
    // Assignment persistence is best effort; defaults keep rendering stable.
  }
}

function hashToBucket(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function weightedVariant(definition, seed, experimentId) {
  const bucket = hashToBucket(`${seed}:${experimentId}`);
  let cursor = 0;
  for (const variant of definition.variants) {
    cursor += Number(variant.weight || 0);
    if (bucket < cursor) return variant.id;
  }
  return definition.defaultVariant;
}

function forcedVariant(experimentId, definition) {
  const local = storage("localStorage");
  const forced = local?.getItem(`nexusrbx:experiments:force:${experimentId}`);
  return validVariant(definition, forced) ? forced : null;
}

export function getExperimentVariant(experimentId) {
  const definition = EXPERIMENT_DEFINITIONS[experimentId];
  if (!definition || experimentsDisabled()) return definition?.defaultVariant || "control";

  const forced = forcedVariant(experimentId, definition);
  if (forced) return forced;
  if (!envEnabled(definition.envFlag)) return definition.defaultVariant;

  const assignments = readAssignments();
  const assigned = assignments[experimentId];
  if (validVariant(definition, assigned)) return assigned;

  const next = weightedVariant(definition, assignmentSeed(), experimentId);
  writeAssignments({ ...assignments, [experimentId]: next });
  return next;
}

export function getExperimentAssignments() {
  return Object.fromEntries(
    Object.entries(EXPERIMENT_DEFINITIONS).map(([id, definition]) => [
      definition.analyticsKey,
      getExperimentVariant(id),
    ])
  );
}

export function getExperimentAnalyticsProperties() {
  const assignments = getExperimentAssignments();
  const variantSummary = Object.entries(assignments)
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  return {
    experiment_variant: variantSummary,
    ...Object.fromEntries(Object.entries(assignments).map(([key, value]) => [`experiment_${key}`, value])),
  };
}

export function getExperimentRequestHeaders() {
  return {
    "X-Nexus-Experiment-Variants": JSON.stringify(getExperimentAssignments()),
  };
}

export function isClearlyComplexPrompt(prompt = "") {
  const text = String(prompt || "").toLowerCase();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    wordCount > 35 ||
    /(multi[-\s]?file|full game|entire game|data\s*store|datastore|inventory system|quest system|combat system|admin panel|server and client|remote\s*event|remoteevent|module\s*script|modulescript|studio workflow|plugin|multiple scripts|architecture|framework|persistent|save data)/i.test(text)
  );
}

export function isMobileViewport(width = typeof window !== "undefined" ? window.innerWidth : 1280) {
  return Number(width) < 1024;
}

export function resolveInitialGeneratorMode({
  restoredSession = null,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
} = {}) {
  const restoredMode = restoredSession?.generatorMode;
  if (restoredMode === "agent_build" || restoredMode === "quick_script") {
    return restoredMode;
  }
  return isMobileViewport(viewportWidth) ? "quick_script" : "agent_build";
}

export function chooseHomepageGeneratorMode(prompt = "", requestedMode = null) {
  if (requestedMode === "quick_script" || requestedMode === "agent_build") return requestedMode;
  if (isClearlyComplexPrompt(prompt)) return "agent_build";
  // Homepage activation is intentionally device-specific: desktop users are
  // entering the Studio agent, while mobile users need the lighter QuickScript
  // workspace. Persisting this mode in the generation intent keeps the handoff
  // stable if authentication or navigation interrupts the transition.
  return isMobileViewport() ? "quick_script" : "agent_build";
}

export function shouldGateFirstValueBeforeSignup() {
  return getExperimentVariant(EXPERIMENT_IDS.SIGNUP_GATE) === "pre_value_signup";
}

export function getHomepageCtaCopy() {
  return getExperimentVariant(EXPERIMENT_IDS.HOMEPAGE_CTA) === "script_oriented"
    ? "Generate Roblox Script"
    : "Generate with AI";
}

export function resetExperimentsForTests() {
  storage("localStorage")?.removeItem(ASSIGNMENT_KEY);
  storage("localStorage")?.removeItem(VISITOR_KEY);
  storage("localStorage")?.removeItem(DISABLED_KEY);
  for (const experimentId of Object.keys(EXPERIMENT_DEFINITIONS)) {
    storage("localStorage")?.removeItem(`nexusrbx:experiments:force:${experimentId}`);
  }
}
