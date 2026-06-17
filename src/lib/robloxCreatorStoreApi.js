import { authedFetch } from "./billing";

async function readJson(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(data?.error || text || fallbackMessage);
    error.status = res.status;
    error.code = data?.code || null;
    error.missingScopes = Array.isArray(data?.missingScopes) ? data.missingScopes : [];
    error.capability = data?.capability || null;
    error.retryAfter = res.headers?.get?.("Retry-After") || data?.retryAfter || null;
    throw error;
  }
  return data || {};
}

export async function searchCreatorStore({ query, assetTypes, pageSize = 20, cursor = null } = {}) {
  const res = await authedFetch("/api/roblox/creator-store/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, assetTypes, pageSize, cursor }),
  });
  return readJson(res, "Failed to search Creator Store");
}

export async function getCreatorStoreAsset(assetId) {
  const id = String(assetId || "").trim();
  const res = await authedFetch(`/api/roblox/creator-store/assets/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return readJson(res, "Failed to load Creator Store asset");
}
