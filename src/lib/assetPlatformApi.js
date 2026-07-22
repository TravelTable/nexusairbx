import { authedFetch } from "./billing";

const ASSET_PLATFORM_BASE = "/api/asset-platform";

function featureEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export const ASSET_PLATFORM_READS_ENABLED = featureEnabled(process.env.REACT_APP_ASSET_PLATFORM_READS_ENABLED);
export const ASSET_PLATFORM_WRITES_ENABLED = ASSET_PLATFORM_READS_ENABLED
  && featureEnabled(process.env.REACT_APP_ASSET_PLATFORM_WRITES_ENABLED);

export const ASSET_PLATFORM_TOOL_NAMES = Object.freeze([
  "inspect_asset_capabilities",
  "list_authorized_creators",
  "search_project_assets",
  "get_asset_details",
  "generate_asset",
  "generate_asset_pack",
  "generate_asset_variation",
  "validate_asset",
  "publish_asset_to_roblox",
  "get_roblox_upload_status",
  "attach_asset_to_project",
  "implement_asset_in_studio",
  "verify_asset_in_studio",
  "create_game_pass",
  "update_game_pass",
  "create_developer_product",
  "update_developer_product",
  "archive_asset",
]);

const ASSET_PLATFORM_TOOL_NAME_SET = new Set(ASSET_PLATFORM_TOOL_NAMES);
const READ_ACTIONS = new Set([
  "inspect_asset_capabilities",
  "list_authorized_creators",
  "search_project_assets",
  "get_asset_details",
  "get_roblox_upload_status",
  "verify_asset_in_studio",
]);
const EXTERNAL_WRITE_ACTIONS = new Set([
  "publish_asset_to_roblox",
  "implement_asset_in_studio",
  "create_game_pass",
  "update_game_pass",
  "create_developer_product",
  "update_developer_product",
]);

const TOOL_INPUT_FIELDS = Object.freeze({
  inspect_asset_capabilities: ["projectId", "universeId", "assetType"],
  list_authorized_creators: ["projectId", "universeId"],
  search_project_assets: ["query", "projectId", "universeId", "filters", "limit"],
  get_asset_details: ["assetId", "projectId"],
  generate_asset: ["projectId", "prompt", "assetType", "style", "referenceAssetIds", "creatorTarget"],
  generate_asset_pack: ["projectId", "concepts", "count", "prompt", "packId", "style", "referenceAssetIds"],
  generate_asset_variation: ["assetId", "projectId", "prompt", "variationCount", "versionId", "failedChecks"],
  validate_asset: ["assetId", "versionId", "assetType", "requireTransparency"],
  publish_asset_to_roblox: ["assetId", "versionId", "projectId", "universeId", "creatorTarget"],
  get_roblox_upload_status: ["assetId", "operationId", "projectId"],
  attach_asset_to_project: ["assetId", "projectId", "role", "active"],
  implement_asset_in_studio: ["assetId", "references", "targets", "property", "expectedClassName"],
  verify_asset_in_studio: ["implementationId", "commandId", "references", "targets", "assetId"],
  create_game_pass: ["universeId", "priceRobux", "pricingConfirmed", "iconAssetId", "artworkVersionId", "name", "description"],
  update_game_pass: ["universeId", "gamePassId", "updates", "changeConfirmed"],
  create_developer_product: ["universeId", "name", "priceRobux", "pricingConfirmed", "description", "iconAssetId"],
  update_developer_product: ["universeId", "developerProductId", "updates", "changeConfirmed"],
  archive_asset: ["assetId", "projectId", "universeId"],
});

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
  ROBLOX_NOT_CONNECTED: "Connect Roblox before publishing this asset.",
  ROBLOX_REAUTH_REQUIRED: "Reconnect Roblox to restore asset publishing.",
  ROBLOX_SCOPE_MISSING: "Reconnect Roblox and grant the permission required for this operation.",
  ROBLOX_CREATOR_NOT_AUTHORIZED: "This Roblox creator has not been authorized for asset publishing.",
  ROBLOX_RESOURCE_NOT_AUTHORIZED: "Roblox has not authorized access to the selected experience or resource.",
  ASSET_TYPE_UNSUPPORTED: "Roblox does not support this asset type through the connected publishing API.",
  ASSET_VALIDATION_FAILED: "The asset did not meet Roblox file requirements. Review the validation details and try again.",
  ASSET_GENERATION_FAILED: "Asset generation failed. Your brief is still saved so you can retry.",
  ASSET_UPLOAD_REJECTED: "Roblox rejected this upload. Review the asset and creator permissions before retrying.",
  ASSET_PROCESSING_TIMEOUT: "Roblox is still processing this asset. NexusRBX will keep the operation available to resume.",
  ASSET_MODERATION_PENDING: "Roblox accepted the asset and is still reviewing it.",
  ASSET_MODERATION_FAILED: "Roblox moderation did not approve this asset. Create a revised replacement.",
  ASSET_DUPLICATE: "A matching asset already exists, so NexusRBX avoided another upload.",
  ASSET_ID_UNAVAILABLE: "Roblox has not returned a usable asset ID yet.",
  STUDIO_NOT_CONNECTED: "The asset is ready, but Roblox Studio is not connected.",
  STUDIO_ASSET_IMPLEMENTATION_FAILED: "The asset is ready, but Studio could not apply it to the intended instance.",
  STUDIO_ASSET_VERIFICATION_FAILED: "Studio changed the asset property, but verification did not match the expected Roblox ID.",
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

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeCapabilityActions(value) {
  if (Array.isArray(value)) {
    return Object.fromEntries(value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .map((name) => [name, true]));
  }
  return Object.fromEntries(Object.entries(asObject(value))
    .map(([name, enabled]) => [String(name), enabled === true]));
}

