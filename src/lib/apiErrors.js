const MAX_RETRY_AFTER_MS = 30 * 60 * 1000;

export function parseRetryAfterMs(value, now = Date.now()) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return Math.min(Math.max(0, timestamp - now), MAX_RETRY_AFTER_MS);
  }

  return null;
}

export function isRetryableApiError(error) {
  return Boolean(
    error?.retryable === true ||
      error?.status === 429 ||
      error?.status === 503 ||
      error?.code === "FIRESTORE_QUOTA_EXCEEDED"
  );
}

export function getRetryDelayMs(error, fallbackMs = 30000) {
  const parsed = Number(error?.retryAfterMs);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(parsed, MAX_RETRY_AFTER_MS);
  }
  return fallbackMs;
}

export async function readJsonResponse(res, fallbackMessage = "Request failed") {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const retryAfter = res.headers?.get?.("Retry-After") || data?.retryAfter || null;
    const error = new Error(data?.message || data?.error || text || fallbackMessage);
    error.status = res.status;
    error.code = data?.code || data?.errorCode || null;
    error.retryable = data?.retryable === true || res.status === 429 || res.status === 503;
    error.retryAfter = retryAfter;
    error.retryAfterMs = parseRetryAfterMs(retryAfter);
    error.payload = data;
    throw error;
  }

  return data || {};
}
