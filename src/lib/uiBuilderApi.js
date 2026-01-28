import { BACKEND_URL as CONFIG_BACKEND_URL } from "../config";

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
      platforms
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

  const eventSource = new EventSource(`${BACKEND_URL}/api/ui-builder/ai/pipeline/stream?${params.toString()}&token=${token}`);

  eventSource.addEventListener("stage", (e) => {
    const data = JSON.parse(e.data);
    onStage?.(data);
  });

  eventSource.addEventListener("boardState", (e) => {
    const data = JSON.parse(e.data);
    onBoardState?.(data.boardState);
  });

  eventSource.addEventListener("done", (e) => {
    const data = JSON.parse(e.data);
    onDone?.(data);
    eventSource.close();
  });

  eventSource.addEventListener("error", (e) => {
    const data = JSON.parse(e.data);
    onError?.(data);
    eventSource.close();
  });

  return () => eventSource.close();
}

export async function aiRefineLua({ token, lua, instruction }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/refine-lua`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ lua, instruction }),
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
