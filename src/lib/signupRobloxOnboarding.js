import { requireRobloxOnboarding } from "./robloxOAuthApi";

export const PENDING_ROBLOX_SIGNUP_KEY = "nexusrbx:signupRobloxOnboarding";
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function hasUnsafeReturnPathChars(value) {
  return value.includes("\\") || Array.from(value).some((character) => character.charCodeAt(0) < 32);
}

export function safeSignupReturnPath(value, fallback = "/ai") {
  return typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !hasUnsafeReturnPathChars(value)
    ? value
    : fallback;
}

export function connectRobloxPath(returnPath = "/ai") {
  return `/connect-roblox?return=${encodeURIComponent(safeSignupReturnPath(returnPath))}`;
}

export function persistPendingRobloxSignup(uid, returnPath = "/ai") {
  if (!uid || typeof window === "undefined") return null;
  const pending = {
    uid: String(uid),
    returnPath: safeSignupReturnPath(returnPath),
    expiresAt: Date.now() + PENDING_TTL_MS,
  };
  try {
    window.localStorage.setItem(PENDING_ROBLOX_SIGNUP_KEY, JSON.stringify(pending));
  } catch (_) {}
  return pending;
}

export function readPendingRobloxSignup(uid = null) {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(PENDING_ROBLOX_SIGNUP_KEY) || "null");
    if (!value?.uid || Number(value.expiresAt || 0) <= Date.now() || (uid && value.uid !== uid)) {
      window.localStorage.removeItem(PENDING_ROBLOX_SIGNUP_KEY);
      return null;
    }
    return value;
  } catch (_) {
    try { window.localStorage.removeItem(PENDING_ROBLOX_SIGNUP_KEY); } catch (_) {}
    return null;
  }
}

export function clearPendingRobloxSignup(uid = null) {
  const pending = readPendingRobloxSignup(uid);
  if (uid && !pending) return;
  try { window.localStorage.removeItem(PENDING_ROBLOX_SIGNUP_KEY); } catch (_) {}
}

export async function registerRobloxSignupRequirement(user, returnPath = "/ai") {
  if (!user?.uid) throw new Error("A signed-in account is required to prepare Roblox onboarding.");
  const pending = persistPendingRobloxSignup(user.uid, returnPath);
  await requireRobloxOnboarding();
  clearPendingRobloxSignup(user.uid);
  return connectRobloxPath(pending?.returnPath || returnPath);
}
