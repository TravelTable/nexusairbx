/**
 * Unified agent tool-step schema (frontend + backend contract).
 *
 * SSE event `tool_step` payload and persisted message `steps[]` share this shape.
 */

export const STEP_STATUSES = Object.freeze([
  "queued",
  "delivered",
  "running",
  "awaiting_approval",
  "succeeded",
  "failed",
]);

export const TERMINAL_STEP_STATUSES = new Set(["succeeded", "failed"]);

export const STUDIO_TOOL_TYPES = new Set([
  "get_project_manifest",
  "list_children",
  "inspect_place",
  "inspect_instances",
  "search_project",
  "search_source",
  "read_script",
  "read_scripts",
  "read_instance",
  "read_properties",
  "get_selection",
  "get_studio_context",
  "get_change_history",
  "get_output_logs",
  "create_script",
  "write_script",
  "patch_script",
  "rename_script",
  "move_script",
  "duplicate_script",
  "delete_script",
  "format_script",
  "replace_in_files",
  "create_instance",
  "update_properties",
  "update_attributes",
  "update_tags",
  "rename_instance",
  "move_instance",
  "duplicate_instance",
  "delete_instance",
  "batch_operations",
  "parse_luau",
  "restore_snapshot",
  "run_smoke_check",
  "run_project_validation",
  "run_test_service",
  "run_play_test",
  "stop_play_test",
  "collect_diagnostics",
  "collect_output",
  "create_snapshot",
  "undo_last_batch",
  "apply_artifact",
]);

export const DESTRUCTIVE_TOOL_TYPES = new Set([
  "write_script",
  "create_script",
  "patch_script",
  "rename_script",
  "move_script",
  "duplicate_script",
  "delete_script",
  "replace_in_files",
  "create_instance",
  "update_properties",
  "update_attributes",
  "update_tags",
  "rename_instance",
  "move_instance",
  "duplicate_instance",
  "delete_instance",
  "batch_operations",
  "restore_snapshot",
  "undo_last_batch",
  "apply_artifact",
]);

export const STUDIO_CONNECTION_UNAVAILABLE_MESSAGE =
  "Studio is unavailable right now. Reconnect Studio and try again.";

function isStudioConnectionError(code, message) {
  const normalizedCode = String(code || "").toUpperCase();
  const normalizedMessage = String(message || "").toLowerCase();
  return (
    /(?:MCP|STUDIO).*(?:UNAVAILABLE|DISCONNECT|NOT_CONNECTED|SESSION)/.test(normalizedCode) ||
    /(?:disconnected|not connected|no place is open|previously active studio|mcp tooling reports)/.test(normalizedMessage)
  );
}

export function normalizeToolStepError(error) {
  if (!error) return "";
  const code = typeof error === "object" ? error.code || error.errorCode : "";
  const message = typeof error === "object"
    ? error.publicMessage || error.userMessage || error.message || error.error || ""
    : error;
  if (isStudioConnectionError(code, message)) {
    return STUDIO_CONNECTION_UNAVAILABLE_MESSAGE;
  }
  if (typeof message === "string" && message.trim()) return message.trim();
  return "This Studio action could not be completed.";
}

/**
 * @typedef {Object} AgentToolStep
 * @property {string} id
 * @property {string} type
 * @property {string} [label]
 * @property {string} status
 * @property {string} [error]
 * @property {Record<string, unknown>} [result]
 * @property {number} [snapshotCount]
 * @property {boolean} [requiresApproval]
 * @property {string} [runId]
 * @property {string} [executionProvider]
 * @property {string} [executionSessionId]
 * @property {string} [operationId]
 * @property {string} [fallbackReason]
 */

/**
 * Normalize an SSE `tool_step` event or partial update into a canonical step.
 * @param {Record<string, unknown>} raw
 * @returns {AgentToolStep}
 */
export function normalizeToolStep(raw) {
  if (!raw || typeof raw !== "object") {
    return { id: "", type: "unknown", status: "queued" };
  }
  const step = {
    id: String(raw.id || raw.stepId || ""),
    type: String(raw.type || "unknown"),
    status: STEP_STATUSES.includes(raw.status) ? raw.status : String(raw.status || "queued"),
    requiresApproval: Boolean(raw.requiresApproval || raw.status === "awaiting_approval"),
  };
  if (raw.label) step.label = String(raw.label);
  if (raw.error) step.error = normalizeToolStepError(raw.error);
  if (raw.result && typeof raw.result === "object") step.result = raw.result;
  if (typeof raw.snapshotCount === "number") {
    step.snapshotCount = raw.snapshotCount;
  } else if (Array.isArray(raw.snapshots)) {
    step.snapshotCount = raw.snapshots.length;
  }
  if (raw.runId) step.runId = String(raw.runId);
  if (raw.executionProvider) step.executionProvider = String(raw.executionProvider);
  if (raw.executionSessionId) step.executionSessionId = String(raw.executionSessionId);
  if (raw.operationId) step.operationId = String(raw.operationId);
  if (raw.fallbackReason) step.fallbackReason = String(raw.fallbackReason);
  return step;
}

