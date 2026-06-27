import { BACKEND_URL as CONFIG_BACKEND_URL } from "../config";
import { ensureStreamSession } from "./streamSession";

export const BACKEND_URL = CONFIG_BACKEND_URL;

async function handleResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code || null;
    err.requestId = data?.requestId || res.headers.get("x-request-id") || null;
    err.retryable = typeof data?.retryable === "boolean" ? data.retryable : null;
    err.missingScopes = Array.isArray(data?.missingScopes) ? data.missingScopes : [];
    throw err;
  }
  return data;
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * For multipart/form-data uploads, do NOT set Content-Type manually (browser sets boundary).
 */
function authOnlyHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listBoards({ token }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createBoard({ token, title, projectId = null, canvasSize, settings }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, projectId, canvasSize, settings }),
  });
  return handleResponse(res);
}

export async function getBoard({ token, boardId }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function deleteBoard({ token, boardId }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function listSnapshots({ token, boardId }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}/snapshots`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createSnapshot({ token, boardId, boardState }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}/snapshots`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ boardState }),
  });
  return handleResponse(res);
}

export async function getSnapshot({ token, boardId, snapshotId }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}/snapshots/${encodeURIComponent(snapshotId)}`,
    { headers: authHeaders(token) }
  );
  return handleResponse(res);
}

/**
 * AI: Generate a full boardState JSON.
 *
 * IMPORTANT DESIGN RULE:
 * - Backend returns a declarative "boardState" object (source-of-truth)
 * - Frontend renders that boardState onto the canvas (no invented extra UI)
 *
 * "themeHint" helps align the generated UI with your site theme (colors, radius, font).
 * Codex: you can expand themeHint by reading more tokens from the main AI page.
 */
export async function aiGenerateBoard({ token, prompt, canvasSize, themeHint, mode = "overwrite", maxItems = 40 }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/generate-board`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ prompt, canvasSize, themeHint, mode, maxItems }),
  });
  return handleResponse(res);
}

/**
 * AI: image/screenshot -> boardState JSON
 *
 * rightsMode:
 * - "owned": user asserts permission; extract more details (still no asset IDs invented)
 * - "reference": inspiration only; replace text/logos, apply site theme
 */
export async function aiImportFromImage({
  token,
  file,
  canvasSize,
  themeHint,
  rightsMode = "reference",
  prompt = "",
  mode = "overwrite",
  maxItems = 40,
}) {
  const form = new FormData();
  form.append("image", file);
  form.append("canvasSize", JSON.stringify(canvasSize));
  form.append("themeHint", JSON.stringify(themeHint || {}));
  form.append("rightsMode", rightsMode);
  form.append("prompt", prompt || "");
  form.append("mode", mode);
  form.append("maxItems", String(maxItems));

  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/import-from-image`, {
    method: "POST",
    headers: authOnlyHeaders(token),
    body: form,
  });
  return handleResponse(res);
}

export async function aiPreview({ token, prompt, canvasSize, themeHint, mode = "overwrite", maxItems = 45 }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/preview`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ prompt, canvasSize, themeHint, mode, maxItems }),
  });
  return handleResponse(res);
}

export async function aiFinalizeLua({
  token,
  boardState,
  prompt = "",
  gameSpec = "",
  maxSystemsTokens,
}) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/finalize-lua`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ boardState, prompt, gameSpec, maxSystemsTokens }),
  });
  return handleResponse(res);
}

export async function aiPipeline({
  token,
  prompt,
  canvasSize,
  themeHint,
  maxItems = 45,
  gameSpec = "",
  maxSystemsTokens = 2500,
  catalog = [],
  animations = "",
  customTheme = null,
  platforms = ["pc"],
  idempotencyKey,
  attachments = [],
}) {
  const headers = authHeaders(token);
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/pipeline`, {
    method: "POST",
    headers,
    body: JSON.stringify({ 
      prompt, 
      canvasSize, 
      themeHint, 
      maxItems, 
      gameSpec, 
      maxSystemsTokens,
      catalog,
      animations,
      customTheme,
      platforms,
      attachments
    }),
  });
  return handleResponse(res);
}

