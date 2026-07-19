import { authedFetch } from "./billing";

const ASSET_PLATFORM_BASE = "/api/asset-platform";

function featureEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export const ASSET_PLATFORM_READS_ENABLED = featureEnabled(process.env.REACT_APP_ASSET_PLATFORM_READS_ENABLED);
export const ASSET_PLATFORM_WRITES_ENABLED = ASSET_PLATFORM_READS_ENABLED
  && featureEnabled(process.env.REACT_APP_ASSET_PLATFORM_WRITES_ENABLED);

const SAFE_ERROR_MESSAGES = {
  AUTH_REQUIRED: "Sign in to use the asset workspace.",
  FORBIDDEN: "You do not have access to this asset or project.",
  NOT_FOUND: "This asset could not be found.",
  VALIDATION_FAILED: "The asset did not pass validation. Review the brief and try again.",
  CAPABILITY_UNSUPPORTED: "This Roblox capability is not available for the selected creator.",
  IMAGE_GENERATION_FAILED: "Image generation failed. Your brief is still here so you can retry.",
  ASSET_UPLOAD_FAILED: "The Nexus asset was saved, but Roblox upload failed. You can retry the upload.",
  MODERATION_PENDING: "Roblox is still reviewing this asset.",
  MODERATION_REJECTED: "Roblox rejected this asset. Create a replacement with a revised brief.",
  RATE_LIMITED: "Too many asset requests are in progress. Wait a moment and try again.",
  OPERATION_CONFLICT: "This asset is already being updated. Refresh its status before trying again.",
  ASSET_PLATFORM_DISABLED: "The Nexus asset platform is not enabled for this environment.",
  ASSET_PLATFORM_WRITES_DISABLED: "Asset generation and Roblox writes are not enabled for this environment.",
};

function firstString(...values) {
  const value = values.find((entry) => (
    (typeof entry === "string" && entry.trim())
    || (typeof entry === "number" && Number.isFinite(entry))
  ));
  return value === undefined || value === null ? "" : String(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstUrl(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") {
      const nested = value.url || value.signedUrl || value.downloadUrl || value.previewUrl;
      if (typeof nested === "string" && nested.trim()) return nested;
    }
  }
  return "";
}

function latestRobloxRelationship(asset) {
  const relationships = asArray(asset?.robloxRelationships || asset?.relationships?.roblox || asset?.relationships);
  if (!relationships.length) return null;
  return [...relationships].sort((a, b) => {
    const aTime = Date.parse(a?.updatedAt || a?.createdAt || 0) || 0;
    const bTime = Date.parse(b?.updatedAt || b?.createdAt || 0) || 0;
    return bTime - aTime;
  })[0];
}

export function normalizeAsset(rawAsset = {}) {
  const asset = rawAsset?.asset || rawAsset;
  const relationship = latestRobloxRelationship(asset);
  const files = asArray(asset?.files || asset?.storageObjects || asset?.fileRefs);
  const previewFile = files.find((file) => ["preview", "thumbnail", "image", "primary"].includes(file?.role));
  const moderation = asset?.moderation && typeof asset.moderation === "object"
    ? asset.moderation
    : {};
  const generation = asset?.generation && typeof asset.generation === "object"
    ? asset.generation
    : {};
  const usage = asset?.usage && typeof asset.usage === "object" ? asset.usage : {};

  return {
    ...asset,
    assetId: firstString(asset?.assetId, asset?.nexusAssetId, asset?.nexusId, asset?.id),
    robloxAssetId: firstString(asset?.robloxAssetId, relationship?.robloxAssetId, relationship?.assetId),
    name: firstString(asset?.name, asset?.displayName, generation?.name) || "Untitled asset",
    kind: firstString(asset?.kind, asset?.assetKind, asset?.type) || "icon",
    lifecycle: firstString(asset?.lifecycle, asset?.status) || "draft",
    generationStatus: firstString(asset?.generationStatus, generation?.status),
    uploadStatus: firstString(asset?.uploadStatus, relationship?.uploadStatus, relationship?.lifecycle),
    moderation: {
      ...moderation,
      state: firstString(moderation?.state, asset?.moderationState, relationship?.moderationState),
    },
    usage: {
      ...usage,
      state: firstString(usage?.state, asset?.usageState) || "unused",
    },
    previewUrl: firstUrl(
      asset?.previewUrl,
      asset?.thumbnailUrl,
      asset?.imageUrl,
      asset?.storage?.preview,
      asset?.storage?.primary,
      previewFile
    ),
    prompt: firstString(generation?.prompt, asset?.prompt, asset?.generationPrompt),
    packId: firstString(asset?.packId, asset?.iconPackId),
    styleProfileId: firstString(asset?.styleProfileId, generation?.styleProfileId),
    sourceProjectId: firstString(asset?.sourceProjectId, asset?.projectId),
    universeId: firstString(asset?.universeId),
    visibility: firstString(asset?.visibility) || "project",
    relatedFileRefs: asArray(asset?.relatedFileRefs || asset?.relatedFiles),
    relatedUiElements: asArray(asset?.relatedUiElements || asset?.uiElements),
    supersedesAssetId: firstString(asset?.supersedesAssetId),
    replacedByAssetId: firstString(asset?.replacedByAssetId),
    createdAt: asset?.createdAt || generation?.createdAt || null,
    updatedAt: asset?.updatedAt || relationship?.updatedAt || null,
    robloxRelationship: relationship,
  };
}

