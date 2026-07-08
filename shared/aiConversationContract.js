const SCENARIO_IDS = Object.freeze([
  "studio_visibility",
  "script_explanation",
  "bug_diagnosis",
  "targeted_edit_request",
  "feature_build_request",
  "search_and_compare",
  "workflow_guidance",
  "project_planning",
  "environment_recovery",
  "safety_boundary",
]);

const BLOCKER_CODES = Object.freeze([
  "none",
  "studio_not_connected",
  "manifest_building",
  "manifest_stale",
  "manifest_partial",
  "manifest_conflicted",
  "studio_timeout",
  "permission_denied",
  "unsupported_command",
  "missing_session",
  "ambiguous_intent",
  "unsafe_action",
  "unknown_error",
]);

const ROUTE_MODES = Object.freeze(["ask", "agent", "plan"]);

const CONTEXT_SOURCES = Object.freeze([
  "manifest",
  "search",
  "script_read",
  "generation",
  "none",
]);

const ACTION_LEVELS = Object.freeze([
  "explain",
  "inspect",
  "propose",
  "queue",
  "execute",
]);

const AI_OUTCOME_STATUSES = Object.freeze([
  "success",
  "partial",
  "blocked",
  "failed",
  "refused",
]);

const AI_TELEMETRY_EVENT_NAMES = Object.freeze({
  AI_INTENT_CLASSIFIED: "ai_intent_classified",
  AI_CLARIFICATION_REQUESTED: "ai_clarification_requested",
  AI_CONTEXT_ACQUIRED: "ai_context_acquired",
  AI_CONTEXT_FAILED: "ai_context_failed",
  AI_TOOL_ROUTE_SELECTED: "ai_tool_route_selected",
  AI_TOOL_EXECUTION_STARTED: "ai_tool_execution_started",
  AI_TOOL_EXECUTION_COMPLETED: "ai_tool_execution_completed",
  AI_RESPONSE_OUTCOME: "ai_response_outcome",
  AI_USER_REPROMPT_AFTER_FAILURE: "ai_user_reprompt_after_failure",
  AI_USER_ACCEPTS_PROPOSED_ACTION: "ai_user_accepts_proposed_action",
  AI_USER_ABANDONS_TASK: "ai_user_abandons_task",
});

const AI_TELEMETRY_EVENT_NAME_VALUES = Object.freeze(Object.values(AI_TELEMETRY_EVENT_NAMES));

const SETS = {
  scenarioId: new Set(SCENARIO_IDS),
  blockerCode: new Set(BLOCKER_CODES),
  routeMode: new Set(ROUTE_MODES),
  contextSource: new Set(CONTEXT_SOURCES),
  actionLevel: new Set(ACTION_LEVELS),
  outcome: new Set(AI_OUTCOME_STATUSES),
};

function fail(field, message) {
  const error = new TypeError(`Invalid ${field}: ${message}`);
  error.code = "INVALID_AI_CONVERSATION_OUTCOME";
  throw error;
}

function requireStringField(value, field, allowedSet) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(field, "Expected non-empty string");
  }
  const normalized = value.trim();
  if (allowedSet && !allowedSet.has(normalized)) {
    fail(field, `Expected one of ${Array.from(allowedSet).join(", ")}`);
  }
  return normalized;
}

function requireBooleanField(value, field) {
  if (typeof value !== "boolean") {
    fail(field, "Expected boolean");
  }
  return value;
}

function requireUnitNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(field, "Expected finite number");
  }
  if (value < 0 || value > 1) {
    fail(field, "Expected number between 0 and 1");
  }
  return value;
}

function requireContextSources(value, field = "contextSourcesUsed") {
  if (!Array.isArray(value)) {
    fail(field, "Expected array");
  }
  return value.map((entry) => requireStringField(entry, `${field}[]`, SETS.contextSource));
}

