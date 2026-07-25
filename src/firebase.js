import { initializeApp, getApps, setLogLevel } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import {
  getFirestoreTransportOptions,
  shouldUsePersistentFirestoreCache,
} from "./lib/firestoreTransport";
import {
  isFirebaseAppCheckEnabled,
  isLocalAppCheckDebugAllowed,
  readFirebaseConfig,
  validateFirebaseAppCheckSiteKey,
  validateFirebaseConfig,
} from "./lib/firebaseEnvironment";

// Keep Firebase SDK transport retries off the browser console; failures are
// reported server-side via deferredClientLog when they persist.
setLogLevel("silent");

export const firebaseConfig = validateFirebaseConfig(readFirebaseConfig());
export const firebaseAppCheckEnabled = isFirebaseAppCheckEnabled();
export const firebaseAppCheckSiteKey = firebaseAppCheckEnabled
  ? validateFirebaseAppCheckSiteKey(
      process.env.REACT_APP_RECAPTCHA_SITE_KEY,
      { required: true }
    )
  : "";

// Prevent double-init during HMR
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const APP_CHECK_INSTANCE_KEY = "__nexusrbxFirebaseAppCheck";

export function initializeFirebaseAppCheck(
  firebaseApp,
  {
    windowObject = typeof window !== "undefined" ? window : undefined,
    documentObject = typeof document !== "undefined" ? document : undefined,
    environment = process.env.NODE_ENV,
    enabled = true,
    siteKey = firebaseAppCheckSiteKey,
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

  if (!enabled) {
    return null;
  }

  if (!siteKey) {
    if (environment === "production") {
      return validateFirebaseAppCheckSiteKey(siteKey, { required: true });
    }
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

  if (
    isLocalAppCheckDebugAllowed({
      environment,
      hostname: windowObject.location?.hostname,
    })
  ) {
    // `true` asks the SDK to generate a local debug token for registration.
    // An explicitly supplied token supports stable local automation.
    windowObject.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
  }

  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  windowObject[APP_CHECK_INSTANCE_KEY] = appCheck;
  return appCheck;
}

export const appCheck = initializeFirebaseAppCheck(app, {
  enabled: firebaseAppCheckEnabled,
});

const APP_CHECK_THROTTLE_RE =
  /exchangeRecaptchaV3Token|too many requests|throttl|resource.exhausted|status of 403/i;

export function classifyFirebaseAppCheckError(error, now = Date.now()) {
  const message = String(error?.message || "Firebase App Check token unavailable");
  const throttled =
    APP_CHECK_THROTTLE_RE.test(message) ||
    error?.status === 429 ||
    error?.code === "appCheck/throttled";
  return {
    status: throttled ? "throttled" : "failed",
    ready: false,
    available: false,
    retryable: throttled,
    retryAt: throttled ? now + 24 * 60 * 60 * 1000 : null,
    error,
  };
}

export function waitForFirebaseAppCheck(
  appCheckInstance,
  {
    environment = process.env.NODE_ENV,
    enabled = true,
    getTokenFn = getToken,
  } = {}
) {
  if (!enabled) {
    return Promise.resolve({
      status: "disabled",
      ready: true,
      available: false,
      disabled: true,
      retryable: false,
      retryAt: null,
    });
  }

  if (environment === "test") {
    return Promise.resolve({
      status: "unavailable",
      ready: false,
      available: false,
      skipped: true,
    });
  }

  if (!appCheckInstance) {
    const error = new Error("Firebase App Check is not initialized.");
    if (environment === "production" && typeof window !== "undefined") {
      console.error("Firebase App Check is unavailable", {
        projectId: firebaseConfig.projectId,
        message: error.message,
      });
    }
    return Promise.resolve({
      status: "unavailable",
      ready: false,
      available: false,
      retryable: false,
      error,
    });
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
      return {
        status: "ready",
        ready: true,
        available: true,
        retryable: false,
        retryAt: null,
      };
    })
    .catch((error) => {
      console.error("Firebase App Check token unavailable", {
        projectId: firebaseConfig.projectId,
        message: error?.message || "Unknown App Check error",
      });
      return classifyFirebaseAppCheckError(error);
    });
}

export const appCheckReady = waitForFirebaseAppCheck(appCheck, {
  enabled: firebaseAppCheckEnabled,
});

// App Check is initialized before any Firebase service that can make network
// requests. Every consumer imports these shared singleton service instances.
export const auth = getAuth(app);
const firestoreOptions = getFirestoreTransportOptions();

// Keep previously-read documents in IndexedDB and coordinate that cache across
// tabs where the browser supports it reliably. Safari uses Firestore's default
// memory cache because persistent multi-tab IndexedDB can stall SDK startup.
if (
  process.env.NODE_ENV !== "test" &&
  shouldUsePersistentFirestoreCache()
) {
  firestoreOptions.localCache = persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  });
}

export const db = initializeFirestore(app, firestoreOptions);
export const functions = getFunctions(app);
export const storage = getStorage(app);

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
