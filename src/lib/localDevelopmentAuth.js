import { signInWithCustomToken } from "firebase/auth";
import { BACKEND_URL } from "../config";

export const LOCAL_DEVELOPMENT_UID = "nexusrbx-local-dev";

function isLoopbackHostname(hostname = "") {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    String(hostname || "").toLowerCase()
  );
}

export function shouldUseLocalDevelopmentAuth({
  environment = process.env.NODE_ENV,
  locationObject = typeof window !== "undefined" ? window.location : null,
  backendUrl = BACKEND_URL,
} = {}) {
  if (environment !== "development" || !locationObject) return false;
  try {
    return isLoopbackHostname(locationObject.hostname)
      && isLoopbackHostname(new URL(backendUrl).hostname);
  } catch (_) {
    return false;
  }
}

export async function ensureLocalDevelopmentAuth(
  auth,
  {
    fetchImpl = typeof fetch === "function" ? fetch : null,
    signIn = signInWithCustomToken,
    backendUrl = BACKEND_URL,
    environment = process.env.NODE_ENV,
    locationObject = typeof window !== "undefined" ? window.location : null,
  } = {}
) {
  if (!shouldUseLocalDevelopmentAuth({ environment, locationObject, backendUrl }) || !fetchImpl) {
    return null;
  }

  if (auth.currentUser?.uid === LOCAL_DEVELOPMENT_UID) return auth.currentUser;

  const response = await fetchImpl(`${backendUrl.replace(/\/$/, "")}/api/auth/local-dev-session`, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Local developer sign-in failed (${response.status}).`);
  }
  const session = await response.json();
  if (!session?.token) throw new Error("Local developer sign-in returned no token.");
  if (auth.currentUser?.uid === session.uid) return auth.currentUser;
  const credential = await signIn(auth, session.token);
  return credential?.user || auth.currentUser;
}

export function startLocalDevelopmentAuthRecovery(
  auth,
  {
    intervalMs = 2000,
    windowObject = typeof window !== "undefined" ? window : null,
    onError = (error) => console.error(
      "Automatic local developer sign-in retry failed:",
      error?.message || error
    ),
    ...authOptions
  } = {}
) {
  if (!windowObject || !shouldUseLocalDevelopmentAuth({
    environment: authOptions.environment,
    locationObject: authOptions.locationObject || windowObject.location,
    backendUrl: authOptions.backendUrl,
  })) {
    return () => {};
  }

  let disposed = false;
  let inFlight = false;
  const attempt = async () => {
    if (disposed || inFlight || auth.currentUser?.uid === LOCAL_DEVELOPMENT_UID) return;
    inFlight = true;
    try {
      await ensureLocalDevelopmentAuth(auth, {
        ...authOptions,
        locationObject: authOptions.locationObject || windowObject.location,
      });
    } catch (error) {
      onError?.(error);
    } finally {
      inFlight = false;
    }
  };

  const timer = windowObject.setInterval(attempt, intervalMs);
  windowObject.addEventListener("focus", attempt);
  windowObject.addEventListener("online", attempt);
  void attempt();

  return () => {
    disposed = true;
    windowObject.clearInterval(timer);
    windowObject.removeEventListener("focus", attempt);
    windowObject.removeEventListener("online", attempt);
  };
}
