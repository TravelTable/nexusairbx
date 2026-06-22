import {
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

export const AUTH_REDIRECT_RETURN_KEY = "nexusrbx:authRedirectReturn";
export const AUTH_REDIRECT_METHOD_KEY = "nexusrbx:authRedirectMethod";

const MISSING_REDIRECT_STATE_RE =
  /missing initial state|sessionStorage is inaccessible|sessionStorage is unavailable/i;

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

export async function signInWithOAuthProvider(
  auth,
  ProviderClass,
  { rememberMe = false, returnPath = "/", method = "oauth" } = {}
) {
  await applyAuthPersistence(auth, rememberMe);
  const provider = new ProviderClass();

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const shouldFallbackToRedirect =
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/operation-not-supported-in-this-environment" ||
      error?.code === "auth/cancelled-popup-request";

    if (!shouldFallbackToRedirect) {
      throw error;
    }

    storeRedirectContext(returnPath, method);
    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function consumeAuthRedirectResult(auth) {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    if (isMissingRedirectStateError(error)) {
      clearRedirectContext();
      return { error };
    }
    throw error;
  }
}
