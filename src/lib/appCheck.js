import { getToken } from "firebase/app-check";
import { appCheck, appCheckReady } from "../firebase";
import { BACKEND_URL } from "../config";
import { NexusApiError } from "./apiErrors";

function appCheckUnavailableError(state, cause) {
  const throttled = state?.status === "throttled";
  const retryAfterMs = state?.retryAt
    ? Math.max(0, Number(state.retryAt) - Date.now())
    : null;
  return new NexusApiError(
    throttled
      ? "Browser integrity verification is temporarily throttled."
      : "Browser integrity verification is unavailable.",
    {
      status: 403,
      code: throttled ? "APP_CHECK_THROTTLED" : "APP_CHECK_UNAVAILABLE",
      kind: "app_check",
      retryable: throttled,
      retryAfterMs,
      retryAfter:
        retryAfterMs == null ? null : String(Math.ceil(retryAfterMs / 1000)),
      cause,
    }
  );
}

// Never surface or log the token: it is added only to outgoing backend requests.
export async function getFirebaseAppCheckHeaders({
  required = false,
} = {}) {
  if (typeof window === "undefined" || !appCheck) {
    if (required) throw appCheckUnavailableError({ status: "unavailable" });
    return {};
  }

  try {
    const readiness = appCheckReady ? await appCheckReady : null;
    if (readiness && readiness.status !== "ready") {
      if (required) throw appCheckUnavailableError(readiness, readiness.error);
      return {};
    }
    const result = await getToken(appCheck);
    if (result?.token) return { "X-Firebase-AppCheck": result.token };
    if (required) throw appCheckUnavailableError({ status: "failed" });
    return {};
  } catch (error) {
    if (error instanceof NexusApiError) throw error;
    if (required) throw appCheckUnavailableError({ status: "failed" }, error);
    return {};
  }
}

function isBackendRequest(input, backendUrl, pageOrigin) {
  try {
    const target = input instanceof Request ? input.url : input;
    return new URL(target, pageOrigin).origin === new URL(backendUrl, pageOrigin).origin;
  } catch (_) {
    return false;
  }
}

// Most API calls in this legacy SPA use fetch directly. Installing a narrowly
// scoped wrapper keeps the token attached to this backend only, rather than
// relying on every feature to remember a security header. It does not affect
// Firebase, Stripe, Roblox, or third-party requests.
export function installAppCheckFetchInterceptor({
  windowObject = typeof window !== "undefined" ? window : null,
  backendUrl = BACKEND_URL,
} = {}) {
  if (!windowObject?.fetch || windowObject.__nexusAppCheckFetchInstalled) return;

  const originalFetch = windowObject.fetch.bind(windowObject);
  windowObject.__nexusAppCheckFetchInstalled = true;
  windowObject.fetch = async (input, init = {}) => {
    if (!isBackendRequest(input, backendUrl, windowObject.location?.origin)) {
      return originalFetch(input, init);
    }

    const appCheckHeaders = await getFirebaseAppCheckHeaders();
    if (!appCheckHeaders["X-Firebase-AppCheck"]) return originalFetch(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers || undefined).forEach((value, key) => headers.set(key, value));
    headers.set("X-Firebase-AppCheck", appCheckHeaders["X-Firebase-AppCheck"]);
    return originalFetch(input, { ...init, headers });
  };
}