function requireRouteHint(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("routeHint", "Expected object");
  }
  return Object.freeze({
    recommendedRouteMode: requireStringField(value.recommendedRouteMode, "routeHint.recommendedRouteMode", SETS.routeMode),
    routeReason: requireStringField(value.routeReason, "routeHint.routeReason"),
    routeConfidence: requireUnitNumber(value.routeConfidence, "routeHint.routeConfidence"),
    shouldSwitchRoute: requireBooleanField(value.shouldSwitchRoute, "routeHint.shouldSwitchRoute"),
    safeToAutoSwitch: requireBooleanField(value.safeToAutoSwitch, "routeHint.safeToAutoSwitch"),
    nextBestAction: requireMachineReadableAction(value.nextBestAction),
  });
}

function requireContextPolicy(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("contextPolicy", "Expected object");
  }
  return Object.freeze({
    requiredContextSources: requireContextSources(value.requiredContextSources, "contextPolicy.requiredContextSources"),
    optionalContextSources: requireContextSources(value.optionalContextSources, "contextPolicy.optionalContextSources"),
    minimumContextSatisfied: requireBooleanField(value.minimumContextSatisfied, "contextPolicy.minimumContextSatisfied"),
    contextAcquisitionBlocked: requireBooleanField(value.contextAcquisitionBlocked, "contextPolicy.contextAcquisitionBlocked"),
    blockerCode: requireStringField(value.blockerCode, "contextPolicy.blockerCode", SETS.blockerCode),
    contextReason: requireStringField(value.contextReason, "contextPolicy.contextReason"),
    safeNextAction: requireMachineReadableAction(value.safeNextAction),
  });
}

function requirePreconditions(value, field) {
  if (!Array.isArray(value)) {
    fail(field, "Expected array");
  }
  return value.map((entry) => requireMachineReadableAction(entry));
}

function requireMutationPolicy(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("mutationPolicy", "Expected object");
  }
  return Object.freeze({
    mutationAllowedNow: requireBooleanField(value.mutationAllowedNow, "mutationPolicy.mutationAllowedNow"),
    requiresManualReview: requireBooleanField(value.requiresManualReview, "mutationPolicy.requiresManualReview"),
    canStageProposal: requireBooleanField(value.canStageProposal, "mutationPolicy.canStageProposal"),
    canExecuteDirectly: requireBooleanField(value.canExecuteDirectly, "mutationPolicy.canExecuteDirectly"),
    requiredPreconditions: requirePreconditions(value.requiredPreconditions, "mutationPolicy.requiredPreconditions"),
    missingPreconditions: requirePreconditions(value.missingPreconditions, "mutationPolicy.missingPreconditions"),
    safetyReason: requireStringField(value.safetyReason, "mutationPolicy.safetyReason"),
    safeNextAction: requireMachineReadableAction(value.safeNextAction),
  });
}

const BLOCKER_RECOVERY_FAMILIES = new Set([
  "none",
  "ambiguity",
  "safety",
  "session",
  "manifest",
  "timing",
  "permission",
  "capability",
  "unknown",
]);

const BLOCKER_RECOVERY_MODES = new Set([
  "none",
  "clarify",
  "refuse",
  "reconnect",
  "refresh",
  "wait",
  "retry",
  "narrow",
  "inspect",
  "continue",
]);

