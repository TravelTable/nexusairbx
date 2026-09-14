export async function playMockScenario(frames = [], {
  onFrame,
  signal,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  for (const frame of frames) {
    if (signal?.aborted) return { stopped: true };
    onFrame?.(frame);
    const delayMs = Number(frame?.delayMs || 0);
    if (delayMs > 0) await wait(delayMs);
    if (signal?.aborted) return { stopped: true };
  }
  return { stopped: false };
}
