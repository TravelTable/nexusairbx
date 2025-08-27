// src/lib/billing.js
import { getAuth } from "firebase/auth";
console.log("REACT_APP_API_ORIGIN:", process.env.REACT_APP_API_ORIGIN);

// Works with Vite, CRA, Next, or a window-injected env.
const API_ORIGIN = "https://nexusrbx-backend-production.up.railway.app";
console.log("DEBUG API_ORIGIN:", API_ORIGIN);

function buildUrl(path) {
  return new URL(path, API_ORIGIN).toString();
}

async function getToken() {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user.getIdToken();
}

export async function authedFetch(path, init = {}) {
  let token = await getToken();
  let res = await fetch(buildUrl(path), {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (res.status === 401) {
    const user = getAuth().currentUser;
    if (!user) throw new Error("Not signed in");
    await user.getIdToken(true);
    token = await user.getIdToken();
    res = await fetch(buildUrl(path), {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
      credentials: "include",
    });
  }
  return res;
}

export async function getEntitlements() {
  const r = await authedFetch("/api/billing/entitlements", { method: "GET" });
  if (r.status === 304) {
    // No new data, handle as needed (return null, cached, or throw)
    throw new Error("entitlements: Not modified (304) - no new data available.");
  }
  const contentType = r.headers.get("content-type") || "";
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`entitlements ${r.status}: ${text}`);
  }
  if (!contentType.includes("application/json")) {
    const text = await r.text();
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
  const j = await r.json().catch(() => ({}));
  if (j?.url) window.location.href = j.url;
  return j;
}

export async function openPortal() {
  const r = await authedFetch("/api/portal", { method: "POST" });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`portal ${r.status}: ${text}`);
  }
  const j = await r.json().catch(() => ({}));
  if (j?.url) window.location.href = j.url;
  return j;
}
