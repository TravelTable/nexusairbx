import { getToken } from "firebase/app-check";
import { appCheck } from "../firebase";
import { BACKEND_URL } from "../config";

// App Check is deliberately optional while the backend is in monitor mode.
// Never surface or log the token: it is added only to the outgoing request.
export async function getFirebaseAppCheckHeaders() {
  if (typeof window === "undefined" || !appCheck) return {};

  try {
    const result = await getToken(appCheck);
    return result?.token ? { "X-Firebase-AppCheck": result.token } : {};
  } catch (_) {
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