/**
 * Idempotently merge a step update by id (used while streaming tool_step events).
 * @param {AgentToolStep[]} steps
 * @param {Record<string, unknown>} update
 * @returns {AgentToolStep[]}
 */
export function upsertAgentStep(steps, update) {
  const next = normalizeToolStep(update);
  if (!next.id) return [...(steps || []), next];
  const list = [...(steps || [])];
  const idx = list.findIndex((s) => s.id === next.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...next };
    return list;
  }
  return [...list, next];
}

/**
 * @param {AgentToolStep} step
 * @returns {string}
 */
export function summarizeStepResult(step) {
  if (!step) return "pending";
  if (step.error) return step.error;
  const result = step.result || {};
  const type = step.type;

  if (type === "generate_artifact") {
    const files = result.files || result.fileCount;
    if (Array.isArray(files)) return `Generated ${files.length} file(s)`;
    if (typeof files === "number") return `Generated ${files} file(s)`;
    return result.title ? `Generated ${result.title}` : "Artifact generated";
  }
  if (type === "get_project_manifest") {
    const count = result.totalInstances ?? result.count ?? result.items?.length ?? 0;
    return `${count} manifest item(s) indexed${result.truncated ? " (truncated)" : ""}`;
  }
  if (type === "inspect_place") {
    const count = result.count ?? result.totalInstances ?? 0;
    return `${count} instance(s) inspected${result.truncated ? " (truncated)" : ""}`;
  }
  if ((type === "search_project" || type === "search_source") && result.results) return `${result.results.length} result(s)`;
  if ((type === "read_script" || type === "read_scripts") && result.scripts) return `${result.scripts.length} script source(s) returned`;
  if ((type === "write_script" || type === "create_script" || type === "patch_script") && result.path) return `Wrote ${result.path}`;
  if ((type === "rename_script" || type === "rename_instance") && result.path) return `Renamed to ${result.path}`;
  if ((type === "move_script" || type === "move_instance") && result.path) return `Moved to ${result.path}`;
  if ((type === "duplicate_script" || type === "duplicate_instance") && result.path) return `Duplicated to ${result.path}`;
  if (type === "create_instance" && result.path) return `Created ${result.path}`;
  if ((type === "delete_instance" || type === "delete_script") && result.path) return `Deleted ${result.path}`;
  if (type === "batch_operations") return `${result.results?.length || 0} operation(s)`;
  if (type === "create_snapshot") return `Captured ${result.snapshotCount ?? result.snapshots?.length ?? 0} snapshot(s)`;
  if (type === "undo_last_batch") return `Restored ${result.restored ?? 0} snapshot(s)`;
  if (type === "restore_snapshot") return `Restored ${result.restored ?? 0} snapshot(s)`;
  if (type === "run_smoke_check") {
    return `${result.issues?.length || 0} issue(s), ${result.checkedScripts || 0} script(s) checked`;
  }
  if (type === "apply_artifact") return "Applied artifact to Studio";

  return step.status || "pending";
}

/**
 * @param {AgentToolStep[]} steps
 * @returns {number}
 */
export function countStepSnapshots(steps) {
  return (steps || []).reduce((sum, step) => sum + (step.snapshotCount || 0), 0);
}

/**
 * @param {AgentToolStep[]} steps
 * @returns {AgentToolStep | null}
 */
export function findPendingApprovalStep(steps) {
  return (steps || []).find((s) => s.status === "awaiting_approval") || null;
}

/**
 * @param {AgentToolStep[]} steps
 * @returns {AgentToolStep | null}
 */
export function findActiveStep(steps) {
  return (
    (steps || []).find((s) => !TERMINAL_STEP_STATUSES.has(s.status) && s.status !== "awaiting_approval") ||
    null
  );
}

export function getStudioApplyMode() {
  if (typeof window === "undefined") return "manual_review";
  return window.localStorage.getItem("nexusStudioApplyMode") || "manual_review";
}

export function setStudioApplyMode(mode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("nexusStudioApplyMode", mode);
  }
}

export function getStudioEnabledPreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("nexusStudioEnabled") !== "false";
}

export function setStudioEnabledPreference(enabled) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("nexusStudioEnabled", enabled ? "true" : "false");
  }
}
