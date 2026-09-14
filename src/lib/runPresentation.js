import { getLifecyclePresentation, inferLifecycleState, normalizeLifecycleState, LIFECYCLE_COPY } from "./productLifecycle";

const terminalStates = new Set(["complete", "unverified_complete", "cancelled", "failed", "timed_out"]);
const waitingStates = new Set(["queued", "waiting_studio", "waiting_user", "waiting_external", "reconnecting", "paused", "applied_unverified"]);

// Runtime vocabulary stays in productLifecycle. These are presentation decisions,
// never evidence that work was saved, applied, or verified.
export function getWorkspacePresentation({ state, run, task, scope = {}, busy = false, stage, stopping = false, operationState, label, verified = false } = {}) {
  stopping ||= String(operationState?.active?.status || operationState?.lastStatus || "").toLowerCase() === "stopping";
  const scopedRun = [task, run].find(candidate => identity(candidate) && scopeMatches(candidate, scope));
  let value = state || scopedRun?.status || scopedRun?.state || (busy ? inferLifecycleState(stage) : "idle");
  let normalized = normalizeLifecycleState(value);
  if (!LIFECYCLE_COPY[normalized]) normalized = busy ? inferLifecycleState(stage) : "idle";
  if (stopping) normalized = "cancelled";
  else if (scopedRun && !terminalStates.has(normalized) && ["reconnecting", "disconnected"].includes(scopedRun.connectionState)) normalized = "reconnecting";
  const lifecycle = getLifecyclePresentation(normalized, { verified: scopedRun ? scopedRun.completion?.canComplete === true : verified });
  const terminal = terminalStates.has(lifecycle.state);
  const waiting = waitingStates.has(lifecycle.state) || lifecycle.state === "unverified_complete";
  const active = lifecycle.active && !waiting && !terminal;
  const motion = active ? "working" : waiting ? "waiting" : terminal ? "settled" : "resting";
  return {
    ...lifecycle,
    id: scopedRun ? identity(scopedRun) : "",
    label: stopping ? "Stopping work" : label || lifecycle.label,
    active, waiting, terminal, motion,
    emphasis: lifecycle.tone === "danger" || lifecycle.state === "waiting_user" ? "high" : active ? "medium" : "low",
    showPulse: active,
    showComposerFlow: active,
    showAmbientGlow: active,
    accessibility: { live: "polite", atomic: true, busy: active },
  };
}

export const UI_BUILD_LABELS = { generating: 'Writing UI files', preparing: 'Saving files', building_model: 'Building RBXM', applying: 'Checking Studio',
  awaiting_studio: 'Applying to Studio', capturing: 'Capturing UI', awaiting_capture: 'Capturing UI', design_preview: 'Preparing preview', rendering: 'Rendering preview',
  awaiting_renders: 'Rendering preview', reviewing: 'Reviewing the render', repairing: 'Refining your UI', complete: 'Visually reviewed', saved: 'Saved',
  preview_unavailable: 'Preview unavailable', needs_review: 'Review needs attention', renderer_limited: 'Preview limitations',
  budget_exhausted: 'Review budget reached', failed: 'Build needs attention' };
export const UI_ACTION_LABELS = { understanding_request: 'Understanding your request', planning_design: 'Planning the design', resolving_assets: 'Resolving icons and assets', generating_artwork: 'Generating matching artwork', extracting_artwork: 'Preparing individual components', writing_ui: 'Writing your UI', rendering_desktop: 'Rendering desktop', rendering_mobile: 'Rendering mobile', reviewing_design: 'Reviewing design quality', improving_design: 'Improving the design', finding_assets: 'Finding icons and images', uploading_assets: 'Uploading images to Roblox', building_layout: 'Building UI layout', writing_implementation: 'Writing UI implementation', validating_implementation: 'Checking UI implementation' };
const uiStageStates = { preparing: 'generating', building_model: 'generating', awaiting_studio: 'waiting_studio', capturing: 'inspecting', awaiting_capture: 'waiting_studio',
  design_preview: 'generating', rendering: 'generating', awaiting_renders: 'waiting_external', reviewing: 'verifying', repairing: 'recovering',
  saved: 'unverified_complete', preview_unavailable: 'unverified_complete', needs_review: 'unverified_complete', renderer_limited: 'unverified_complete', budget_exhausted: 'unverified_complete' };

export function getUiWorkspacePresentation({ task, busy = '', connection = '', stopping = false } = {}) {
  const build = task?.uiBuild;
  const taskState = normalizeLifecycleState(task?.status || 'idle');
  // New operations supersede the preceding result; document/library loading is quiet.
  const busyStates = { 'Starting build': 'sending', Answering: 'thinking', 'Applying to Studio': 'applying', 'Reviewing the render': 'verifying', 'Capturing UI': 'inspecting' };
  let state = busyStates[busy] || taskState;
  let label = busyStates[busy] ? busy : '';
  if (!busyStates[busy] && !['cancelled', 'failed', 'timed_out'].includes(taskState) && build) {
    state = uiStageStates[build.stage] || normalizeLifecycleState(build.stage);
    const ended = terminalStates.has(state) || state === 'complete';
    label = (!ended && UI_ACTION_LABELS[build.action]) || UI_BUILD_LABELS[build.stage];
    if (!ended && !waitingStates.has(state) && UI_ACTION_LABELS[build.action]) state = inferLifecycleState(label);
    if (!ended && waitingStates.has(taskState)) { state = taskState; label = ''; }
  }
  if (connection && !busyStates[busy] && !terminalStates.has(state)) { state = 'reconnecting'; label = ''; }
  return getWorkspacePresentation({ state, label, stopping, verified: task?.completion?.canComplete === true });
}

export function workspacePresentationAttributes(presentation) {
  return {
    "data-agent-state": presentation.state,
    "data-agent-motion": presentation.motion,
    "data-agent-tone": presentation.tone,
    "data-agent-active": presentation.active || undefined,
    "data-agent-pulse": presentation.showPulse || undefined,
    "data-agent-flow": presentation.showComposerFlow || undefined,
    "data-agent-glow": presentation.showAmbientGlow || undefined,
  };
}

const identity = run => String(run?.taskId || run?.runId || run?.id || "");

function scopeMatches(run, scope = {}) {
  return ["chatId", "projectId"].every(key => !scope[key] || String(run?.[key] || "") === String(scope[key]));
}

function getRunPresentation(run, scope = {}) {
  if (!identity(run) || !scopeMatches(run, scope)) return null;
  const status = String(run?.status || run?.state || "").trim().toLowerCase();
  if (["", "idle", "ready"].includes(status)) return null;
  return { ...getWorkspacePresentation({ run, scope }), status };
}

function getRunSpecialists(run, scope = {}) {
  if (!getRunPresentation(run, scope) || run?.teamActivity?.executionMode !== "team") return [];
  return (Array.isArray(run.teamActivity.assignments) ? run.teamActivity.assignments : [])
    .filter(item => item?.stepId && ["lead", "gameplay", "ui", "world_assets", "qa"].includes(item.role))
    .map(item => ({ id: item.stepId, name: item.role === "world_assets" ? "World and assets" : item.role,
      status: String(item.status || "pending"), detail: String(item.title || "") }));
}

export { getRunPresentation, getRunSpecialists, scopeMatches };
