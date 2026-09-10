// src/lib/billing.js
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BACKEND_URL } from "../config";
import {
  getRetryDelayMs,
  isRetryableApiError,
  NexusApiError,
  readJsonResponse,
  withApiRetryCooldown,
  throwIfApiRetryCooldownActive,
  rememberApiRetryCooldown,
  clearApiRetryCooldown,
  parseRetryAfterMs,
} from "./apiErrors";
import { getProductAnalyticsHeaders } from "./productAnalytics";
import { getFirebaseAppCheckHeaders } from "./appCheck";

const API_ORIGIN = BACKEND_URL;
const TIMEZONE_SUCCESS_THROTTLE_MS = 12 * 60 * 60 * 1000;
const TIMEZONE_RETRY_THROTTLE_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 2 * 60 * 1000;

let authInitPromise = null;
let forcedTokenRefreshPromise = null;
let forcedTokenRefreshUid = null;
const billingRequestKeys = new Map();
const BILLING_REQUEST_KEY_TTL_MS = 30 * 60 * 1000;
const BILLING_REQUEST_STORAGE_PREFIX = "nexus:billing-request:";

function waitForAuthInit() {
  const auth = getAuth();
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        resolve(user);
      });
    });
  }
  return authInitPromise;
}

function tokenNeedsRefresh(user) {
  const expirationTime = Number(user?.stsTokenManager?.expirationTime || 0);
  return expirationTime > 0 && expirationTime <= Date.now() + TOKEN_REFRESH_SKEW_MS;
}

function forceRefreshIdToken(user) {
  const uid = String(user?.uid || "");
  if (forcedTokenRefreshPromise && forcedTokenRefreshUid === uid) {
    return forcedTokenRefreshPromise;
  }
  const refresh = Promise.resolve().then(() => user.getIdToken(true));
  forcedTokenRefreshUid = uid;
  const wrappedRefresh = refresh.finally(() => {
    if (forcedTokenRefreshPromise === wrappedRefresh) {
      forcedTokenRefreshPromise = null;
      forcedTokenRefreshUid = null;
    }
  });
  forcedTokenRefreshPromise = wrappedRefresh;
  return forcedTokenRefreshPromise;
}

async function getIdToken({ force = false } = {}) {
  const user = getAuth().currentUser || (await waitForAuthInit());
  if (!user) {
    throw new NexusApiError("Sign in is required.", {
      status: 401,
      code: "AUTH_REQUIRED",
      kind: "authentication",
      retryable: false,
    });
  }
  if (force || tokenNeedsRefresh(user)) return forceRefreshIdToken(user);
  return user.getIdToken(false);
}

function readStoredNumber(key) {
  try {
    const value = window.localStorage.getItem(key);
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  } catch (_) {
    return null;
  }
}

function writeStoredNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch (_) {
    /* best effort */
  }
}

function removeStoredValue(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (_) {
    /* best effort */
  }
}

function randomRequestId() {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  if (typeof window !== "undefined" && typeof window.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function clientDeploymentVersion() {
  const value = process.env.REACT_APP_DEPLOYMENT_VERSION
    || process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA
    || process.env.REACT_APP_GIT_SHA
    || "unknown";
  const text = String(value).trim();
  return /^[a-zA-Z0-9._:-]{1,96}$/.test(text) ? text : "unknown";
}

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const target = String(name).toLowerCase();
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
  return entry?.[1] || null;
}

function authenticatedHeaders(initHeaders, token, appCheckHeaders, requestId) {
  return {
    Accept: "application/json",
    ...getProductAnalyticsHeaders(),
    ...(initHeaders || {}),
    ...appCheckHeaders,
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-cache, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Request-ID": requestId,
    "X-Nexus-Client-Deployment": clientDeploymentVersion(),
  };
}

export function isNexusApiUrl(url, apiOrigin = API_ORIGIN) {
  try {
    return new URL(url, apiOrigin).origin === new URL(apiOrigin).origin;
  } catch (_) {
    return false;
  }
}

export function assertSafeNexusApiRequestUrl(url, apiOrigin = API_ORIGIN) {
  const target = new URL(url, apiOrigin);
  const pathSegments = target.pathname.split("/").map((segment) => {
    try {
      return decodeURIComponent(segment).toLowerCase();
    } catch (_) {
      return segment.toLowerCase();
    }
  });
  if (
    isNexusApiUrl(target, apiOrigin) &&
    pathSegments.includes("nofilter")
  ) {
    throw new NexusApiError(
      `Blocked malformed first-party API path: ${target.pathname}`,
      {
        status: 400,
        code: "MALFORMED_API_PATH",
        kind: "client_configuration",
        retryable: false,
      }
    );
  }
  return target;
}

function billingRequestKey(scope, body) {
  const fingerprint = `${scope}:${JSON.stringify(body || {})}`;
  const now = Date.now();
  const existing = billingRequestKeys.get(fingerprint);
  if (existing && existing.expiresAt > now) return existing.key;

  const storageKey = `${BILLING_REQUEST_STORAGE_PREFIX}${encodeURIComponent(fingerprint)}`;
  try {
    const persisted = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
    if (persisted?.key && persisted.expiresAt > now) {
      billingRequestKeys.set(fingerprint, persisted);
      return persisted.key;
    }
    window.sessionStorage.removeItem(storageKey);
  } catch (_) {
    // Session storage is only a retry aid; checkout remains safe without it.
  }

  const key = `${scope}-${randomRequestId()}`;
  const entry = { key, expiresAt: now + BILLING_REQUEST_KEY_TTL_MS };
  billingRequestKeys.set(fingerprint, entry);
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(entry));
  } catch (_) {
    // Private browsing or storage restrictions must not block an authorized checkout.
  }
  for (const [storedFingerprint, value] of billingRequestKeys) {
    if (value.expiresAt <= now) billingRequestKeys.delete(storedFingerprint);
  }
  return key;
}

