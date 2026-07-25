import {
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { debugAuthLog } from "./debugAuthLog";

export const AUTH_REDIRECT_RETURN_KEY = "nexusrbx:authRedirectReturn";
export const AUTH_REDIRECT_METHOD_KEY = "nexusrbx:authRedirectMethod";
export const AUTH_REDIRECT_ERROR_KEY = "nexusrbx:authRedirectError";
export const AUTH_PERSISTENCE_PREFERENCE_KEY = "nexusrbx:authPersistencePreference";

const AUTH_PERSISTENCE_LOCAL = "local";
const AUTH_PERSISTENCE_SESSION = "session";

const MISSING_REDIRECT_STATE_RE =
  /missing initial state|sessionStorage is inaccessible|sessionStorage is unavailable/i;

const POPUP_REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
  // Some browsers surface a blocked or failed popup handshake as the generic
  // internal error after leaving signInWithPopup pending for several seconds.
  "auth/internal-error",
]);

export function isMissingRedirectStateError(error) {
  const message = String(error?.message || error?.code || "");
  return MISSING_REDIRECT_STATE_RE.test(message);
}

export function getFriendlyAuthErrorMessage(error) {
  if (isMissingRedirectStateError(error)) {
    return "Sign-in was interrupted because browser storage was cleared or blocked. Please try again in the same tab, without private browsing extensions that block storage.";
  }
  if (error?.code === "auth/popup-blocked") {
    return "The sign-in popup was blocked. Allow popups for this site or try again to use a full-page redirect.";
  }
  if (error?.code === "auth/popup-closed-by-user") {
    return "Sign-in was cancelled before it finished.";
  }
  return error?.message || "Sign-in failed. Please try again.";
}

export function readAuthPersistencePreference() {
  try {
    const value = localStorage.getItem(AUTH_PERSISTENCE_PREFERENCE_KEY);
    if (value === AUTH_PERSISTENCE_SESSION) return false;
    if (value === AUTH_PERSISTENCE_LOCAL) return true;
  } catch (_) {
    // Ignore storage failures and fall back to the secure default.
  }
  return true;
}

export function writeAuthPersistencePreference(rememberMe) {
  try {
    localStorage.setItem(
      AUTH_PERSISTENCE_PREFERENCE_KEY,
      rememberMe ? AUTH_PERSISTENCE_LOCAL : AUTH_PERSISTENCE_SESSION
    );
  } catch (_) {
    // Ignore storage failures; sign-in still applies persistence for this attempt.
  }
}

export async function applyAuthPersistence(auth, rememberMe = false) {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
}

function storeRedirectContext(returnPath, method) {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_RETURN_KEY, returnPath || "/");
    if (method) sessionStorage.setItem(AUTH_REDIRECT_METHOD_KEY, method);
  } catch (_) {
    // Ignore storage failures; redirect may still work on same-origin flows.
  }
}

export function readRedirectContext() {
  try {
    return {
      returnPath: sessionStorage.getItem(AUTH_REDIRECT_RETURN_KEY) || "/",
      method: sessionStorage.getItem(AUTH_REDIRECT_METHOD_KEY) || null,
    };
  } catch (_) {
    return { returnPath: "/", method: null };
  }
}

export function clearRedirectContext() {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_RETURN_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_METHOD_KEY);
  } catch (_) {}
}

export function storeAuthRedirectError(error) {
  const message = getFriendlyAuthErrorMessage(error);
  try {
    sessionStorage.setItem(AUTH_REDIRECT_ERROR_KEY, message);
  } catch (_) {
    // Ignore storage failures; the caller still returns the message.
  }
  return message;
}

export function consumeAuthRedirectError() {
  try {
    const message = sessionStorage.getItem(AUTH_REDIRECT_ERROR_KEY);
    if (message) sessionStorage.removeItem(AUTH_REDIRECT_ERROR_KEY);
    return message;
  } catch (_) {
    return null;
  }
}

export async function signInWithOAuthProvider(
  auth,
  ProviderClass,
  { rememberMe = false, returnPath = "/", method = "oauth" } = {}
) {
  // #region agent log
  debugAuthLog({
    hypothesisId: "A",
    location: "src/lib/firebaseAuth.js:signInWithOAuthProvider:entry",
    message: "OAuth sign-in started",
    data: {
      method,
      rememberMe: Boolean(rememberMe),
      returnPath,
      authDomain: auth?.config?.authDomain || null,
      hostname:
        typeof window !== "undefined" ? window.location?.hostname || null : null,
    },
  });
  // #endregion

  await applyAuthPersistence(auth, rememberMe);
  const provider = new ProviderClass();
  if (method === "google" && typeof provider.setCustomParameters === "function") {
    provider.setCustomParameters({ prompt: "select_account" });
  }

  try {
    const credential = await signInWithPopup(auth, provider);
    // #region agent log
    debugAuthLog({
      hypothesisId: "C",
      location: "src/lib/firebaseAuth.js:signInWithOAuthProvider:popup-success",
      message: "Popup sign-in succeeded",
      data: {
        method,
        hasUser: Boolean(credential?.user),
        uidPresent: Boolean(credential?.user?.uid),
      },
    });
    // #endregion
    return credential;
  } catch (error) {
    const shouldFallbackToRedirect = POPUP_REDIRECT_FALLBACK_CODES.has(error?.code);

    // #region agent log
    debugAuthLog({
      hypothesisId: shouldFallbackToRedirect ? "A" : "B",
      location: "src/lib/firebaseAuth.js:signInWithOAuthProvider:popup-error",
      message: "Popup sign-in failed",
      data: {
        method,
        code: error?.code || null,
        errorMessage: String(error?.message || "").slice(0, 300),
        willFallbackToRedirect: shouldFallbackToRedirect,
      },
    });
    // #endregion

    if (!shouldFallbackToRedirect) {
      throw error;
    }

    storeRedirectContext(returnPath, method);
    // #region agent log
    debugAuthLog({
      hypothesisId: "A",
      location: "src/lib/firebaseAuth.js:signInWithOAuthProvider:redirect-fallback",
      message: "Falling back to signInWithRedirect",
      data: { method, returnPath, authDomain: auth?.config?.authDomain || null },
    });
    // #endregion
    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function consumeAuthRedirectResult(auth) {
  try {
    const result = await getRedirectResult(auth);
    // #region agent log
    debugAuthLog({
      hypothesisId: "A",
      location: "src/lib/firebaseAuth.js:consumeAuthRedirectResult",
      message: "getRedirectResult resolved",
      data: {
        hasResult: Boolean(result),
        hasUser: Boolean(result?.user),
        authDomain: auth?.config?.authDomain || null,
      },
    });
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    debugAuthLog({
      hypothesisId: "A",
      location: "src/lib/firebaseAuth.js:consumeAuthRedirectResult:error",
      message: "getRedirectResult failed",
      data: {
        code: error?.code || null,
        errorMessage: String(error?.message || "").slice(0, 300),
        missingState: isMissingRedirectStateError(error),
      },
    });
    // #endregion
    if (isMissingRedirectStateError(error)) {
      clearRedirectContext();
      return { error };
    }
    throw error;
  }
}
