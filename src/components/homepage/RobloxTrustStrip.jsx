import { useEffect, useState } from "react";
import { Gamepad2, Code } from "lib/icons";
import { shouldUseLocalDevelopmentAuth } from "lib/localDevelopmentAuth";

import PluginCallout from "./PluginCallout";

function GoogleIcon({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 20 20" fill="none">
      <path
        d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.5a4.7 4.7 0 01-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.43z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.3-2.56c-.92.62-2.1.99-3.33.99-2.56 0-4.73-1.73-5.5-4.06H1.09v2.6A9.99 9.99 0 0010 20z"
        fill="#34A853"
      />
      <path
        d="M4.5 11.93A5.99 5.99 0 014.13 10c0-.67.12-1.33.37-1.93V5.47H1.09A9.99 9.99 0 000 10c0 1.64.39 3.19 1.09 4.53l3.41-2.6z"
        fill="#FBBC05"
      />
      <path
        d="M10 4.01c1.47 0 2.78.51 3.81 1.51l2.85-2.85C14.97 1.09 12.7 0 10 0A9.99 9.99 0 001.09 5.47l3.41 2.6C5.27 5.74 7.44 4.01 10 4.01z"
        fill="#EA4335"
      />
    </svg>
  );
}

function useHomepageAuthState(providedUser, providedAuthReady) {
  const [publicAuth, setPublicAuth] = useState({ user: null, authReady: false });
  const hasProvidedAuth = typeof providedAuthReady === "boolean";

  useEffect(() => {
    if (hasProvidedAuth) return undefined;

    let cancelled = false;
    let unsubscribe = () => {};

    async function subscribeToAuth() {
      try {
        const [{ auth }, { onAuthStateChanged }] = await Promise.all([
          import("../../firebase"),
          import("firebase/auth"),
        ]);
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setPublicAuth({ user, authReady: true });
        });
      } catch (_) {
        if (!cancelled) setPublicAuth({ user: null, authReady: true });
      }
    }

    void subscribeToAuth();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hasProvidedAuth]);

  return hasProvidedAuth
    ? { user: providedUser || null, authReady: providedAuthReady }
    : publicAuth;
}

export default function RobloxTrustStrip({ user: providedUser, authReady: providedAuthReady }) {
  const localDevelopmentAuth = shouldUseLocalDevelopmentAuth();
  const { user, authReady } = useHomepageAuthState(providedUser, providedAuthReady);
  const pillClass =
    "inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-2 text-xs font-medium text-[var(--ds-text-secondary)]";

  return (
    <div className="relative mt-6 w-full max-w-2xl pb-10 lg:pb-11">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className={pillClass}>
          <Gamepad2 className="h-3.5 w-3.5" />
          Roblox OAuth Verified
        </span>

        {localDevelopmentAuth || (authReady && user) ? (
          <a href="/ai" className={pillClass + " transition-[background-color,border-color,color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] motion-reduce:transform-none"}>
            <Code className="h-3.5 w-3.5" />
            {localDevelopmentAuth ? "Local developer session" : "Open AI workspace"}
          </a>
        ) : !authReady ? (
          <span className={pillClass} role="status">
            Checking account...
          </span>
        ) : (
          <a href="/signin" className={pillClass + " transition-[background-color,border-color,color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] motion-reduce:transform-none"}>
            <GoogleIcon />
            Sign in with Google
          </a>
        )}

        <div className="relative inline-flex">
          <a
            href="https://create.roblox.com/store/asset/83865885181263/NexusRBX-Ai"
            target="_blank"
            rel="noopener noreferrer"
            className={pillClass + " transition-[background-color,border-color,color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] motion-reduce:transform-none"}
          >
            <Code className="h-3.5 w-3.5" />
            Built for Roblox Studio
          </a>
          <PluginCallout className="hidden lg:block" />
        </div>
      </div>
    </div>
  );
}
