const LIFECYCLE_COPY = Object.freeze({
  queued: Object.freeze({
    eyebrow: "Queued",
    title: "Your request is safely queued",
    label: "Build queued",
    body: "The build has not completed yet. Nothing has been applied; work will begin when runtime capacity is available.",
    tone: "neutral",
    active: true,
  }),
  sending: Object.freeze({
    eyebrow: "Sending",
    title: "Saving your request",
    label: "Sending request",
    body: "Nexus is saving the request before work begins.",
    tone: "active",
    active: true,
  }),
  thinking: Object.freeze({
    eyebrow: "Understanding",
    title: "Understanding your task",
    label: "Understanding your task",
    body: "Nexus is reading the request and available project context.",
    tone: "active",
    active: true,
  }),
  planning: Object.freeze({
    eyebrow: "Planning",
    title: "Preparing the change plan",
    label: "Planning the change",
    body: "Nexus is organizing reviewable steps before making changes.",
    tone: "active",
    active: true,
  }),
  inspecting: Object.freeze({
    eyebrow: "Project context",
    title: "Reading the project",
    label: "Reading the project",
    body: "Nexus is inspecting relevant project structure before it proposes or makes changes.",
    tone: "active",
    active: true,
  }),
  generating: Object.freeze({
    eyebrow: "Generating",
    title: "Generating the change set",
    label: "Generating files",
    body: "Nexus is producing the planned files and changes for review.",
    tone: "active",
    active: true,
  }),
  executing_tool: Object.freeze({
    eyebrow: "Working",
    title: "Executing an approved operation",
    label: "Executing tool",
    body: "The operation and its result are recorded in this run.",
    tone: "active",
    active: true,
  }),
  waiting_studio: Object.freeze({
    eyebrow: "Studio needed",
    title: "Waiting for Roblox Studio",
    label: "Waiting for Studio",
    body: "Saved work is intact. Connect the intended Studio place to continue.",
    tone: "waiting",
    active: false,
  }),
  waiting_user: Object.freeze({
    eyebrow: "Review needed",
    title: "Your approval or input is required",
    label: "Action required",
    body: "Work is paused safely and will not continue until you respond.",
    tone: "waiting",
    active: false,
  }),
  waiting_external: Object.freeze({
    eyebrow: "External result pending",
    title: "Waiting for an external service",
    label: "Waiting for an external result",
    body: "Work is paused safely and will resume when the external result arrives.",
    tone: "waiting",
    active: true,
  }),
  applying: Object.freeze({
    eyebrow: "Applying",
    title: "Applying the approved change set",
    label: "Applying to Studio",
    body: "Nexus is applying approved changes and recording each result.",
    tone: "active",
    active: true,
  }),
  testing: Object.freeze({
    eyebrow: "Testing",
    title: "Testing the applied changes",
    label: "Testing the change",
    body: "Nexus is running the available checks before reporting a result.",
    tone: "active",
    active: true,
  }),
  verifying: Object.freeze({
    eyebrow: "Verification",
    title: "Verifying the result",
    label: "Verifying the result",
    body: "Nexus is checking recorded evidence before reporting completion.",
    tone: "active",
    active: true,
  }),
  recovering: Object.freeze({
    eyebrow: "Recovering",
    title: "Recovering from an interrupted step",
    label: "Recovering saved progress",
    body: "Completed work remains recorded while Nexus resumes safely.",
    tone: "waiting",
    active: true,
  }),
  reconnecting: Object.freeze({
    eyebrow: "Reconnecting",
    title: "Reconnecting to this run",
    label: "Reconnecting to the build",
    body: "Progress is saved. Live updates will resume when the connection returns.",
    tone: "waiting",
    active: true,
  }),
  cancelled: Object.freeze({
    eyebrow: "Cancelled",
    title: "Work cancelled",
    label: "Build stopped",
    body: "No further steps will run. Completed activity remains available in technical details.",
    tone: "neutral",
    active: false,
  }),
  failed: Object.freeze({
    eyebrow: "Stopped",
    title: "The work could not be completed",
    label: "Build stopped before completion",
    body: "Nexus stopped before it could confirm completion. Review the recorded steps to see whether any change was applied, then use only the recovery actions offered for this run.",
    tone: "danger",
    active: false,
  }),
  complete: Object.freeze({
    eyebrow: "Complete",
    title: "Work complete",
    label: "Build complete",
    body: "The requested work reached a confirmed terminal state.",
    tone: "success",
    active: false,
  }),
  unverified_complete: Object.freeze({
    eyebrow: "Build result",
    title: "Work finished; verification is unconfirmed",
    label: "Build finished · verification unconfirmed",
    body: "Saved output is available, but required verification did not confirm completion.",
    tone: "waiting",
    active: false,
  }),
  applied_unverified: Object.freeze({
    eyebrow: "Applied",
    title: "Change set applied; verification is pending",
    label: "Applied · verification pending",
    body: "The change set reached Studio, but verification has not yet confirmed the result.",
    tone: "waiting",
    active: false,
  }),
  timed_out: Object.freeze({
    eyebrow: "Timed out",
    title: "The build timed out",
    label: "Build timed out",
    body: "Nexus stopped waiting before it could confirm completion. Review the recorded steps before retrying.",
    tone: "danger",
    active: false,
  }),
  paused: Object.freeze({
    eyebrow: "Paused",
    title: "Work is paused",
    label: "Build paused",
    body: "Saved progress remains available. Open the run for the required next action.",
    tone: "waiting",
    active: false,
  }),
});

