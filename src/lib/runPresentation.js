import { getLifecyclePresentation } from "./productLifecycle";

const identity = run => String(run?.taskId || run?.runId || run?.id || "");

function scopeMatches(run, scope = {}) {
  return ["chatId", "projectId"].every(key => !scope[key] || String(run?.[key] || "") === String(scope[key]));
}

function getRunPresentation(run, scope = {}) {
  if (!identity(run) || !scopeMatches(run, scope)) return null;
  const status = String(run?.status || run?.state || "").trim().toLowerCase();
  if (["", "idle", "ready"].includes(status)) return null;
  if (["reconnecting", "disconnected"].includes(run.connectionState) && !["succeeded", "completed", "done", "failed", "cancelled", "canceled"].includes(status)) {
    const reconnecting = getLifecyclePresentation("reconnecting");
    return { id: identity(run), status: reconnecting.state, label: reconnecting.label, active: reconnecting.active, tone: reconnecting.tone };
  }
  // Only the server completion gate can assert full verification.
  const presentation = getLifecyclePresentation(status, {
    verified: run.completion?.canComplete === true,
  });
  return {
    id: identity(run),
    status,
    label: presentation.label,
    active: presentation.active,
    tone: presentation.tone === "waiting" ? "muted" : presentation.tone,
  };
}

function getRunSpecialists(run, scope = {}) {
  if (!getRunPresentation(run, scope) || run?.teamActivity?.executionMode !== "team") return [];
  return (Array.isArray(run.teamActivity.assignments) ? run.teamActivity.assignments : [])
    .filter(item => item?.stepId && ["lead", "gameplay", "ui", "world_assets", "qa"].includes(item.role))
    .map(item => ({ id: item.stepId, name: item.role === "world_assets" ? "World and assets" : item.role,
      status: String(item.status || "pending"), detail: String(item.title || "") }));
}

export { getRunPresentation, getRunSpecialists, scopeMatches };