function fileList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([role, descriptor]) => (
    descriptor && typeof descriptor === "object" ? { role, ...descriptor } : { role, value: descriptor }
  ));
}

function fileByRole(files, roles) {
  for (const role of roles) {
    const match = files.find((file) => file?.role === role);
    if (match) return match;
  }
  return null;
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
  const files = fileList(asset?.files || asset?.storageObjects || asset?.fileRefs);
  const sourceFile = asObject(asset?.sourceFile || fileByRole(files, ["source", "master"]));
  const processedFile = asObject(asset?.processedFile || fileByRole(files, ["processed", "roblox_ready"]));
  const previewFile = fileByRole(
    files,
    ["preview", "thumbnail", "image", "primary", "processed", "roblox_ready", "master"]
  );
  const moderation = asset?.moderation && typeof asset.moderation === "object"
    ? asset.moderation
    : {};
  const generation = asset?.generation && typeof asset.generation === "object"
    ? asset.generation
    : {};
  const usageEntries = Array.isArray(asset?.usage) ? asset.usage : [];
  const usage = asObject(asset?.usage);
  const creator = asObject(asset?.robloxCreator || asset?.creator || relationship?.creator);
  const failure = asObject(asset?.failure || asset?.lastFailure || generation?.failure || relationship?.failure);
  const implementationLocations = asArray(asset?.studioImplementationLocations || asset?.implementationLocations || usageEntries);
  const implementationReceipts = asArray(asset?.studioImplementationReceipts || asset?.implementationReceipts);
  const projectAssociations = asArray(asset?.projectAssociations || asset?.projects);

  return {
    ...asset,
    assetId: firstString(asset?.assetId, asset?.nexusAssetId, asset?.nexusId, asset?.id),
    robloxAssetId: firstString(asset?.robloxAssetId, relationship?.robloxAssetId, relationship?.assetId),
    robloxOperationId: firstString(asset?.robloxOperationId, asset?.operationId, relationship?.robloxOperationId, relationship?.operationId),
    name: firstString(asset?.name, asset?.displayName, generation?.name) || "Untitled asset",
    kind: firstString(asset?.kind, asset?.assetKind, asset?.assetType, asset?.type) || "icon",
    lifecycle: firstString(asset?.lifecycle, asset?.status) || "draft",
    generationStatus: firstString(asset?.generationStatus, generation?.status),
    uploadStatus: firstString(asset?.uploadStatus, relationship?.uploadStatus, relationship?.lifecycle),
    moderation: {
      ...moderation,
      state: firstString(moderation?.state, asset?.moderationState, relationship?.moderationState),
    },
    usage: {
      ...usage,
      state: firstString(usage?.state, asset?.usageState) || (usageEntries.length ? "used" : "unused"),
      entries: usageEntries,
    },
    previewUrl: firstUrl(
      asset?.previewUrl,
      asset?.thumbnailUrl,
      asset?.imageUrl,
      asset?.storage?.preview,
      asset?.storage?.primary,
      previewFile
    ),
    prompt: firstString(asset?.generationPrompt, generation?.prompt, asset?.prompt, asset?.promptSummary, asset?.originalUserRequest),
    originalUserRequest: firstString(asset?.originalUserRequest),
    generationProvider: firstString(asset?.generationProvider, generation?.provider),
    generationModel: firstString(asset?.generationModel, generation?.model),
    packId: firstString(asset?.packId, asset?.relatedAssetPackId, asset?.iconPackId),
    parentAssetId: firstString(asset?.parentAssetId),
    styleProfileId: firstString(asset?.styleProfileId, generation?.styleProfileId),
    sourceProjectId: firstString(asset?.sourceProjectId, asset?.projectId),
    universeId: firstString(asset?.universeId),
    conversationId: firstString(asset?.conversationId),
    creator: {
      type: firstString(asset?.robloxCreatorType, asset?.creatorType, creator?.type, relationship?.creatorType),
      id: firstString(asset?.robloxCreatorId, asset?.creatorId, creator?.id, relationship?.creatorId),
      name: firstString(creator?.name, creator?.displayName, relationship?.creatorName),
    },
    visibility: firstString(asset?.visibility) || "project",
    tags: asArray(asset?.tags),
    colorPalette: asArray(asset?.colorPalette || asset?.palette),
    style: asObject(asset?.style || generation?.style),
    files,
    sourceFile,
    processedFile,
    fileFormat: firstString(asset?.fileFormat, asset?.format, processedFile?.format),
    mimeType: firstString(asset?.mimeType, processedFile?.mimeType),
    width: Number(asset?.width || processedFile?.width || 0) || null,
    height: Number(asset?.height || processedFile?.height || 0) || null,
    hasTransparency: typeof asset?.hasTransparency === "boolean"
      ? asset.hasTransparency
      : typeof processedFile?.hasTransparency === "boolean" ? processedFile.hasTransparency : null,
    fileSize: Number(asset?.fileSize || processedFile?.size || processedFile?.fileSize || 0) || null,
    relatedFileRefs: asArray(asset?.relatedFileRefs || asset?.relatedFiles),
    relatedUiElements: asArray(asset?.relatedUiElements || asset?.uiElements),
    studioImplementationLocations: implementationLocations,
    studioImplementationReceipts: implementationReceipts,
    projectAssociations,
    failure,
    supersedesAssetId: firstString(asset?.supersedesAssetId),
    replacedByAssetId: firstString(asset?.replacedByAssetId),
    createdAt: asset?.createdAt || generation?.createdAt || null,
    updatedAt: asset?.updatedAt || relationship?.updatedAt || null,
    lastUsedAt: asset?.lastUsedAt || usage?.lastUsedAt || null,
    robloxRelationship: relationship,
  };
}

