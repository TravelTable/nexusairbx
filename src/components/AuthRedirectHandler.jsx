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

      const fromState = location.state?.from?.pathname;
      const pending = readPendingAuthAction({ includeExpired: true });
      const destination = pending?.returnPath
        ? getPendingAuthReturnPath("/ai")
        : fromState || stored.returnPath || "/";
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
