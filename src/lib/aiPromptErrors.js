export function createImprovePromptError(res, data = {}) {
  const err = new Error(data?.message || data?.error || data?.detail || "Improve prompt request failed");
  err.status = res?.status || null;
  err.code = data?.code || data?.error || null;
  err.requestId = data?.requestId || res?.headers?.get?.("x-request-id") || null;
  err.retryable = typeof data?.retryable === "boolean" ? data.retryable : null;
  return err;
}

export function formatImprovePromptErrorMessage(err) {
  const retryCopy = err?.retryable ? " You can retry in a moment." : "";
  const requestCopy = err?.requestId ? ` Request ID: ${err.requestId}` : "";
  return `${err?.message || "Couldn't improve prompt, try again"}${retryCopy}${requestCopy}`;
}