export function getAssetPlatformCapabilities(rawContext = {}) {
  const context = rawContext?.context || rawContext || {};
  const capabilities = asObject(context.capabilities);
  const actions = {
    ...normalizeCapabilityActions(capabilities.actions || context.actions),
    ...Object.fromEntries(ASSET_PLATFORM_TOOL_NAMES
      .filter((name) => Object.prototype.hasOwnProperty.call(capabilities, name))
      .map((name) => [name, capabilities[name] === true])),
  };
  const reads = ASSET_PLATFORM_READS_ENABLED && capabilities.reads !== false;
  const writes = ASSET_PLATFORM_WRITES_ENABLED && capabilities.writes === true;
  const externalWrites = writes && capabilities.externalWrites === true;
  return { reads, writes, externalWrites, actions };
}

export function canAssetPlatformAction(capabilities, action) {
  const actionName = String(action || "");
  if (!actionName || capabilities?.actions?.[actionName] !== true) return false;
  if (READ_ACTIONS.has(actionName)) return capabilities?.reads === true;
  if (EXTERNAL_WRITE_ACTIONS.has(actionName)) return capabilities?.externalWrites === true;
  return capabilities?.writes === true;
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

function pickDefined(input, fields) {
  const source = asObject(input);
  return Object.fromEntries(fields
    .filter((field) => Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined)
    .map((field) => [field, source[field]]));
}

function normalizeToolResponse(rawResponse = {}) {
  const envelope = asObject(rawResponse);
  const rawResult = asObject(envelope.result || envelope.output || envelope);
  const rawData = asObject(rawResult.data);
  const asset = rawData.asset || rawResult.asset;
  const assets = rawData.assets || rawResult.assets;
  const pack = rawData.pack || rawResult.pack;
  const normalizedData = {
    ...rawData,
    ...(asset ? { asset: normalizeAsset(asset) } : {}),
    ...(Array.isArray(assets) ? { assets: assets.map(normalizeAsset) } : {}),
    ...(pack ? { pack: normalizePack(pack) } : {}),
  };

  return {
    ...rawResult,
    ...normalizedData,
    ...(envelope.tool ? { tool: envelope.tool } : {}),
    data: normalizedData,
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

async function request(path, {
  method = "GET",
  body,
  headers,
  readOnly = false,
  ...init
} = {}, fallbackMessage = "The asset request could not be completed.") {
  const normalizedMethod = String(method || "GET").toUpperCase();
  if (!ASSET_PLATFORM_READS_ENABLED) {
    const error = new Error(SAFE_ERROR_MESSAGES.ASSET_PLATFORM_DISABLED);
    error.status = 404;
    error.code = "ASSET_PLATFORM_DISABLED";
    error.summary = SAFE_ERROR_MESSAGES.ASSET_PLATFORM_DISABLED;
    throw error;
  }
  if (normalizedMethod !== "GET" && !readOnly && !ASSET_PLATFORM_WRITES_ENABLED) {
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

export async function getAssetFileBlob(assetId, role = "preview", {
  signal,
  projectId = "",
  universeId = "",
} = {}) {
  if (!ASSET_PLATFORM_READS_ENABLED) {
    const error = new Error(SAFE_ERROR_MESSAGES.ASSET_PLATFORM_DISABLED);
    error.status = 404;
    error.code = "ASSET_PLATFORM_DISABLED";
    error.summary = SAFE_ERROR_MESSAGES.ASSET_PLATFORM_DISABLED;
    throw error;
  }
  const normalizedAssetId = String(assetId || "").trim();
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (!normalizedAssetId || !["master", "roblox_ready", "preview"].includes(normalizedRole)) {
    const error = new Error("A valid asset and private file role are required.");
    error.status = 400;
    error.code = "VALIDATION_FAILED";
    error.summary = "A valid asset and private file role are required.";
    throw error;
  }
  const response = await authedFetch(
    `${ASSET_PLATFORM_BASE}${withQuery(`/assets/${idPath(normalizedAssetId)}/files/${idPath(normalizedRole)}`, { projectId, universeId })}`,
    { method: "GET", noCache: true, signal }
  );
  if (!response.ok) {
    await readResponse(response, "Asset preview could not be loaded.");
  }
  return response.blob();
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

export async function runAssetPlatformTool(toolName, input = {}) {
  const name = String(toolName || "").trim();
  if (!ASSET_PLATFORM_TOOL_NAME_SET.has(name)) {
    const error = new Error(SAFE_ERROR_MESSAGES.CAPABILITY_UNSUPPORTED);
    error.status = 400;
    error.code = "CAPABILITY_UNSUPPORTED";
    error.summary = SAFE_ERROR_MESSAGES.CAPABILITY_UNSUPPORTED;
    return Promise.reject(error);
  }
  const allowedInput = pickDefined(input, [...TOOL_INPUT_FIELDS[name], "idempotencyKey"]);
  const { idempotencyKey, ...body } = allowedInput;
  const response = await request(`/tools/${idPath(name)}`, {
    method: "POST",
    body,
    readOnly: READ_ACTIONS.has(name),
    headers: idempotencyKey ? { "Idempotency-Key": String(idempotencyKey) } : undefined,
  }, "The asset action could not be completed.");
  return normalizeToolResponse(response);
}

export function inspectAssetCapabilities(input = {}) {
  return runAssetPlatformTool("inspect_asset_capabilities", input);
}

export function listAuthorizedCreators(input = {}) {
  return runAssetPlatformTool("list_authorized_creators", input);
}

export function searchProjectAssets(query, input = {}) {
  const details = typeof query === "object" ? asObject(query) : { ...asObject(input), query };
  return runAssetPlatformTool("search_project_assets", details);
}

export function getAssetDetails(assetId, input = {}) {
  return runAssetPlatformTool("get_asset_details", { ...asObject(input), assetId });
}

export function generateAsset(input = {}) {
  return runAssetPlatformTool("generate_asset", input);
}

export function generateAssetPack(input = {}) {
  return runAssetPlatformTool("generate_asset_pack", input);
}

export function generateAssetVariation(assetIdOrInput, input = {}) {
  const details =
    assetIdOrInput && typeof assetIdOrInput === "object"
      ? asObject(assetIdOrInput)
      : { ...asObject(input), assetId: assetIdOrInput };
  return runAssetPlatformTool("generate_asset_variation", details);
}

// Compatibility helpers keep existing library callers on the canonical tool route.
export function generateAssets(input = {}) {
  const payload = asObject(input);
  if (["pack", "extend"].includes(payload.mode)) {
    const concepts = asArray(payload.concepts || payload.conceptNames).filter(Boolean);
    return generateAssetPack({
      ...pickDefined(payload, ["idempotencyKey", "projectId", "prompt", "packId", "style", "referenceAssetIds"]),
      ...(concepts.length ? { concepts } : { count: Number(payload.count || payload.requestedCount || 1) }),
    });
  }
  if (["similar", "replacement"].includes(payload.mode)) {
    return generateAssetVariation(payload.assetId || payload.sourceAssetId, {
      ...pickDefined(payload, ["idempotencyKey", "projectId", "prompt", "variationCount", "versionId", "failedChecks"]),
    });
  }
  return generateAsset(pickDefined(payload, [
    "idempotencyKey",
    "projectId",
    "prompt",
    "assetType",
    "style",
    "referenceAssetIds",
    "creatorTarget",
  ]));
}

export function extendAssetPack(packId, input = {}) {
  const payload = asObject(input);
  const concepts = asArray(payload.concepts || payload.conceptNames).filter(Boolean);
  return generateAssetPack({
    ...pickDefined(payload, ["idempotencyKey", "projectId", "prompt", "style", "referenceAssetIds"]),
    packId,
    ...(concepts.length ? { concepts } : { count: Number(payload.count || payload.requestedCount || 1) }),
  });
}

export function generateSimilarAsset(assetId, input = {}) {
  return generateAssetVariation(assetId, input);
}

export function replaceAsset(assetId, input = {}) {
  return generateAssetVariation(assetId, input);
}

export function validateAsset(assetId, input = {}) {
  return runAssetPlatformTool("validate_asset", { ...asObject(input), assetId });
}

export function publishAssetToRoblox(assetId, input = {}) {
  return runAssetPlatformTool("publish_asset_to_roblox", { ...asObject(input), assetId });
}

export function getRobloxUploadStatus(assetId, input = {}) {
  const details = asObject(input);
  if (details.operationId) {
    return runAssetPlatformTool("get_roblox_upload_status", {
      operationId: details.operationId,
      ...(details.projectId ? { projectId: details.projectId } : {}),
    });
  }
  return runAssetPlatformTool("get_roblox_upload_status", { ...details, assetId });
}

export function retryAssetUpload(assetId, input = {}) {
  return publishAssetToRoblox(assetId, input);
}

export function pollAssetStatus(assetId, input = {}) {
  return getRobloxUploadStatus(assetId, input);
}

export function attachAssetToProject(assetId, projectId, input = {}) {
  return runAssetPlatformTool("attach_asset_to_project", { ...asObject(input), assetId, projectId });
}

export function implementAssetInStudio(assetId, input = {}) {
  return runAssetPlatformTool("implement_asset_in_studio", { ...asObject(input), assetId });
}

export function verifyAssetInStudio(assetId, input = {}) {
  return runAssetPlatformTool("verify_asset_in_studio", { ...asObject(input), assetId });
}

export function createGamePass(input = {}) {
  return runAssetPlatformTool("create_game_pass", input);
}

export function updateGamePass(input = {}) {
  return runAssetPlatformTool("update_game_pass", input);
}

export function createDeveloperProduct(input = {}) {
  return runAssetPlatformTool("create_developer_product", input);
}

export function updateDeveloperProduct(input = {}) {
  return runAssetPlatformTool("update_developer_product", input);
}

export function archiveAsset(assetId, input = {}) {
  return runAssetPlatformTool("archive_asset", { ...asObject(input), assetId });
}
