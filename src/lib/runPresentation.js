const STATES = Object.freeze({
  accepted: ["Starting build", true], queued: ["Build queued", true],
  planning: ["Organizing the build", true], inspecting: ["Reading the project", true],
  running: ["Building", true], building: ["Building", true], generating: ["Building", true],
  applying: ["Applying to Studio", true], ready_to_apply: ["Preparing Studio changes", true],
  verifying: ["Testing", true], testing: ["Testing", true], validating: ["Testing", true],
  repairing: ["Fixing issues", true], retry_scheduled: ["Retrying a failed step", true],
  waiting_for_tool: ["Waiting for Studio", true],
  waiting_studio: ["Reconnect Studio to continue", false], blocked_studio: ["Reconnect Studio to continue", false],
  awaiting_studio_reconnect: ["Reconnect Studio to continue", false],
  awaiting_studio_target: ["Select a Studio place", false],
  awaiting_plugin_update: ["Update the Studio connection", false],
  waiting_user: ["Action required", false], waiting_for_approval: ["Action required", false],
  needs_action: ["Action required", false], waiting_external: ["Waiting for an asset", true],
  assets_pending: ["Waiting for an asset", true], interrupted: ["Reconnecting to the build", true],
  verification_pending: ["Applied · testing pending", false],
  incomplete: ["Build incomplete · open details", false],
  manual_verification_required: ["Applied · gameplay check needed", false],
  applied: ["Applied · testing pending", false],
  failed: ["Build stopped before completion", false], blocked: ["Build paused", false],
  conflict: ["Project changed · review needed", false], paused: ["Build paused", false],
  timed_out: ["Build timed out", false], iteration_limit: ["Build stopped at its runtime limit", false],
  cancelled: ["Build stopped", false], canceled: ["Build stopped", false],
  push_skipped: ["Saved to Files · not applied", false],
});
const identity = run => String(run?.taskId || run?.runId || run?.id || "");

function scopeMatches(run, scope = {}) {
  return ["chatId", "projectId"].every(key => !scope[key] || String(run?.[key] || "") === String(scope[key]));
}

function getRunPresentation(run, scope = {}) {
  if (!identity(run) || !scopeMatches(run, scope)) return null;
  const status = String(run?.status || run?.state || "").trim().toLowerCase();
  if (["", "idle", "ready"].includes(status)) return null;
  if (["reconnecting", "disconnected"].includes(run.connectionState) && !["succeeded", "completed", "done", "failed", "cancelled", "canceled"].includes(status)) {
    return { id: identity(run), status: "interrupted", label: "Reconnecting to the build", active: true, tone: "active" };
  }
  if (["succeeded", "completed", "done"].includes(status)) {
    // Only the server completion gate can assert full verification.
    const verified = run.completion?.canComplete === true;
    return { id: identity(run), status, label: verified ? "Build complete" : "Build finished · verification unconfirmed",
      active: false, tone: verified ? "success" : "muted" };
  }
  const [label, active] = STATES[status] || ["Checking build status", false];
  const failed = ["failed", "timed_out", "iteration_limit"].includes(status);
  return { id: identity(run), status, label, active, tone: failed ? "danger" : active ? "active" : "muted" };
}

function getRunSpecialists(run, scope = {}) {
  if (!getRunPresentation(run, scope) || run?.teamActivity?.executionMode !== "team") return [];
  return (Array.isArray(run.teamActivity.assignments) ? run.teamActivity.assignments : [])
    .filter(item => item?.stepId && ["lead", "gameplay", "ui", "world_assets", "qa"].includes(item.role))
    .map(item => ({ id: item.stepId, name: item.role === "world_assets" ? "World and assets" : item.role,
      status: String(item.status || "pending"), detail: String(item.title || "") }));
}

export { getRunPresentation, getRunSpecialists, scopeMatches };
