let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_ORIGIN;
if (!BACKEND_URL) {
  BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app";
}
if (BACKEND_URL.endsWith("/")) {
  BACKEND_URL = BACKEND_URL.replace(/\/+$/, "");
}

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