const STATUS_ALIASES = Object.freeze({
  accepted: "sending",
  running: "executing_tool",
  building: "generating",
  writing: "generating",
  ready_to_apply: "applying",
  waiting_for_tool: "waiting_studio",
  blocked_studio: "waiting_studio",
  awaiting_studio_reconnect: "waiting_studio",
  awaiting_studio_target: "waiting_studio",
  awaiting_plugin_update: "waiting_studio",
  waiting_for_approval: "waiting_user",
  needs_action: "waiting_user",
  assets_pending: "waiting_external",
  validating: "verifying",
  repairing: "recovering",
  retry_scheduled: "recovering",
  compensating: "recovering",
  interrupted: "reconnecting",
  disconnected: "reconnecting",
  succeeded: "complete",
  completed: "complete",
  done: "complete",
  canceled: "cancelled",
  timed_out: "timed_out",
  iteration_limit: "failed",
  blocked: "paused",
  conflict: "paused",
  applied: "applied_unverified",
  verification_pending: "unverified_complete",
  manual_verification_required: "unverified_complete",
  incomplete: "unverified_complete",
  push_skipped: "unverified_complete",
});

export function normalizeLifecycleState(value) {
  const status = String(value || "").trim().toLowerCase().replaceAll("-", "_");
  return STATUS_ALIASES[status] || status || "thinking";
}

export function inferLifecycleState(value) {
  const text = String(value || "").trim().toLowerCase();
  if (/reconnect|stream interrupted/.test(text)) return "reconnecting";
  if (/recover|catching up|retry/.test(text)) return "recovering";
  if (/wait.*studio|studio.*wait|connect.*studio/.test(text)) return "waiting_studio";
  if (/verif|final check/.test(text)) return "verifying";
  if (/test|validat/.test(text)) return "testing";
  if (/apply|push.*studio/.test(text)) return "applying";
  if (/plan|layout/.test(text)) return "planning";
  if (/read|inspect|analyz/.test(text)) return "inspecting";
  if (/writ|generat|creat|finaliz|render/.test(text)) return "generating";
  if (/send|sav.*request/.test(text)) return "sending";
  return "thinking";
}

export function getLifecyclePresentation(value, { verified = false } = {}) {
  let state = normalizeLifecycleState(value);
  if (state === "complete" && !verified) state = "unverified_complete";
  return {
    state,
    ...(LIFECYCLE_COPY[state] || LIFECYCLE_COPY.thinking),
  };
}

export function getLifecyclePresentationFromText(value) {
  return getLifecyclePresentation(inferLifecycleState(value));
}

export { LIFECYCLE_COPY };
