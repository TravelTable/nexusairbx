import { authedFetch } from "./billing";
import { readJsonResponse, withApiRetryCooldown } from "./apiErrors";
import { formatRobloxErrorMessage } from "./robloxAuthorizationMessages";

const readJsonOrThrow = readJsonResponse;

const SENSITIVE_CONNECTION_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "clientSecret",
  "idToken",
  "codeVerifier",
  "encryptedAccessToken",
  "encryptedRefreshToken",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstString(...values) {
  const value = values.find((entry) => (
    (typeof entry === "string" && entry.trim())
    || (typeof entry === "number" && Number.isFinite(entry))
  ));
  return value === undefined || value === null ? "" : String(value);
}

function normalizeCreator(rawCreator) {
  if (!rawCreator || typeof rawCreator !== "object") return null;
  const typeValue = firstString(rawCreator.type, rawCreator.creatorType).toLowerCase();
  const type = typeValue === "group" ? "Group" : typeValue === "user" ? "User" : "";
  const id = firstString(rawCreator.id, rawCreator.creatorId, rawCreator.userId, rawCreator.groupId);
  if (!type || !id) return null;
  return {
    type,
    id,
    name: firstString(rawCreator.name, rawCreator.displayName, rawCreator.label) || `${type} ${id}`,
    authorized: rawCreator.authorized !== false,
    permissions: asArray(rawCreator.permissions).map(String),
    missingPermissions: asArray(rawCreator.missingPermissions).map(String),
  };
}

function normalizeUniverse(rawUniverse) {
  if (!rawUniverse || typeof rawUniverse !== "object") return null;
  const id = firstString(rawUniverse.id, rawUniverse.universeId, rawUniverse.resourceId);
  if (!id) return null;
  return {
    id,
    name: firstString(rawUniverse.name, rawUniverse.displayName) || `Universe ${id}`,
    creator: normalizeCreator(rawUniverse.creator),
    permissions: asArray(rawUniverse.permissions).map(String),
    missingPermissions: asArray(rawUniverse.missingPermissions).map(String),
  };
}

function sanitizeProfile(rawProfile, fallbackUserId) {
  const profile = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const userId = firstString(profile.sub, profile.id, profile.userId, fallbackUserId);
  if (!userId && !Object.keys(profile).length) return null;
  return {
    sub: userId,
    id: userId,
    preferred_username: firstString(profile.preferred_username, profile.username, profile.name),
    username: firstString(profile.username, profile.preferred_username, profile.name),
    name: firstString(profile.name, profile.displayName, profile.nickname, profile.preferred_username),
    displayName: firstString(profile.displayName, profile.name, profile.nickname, profile.preferred_username),
    nickname: firstString(profile.nickname),
    picture: firstString(profile.picture, profile.avatarUrl),
  };
}

/**
 * Reduces the OAuth status response to the creator and health metadata the UI
 * needs. This is a defence-in-depth boundary: credential-shaped properties are
 * never retained even if a future server response accidentally includes them.
 */
