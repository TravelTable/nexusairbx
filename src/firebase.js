import { initializeApp, getApps, setLogLevel } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFirestoreTransportOptions } from "./lib/firestoreTransport";

// Keep Firebase SDK transport retries off the browser console; failures are
// reported server-side via deferredClientLog when they persist.
setLogLevel("silent");

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCT6UZdUWmWdaJgKYhCSAzmr0pM-UU6-Tg",
  authDomain: "nexusrbx.firebaseapp.com",
  projectId: "nexusrbx",
  storageBucket: "nexusrbx.appspot.com",
  messagingSenderId: "834738385750",
  appId: "1:834738385750:web:7f877b6dd0228c11fa1cf7",
  measurementId: "G-4V4T613MJ7",
};

// Prevent double-init during HMR
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const APP_CHECK_INSTANCE_KEY = "__nexusrbxFirebaseAppCheck";

export function initializeFirebaseAppCheck(
  firebaseApp,
  {
    windowObject = typeof window !== "undefined" ? window : undefined,
    documentObject = typeof document !== "undefined" ? document : undefined,
    environment = process.env.NODE_ENV,
    siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY,
    debugToken = process.env.REACT_APP_APP_CHECK_DEBUG_TOKEN,
  } = {}
) {
  if (
    environment === "test" ||
    !windowObject ||
    !documentObject
  ) {
    return null;
  }

  if (!siteKey) {
    if (environment === "development") {
      console.warn(
        "Firebase App Check is disabled: set REACT_APP_RECAPTCHA_SITE_KEY to enable reCAPTCHA v3."
      );
    }
    return null;
  }

  if (windowObject[APP_CHECK_INSTANCE_KEY]) {
    return windowObject[APP_CHECK_INSTANCE_KEY];
  }

  if (environment === "development" && debugToken) {
    windowObject.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  windowObject[APP_CHECK_INSTANCE_KEY] = appCheck;
  return appCheck;
}

export const appCheck = initializeFirebaseAppCheck(app);

/**
 * Probe App Check without making it a workspace startup dependency. App Check
 * remains useful telemetry while enforcement is in monitor mode, but auth and
 * Firestore must still start when the provider or token is unavailable.
 */
export function waitForFirebaseAppCheck(
  appCheckInstance,
  {
    environment = process.env.NODE_ENV,
    getTokenFn = getToken,
  } = {}
) {
  if (environment === "test") {
    return Promise.resolve({ ready: true, available: false, skipped: true });
  }

  if (!appCheckInstance) {
    const error = new Error("Firebase App Check is not initialized.");
    if (environment === "production") {
      console.error("Firebase App Check is unavailable", {
        projectId: firebaseConfig.projectId,
        message: error.message,
      });
    }
    return Promise.resolve({ ready: true, available: false, error });
  }

  return getTokenFn(appCheckInstance)
    .then((tokenResult) => {
      if (!tokenResult?.token) {
        throw new Error("Firebase App Check returned an empty token.");
      }
      if (environment === "development") {
        console.debug("Firebase App Check initial token acquired", {
          projectId: firebaseConfig.projectId,
        });
      }
      return { ready: true, available: true };
    })
    .catch((error) => {
      console.error("Firebase App Check token unavailable", {
        projectId: firebaseConfig.projectId,
        message: error?.message || "Unknown App Check error",
      });
      return { ready: true, available: false, error };
    });
}

export const appCheckReady = waitForFirebaseAppCheck(appCheck);

// Core SDKs
export const auth = getAuth(app);
const firestoreOptions = getFirestoreTransportOptions();

// Keep previously-read documents in IndexedDB and coordinate that cache across
// tabs. Firestore can then resume listeners without re-reading their full query
// result after ordinary refreshes and reconnects.
if (
  process.env.NODE_ENV !== "test" &&
  typeof window !== "undefined" &&
  typeof window.indexedDB !== "undefined"
) {
  firestoreOptions.localCache = persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  });
}

export const db = initializeFirestore(app, firestoreOptions);

// Safe, optional Analytics loader
export async function initAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("Analytics disabled (load failed):", err);
    }
    return null;
  }
}

export default app;
