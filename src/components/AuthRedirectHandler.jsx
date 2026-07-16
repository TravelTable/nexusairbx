import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  clearRedirectContext,
  consumeAuthRedirectResult,
  readRedirectContext,
} from "../lib/firebaseAuth";
import { scheduleDeferredClientLog } from "../lib/deferredClientLog";
import { getPendingAuthReturnPath, readPendingAuthAction } from "../lib/pendingAuthAction";

function safeReturnPath(value, fallback = "") {
  if (typeof value === "string") {
    return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
  }
  const pathname = typeof value?.pathname === "string" ? value.pathname : fallback;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return fallback;
  const search = typeof value?.search === "string" && value.search.startsWith("?") ? value.search : "";
  const hash = typeof value?.hash === "string" && value.hash.startsWith("#") ? value.hash : "";
  return `${pathname}${search}${hash}`;
}

export default function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await consumeAuthRedirectResult(auth);
      if (cancelled || !result || result.error) return;

      const user = result.user;
      if (!user) return;

      try {
        await user.getIdToken();
      } catch (_) {
        // Navigation can still proceed; token refresh will happen on protected routes.
      }

      const stored = readRedirectContext();
      clearRedirectContext();

      const fromState = safeReturnPath(location.state?.from);
      const storedReturnPath = stored.method ? safeReturnPath(stored.returnPath) : "";
      const pending = readPendingAuthAction({ includeExpired: true });
      const destination = pending?.returnPath
        ? getPendingAuthReturnPath("/ai")
        : storedReturnPath || fromState || "/";
      navigate(destination, { replace: true });
    })().catch((error) => {
      if (cancelled) return;
      scheduleDeferredClientLog({
        key: "auth:redirect",
        source: "firebase-auth",
        message: error?.message || "Auth redirect handling failed",
        metadata: { code: error?.code || null },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [location.state, navigate]);

  return null;
}