export function normalizeRobloxConnectionStatus(rawStatus = {}) {
  const status = rawStatus && typeof rawStatus === "object" ? rawStatus : {};
  const rawConnection = status.connection && typeof status.connection === "object"
    ? status.connection
    : {};
  const sensitiveKeysPresent = [...SENSITIVE_CONNECTION_KEYS].some((key) => (
    Object.prototype.hasOwnProperty.call(status, key)
    || Object.prototype.hasOwnProperty.call(rawConnection, key)
  ));
  const profile = sanitizeProfile(
    rawConnection.profile || status.profile || status.user,
    firstString(rawConnection.robloxUserId, status.robloxUserId)
  );
  const creatorCandidates = asArray(
    status.authorizedCreators?.length ? status.authorizedCreators : rawConnection.creators
  );
  const creators = creatorCandidates.map(normalizeCreator).filter(Boolean);
  const selectedCreator = normalizeCreator(rawConnection.selectedCreator || status.selectedCreator);
  const personalCreator = creators.find((creator) => creator.type === "User")
    || (profile?.id ? normalizeCreator({ type: "User", id: profile.id, name: profile.displayName || profile.username }) : null);
  const groups = creators.filter((creator) => creator.type === "Group");
  const universes = asArray(
    status.accessibleUniverses?.length
      ? status.accessibleUniverses
      : rawConnection.universes || status.universes
  ).map(normalizeUniverse).filter(Boolean);
  const grantedScopes = asArray(status.grantedScopes?.length ? status.grantedScopes : rawConnection.scopes).map(String);
  const missingScopes = asArray(status.missingScopes).map(String);
  const tokenHealthRaw = status.tokenHealth && typeof status.tokenHealth === "object" ? status.tokenHealth : {};
  const tokenHealth = {
    status: firstString(tokenHealthRaw.status) || (status.connected ? "unknown" : "not_connected"),
    accessTokenExpiresAt: tokenHealthRaw.accessTokenExpiresAt || null,
    lastRefreshAt: tokenHealthRaw.lastRefreshAt || null,
    hasRefreshToken: tokenHealthRaw.hasRefreshToken === true,
  };
  const lastSuccessfulOperation = status.lastSuccessfulOperation && typeof status.lastSuccessfulOperation === "object"
    ? {
      type: firstString(status.lastSuccessfulOperation.type, status.lastSuccessfulOperation.operationType),
      occurredAt: status.lastSuccessfulOperation.occurredAt || status.lastSuccessfulOperation.completedAt || status.lastSuccessfulOperation.createdAt || null,
      creator: normalizeCreator(status.lastSuccessfulOperation.creator),
    }
    : null;
  const missingPermissions = Array.from(new Set([
    ...creators.flatMap((creator) => creator.missingPermissions),
    ...universes.flatMap((universe) => universe.missingPermissions),
  ]));

  return {
    connected: status.connected === true,
    upgradeRequired: status.upgradeRequired === true,
    capabilities: status.capabilities && typeof status.capabilities === "object" ? status.capabilities : {},
    grantedScopes,
    missingScopes,
    missingCapabilities: asArray(status.missingCapabilities).map(String),
    authorizedCreators: creators,
    accessibleUniverses: universes,
    permissions: status.permissions && typeof status.permissions === "object" ? {
      resourceValidationStatus: firstString(status.permissions.resourceValidationStatus) || "unknown",
      resourcesValidatedAt: status.permissions.resourcesValidatedAt || null,
    } : { resourceValidationStatus: "unknown", resourcesValidatedAt: null },
    policy: status.policy && typeof status.policy === "object" ? status.policy : {},
    tokenHealth,
    lastSuccessfulOperation,
    connection: Object.keys(rawConnection).length || status.connected ? {
      status: firstString(rawConnection.status) || (status.connected ? "connected" : "disconnected"),
      profile,
      identity: profile ? {
        userId: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        picture: profile.picture,
      } : null,
      selectedCreator,
      creators,
      personalCreator,
      groups,
      universes,
      grantedScopes,
      missingScopes,
      missingPermissions,
      tokenHealth,
      lastSuccessfulOperation,
    } : null,
    // Kept private to tests/telemetry callers; never includes the values.
    credentialFieldsDiscarded: sensitiveKeysPresent,
  };
}

export async function getRobloxOAuthStatus() {
  return withApiRetryCooldown("roblox-oauth:status", "Failed to load Roblox connection", async () => {
    const res = await authedFetch("/api/roblox/oauth/status", { method: "GET", noCache: true });
    const status = await readJsonOrThrow(res, "Failed to load Roblox connection");
    return normalizeRobloxConnectionStatus(status);
  });
}

export async function startRobloxOAuth({ bundles = ["core"], returnPath = "/settings?tab=roblox", prompt = null } = {}) {
  return withApiRetryCooldown("roblox-oauth:start", "Failed to start Roblox authorization", async () => {
    const res = await authedFetch("/api/roblox/oauth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundles, returnPath, ...(prompt ? { prompt } : {}) }),
    });
    return readJsonOrThrow(res, "Failed to start Roblox authorization");
  });
}

export async function reauthorizeRoblox({ bundles = ["core"], returnPath = "/settings?tab=roblox" } = {}) {
  return withApiRetryCooldown("roblox-oauth:reauthorize", "Failed to start Roblox reauthorization", async () => {
    const res = await authedFetch("/api/roblox/oauth/reauthorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundles, returnPath }),
    });
    return readJsonOrThrow(res, "Failed to start Roblox reauthorization");
  });
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
  const data = await withApiRetryCooldown("roblox-oauth:ensure", "Failed to verify Roblox authorization", async () => {
    const res = await authedFetch("/api/roblox/oauth/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capabilities: requestedCapabilities,
        returnPath,
        ...(pendingAction ? { pendingAction } : {}),
      }),
    });
    return readJsonOrThrow(res, "Failed to verify Roblox authorization");
  });
  if (data.authorizationUrl) {
    persistPendingAction(pendingAction, returnPath);
    window.location.assign(data.authorizationUrl);
  }
  return data;
}

export async function disconnectRobloxOAuth() {
  return withApiRetryCooldown("roblox-oauth:disconnect", "Failed to disconnect Roblox", async () => {
    const res = await authedFetch("/api/roblox/oauth/disconnect", { method: "POST" });
    return readJsonOrThrow(res, "Failed to disconnect Roblox");
  });
}

export async function revokeRobloxOAuth() {
  return withApiRetryCooldown("roblox-oauth:revoke", "Failed to revoke Roblox access", async () => {
    const res = await authedFetch("/api/roblox/oauth/revoke", { method: "POST" });
    return readJsonOrThrow(res, "Failed to revoke Roblox access");
  });
}

export async function setRobloxTargetCreator(creator) {
  return withApiRetryCooldown("roblox-oauth:target-creator", "Failed to update Roblox creator target", async () => {
    const res = await authedFetch("/api/roblox/oauth/target-creator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator }),
    });
    return readJsonOrThrow(res, "Failed to update Roblox creator target");
  });
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
