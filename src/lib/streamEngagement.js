export const IDLE_PULSE_INTERVAL_MS = 2500;

// A single honest heartbeat line, not a rotating "fake flow". The real model
// reasoning/file tokens drive the visible activity; this only reassures the user
// during genuinely quiet gaps (e.g. long tool calls or waiting on Studio).
export const IDLE_PULSE_MESSAGES = Object.freeze(["Working..."]);

export const STUDIO_IDLE_PULSE_MESSAGES = Object.freeze([
  "Waiting for Studio to respond...",
]);

export function stageSlug(label = "") {
  return String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** True when the current stage is actually blocked on a Studio round-trip. */
export function isWaitingForStudioContext(ctx = {}) {
  if (ctx.waitingForStudio === true) return true;
  if (ctx.waitingForStudio === false) return false;
  const stage = String(ctx.stage || "").toLowerCase();
  if (!stage) return false;
  return (
    stage.includes("waiting for studio") ||
    stage.includes("waiting for roblox studio") ||
    stage.includes("waiting for tool") ||
    /\b(inspecting|applying|building studio manifest)\b/.test(stage)
  );
}

/**
 * Emits soft status lines when the stream has been quiet — honest pipeline copy,
 * not fake tool calls. Pulses upsert by id so the activity list does not grow.
 */
export function createIdlePulseController({
  onPulse,
  getActivitySeq,
  getContext,
  intervalMs = IDLE_PULSE_INTERVAL_MS,
} = {}) {
  let timer = null;
  let pulseIndex = 0;
  let lastSeenSeq = 0;
  let quietTicks = 0;

  const tick = () => {
    const seq = Number(getActivitySeq?.() ?? 0);
    if (seq !== lastSeenSeq) {
      lastSeenSeq = seq;
      quietTicks = 0;
      return;
    }
    quietTicks += 1;
    // Only speak up after a longer silence so real streaming carries the UI.
    if (quietTicks < 3) return;
    const ctx = getContext?.() || {};
    const messages = isWaitingForStudioContext(ctx)
      ? STUDIO_IDLE_PULSE_MESSAGES
      : IDLE_PULSE_MESSAGES;
    const message = messages[pulseIndex % messages.length];
    pulseIndex += 1;
    onPulse?.(message);
  };

  return {
    start() {
      if (timer) return;
      lastSeenSeq = Number(getActivitySeq?.() ?? 0);
      quietTicks = 0;
      timer = setInterval(tick, intervalMs);
    },
    dispose() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    notifyActivity() {
      lastSeenSeq = Number(getActivitySeq?.() ?? 0);
      quietTicks = 0;
    },
  };
}