export function normalizePack(rawPack = {}) {
  const pack = rawPack?.pack || rawPack;
  const assets = asArray(pack?.assets || pack?.items).map(normalizeAsset);
  return {
    ...pack,
    packId: firstString(pack?.packId, pack?.id),
    name: firstString(pack?.name, pack?.title) || "Untitled pack",
    projectId: firstString(pack?.projectId, pack?.sourceProjectId),
    universeId: firstString(pack?.universeId),
    lifecycle: firstString(pack?.lifecycle, pack?.status) || "draft",
    requestedCount: Number(pack?.requestedCount || pack?.count || assets.length || 0),
    softDefaultCount: Number(pack?.softDefaultCount || 8),
    iconAssetIds: asArray(pack?.iconAssetIds || pack?.assetIds),
    styleProfileId: firstString(pack?.styleProfileId),
    generationBrief: pack?.generationBrief || pack?.brief || {},
    assets,
    createdAt: pack?.createdAt || null,
    updatedAt: pack?.updatedAt || null,
  };
}

export function normalizeStyleProfile(rawProfile = {}) {
  const profile = rawProfile?.styleProfile || rawProfile;
  return {
    ...profile,
    styleProfileId: firstString(profile?.styleProfileId, profile?.id),
    name: firstString(profile?.name, profile?.title) || "Project style",
    promptDirectives: asArray(profile?.promptDirectives || profile?.directives),
    negativeDirectives: asArray(profile?.negativeDirectives),
    palette: asArray(profile?.palette || profile?.colors),
    transparencyRequired: Boolean(profile?.transparencyRequired),
  };
}

async function readResponse(response, fallbackMessage) {
  const text = await response.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(fallbackMessage);
    error.status = response.status;
    error.code = data?.code || data?.error?.code || null;
    error.summary = data?.summary
      || data?.error?.summary
      || (typeof data?.error === "string" ? data.error : null);
    error.requestId = data?.requestId || data?.error?.requestId || response.headers?.get?.("x-request-id") || null;
    error.retryable = typeof data?.retryable === "boolean" ? data.retryable : null;
    error.recovery = data?.recovery || null;
    error.details = data?.details || null;
    throw error;
  }

  return data || {};
}