function requireBlockerRecovery(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("blockerRecovery", "Expected object");
  }
  return Object.freeze({
    blockerCode: requireStringField(value.blockerCode, "blockerRecovery.blockerCode", SETS.blockerCode),
    blockerFamily: requireStringField(value.blockerFamily, "blockerRecovery.blockerFamily", BLOCKER_RECOVERY_FAMILIES),
    recoveryMode: requireStringField(value.recoveryMode, "blockerRecovery.recoveryMode", BLOCKER_RECOVERY_MODES),
    canRetrySafely: requireBooleanField(value.canRetrySafely, "blockerRecovery.canRetrySafely"),
    shouldReconnectStudio: requireBooleanField(value.shouldReconnectStudio, "blockerRecovery.shouldReconnectStudio"),
    shouldRefreshManifest: requireBooleanField(value.shouldRefreshManifest, "blockerRecovery.shouldRefreshManifest"),
    shouldRetryLater: requireBooleanField(value.shouldRetryLater, "blockerRecovery.shouldRetryLater"),
    shouldAskForClarification: requireBooleanField(value.shouldAskForClarification, "blockerRecovery.shouldAskForClarification"),
    shouldNarrowScope: requireBooleanField(value.shouldNarrowScope, "blockerRecovery.shouldNarrowScope"),
    safeNextAction: requireMachineReadableAction(value.safeNextAction),
    recoveryAction: requireMachineReadableAction(value.recoveryAction),
    userActionRequired: requireBooleanField(value.userActionRequired, "blockerRecovery.userActionRequired"),
    recoveryReason: requireStringField(value.recoveryReason, "blockerRecovery.recoveryReason"),
    userSafeMessage: requireStringField(value.userSafeMessage, "blockerRecovery.userSafeMessage"),
  });
}

function requireMachineReadableAction(value) {
  if (typeof value !== "string") {
    fail("nextBestAction", "Expected string");
  }
  const normalized = value.trim();
  if (!normalized) {
    fail("nextBestAction", "Expected non-empty string");
  }
  if (normalized.length > 64) {
    fail("nextBestAction", "Expected short string");
  }
  if (!/^[a-z][a-z0-9_:-]*$/.test(normalized)) {
    fail("nextBestAction", "Expected machine-readable lowercase token");
  }
  return normalized;
}

function normalizeAiConversationOutcome(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("outcome", "Expected object");
  }

  const normalizedRouteHint =
    raw.routeHint === undefined ? undefined : requireRouteHint(raw.routeHint);
  const normalizedContextPolicy =
    raw.contextPolicy === undefined ? undefined : requireContextPolicy(raw.contextPolicy);
  const normalizedMutationPolicy =
    raw.mutationPolicy === undefined ? undefined : requireMutationPolicy(raw.mutationPolicy);
  const normalizedBlockerRecovery =
    raw.blockerRecovery === undefined ? undefined : requireBlockerRecovery(raw.blockerRecovery);

  return Object.freeze({
    scenarioId: requireStringField(raw.scenarioId, "scenarioId", SETS.scenarioId),
    routeMode: requireStringField(raw.routeMode, "routeMode", SETS.routeMode),
    intentConfidence: requireUnitNumber(raw.intentConfidence, "intentConfidence"),
    clarificationRequired: requireBooleanField(raw.clarificationRequired, "clarificationRequired"),
    studioRequired: requireBooleanField(raw.studioRequired, "studioRequired"),
    studioAvailable: requireBooleanField(raw.studioAvailable, "studioAvailable"),
    contextSourcesUsed: requireContextSources(raw.contextSourcesUsed),
    actionLevel: requireStringField(raw.actionLevel, "actionLevel", SETS.actionLevel),
    outcome: requireStringField(raw.outcome, "outcome", SETS.outcome),
    blockerCode: requireStringField(raw.blockerCode, "blockerCode", SETS.blockerCode),
    userGoalResolved: requireBooleanField(raw.userGoalResolved, "userGoalResolved"),
    nextBestAction: requireMachineReadableAction(raw.nextBestAction),
    ...(normalizedRouteHint ? { routeHint: normalizedRouteHint } : {}),
    ...(normalizedContextPolicy ? { contextPolicy: normalizedContextPolicy } : {}),
    ...(normalizedMutationPolicy ? { mutationPolicy: normalizedMutationPolicy } : {}),
    ...(normalizedBlockerRecovery ? { blockerRecovery: normalizedBlockerRecovery } : {}),
  });
}

module.exports = {
  SCENARIO_IDS,
  BLOCKER_CODES,
  ROUTE_MODES,
  CONTEXT_SOURCES,
  ACTION_LEVELS,
  AI_OUTCOME_STATUSES,
  AI_TELEMETRY_EVENT_NAMES,
  AI_TELEMETRY_EVENT_NAME_VALUES,
  normalizeAiConversationOutcome,
};
