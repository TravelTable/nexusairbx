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
    const error = new Error(data?.error || data?.summary || text || fallbackMessage);
    error.status = res.status;
    error.code = data?.code || null;
    error.recovery = data?.recovery || null;
    error.details = data?.details || null;
    error.requestId = data?.requestId || null;
    error.missingScopes = Array.isArray(data?.missingScopes) ? data.missingScopes : [];
    error.retryable = typeof data?.retryable === "boolean" ? data.retryable : null;
    throw error;
  }
  return data || {};
}

export async function listRobloxAssets({ source = "my", search = "", assetTypes = [], sort = "recently_updated", cursor = "", pageSize = 24 } = {}) {
  const params = new URLSearchParams();
  params.set("source", source);
  if (search) params.set("search", search);
  if (Array.isArray(assetTypes) && assetTypes.length) params.set("assetTypes", assetTypes.join(","));
  if (sort) params.set("sort", sort);
  if (cursor) params.set("cursor", cursor);
  if (pageSize) params.set("pageSize", String(pageSize));
  const res = await authedFetch(`/api/roblox/assets?${params.toString()}`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox assets");
}

export async function getRobloxAsset(assetId) {
  const id = encodeURIComponent(String(assetId || ""));
  const res = await authedFetch(`/api/roblox/assets/${id}`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox asset");
}

export async function getRobloxAssetPreview(assetId) {
  const id = encodeURIComponent(String(assetId || ""));
  const res = await authedFetch(`/api/roblox/assets/${id}/preview`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load Roblox asset preview");
}

export async function listProjectAssets(projectId) {
  const id = encodeURIComponent(String(projectId || ""));
  const res = await authedFetch(`/api/projects/${id}/assets`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load project assets");
}

export async function attachProjectAssets(projectId, assets) {
  const id = encodeURIComponent(String(projectId || ""));
  const res = await authedFetch(`/api/projects/${id}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assets }),
  });
  return readJson(res, "Failed to attach project assets");
}

export async function removeProjectAsset(projectId, assetId) {
  const id = encodeURIComponent(String(projectId || ""));
  const asset = encodeURIComponent(String(assetId || ""));
  const res = await authedFetch(`/api/projects/${id}/assets/${asset}`, { method: "DELETE" });
  return readJson(res, "Failed to remove project asset");
}

export async function getProjectAssetUploadSettings(projectId) {
  const id = encodeURIComponent(String(projectId || ""));
  const res = await authedFetch(`/api/projects/${id}/asset-upload-settings`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load generated asset upload settings");
}

export async function setProjectAssetUploadSettings(projectId, enabled) {
  const id = encodeURIComponent(String(projectId || ""));
  const res = await authedFetch(`/api/projects/${id}/asset-upload-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: Boolean(enabled) }),
  });
  return readJson(res, "Failed to update generated asset upload settings");
}

export async function listGeneratedProjectAssets(projectId) {
  const id = encodeURIComponent(String(projectId || ""));
  const res = await authedFetch(`/api/projects/${id}/generated-assets`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load generated assets");
}

export async function getGeneratedAssetUploadStatus(projectId) {
  const id = encodeURIComponent(String(projectId || ""));
  const res = await authedFetch(`/api/projects/${id}/generated-assets/upload-status`, { method: "GET", noCache: true });
  return readJson(res, "Failed to load upload status");
}

export async function retryGeneratedAssetUpload(projectId, generatedAssetId) {
  const id = encodeURIComponent(String(projectId || ""));
  const generatedId = encodeURIComponent(String(generatedAssetId || ""));
  const res = await authedFetch(`/api/projects/${id}/generated-assets/${generatedId}/retry`, { method: "POST" });
  return readJson(res, "Failed to retry generated asset upload");
}
