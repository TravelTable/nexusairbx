import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  clearRedirectContext,
  consumeAuthRedirectResult,
  readRedirectContext,
} from "../lib/firebaseAuth";

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
      const destination = fromState || stored.returnPath || "/";
      navigate(destination, { replace: true });
    })().catch((error) => {
      if (cancelled) return;
      console.warn("Auth redirect handling failed:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [location.state, navigate]);

  return null;
}
