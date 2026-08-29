import {
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { appCheckReady, firebaseAppCheckEnabled } from "../firebase";

export const AUTH_REDIRECT_RETURN_KEY = "nexusrbx:authRedirectReturn";
export const AUTH_REDIRECT_METHOD_KEY = "nexusrbx:authRedirectMethod";
export const AUTH_REDIRECT_ERROR_KEY = "nexusrbx:authRedirectError";
export const AUTH_REDIRECT_INTENT_KEY = "nexusrbx:authRedirectIntent";
export const AUTH_PERSISTENCE_PREFERENCE_KEY = "nexusrbx:authPersistencePreference";

// Public OAuth web client used by Firebase Google provider config.
export const GOOGLE_OAUTH_CLIENT_ID =
  "834738385750-hoc2k5s3j6dfuu9pa9qhtrr6qrm1kmps.apps.googleusercontent.com";

const AUTH_PERSISTENCE_LOCAL = "local";
const AUTH_PERSISTENCE_SESSION = "session";

const MISSING_REDIRECT_STATE_RE =
  /missing initial state|sessionStorage is inaccessible|sessionStorage is unavailable/i;

const POPUP_REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
  "popup_closed",
  "popup_failed_to_open",
]);

export function shouldFallbackToAuthRedirect(error) {
  return POPUP_REDIRECT_FALLBACK_CODES.has(error?.code);
}

export function shouldUseFirebaseGooglePopup(
  hostname = typeof window !== "undefined" ? window.location?.hostname : ""
) {
  return String(hostname || "").trim().toLowerCase().endsWith(".vercel.app");
}

let googleIdentityScriptPromise = null;

function loadGoogleIdentityServices() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services requires a browser."));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google.accounts.oauth2);
  }
  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-nexus-gis="true"]');
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.google?.accounts?.oauth2) resolve(window.google.accounts.oauth2);
          else reject(new Error("Google Identity Services failed to initialize."));
        });
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Google Identity Services."))
        );
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.nexusGis = "true";
      script.onload = () => {
        if (window.google?.accounts?.oauth2) resolve(window.google.accounts.oauth2);
        else reject(new Error("Google Identity Services failed to initialize."));
      };
      script.onerror = () => {
        googleIdentityScriptPromise = null;
        reject(new Error("Failed to load Google Identity Services."));
      };
      document.head.appendChild(script);
    });
  }
  return googleIdentityScriptPromise;
}

/**
 * Google sign-in via GIS token client + Firebase credential exchange.
 * Avoids Firebase /__/auth helper popups/redirects that currently fail with
 * auth/internal-error on production Safari/WebKit.
 */
export async function signInWithGoogleIdentityServices(auth, { rememberMe = true } = {}) {
  await applyAuthPersistence(auth, rememberMe);
  const oauth2 = await loadGoogleIdentityServices();

  const accessToken = await new Promise((resolve, reject) => {
    try {
      const client = oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: "openid email profile",
        prompt: "select_account",
        callback: (response) => {
          if (response?.error) {
            const error = new Error(response.error_description || response.error);
            error.code = response.error;
            reject(error);
            return;
          }
          if (!response?.access_token) {
            reject(new Error("Google sign-in returned no access token."));
            return;
          }
          resolve(response.access_token);
        },
        error_callback: (error) => {
          const err = new Error(error?.message || "Google sign-in was cancelled.");
          err.code =
            error?.type === "popup_closed"
              ? "auth/popup-closed-by-user"
              : error?.type || "auth/internal-error";
          reject(err);
        },
      });
      client.requestAccessToken();
    } catch (error) {
      reject(error);
    }
  });

  if (firebaseAppCheckEnabled && appCheckReady) {
    await appCheckReady;
  }

  const credential = GoogleAuthProvider.credential(null, accessToken);
  return signInWithCredential(auth, credential);
}

/**
 * Selects the Google auth transport for the current deployment origin.
 *
 * Stable/custom origins use GIS so production browsers do not depend on the
 * Firebase redirect helper's third-party storage. Vercel deployments use the
 * Firebase popup because Firebase authorizes the app hostname directly while
 * Google's JavaScript-origin allowlist may lag after a deployment alias is
 * added. Redirect fallback is deliberately disabled on Vercel because an
 * empty third-party redirect result would only make the user repeat sign-in.
 */
