// src/lib/billing.js
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BACKEND_URL } from "../config";
import { getRetryDelayMs, isRetryableApiError, readJsonResponse, withApiRetryCooldown } from "./apiErrors";
import { getProductAnalyticsHeaders } from "./productAnalytics";
import { getFirebaseAppCheckHeaders } from "./appCheck";

const API_ORIGIN = BACKEND_URL;
const TIMEZONE_SUCCESS_THROTTLE_MS = 12 * 60 * 60 * 1000;
const TIMEZONE_RETRY_THROTTLE_MS = 5 * 60 * 1000;

let authInitPromise = null;

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

async function getIdToken({ force = false } = {}) {
  const user = getAuth().currentUser || (await waitForAuthInit());
  if (!user) throw new Error("Not signed in");
  return user.getIdToken(force);
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

function timezoneStorageKey(uid, timezone, suffix) {
  const safeUid = encodeURIComponent(uid || "anonymous");
  const safeTimezone = encodeURIComponent(timezone || "unknown");
  return `nexus:timezone:${safeUid}:${safeTimezone}:${suffix}`;
}

// Core authed fetch. Adds Bearer token, disables caches, retries once on 401.
export async function authedFetch(path, init = {}) {
  const noCache = init.noCache === true;
  const url = new URL(path, API_ORIGIN);
  if (noCache) url.searchParams.set("t", String(Date.now()));

  let token = await getIdToken({ force: false });
  let appCheckHeaders = await getFirebaseAppCheckHeaders();

  let res = await fetch(url.toString(), {
    ...init,
    method: init.method || "GET",
    mode: "cors",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...getProductAnalyticsHeaders(),
      ...(init.headers || {}),
      ...appCheckHeaders,
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });

  // Retry once if token expired
  if (res.status === 401) {
    token = await getIdToken({ force: true });
    appCheckHeaders = await getFirebaseAppCheckHeaders();
    res = await fetch(url.toString(), {
      ...init,
      method: init.method || "GET",
      mode: "cors",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...getProductAnalyticsHeaders(),
        ...(init.headers || {}),
        ...appCheckHeaders,
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    });
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

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Format provider-cost micros as a USD string for Premium Balance display. */
export function dollarsFromMicros(micros) {
  const value = Math.max(0, Number(micros || 0)) / 1_000_000;
  return `$${value.toFixed(2)}`;
}

export function resolveUsagePercent({
  isFreeUsagePlan = false,
  dailyUsage = null,
  includedUsage = null,
  tokensLeft = null,
  tokensLimit = null,
  usageLoading = false,
} = {}) {
  if (usageLoading) return null;
  if (isFreeUsagePlan && dailyUsage?.percentUsed != null) {
    return clampPercent(dailyUsage.percentUsed);
  }
  if (includedUsage?.percentUsed != null) {
    return clampPercent(includedUsage.percentUsed);
  }
  if (typeof tokensLeft === "number" && typeof tokensLimit === "number" && tokensLimit > 0) {
    return clampPercent(((tokensLimit - tokensLeft) / tokensLimit) * 100);
  }
  if (isFreeUsagePlan && !dailyUsage) return null;
  return 0;
}

export function normalizePlanKey(plan) {
  return String(plan || "FREE").toUpperCase();
}

export function isStarterPlan(plan, entitlements = []) {
  const normalized = normalizePlanKey(plan);
  if (normalized === "STARTER") return true;
  const list = Array.isArray(entitlements) ? entitlements : [];
  return list.includes("starter");
}

export function isPremiumPlan(plan, entitlements = []) {
  const normalized = normalizePlanKey(plan);
  if (normalized === "PRO" || normalized === "PRO_PLUS" || normalized === "TEAM") return true;
  const list = Array.isArray(entitlements) ? entitlements : [];
  return list.includes("pro") || list.includes("pro_plus") || list.includes("team");
}

export function isSubscriberPlan(plan, entitlements = []) {
  return isStarterPlan(plan, entitlements) || isPremiumPlan(plan, entitlements);
}

export function isStarterOrAbove(plan, entitlements = []) {
  return isSubscriberPlan(plan, entitlements);
}

export function summarizeEntitlements(e) {
  const plan = e?.plan || "FREE";
  const cycle = e?.cycle || null;
  const limit = Number(e?.sub?.limit ?? 0);
  const used = Number(e?.sub?.used ?? 0);
  const paygRemaining = Math.max(0, Number(e?.payg?.remaining ?? 0));
  const flags = {
    isAdmin: Boolean(e?.flags?.isAdmin),
    unlimitedTokens: Boolean(e?.flags?.unlimitedTokens),
    devOverride: Boolean(e?.flags?.devOverride),
  };

  const subRemaining = Math.max(0, limit - used);
  return {
    plan,
    cycle,
    subRemaining,
    paygRemaining,
    totalRemaining: subRemaining + paygRemaining,
    resetsAt: e?.sub?.resetsAt ? new Date(e.sub.resetsAt) : null,
    subLimit: limit,
    isAdmin: flags.isAdmin,
    unlimitedTokens: flags.unlimitedTokens,
    devOverride: flags.devOverride,
    flags,
    entitlements: e?.entitlements || [],
    modelAccess: e?.modelAccess || null,
    subscription: e?.subscription || null,
    pricingVersion: e?.pricingVersion || "CURRENT",
    grandfathered: Boolean(e?.grandfathered),
    includedUsage: e?.includedUsage || null,
    premiumBalance: e?.premiumBalance || null,
    team: e?.team || null,
    dailyUsage: e?.dailyUsage || null,
    fairUse: e?.fairUse || null,
    limits: e?.limits || null,
    isFreeUsagePlan: plan === "FREE" || plan === "ANON",
    isStarter: isStarterPlan(plan, e?.entitlements),
    isSubscriber: isSubscriberPlan(plan, e?.entitlements),
    isStarterOrAbove: isStarterOrAbove(plan, e?.entitlements),
    isPremium: isPremiumPlan(plan, e?.entitlements),
    canUseAi: Boolean(e?.canUseAi) || isStarterOrAbove(plan, e?.entitlements),
  };
}

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
  const r = await authedFetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export async function startSubscriptionCheckout({ plan, interval, seatCount } = {}) {
  if (!plan) throw new Error("Missing plan");
  if (!["month", "year"].includes(interval)) throw new Error("Invalid billing interval");
  return postCheckout({ mode: "subscription", plan, interval, ...(seatCount ? { seatCount } : {}) });
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
  const r = await authedFetch("/api/portal", { method: "POST" });
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
