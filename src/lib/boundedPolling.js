import { NexusApiError } from "./apiErrors";

export class PollingLimitError extends NexusApiError {
  constructor(message = "Polling stopped before the operation completed.") {
    super(message, {
      status: 408,
      code: "POLLING_LIMIT_REACHED",
      kind: "polling",
      retryable: false,
    });
    this.name = "PollingLimitError";
  }
}

export function createAbortError() {
  const error = new Error("The request was aborted.");
  error.name = "AbortError";
  error.code = "ABORTED";
  return error;
}

export function waitForPollingDelay(delayMs, { signal } = {}) {
  if (signal?.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(done, Math.max(0, Number(delayMs) || 0));

    function cleanup() {
      if (signal) signal.removeEventListener("abort", aborted);
    }
    function done() {
      cleanup();
      resolve();
    }
    function aborted() {
      clearTimeout(timeoutId);
      cleanup();
      reject(createAbortError());
    }

    if (signal) signal.addEventListener("abort", aborted, { once: true });
  });
}

export function jitterDelay(delayMs, random = Math.random, ratio = 0.1) {
  const delay = Math.max(0, Number(delayMs) || 0);
  const spread = delay * Math.max(0, Number(ratio) || 0);
  return Math.max(0, Math.round(delay - spread + random() * spread * 2));
}