export async function signInWithGoogleProvider(
  auth,
  {
    rememberMe = true,
    returnPath = "/",
    hostname = typeof window !== "undefined" ? window.location?.hostname : "",
    intent = "signin",
  } = {}
) {
  if (shouldUseFirebaseGooglePopup(hostname)) {
    return signInWithOAuthProvider(auth, GoogleAuthProvider, {
      rememberMe,
      returnPath,
      method: "google",
      redirectFallback: false,
      intent,
    });
  }

  try {
    return await signInWithGoogleIdentityServices(auth, { rememberMe });
  } catch (error) {
    if (!shouldFallbackToAuthRedirect(error)) throw error;
    return redirectSignInWithOAuthProvider(auth, GoogleAuthProvider, {
      rememberMe,
      returnPath,
      method: "google",
      intent,
    });
  }
}

export function isMissingRedirectStateError(error) {
  const message = String(error?.message || error?.code || "");
  return MISSING_REDIRECT_STATE_RE.test(message);
}

export function getFriendlyAuthErrorMessage(error) {
  if (isMissingRedirectStateError(error)) {
    return "Sign-in was interrupted because browser storage was cleared or blocked. Please try again in the same tab, without private browsing extensions that block storage.";
  }
  if (error?.code === "auth/redirect-empty-result") {
    return "Sign-in redirect finished without a session. Please try Google sign-in again.";
  }
  if (error?.code === "auth/popup-blocked") {
    return "The sign-in popup was blocked. Allow popups for this site or try again to use a full-page redirect.";
  }
  if (error?.code === "auth/popup-closed-by-user") {
    return "Sign-in was cancelled before it finished.";
  }
  if (error?.code === "auth/internal-error") {
    return "Google sign-in could not complete in this browser session. Please try again, allow popups, or use email sign-in.";
  }
  if (
    error?.code === "auth/firebase-app-check-token-is-invalid" ||
    error?.code === "auth/firebase-app-check-token-is-invalid." ||
    String(error?.message || "").includes("app-check-token-is-invalid")
  ) {
    return "Sign-in was blocked by Firebase App Check. Refresh the page and try again; if it keeps failing, App Check may be misconfigured for this site.";
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

function storeRedirectContext(returnPath, method, intent = "signin") {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_RETURN_KEY, returnPath || "/");
    if (method) sessionStorage.setItem(AUTH_REDIRECT_METHOD_KEY, method);
    sessionStorage.setItem(AUTH_REDIRECT_INTENT_KEY, intent === "signup" ? "signup" : "signin");
  } catch (_) {
    // Ignore storage failures; redirect may still work on same-origin flows.
  }
}

export function readRedirectContext() {
  try {
    return {
      returnPath: sessionStorage.getItem(AUTH_REDIRECT_RETURN_KEY) || "/",
      method: sessionStorage.getItem(AUTH_REDIRECT_METHOD_KEY) || null,
      intent: sessionStorage.getItem(AUTH_REDIRECT_INTENT_KEY) || "signin",
    };
  } catch (_) {
    return { returnPath: "/", method: null, intent: "signin" };
  }
}

export function clearRedirectContext() {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_RETURN_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_METHOD_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_INTENT_KEY);
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
  {
    rememberMe = false,
    returnPath = "/",
    method = "oauth",
    redirectFallback = true,
    intent = "signin",
  } = {}
) {
  await applyAuthPersistence(auth, rememberMe);
  const provider = new ProviderClass();
  if (method === "google" && typeof provider.setCustomParameters === "function") {
    provider.setCustomParameters({ prompt: "select_account" });
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const shouldFallbackToRedirect =
      redirectFallback && shouldFallbackToAuthRedirect(error);
    if (!shouldFallbackToRedirect) {
      throw error;
    }

    storeRedirectContext(returnPath, method, intent);
    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function redirectSignInWithOAuthProvider(
  auth,
  ProviderClass,
  { rememberMe = false, returnPath = "/", method = "oauth", intent = "signin" } = {}
) {
  await applyAuthPersistence(auth, rememberMe);
  const provider = new ProviderClass();
  if (method === "google" && typeof provider.setCustomParameters === "function") {
    provider.setCustomParameters({ prompt: "select_account" });
  }
  storeRedirectContext(returnPath, method, intent);
  await signInWithRedirect(auth, provider);
  return null;
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
