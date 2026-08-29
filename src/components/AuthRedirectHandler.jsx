import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAdditionalUserInfo } from "firebase/auth";
import { auth } from "../firebase";
import {
  clearRedirectContext,
  consumeAuthRedirectResult,
  getFriendlyAuthErrorMessage,
  readRedirectContext,
  storeAuthRedirectError,
} from "../lib/firebaseAuth";
import { scheduleDeferredClientLog } from "../lib/deferredClientLog";
import { getPendingAuthReturnPath, readPendingAuthAction } from "../lib/pendingAuthAction";
import { registerRobloxSignupRequirement } from "../lib/signupRobloxOnboarding";

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

function returnPathLocation(value) {
  const parsed = new URL(safeReturnPath(value, "/ai"), "https://nexusrbx.local");
  return {
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
  };
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

      const pendingRedirect = readRedirectContext();

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

      if (!result) {
        // Popup failed, redirect ran, but Firebase returned no credential.
        // That is the storage-partition failure mode on cross-origin authDomain.
        if (pendingRedirect.method) {
          handledRef.current = true;
          clearRedirectContext();
          const emptyRedirectError = new Error(
            "Sign-in redirect finished without a session. Please try Google sign-in again."
          );
          emptyRedirectError.code = "auth/redirect-empty-result";
          const message = storeAuthRedirectError(emptyRedirectError);
          navigateToSignInWithError(navigate, location, message);
        }
        return;
      }

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
      const normalDestination = pending?.returnPath
        ? getPendingAuthReturnPath("/ai")
        : storedReturnPath || fromState || "/";
      const isNewSignup = stored.intent === "signup"
        && getAdditionalUserInfo(result)?.isNewUser === true;
      let destination = normalDestination;
      if (isNewSignup) {
        try {
          destination = await registerRobloxSignupRequirement(user, normalDestination || "/ai");
        } catch (error) {
          const message = getFriendlyAuthErrorMessage(error);
          navigate("/signup", {
            replace: true,
            state: {
              authError: message,
              from: returnPathLocation(normalDestination || "/ai"),
            },
          });
          return;
        }
      }
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
