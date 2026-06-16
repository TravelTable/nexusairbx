import { authedFetch } from "./billing";

async function readJsonOrThrow(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) throw new Error(data?.error || text || fallbackMessage);
  return data || {};
}

export async function getRobloxOAuthStatus() {
  const res = await authedFetch("/api/roblox/oauth/status", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load Roblox connection");
}

export async function startRobloxOAuth({ bundles = ["core"], returnPath = "/settings?tab=roblox", forceConsent = false } = {}) {
  const res = await authedFetch("/api/roblox/oauth/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundles, returnPath, forceConsent }),
  });
  return readJsonOrThrow(res, "Failed to start Roblox authorization");
}

export async function reauthorizeRoblox({ bundles = ["core"], returnPath = "/settings?tab=roblox" } = {}) {
  const res = await authedFetch("/api/roblox/oauth/reauthorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundles, returnPath }),
  });
  return readJsonOrThrow(res, "Failed to start Roblox reauthorization");
}

export async function disconnectRobloxOAuth() {
  const res = await authedFetch("/api/roblox/oauth/disconnect", { method: "POST" });
  return readJsonOrThrow(res, "Failed to disconnect Roblox");
}

export async function setRobloxTargetCreator(creator) {
  const res = await authedFetch("/api/roblox/oauth/target-creator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creator }),
  });
  return readJsonOrThrow(res, "Failed to update Roblox creator target");
}

export async function getRobloxCapabilities() {
  const res = await authedFetch("/api/roblox/capabilities", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load Roblox capabilities");
}

export async function getRobloxOperations({ limit = 50 } = {}) {
  const res = await authedFetch(`/api/roblox/operations?limit=${encodeURIComponent(String(limit))}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Roblox operation history");
}

export async function beginRobloxOAuth(options) {
  const data = await startRobloxOAuth(options);
  if (data.authorizationUrl) window.location.assign(data.authorizationUrl);
  return data;
}

export async function beginRobloxReauthorization(options) {
  const data = await reauthorizeRoblox(options);
  if (data.authorizationUrl) window.location.assign(data.authorizationUrl);
  return data;
}