export async function aiPipelineStream({
  token,
  prompt,
  canvasSize,
  maxItems = 45,
  gameSpec = "",
  maxSystemsTokens = 2500,
  onStage,
  onPartialBoard,
  onBoardState,
  onDone,
  onError
}) {
  const params = new URLSearchParams({
    prompt,
    canvasSize: JSON.stringify(canvasSize),
    maxItems: String(maxItems),
    gameSpec,
    maxSystemsTokens: String(maxSystemsTokens)
  });

  await ensureStreamSession(token);

  const eventSource = new EventSource(`${BACKEND_URL}/api/ui-builder/ai/pipeline/stream?${params.toString()}`, {
    withCredentials: true,
  });

  eventSource.addEventListener("stage", (e) => {
    try { onStage?.(JSON.parse(e.data)); } catch (_) {}
  });

  // Progressive render: partial boardState containing the items parsed so far.
  eventSource.addEventListener("partial_board", (e) => {
    try { onPartialBoard?.(JSON.parse(e.data).boardState); } catch (_) {}
  });

  eventSource.addEventListener("boardState", (e) => {
    try { onBoardState?.(JSON.parse(e.data).boardState); } catch (_) {}
  });

  eventSource.addEventListener("done", (e) => {
    try { onDone?.(JSON.parse(e.data)); } catch (err) { onError?.({ message: err?.message || "Failed to parse result" }); }
    eventSource.close();
  });

  eventSource.addEventListener("error", (e) => {
    // SSE "error" can be a server-sent event (with data) or a native transport
    // error (no data). Handle both without throwing.
    let data = null;
    try { if (e?.data) data = JSON.parse(e.data); } catch (_) {}
    onError?.(data || { message: "Connection lost during generation" });
    eventSource.close();
  });

  return () => eventSource.close();
}

export async function aiRefineLua({ token, lua, instruction, attachments = [] }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/refine-lua`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ lua, instruction, attachments }),
  });
  return handleResponse(res);
}

export async function exportLua({ token, boardState }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/export-lua`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ boardState }),
  });
  return handleResponse(res);
}

export async function aiGenerateFunctionality({ token, uiModuleLua, systemsLua, prompt, gameSpec = "" }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/generate-functionality`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ uiModuleLua, systemsLua, prompt, gameSpec }),
  });
  return handleResponse(res);
}

/**
 * AI: Suggest search keywords for missing ImageLabel image IDs.
 * Backend returns keywords only (never IDs).
 */
export async function aiSuggestImageQueries({ token, items, boardPrompt = "" }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/suggest-image-queries`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ items, boardPrompt }),
  });
  return handleResponse(res);
}

/**
 * AI: Enhance an existing boardState (polish spacing/hierarchy without changing IDs or image assets).
 */
export async function aiEnhanceBoard({ token, boardState, prompt = "Make it feel more premium and polished", themeHint }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/enhance-board`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ boardState, prompt, themeHint }),
  });
  return handleResponse(res);
}

// --- Genre-aware UI generation system -------------------------------------

/**
 * Generate a structured 12-field UI plan (genre, screen, style, assets, ...).
 * Returns { plan, model, tokensConsumed, estimate, entitlements }.
 */
export async function aiPlanUi({ token, prompt, genreHint, projectId, screenId, requestedModel }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/plan`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ prompt, genreHint, projectId, screenId, requestedModel }),
  });
  return handleResponse(res);
}

export async function createUiProject({ token, game_genre, theme, style, palette, name }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/projects`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ game_genre, theme, style, palette, name }),
  });
  return handleResponse(res);
}

export async function listGenreProfiles({ token }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/genre-profiles`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createStyleProfile({ token, projectId, profile }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/style-profile`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(profile || {}),
    }
  );
  return handleResponse(res);
}

export async function getUiProjectState({ token, projectId, optional = false }) {
  const params = optional ? "?optional=1" : "";
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/state${params}`,
    { headers: authHeaders(token) }
  );
  return handleResponse(res);
}

export async function listUiProjectAssets({ token, projectId }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/assets`,
    { headers: authHeaders(token) }
  );
  return handleResponse(res);
}

/**
 * Run the asset pipeline for a plan's asset_list (or explicit specs).
 * Returns { projectId, results, generatedCount, boardState, entitlements }.
 */
export async function aiGenerateAssets({
  token,
  projectId,
  specs,
  plan,
  boardState,
  allowReuse = true,
  robloxOAuthUpload = false,
  requestId,
  runId,
}) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/assets/generate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ projectId, specs, plan, boardState, allowReuse, robloxOAuthUpload, requestId, runId }),
  });
  return handleResponse(res);
}

/** Regenerate a single asset by id ("regenerate only the shop icon"). */
export async function aiRegenerateAsset({ token, assetId, projectId, spec, boardState, robloxOAuthUpload = false, requestId, runId }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/assets/${encodeURIComponent(assetId)}/regenerate`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ projectId, spec, boardState, robloxOAuthUpload, requestId, runId }),
    }
  );
  return handleResponse(res);
}

