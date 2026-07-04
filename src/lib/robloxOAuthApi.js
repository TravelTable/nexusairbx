import { authedFetch } from "./billing";
import { formatRobloxErrorMessage } from "./robloxAuthorizationMessages";

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

export async function startRobloxOAuth({ bundles = ["core"], returnPath = "/settings?tab=roblox", prompt = null } = {}) {
  const res = await authedFetch("/api/roblox/oauth/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundles, returnPath, ...(prompt ? { prompt } : {}) }),
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

const ROBLOX_PENDING_ACTION_STORAGE_KEY = "nexusrbx.roblox.pendingAction";

export const ROBLOX_PRODUCT_DEFAULT_CAPABILITIES = [
  "roblox_get_connection",
  "roblox_upload_asset",
  "roblox_get_asset",
  "roblox_search_creator_store",
];
export const ROBLOX_UPLOAD_ASSET_CAPABILITIES = ["roblox_upload_asset"];
export const CREATOR_STORE_READ_CAPABILITIES = ["roblox_search_creator_store"];

function normalizeCapabilities(capabilities) {
  const values = Array.isArray(capabilities) ? capabilities : [capabilities];
  const ids = values.map((id) => String(id || "").trim()).filter(Boolean);
  return Array.from(new Set(ids.length ? ids : ROBLOX_PRODUCT_DEFAULT_CAPABILITIES)).sort();
}

function capabilitiesForBundles(bundles = ["product_default"]) {
  const ids = new Set();
  for (const bundle of Array.isArray(bundles) ? bundles : [bundles]) {
    if (bundle === "creator_store_read") {
      ids.add("roblox_search_creator_store");
    } else {
      ROBLOX_PRODUCT_DEFAULT_CAPABILITIES.forEach((capability) => ids.add(capability));
    }
  }
  return Array.from(ids).sort();
}

function persistPendingAction(pendingAction, returnPath) {
  if (!pendingAction || typeof window === "undefined" || !window.sessionStorage) return;
  const type = String(pendingAction.type || "").trim();
  if (!type) return;
  const safeAction = {
    type,
    ...(pendingAction.id ? { id: String(pendingAction.id) } : {}),
    ...(pendingAction.requiresFileReselect === true ? { requiresFileReselect: true } : {}),
    returnPath: String(returnPath || "/ai"),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  window.sessionStorage.setItem(ROBLOX_PENDING_ACTION_STORAGE_KEY, JSON.stringify(safeAction));
}

export function readPendingRobloxAction() {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  const raw = window.sessionStorage.getItem(ROBLOX_PENDING_ACTION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const action = JSON.parse(raw);
    if (!action?.type || Number(action.expiresAt || 0) < Date.now()) {
      window.sessionStorage.removeItem(ROBLOX_PENDING_ACTION_STORAGE_KEY);
      return null;
    }
    return action;
  } catch (_) {
    window.sessionStorage.removeItem(ROBLOX_PENDING_ACTION_STORAGE_KEY);
    return null;
  }
}

export function clearPendingRobloxAction() {
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.removeItem(ROBLOX_PENDING_ACTION_STORAGE_KEY);
  }
}

export async function ensureRobloxCapabilities({ capabilities, returnPath = "/settings?tab=roblox", pendingAction = null } = {}) {
  const requestedCapabilities = normalizeCapabilities(capabilities);
  const res = await authedFetch("/api/roblox/oauth/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capabilities: requestedCapabilities,
      returnPath,
      ...(pendingAction ? { pendingAction } : {}),
    }),
  });
  const data = await readJsonOrThrow(res, "Failed to verify Roblox authorization");
  if (data.authorizationUrl) {
    persistPendingAction(pendingAction, returnPath);
    window.location.assign(data.authorizationUrl);
  }
  return data;
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
  const { bundles, capabilities, returnPath, pendingAction } = options || {};
  return ensureRobloxCapabilities({
    capabilities: capabilities || capabilitiesForBundles(bundles),
    returnPath: returnPath || "/settings?tab=roblox",
    pendingAction,
  });
}

export async function beginRobloxReauthorization(options) {
  const { bundles, capabilities, returnPath, pendingAction } = options || {};
  return ensureRobloxCapabilities({
    capabilities: capabilities || capabilitiesForBundles(bundles),
    returnPath: returnPath || "/settings?tab=roblox",
    pendingAction,
  });
}

export function getRobloxCapability(robloxStatus, capabilityId) {
  const caps = robloxStatus?.capabilities;
  if (!caps) return null;
  if (caps[capabilityId]) return caps[capabilityId];
  const fromGranted = Array.isArray(caps.granted)
    ? caps.granted.find((item) => item.id === capabilityId)
    : null;
  if (fromGranted) {
    return {
      authorized: fromGranted.available !== false,
      missingScopes: Array.isArray(fromGranted.missingScopes) ? fromGranted.missingScopes : [],
    };
  }
  const fromMissing = Array.isArray(caps.missing)
    ? caps.missing.find((item) => item.id === capabilityId)
    : null;
  if (fromMissing) {
    return {
      authorized: false,
      missingScopes: Array.isArray(fromMissing.missingScopes) ? fromMissing.missingScopes : [],
    };
  }
  return null;
}

export function isCapabilityAuthorized(robloxStatus, capabilityId) {
  if (robloxStatus?.connected !== true) return false;
  const capability = getRobloxCapability(robloxStatus, capabilityId);
  if (!capability) return false;
  return capability.authorized !== false && !(capability.missingScopes?.length > 0);
}

export function needsRobloxUpgrade(robloxStatus) {
  return robloxStatus?.upgradeRequired === true || (Array.isArray(robloxStatus?.missingScopes) && robloxStatus.missingScopes.length > 0);
}

export function formatRobloxApiError(error) {
  return formatRobloxErrorMessage(error);
}

export function isCreatorStoreReadAuthorized(robloxStatus) {
  return isCapabilityAuthorized(robloxStatus, "roblox_search_creator_store");
}

export function isRobloxReauthorizationError(code) {
  return code === "ROBLOX_REAUTHORIZATION_REQUIRED"
    || code === "CREATOR_STORE_REAUTHORIZATION_REQUIRED"
    || code === "ROBLOX_AUTH_REQUIRED";
}

export function creatorStoreAccessError() {
  const error = new Error("Reauthorize Roblox to grant Creator Store read access.");
  error.code = "CREATOR_STORE_REAUTHORIZATION_REQUIRED";
  error.recovery = "Reconnect Roblox and grant the required asset permissions.";
  return error;
}

export async function beginCreatorStoreReauthorization(returnPath = "/ai") {
  return ensureRobloxCapabilities({
    capabilities: CREATOR_STORE_READ_CAPABILITIES,
    returnPath,
    pendingAction: { type: "creator_store_search" },
  });
}