function timezoneStorageKey(uid, timezone, suffix) {
  const safeUid = encodeURIComponent(uid || "anonymous");
  const safeTimezone = encodeURIComponent(timezone || "unknown");
  return `nexus:timezone:${safeUid}:${safeTimezone}:${suffix}`;
}

// Core authed fetch. Adds Bearer token, disables caches, retries once on 401.
export async function authedFetch(path, init = {}) {
  const { noCache = false, ...requestInit } = init;
  const url = assertSafeNexusApiRequestUrl(path);
  if (noCache) url.searchParams.set("t", String(Date.now()));

  // Absolute and protocol-relative URLs can escape the configured API origin.
  // Forward them without Nexus auth, App Check, deployment, or analytics
  // headers so a future caller cannot leak Nexus credentials to a third party.
  if (!isNexusApiUrl(url)) {
    return fetch(url.toString(), {
      ...requestInit,
      method: requestInit.method || "GET",
      headers: requestInit.headers,
    });
  }

  // Avoid dispatching first-party requests that the browser already knows
  // cannot succeed. Besides returning a clearer typed error to callers, this
  // prevents high-frequency polling from flooding Safari's console while the
  // device is offline. Pollers can retry normally after the `online` event or
  // their next scheduled tick.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new NexusApiError("The internet connection appears to be offline.", {
      status: 0,
      code: "NETWORK_OFFLINE",
      kind: "network",
      retryable: true,
      retryAfterMs: 30_000,
    });
  }

  let token = await getIdToken({ force: false });
  // Share a bounded cooldown between polling consumers of the same read.
  // Never replay mutations, and never share a private response across users.
  const readOnly = ["GET", "HEAD"].includes(String(requestInit.method || "GET").toUpperCase());
  const cooldownUrl = new URL(url);
  cooldownUrl.searchParams.delete("t");
  cooldownUrl.searchParams.sort();
  const cooldownKey = readOnly ? `api-read:${getAuth().currentUser?.uid || "anonymous"}:${cooldownUrl}` : null;
  if (cooldownKey) throwIfApiRetryCooldownActive(cooldownKey, "The server is temporarily unavailable. Reconnecting shortly.");
  let appCheckHeaders = await getFirebaseAppCheckHeaders();
  const requestId = headerValue(requestInit.headers, "X-Request-ID") || randomRequestId();

  let res = await fetch(url.toString(), {
    ...requestInit,
    method: requestInit.method || "GET",
    mode: "cors",
    credentials: "include",
    cache: "no-store",
    headers: authenticatedHeaders(requestInit.headers, token, appCheckHeaders, requestId),
  });

  // Retry once if token expired
  if (res.status === 401) {
    token = await getIdToken({ force: true });
    appCheckHeaders = await getFirebaseAppCheckHeaders();
    res = await fetch(url.toString(), {
      ...requestInit,
      method: requestInit.method || "GET",
      mode: "cors",
      credentials: "include",
      cache: "no-store",
      headers: authenticatedHeaders(requestInit.headers, token, appCheckHeaders, requestId),
    });
  }

  if (cooldownKey) {
    if ([500, 502, 503, 504].includes(res.status)) {
      const retryAfterMs = parseRetryAfterMs(res.headers?.get?.("Retry-After")) ?? 30_000;
      rememberApiRetryCooldown(cooldownKey, new NexusApiError("The server is temporarily unavailable.", {
        status: res.status, retryable: true, retryAfterMs,
      }));
    } else if (res.ok) clearApiRetryCooldown(cooldownKey);
  }
  return res;
}