export async function approveProjectAssets({ token, projectId, assets, expectedProjectRevision }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/assets/approve`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ assets, expectedProjectRevision }),
    }
  );
  return handleResponse(res);
}

export async function uploadProjectAssetsToRoblox({ token, projectId, assetIds, expectedProjectRevision, requestId, runId }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/assets/upload-to-roblox`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ assetIds, expectedProjectRevision, requestId, runId }),
    }
  );
  return handleResponse(res);
}

export async function refreshProjectAssetUploads({ token, projectId, assetIds }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/assets/refresh-uploads`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ assetIds }),
    }
  );
  return handleResponse(res);
}

export async function applyProjectAssetIds({ token, projectId, boardState, files, expectedProjectRevision }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/assets/apply-ids`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ boardState, files, expectedProjectRevision }),
    }
  );
  return handleResponse(res);
}

export async function searchAssetCatalog({
  token,
  projectId,
  query = "",
  spec,
  styleProfileId,
  organizationId,
  includeShared = true,
  includeSystem = true,
  limit = 24,
}) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (query) params.set("q", query);
  if (spec) params.set("spec", JSON.stringify(spec));
  if (styleProfileId) params.set("styleProfileId", styleProfileId);
  if (organizationId) params.set("organizationId", organizationId);
  params.set("includeShared", String(includeShared));
  params.set("includeSystem", String(includeSystem));
  params.set("limit", String(limit));
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/asset-catalog/search?${params.toString()}`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function attachReusableProjectAsset({
  token,
  projectId,
  masterAssetId,
  logicalAssetId,
  intendedComponent,
  organizationId,
  expectedProjectRevision,
}) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/projects/${encodeURIComponent(projectId)}/assets/attach-reusable`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ masterAssetId, logicalAssetId, intendedComponent, organizationId, expectedProjectRevision }),
    }
  );
  return handleResponse(res);
}

export async function requestAssetCatalogPromotion({
  token,
  masterAssetId,
  targetVisibility = "shared_catalog",
  licenseClass = "original",
  provenance = {},
  safeForSharedReuse = false,
  organizationId,
}) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/asset-catalog/promotions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ masterAssetId, targetVisibility, licenseClass, provenance, safeForSharedReuse, organizationId }),
  });
  return handleResponse(res);
}

export async function listAssetCatalogPromotions({ token, status = "", limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/asset-catalog/promotions?${params.toString()}`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function reviewAssetCatalogPromotion({ token, promotionId, decision, reviewerNote = "" }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/asset-catalog/promotions/${encodeURIComponent(promotionId)}/review`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ decision, reviewerNote }),
    }
  );
  return handleResponse(res);
}

export async function getAssetUsageSummary({ token, masterAssetId, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (masterAssetId) params.set("masterAssetId", masterAssetId);
  params.set("limit", String(limit));
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/asset-catalog/usage?${params.toString()}`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function listCuratedSystemPacks({ token }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/asset-catalog/system-packs`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

/** Re-plan + re-art a single component ("make the quest panel darker"). */
export async function aiRegenerateComponent({ token, componentId, boardState, instruction, projectId, regenerateAsset, assetSpec }) {
  const res = await fetch(
    `${BACKEND_URL}/api/ui-builder/component/${encodeURIComponent(componentId)}/regenerate`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ boardState, instruction, projectId, regenerateAsset, assetSpec }),
    }
  );
  return handleResponse(res);
}

/** Export a clean, multi-file Roblox project (UITheme/UIAssets/etc.). */
export async function exportModulesApi({ token, boardState, systemsLua, assets, screenName }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/export-modules`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ boardState, systemsLua, assets, screenName }),
  });
  return handleResponse(res);
}

// --- Roblox helpers (no auth; backend proxies Roblox endpoints) ---
export function robloxThumbnailUrl({ assetId, size = "420x420" }) {
  const id = String(assetId || "").trim();
  return `${BACKEND_URL}/api/roblox/thumbnail?assetId=${encodeURIComponent(id)}&size=${encodeURIComponent(size)}`;
}

export async function robloxCatalogSearch({ keyword, limit = 10 }) {
  const q = String(keyword || "").trim();
  const lim = Math.max(1, Math.min(30, Number(limit || 10)));
  const res = await fetch(
    `${BACKEND_URL}/api/roblox/catalog/search?keyword=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(lim))}`
  );
  return handleResponse(res);
}

export async function exportIcon({ token, iconId, tintColor, customName }) {
  const res = await fetch(`${BACKEND_URL}/api/icons/${encodeURIComponent(iconId)}/export`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ tintColor, customName }),
  });
  return handleResponse(res);
}
