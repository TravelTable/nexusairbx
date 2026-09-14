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

// Canonical happy-path loading walk for UI creator. Mock runs play this list as-is —
// add a step here (and its label above) and both production presentation and mock demos pick it up.
export const UI_LOADING_PIPELINE = Object.freeze([
  Object.freeze({ delayMs: 450, busy: 'Starting build' }),
  Object.freeze({ delayMs: 700, stage: 'generating', action: 'understanding_request' }),
  Object.freeze({ delayMs: 900, stage: 'generating', action: 'planning_design' }),
  Object.freeze({ delayMs: 1100, stage: 'generating', action: 'writing_ui', withFiles: true }),
  Object.freeze({ delayMs: 700, stage: 'preparing', action: 'writing_implementation', withFiles: true }),
  Object.freeze({ delayMs: 700, stage: 'building_model', withFiles: true }),
  Object.freeze({ delayMs: 800, stage: 'rendering', action: 'rendering_desktop', withFiles: true }),
  Object.freeze({ delayMs: 800, stage: 'rendering', action: 'rendering_mobile', withFiles: true }),
  Object.freeze({ delayMs: 900, stage: 'reviewing', action: 'reviewing_design', withFiles: true }),
  Object.freeze({ delayMs: 0, stage: 'complete', outcome: 'visual_review_passed', terminal: true, withFiles: true }),
]);

// Canonical agent loading walk for mock demos. Stage strings feed getWorkspacePresentation.
export const AGENT_LOADING_PIPELINE = Object.freeze([
  Object.freeze({ delayMs: 400, stage: 'Understanding your request', status: 'queued' }),
  Object.freeze({ delayMs: 700, stage: 'Planning the change', status: 'running' }),
  Object.freeze({ delayMs: 900, stage: 'Writing Roblox scripts', status: 'running' }),
  Object.freeze({ delayMs: 800, stage: 'Checking the result', status: 'running' }),
  Object.freeze({ delayMs: 0, status: 'succeeded', terminal: true }),
]);

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

function pipelineStepKey(step = {}) {
  if (step.busy) return `busy:${step.busy}`;
  return `stage:${step.stage || ''}|action:${step.action || ''}|terminal:${step.terminal ? 1 : 0}`;
}

function currentUiPipelineKey({ busy = '', task } = {}) {
  if (busy) return `busy:${busy}`;
  const build = task?.uiBuild;
  if (!build) return '';
  const terminal = build.stage === 'complete' || Boolean(build.outcome);
  return `stage:${build.stage || ''}|action:${build.action || ''}|terminal:${terminal && build.stage === 'complete' ? 1 : 0}`;
}

/** Map the shared UI loading pipeline into Chain-of-Thought step statuses. */
export function getUiLoadingChainSteps({ busy = '', task, pipeline = UI_LOADING_PIPELINE } = {}) {
  const currentKey = currentUiPipelineKey({ busy, task });
  let activeIndex = pipeline.findIndex((step) => pipelineStepKey(step) === currentKey);
  if (activeIndex < 0 && task?.uiBuild?.stage === 'complete') activeIndex = pipeline.length - 1;
  if (activeIndex < 0 && busy) {
    activeIndex = pipeline.findIndex((step) => step.busy);
  }
  if (activeIndex < 0 && task?.uiBuild) {
    activeIndex = pipeline.findIndex((step) =>
      step.stage === task.uiBuild.stage
      && (!step.action || step.action === task.uiBuild.action)
      && !step.busy
    );
  }
  const finished = activeIndex >= 0
    && Boolean(pipeline[activeIndex]?.terminal)
    && ['succeeded', 'completed', 'complete', 'done'].includes(String(task?.status || '').toLowerCase());

  return pipeline.map((step, index) => {
    const label = step.busy
      || UI_ACTION_LABELS[step.action]
      || UI_BUILD_LABELS[step.stage]
      || step.stage
      || 'Working';
    let status = 'pending';
    if (activeIndex < 0) status = 'pending';
    else if (finished || index < activeIndex) status = 'complete';
    else if (index === activeIndex) status = step.terminal ? 'complete' : 'active';
    return {
      id: pipelineStepKey(step),
      label,
      status,
      stage: step.stage || '',
      action: step.action || '',
      busy: step.busy || '',
    };
  });
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