// ALWAYS default to noCache; force-refresh the token if caller asked noCache
export async function getEntitlements({ noCache = true } = {}) {
  return withApiRetryCooldown("billing:entitlements", "Billing is temporarily unavailable.", async () => {
    // If caller wants a fresh read (e.g., right after checkout), refresh the token once.
    if (noCache) await getIdToken({ force: true });

    const r = await authedFetch("/api/billing/entitlements", {
      method: "GET",
      noCache,
      headers: { Accept: "application/json" },
    });

    if (r.status === 304) return {}; // caller can ignore if unchanged

    const contentType = r.headers.get("content-type") || "";
    if (!r.ok) {
      await readJsonResponse(r, `entitlements ${r.status}`);
    }
    if (!contentType.includes("application/json")) {
      const text = await r.text().catch(() => "");
      throw new Error(`entitlements: Expected JSON but got: ${text}`);
    }
    return r.json();
  });
}

export { dollarsFromMicros, resolveUsagePercent, normalizePlanKey, isStarterPlan, isPremiumPlan, isSubscriberPlan, isStarterOrAbove, summarizeEntitlements } from "./billingSummary";

export async function submitBrowserTimezone(timezone) {
  if (!timezone) return null;
  const user = getAuth().currentUser || (await waitForAuthInit());
  if (!user) return null;

  const now = Date.now();
  const successKey = timezoneStorageKey(user.uid, timezone, "sentAt");
  const retryKey = timezoneStorageKey(user.uid, timezone, "retryAfter");
  const retryAfter = readStoredNumber(retryKey);
  if (retryAfter && retryAfter > now) return null;

  const lastSuccess = readStoredNumber(successKey);
  if (lastSuccess && now - lastSuccess < TIMEZONE_SUCCESS_THROTTLE_MS) return null;

  try {
    const r = await authedFetch("/api/billing/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });
    const data = await readJsonResponse(r, "Failed to submit browser timezone");
    writeStoredNumber(successKey, now);
    removeStoredValue(retryKey);
    return data;
  } catch (err) {
    if (isRetryableApiError(err)) {
      writeStoredNumber(retryKey, now + getRetryDelayMs(err, TIMEZONE_RETRY_THROTTLE_MS));
    }
    return null;
  }
}

async function postCheckout(body) {
  const idempotencyKey = billingRequestKey("checkout", body);
  const r = await authedFetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const payload = await r.json().catch(async () => ({ error: await r.text().catch(() => "") }));
    const err = new Error(payload?.error || `checkout ${r.status}`);
    err.code = payload?.code || null;
    err.status = r.status;
    throw err;
  }
  return r.json().catch(() => ({})); // {url} OR {sessionDocPath}
}

export async function startSubscriptionCheckout({ plan, interval, seatCount, teamId } = {}) {
  if (!plan) throw new Error("Missing plan");
  if (!["month", "year"].includes(interval)) throw new Error("Invalid billing interval");
  return postCheckout({ catalogVersion: "v2", purchaseType: "subscription", plan, interval,
    ...(plan === "TEAM" ? { seatCount, teamId } : {}) });
}

export async function startCreditPackCheckout({ creditPack, teamId } = {}) {
  return postCheckout({ catalogVersion: "v2", purchaseType: "credits", creditPack, ...(teamId ? { teamId } : {}) });
}

export async function startPremiumBalanceCheckout({ packageKey, teamId } = {}) {
  if (!packageKey) throw new Error("Missing Premium Balance package");
  return postCheckout({ mode: "payment", package: packageKey, ...(teamId ? { teamId } : {}) });
}

export async function startCheckout(firstArg, mode = "subscription", thirdArg) {
  if (typeof firstArg === "object" && firstArg !== null) return postCheckout(firstArg);
  if (mode === "subscription") {
    return startSubscriptionCheckout({
      plan: firstArg,
      interval: thirdArg || "month",
    });
  }
  return startPremiumBalanceCheckout({ packageKey: firstArg });
}

export async function openPortal() {
  const r = await authedFetch("/api/portal", {
    method: "POST",
    headers: { "Idempotency-Key": billingRequestKey("portal", {}) },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`portal ${r.status}: ${text}`);
  }
  // IMPORTANT: do NOT redirect here. Let the page decide.
  return r.json().catch(() => ({})); // {url} or {portalDocPath}
}

export async function cancelSubscription() {
  const r = await authedFetch("/api/billing/cancel", { method: "POST" });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`cancel ${r.status}: ${text}`);
  }
  return r.json();
}

export async function consumeTokens(payload) {
  const r = await authedFetch("/api/billing/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`consume ${r.status}: ${text}`);
  }
  return r.json().catch(() => ({}));
}
