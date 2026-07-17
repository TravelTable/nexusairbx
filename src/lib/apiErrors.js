const MAX_RETRY_AFTER_MS = 30 * 60 * 1000;
const API_RETRY_COOLDOWN_STORAGE_PREFIX = "nexusrbx:apiRetryCooldown:";
const apiRetryCooldowns = new Map();

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
  const message = String(error?.message || "");
  const isNetworkTransportFailure =
    error?.name === "TypeError" &&
    /failed to fetch|load failed|networkerror|network request failed|cannot load/i.test(message);
  return Boolean(
    error?.retryable === true ||
      error?.status === 429 ||
      error?.status === 503 ||
      error?.code === "FIRESTORE_QUOTA_EXCEEDED" ||
      isNetworkTransportFailure
  );
}

export function getRetryDelayMs(error, fallbackMs = 30000) {
  const parsed = Number(error?.retryAfterMs);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(parsed, MAX_RETRY_AFTER_MS);
  }
  return fallbackMs;
}

function normalizeCooldownKey(key) {
  return String(key || "").trim();
}

function cooldownStorageKey(key) {
  return `${API_RETRY_COOLDOWN_STORAGE_PREFIX}${encodeURIComponent(key)}`;
}

function readStoredRetryAt(key) {
  if (typeof window === "undefined" || !window.sessionStorage) return 0;
  try {
    const raw = window.sessionStorage.getItem(cooldownStorageKey(key));
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Number(parsed?.retryAt || parsed || 0);
  } catch (_) {
    return 0;
  }
}

function writeStoredRetryAt(key, retryAt) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(cooldownStorageKey(key), JSON.stringify({ retryAt }));
  } catch (_) {
    /* best effort */
  }
}

function removeStoredRetryAt(key) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(cooldownStorageKey(key));
  } catch (_) {
    /* best effort */
  }
}

export function getApiRetryCooldownMs(key, now = Date.now()) {
  const normalized = normalizeCooldownKey(key);
  if (!normalized) return 0;
  const retryAt = Math.max(
    Number(apiRetryCooldowns.get(normalized) || 0),
    readStoredRetryAt(normalized)
  );
  const remaining = retryAt - now;
  if (!Number.isFinite(retryAt) || remaining <= 0) {
    apiRetryCooldowns.delete(normalized);
    removeStoredRetryAt(normalized);
    return 0;
  }
  apiRetryCooldowns.set(normalized, retryAt);
  return Math.min(remaining, MAX_RETRY_AFTER_MS);
}

export function clearApiRetryCooldown(key) {
  const normalized = normalizeCooldownKey(key);
  if (normalized) {
    apiRetryCooldowns.delete(normalized);
    removeStoredRetryAt(normalized);
  }
}

export function createApiRetryCooldownError(key, fallbackMessage, retryAfterMs) {
  const delayMs = Math.min(Math.max(0, Number(retryAfterMs) || 0), MAX_RETRY_AFTER_MS);
  const error = new Error(fallbackMessage || "Request temporarily unavailable. Please retry shortly.");
  error.status = 503;
  error.code = "API_RETRY_COOLDOWN";
  error.retryable = true;
  error.retryAfter = String(Math.ceil(delayMs / 1000));
  error.retryAfterMs = delayMs;
  error.localCooldown = true;
  error.cooldownKey = key;
  return error;
}

export function throwIfApiRetryCooldownActive(key, fallbackMessage = "Request temporarily unavailable. Please retry shortly.") {
  const remainingMs = getApiRetryCooldownMs(key);
  if (remainingMs > 0) {
    throw createApiRetryCooldownError(key, fallbackMessage, remainingMs);
  }
}

export function rememberApiRetryCooldown(key, error, fallbackMs = 30000) {
  const normalized = normalizeCooldownKey(key);
  if (!normalized || !isRetryableApiError(error)) return 0;
  const delayMs = getRetryDelayMs(error, fallbackMs);
  if (delayMs > 0) {
    const retryAt = Date.now() + delayMs;
    apiRetryCooldowns.set(normalized, retryAt);
    writeStoredRetryAt(normalized, retryAt);
  }
  return delayMs;
}

export async function withApiRetryCooldown(
  key,
  fallbackMessage,
  task,
  { fallbackMs = 30000 } = {}
) {
  throwIfApiRetryCooldownActive(key, fallbackMessage);
  try {
    const result = await task();
    clearApiRetryCooldown(key);
    return result;
  } catch (error) {
    rememberApiRetryCooldown(key, error, fallbackMs);
    throw error;
  }
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