async function request(path, { method = "GET", body, headers, ...init } = {}, fallbackMessage = "The asset request could not be completed.") {
  const normalizedMethod = String(method || "GET").toUpperCase();
  if (!ASSET_PLATFORM_READS_ENABLED) {
    const error = new Error(SAFE_ERROR_MESSAGES.ASSET_PLATFORM_DISABLED);
    error.status = 404;
    error.code = "ASSET_PLATFORM_DISABLED";
    error.summary = SAFE_ERROR_MESSAGES.ASSET_PLATFORM_DISABLED;
    throw error;
  }
  if (normalizedMethod !== "GET" && !ASSET_PLATFORM_WRITES_ENABLED) {
    const error = new Error(SAFE_ERROR_MESSAGES.ASSET_PLATFORM_WRITES_DISABLED);
    error.status = 404;
    error.code = "ASSET_PLATFORM_WRITES_DISABLED";
    error.summary = SAFE_ERROR_MESSAGES.ASSET_PLATFORM_WRITES_DISABLED;
    throw error;
  }
  const response = await authedFetch(`${ASSET_PLATFORM_BASE}${path}`, {
    method: normalizedMethod,
    noCache: normalizedMethod === "GET",
    headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
  return readResponse(response, fallbackMessage);
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(","));
      return;
    }
    query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function idPath(id) {
  return encodeURIComponent(String(id || ""));
}

export function createAssetOperationKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatAssetPlatformError(error, fallback = "The asset request could not be completed.") {
  const code = error?.code || "";
  let message = SAFE_ERROR_MESSAGES[code];
  if (!message && error?.status === 401) message = SAFE_ERROR_MESSAGES.AUTH_REQUIRED;
  if (!message && error?.status === 403) message = SAFE_ERROR_MESSAGES.FORBIDDEN;
  if (!message && error?.status === 404) message = SAFE_ERROR_MESSAGES.NOT_FOUND;
  if (!message && error?.status === 429) message = SAFE_ERROR_MESSAGES.RATE_LIMITED;
  if (!message) message = error?.summary || fallback;
  return error?.requestId ? `${message} Support ID: ${error.requestId}` : message;
}

export async function getAssetPlatformContext({ projectId = "" } = {}) {
  return request(withQuery("/context", { projectId }), {}, "Asset context could not be loaded.");
}

export async function listAssets(params = {}) {
  const data = await request(withQuery("/assets", params), {}, "Assets could not be loaded.");
  const items = data.assets || data.items || data.results || [];
  return { ...data, assets: asArray(items).map(normalizeAsset) };
}

export async function getAsset(assetId) {
  const data = await request(`/assets/${idPath(assetId)}`, {}, "Asset details could not be loaded.");
  return { ...data, asset: normalizeAsset(data.asset || data) };
}

export async function listAssetPacks(params = {}) {
  const data = await request(withQuery("/packs", params), {}, "Asset packs could not be loaded.");
  const items = data.packs || data.items || data.results || [];
  return { ...data, packs: asArray(items).map(normalizePack) };
}

export async function getAssetPack(packId) {
  const data = await request(`/packs/${idPath(packId)}`, {}, "The asset pack could not be loaded.");
  return { ...data, pack: normalizePack(data.pack || data) };
}

export async function listStyleProfiles(params = {}) {
  const data = await request(withQuery("/style-profiles", params), {}, "Style profiles could not be loaded.");
  const items = data.styleProfiles || data.profiles || data.items || [];
  return { ...data, styleProfiles: asArray(items).map(normalizeStyleProfile) };
}

export async function generateAssets(payload) {
  const data = await request("/operations/generate", { method: "POST", body: payload }, "Asset generation could not be started.");
  return {
    ...data,
    operationId: firstString(data.operationId, data.operation?.operationId, data.operation?.id),
    assets: asArray(data.assets || data.operation?.assets).map(normalizeAsset),
    pack: data.pack ? normalizePack(data.pack) : null,
  };
}

export async function getAssetOperation(operationId) {
  const data = await request(`/operations/${idPath(operationId)}`, {}, "Asset progress could not be refreshed.");
  return {
    ...data,
    operation: data.operation || data,
    assets: asArray(data.assets || data.operation?.assets).map(normalizeAsset),
    pack: data.pack ? normalizePack(data.pack) : null,
  };
}

export function extendAssetPack(packId, payload) {
  return request(`/packs/${idPath(packId)}/extend`, { method: "POST", body: payload }, "The pack could not be extended.");
}

export function generateSimilarAsset(assetId, payload) {
  return request(`/assets/${idPath(assetId)}/similar`, { method: "POST", body: payload }, "A similar asset could not be started.");
}

export function replaceAsset(assetId, payload) {
  return request(`/assets/${idPath(assetId)}/replace`, { method: "POST", body: payload }, "A replacement could not be started.");
}

export function retryAssetUpload(assetId) {
  return request(`/assets/${idPath(assetId)}/retry-upload`, { method: "POST" }, "Roblox upload could not be retried.");
}

export function pollAssetStatus(assetId) {
  return request(`/assets/${idPath(assetId)}/poll`, { method: "POST" }, "Roblox status could not be refreshed.");
}

export function updateAssetVisibility(assetId, visibility) {
  return request(`/assets/${idPath(assetId)}/visibility`, {
    method: "POST",
    body: { visibility },
  }, "Asset visibility could not be updated.");
}
