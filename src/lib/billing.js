// src/lib/billing.js
import { getAuth } from "firebase/auth";

// Backend origin (hardcoded OK if that’s your deploy)
const API_ORIGIN = "https://nexusrbx-backend-production.up.railway.app";

function buildUrl(path) {
  return new URL(path, API_ORIGIN).toString();
}

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
    credentials: "include",
    mode: "cors",
    cache: "no-store",
    headers: {
      Accept: "application/json",
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
      credentials: "include",
      mode: "cors",
      cache: "no-store",
      headers: {
        Accept: "application/json",
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

export function summarizeEntitlements(e) {
  const plan = e?.plan || "FREE";
  const cycle = e?.cycle || null;
  const limit = Number(e?.sub?.limit ?? 0);
  const used  = Number(e?.sub?.used ?? 0);
  const subRemaining = Math.max(0, limit - used);
  const paygRemaining = Math.max(0, Number(e?.payg?.remaining ?? 0));
  return {
    plan, cycle,
    subRemaining,
    paygRemaining,
    totalRemaining: subRemaining + paygRemaining,
    resetsAt: e?.sub?.resetsAt ? new Date(e.sub.resetsAt) : null,
  };
}

export async function startCheckout(priceId, mode = "subscription", topupTokens) {
  if (!priceId) throw new Error("Missing priceId");
  if (!["subscription", "payment"].includes(mode)) throw new Error("Invalid checkout mode");

  const user = getAuth().currentUser;
  const uid = user?.uid;
  const body = { priceId, mode, uid };
  if (topupTokens) body.topupTokens = topupTokens;

  const r = await authedFetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`checkout ${r.status}: ${text}`);
  }
  // IMPORTANT: do NOT redirect here. Let the page decide.
  return r.json().catch(() => ({})); // {url} OR {sessionDocPath}
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
