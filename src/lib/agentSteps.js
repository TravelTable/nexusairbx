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
  "inspect_place",
  "read_script",
  "write_script",
  "create_instance",
  "delete_instance",
  "restore_snapshot",
  "run_smoke_check",
  "apply_artifact",
]);

export const DESTRUCTIVE_TOOL_TYPES = new Set([
  "write_script",
  "create_instance",
  "delete_instance",
  "restore_snapshot",
  "apply_artifact",
]);

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
  return {
    id: String(raw.id || raw.stepId || ""),
    type: String(raw.type || "unknown"),
    label: raw.label ? String(raw.label) : undefined,
    status: STEP_STATUSES.includes(raw.status) ? raw.status : String(raw.status || "queued"),
    error: raw.error ? String(raw.error) : undefined,
    result: raw.result && typeof raw.result === "object" ? raw.result : undefined,
    snapshotCount:
      typeof raw.snapshotCount === "number"
        ? raw.snapshotCount
        : Array.isArray(raw.snapshots)
          ? raw.snapshots.length
          : undefined,
    requiresApproval: Boolean(raw.requiresApproval || raw.status === "awaiting_approval"),
    runId: raw.runId ? String(raw.runId) : undefined,
  };
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
  if (type === "inspect_place") {
    const count = result.count ?? result.totalInstances ?? 0;
    return `${count} instance(s) inspected${result.truncated ? " (truncated)" : ""}`;
  }
  if (type === "read_script" && result.scripts) return `${result.scripts.length} script source(s) returned`;
  if (type === "write_script" && result.path) return `Wrote ${result.path}`;
  if (type === "create_instance" && result.path) return `Created ${result.path}`;
  if (type === "delete_instance" && result.path) return `Deleted ${result.path}`;
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
