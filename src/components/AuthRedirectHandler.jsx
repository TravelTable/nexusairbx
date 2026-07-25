import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  clearRedirectContext,
  consumeAuthRedirectResult,
  readRedirectContext,
  storeAuthRedirectError,
} from "../lib/firebaseAuth";
import { debugAuthLog } from "../lib/debugAuthLog";
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

function navigateToSignInWithError(navigate, location, message) {
  if (
    location.pathname === "/signin"
    && location.state?.authError === message
  ) {
    return;
  }
  navigate("/signin", {
    replace: true,
    state: {
      authError: message,
      ...(location.state?.from ? { from: location.state.from } : {}),
    },
  });
}

export default function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (handledRef.current) return;

      const result = await consumeAuthRedirectResult(auth);
      if (cancelled || handledRef.current) return;

      // #region agent log
      debugAuthLog({
        hypothesisId: "A",
        location: "src/components/AuthRedirectHandler.jsx:result",
        message: "AuthRedirectHandler consumed redirect result",
        data: {
          pathname: location.pathname,
          hasResult: Boolean(result),
          hasError: Boolean(result?.error),
          hasUser: Boolean(result?.user),
          errorCode: result?.error?.code || null,
        },
      });
      // #endregion

      if (result?.error) {
        handledRef.current = true;
        const message = storeAuthRedirectError(result.error);
        scheduleDeferredClientLog({
          key: "auth:redirect",
          source: "firebase-auth",
          message: result.error?.message || "Auth redirect handling failed",
          metadata: { code: result.error?.code || null },
        });
        navigateToSignInWithError(navigate, location, message);
        return;
      }

      if (!result) return;

      const user = result.user;
      if (!user) return;

      handledRef.current = true;

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
      if (cancelled || handledRef.current) return;
      handledRef.current = true;
      const message = storeAuthRedirectError(error);
      scheduleDeferredClientLog({
        key: "auth:redirect",
        source: "firebase-auth",
        message: error?.message || "Auth redirect handling failed",
        metadata: { code: error?.code || null },
      });
      navigateToSignInWithError(navigate, location, message);
    });

    return () => {
      cancelled = true;
    };
  }, [location, navigate]);

  return null;
}
