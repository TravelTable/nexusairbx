// src/lib/billing.js
import { getAuth } from "firebase/auth";
import { BACKEND_URL } from "../config";
import { getProductAnalyticsHeaders } from "./productAnalytics";

const API_ORIGIN = BACKEND_URL;

async function getIdToken({ force = false } = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user.getIdToken(force);
}

// Core authed fetch. Adds Bearer token, disables caches, retries once on 401.
export async function authedFetch(path, init = {}) {
  const noCache = init.noCache === true;
  const url = new URL(path, API_ORIGIN);
  if (noCache) url.searchParams.set("t", String(Date.now()));

  let token = await getIdToken({ force: false });

  let res = await fetch(url.toString(), {
    ...init,
    method: init.method || "GET",
    mode: "cors",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...getProductAnalyticsHeaders(),
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });

  // Retry once if token expired
  if (res.status === 401) {
    token = await getIdToken({ force: true });
    res = await fetch(url.toString(), {
      ...init,
      method: init.method || "GET",
      mode: "cors",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...getProductAnalyticsHeaders(),
        ...(init.headers || {}),
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
    const text = await r.text().catch(() => "");
    throw new Error(`entitlements ${r.status}: ${text}`);
  }
  if (!contentType.includes("application/json")) {
    const text = await r.text().catch(() => "");
    throw new Error(`entitlements: Expected JSON but got: ${text}`);
  }
  return r.json();
}

export function isPremiumPlan(plan, entitlements = []) {
  const normalized = String(plan || "FREE").toUpperCase();
  if (normalized === "PRO" || normalized === "PRO_PLUS" || normalized === "TEAM") return true;
  const list = Array.isArray(entitlements) ? entitlements : [];
  return list.includes("pro") || list.includes("pro_plus") || list.includes("team");
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
    isPremium: isPremiumPlan(plan, e?.entitlements),
  };
}

export async function submitBrowserTimezone(timezone) {
  if (!timezone) return null;
  const r = await authedFetch("/api/billing/timezone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timezone }),
  });
  if (!r.ok) return null;
  return r.json().catch(() => null);
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
