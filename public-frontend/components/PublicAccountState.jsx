"use client";

import { createContext, useContext, useEffect, useState } from "react";

const PublicAccountContext = createContext(null);

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-overlay)]";

export function PublicAccountProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [signOutState, setSignOutState] = useState("idle");
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    async function subscribeToAuth() {
      try {
        const [{ auth }, { onAuthStateChanged }] = await Promise.all([
          import("../../src/firebase"),
          import("firebase/auth"),
        ]);
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setAccount(user ? { email: user.email || "Signed in" } : null);
          if (!user) setSupportUnreadCount(0);
          setAuthReady(true);
        });
      } catch (_) {
        if (!cancelled) setAuthReady(true);
      }
    }

    void subscribeToAuth();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!account) return undefined;
    let active = true;

    async function refreshUnreadCount() {
      try {
        const { getSupportUnreadCount } = await import("../../src/lib/supportApi");
        const count = await getSupportUnreadCount();
        if (active) setSupportUnreadCount(count);
      } catch (_) {
        // Public navigation remains usable if support is temporarily unavailable.
      }
    }

    void refreshUnreadCount();
    const timer = window.setInterval(refreshUnreadCount, 60_000);
    window.addEventListener("nexusrbx:support-unread-changed", refreshUnreadCount);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("nexusrbx:support-unread-changed", refreshUnreadCount);
    };
  }, [account]);

  async function handleSignOut() {
    setSignOutState("loading");
    try {
      const [{ auth }, { signOut }] = await Promise.all([
        import("../../src/firebase"),
        import("firebase/auth"),
      ]);
      await signOut(auth);
      setSignOutState("idle");
    } catch (_) {
      setSignOutState("error");
    }
  }

  return (
    <PublicAccountContext.Provider
      value={{ account, authReady, signOutState, supportUnreadCount, handleSignOut }}
    >
      {children}
    </PublicAccountContext.Provider>
  );
}

export default function PublicAccountState({ mobile = false }) {
  const accountState = useContext(PublicAccountContext);
  if (!accountState) return null;

  const { account, authReady, signOutState, supportUnreadCount, handleSignOut } = accountState;

  const wrapperClass = mobile ? "grid gap-2" : "flex items-center gap-2";
  const controlHeightClass = "h-11";
  const primaryClass = `${focusClass} ${controlHeightClass} inline-flex items-center justify-center rounded-full bg-[var(--ds-text)] px-5 text-[13px] font-semibold text-[var(--ds-bg-canvas)] transition-[background-color,transform] hover:bg-[var(--ds-text-secondary)] active:scale-[0.98] active:bg-[var(--ds-text-secondary)] motion-reduce:transform-none`;
  const secondaryClass = `${focusClass} ${controlHeightClass} inline-flex items-center justify-center rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] px-4 text-[13px] font-medium text-[var(--ds-text-secondary)] transition-[background-color,border-color,color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] motion-reduce:transform-none`;
  const menuItemClass = `${focusClass} flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--ds-text-secondary)] transition-[background-color,color] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]`;

  if (!authReady) {
    return (
      <div className={wrapperClass} aria-label="Loading account controls">
        <span className={`${controlHeightClass} w-20 animate-pulse rounded-lg bg-[var(--ds-fill-subtle)] motion-reduce:animate-none`} aria-hidden="true" />
        <span className={`${controlHeightClass} w-28 animate-pulse rounded-lg bg-[var(--ds-fill-subtle)] motion-reduce:animate-none`} aria-hidden="true" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className={wrapperClass}>
        <a className={secondaryClass} href="/signin">Sign in</a>
        <a className={primaryClass} href="/signup">Start free</a>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <details className="group relative">
        <summary className={`${secondaryClass} w-full cursor-pointer list-none gap-1.5 [&::-webkit-details-marker]:hidden`}>
          Account
          {supportUnreadCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ds-accent)] px-1.5 text-[11px] font-bold text-[var(--ds-accent-foreground)]" aria-label={`${supportUnreadCount} unread support ${supportUnreadCount === 1 ? "reply" : "replies"}`}>
              {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
            </span>
          ) : null}
          <span aria-hidden="true" className="text-[10px] text-[var(--ds-text-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none">▾</span>
        </summary>
        <div className={mobile
          ? "mt-2 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-2"
          : "absolute right-0 top-12 z-50 w-64 origin-top-right rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-2 shadow-xl shadow-black/10"
        }>
          <p className="truncate border-b border-[var(--ds-border-subtle)] px-3 pb-2 pt-1 text-xs text-[var(--ds-text-muted)]" title={account.email}>
            {account.email}
          </p>
          <a className={`${menuItemClass} mt-1`} href="/settings?tab=roblox">
            Roblox + Studio
          </a>
          <a className={menuItemClass} href="/billing">
            Billing
          </a>
          <a className={menuItemClass} href="/settings">
            Settings
          </a>
          <a className={`${menuItemClass} justify-between gap-3`} href="/support">
            <span>Support</span>
            {supportUnreadCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ds-accent)] px-1.5 text-[11px] font-bold text-[var(--ds-accent-foreground)]">
                {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
              </span>
            ) : null}
          </a>
          <button
            className={`${menuItemClass} w-full text-left disabled:cursor-wait disabled:text-[var(--ds-text-muted)]`}
            type="button"
            onClick={handleSignOut}
            disabled={signOutState === "loading"}
          >
            {signOutState === "loading" ? "Signing out…" : "Sign out"}
          </button>
          {signOutState === "error" ? (
            <p className="px-3 pb-1 pt-2 text-xs text-[var(--ds-danger)]" role="status">
              Could not sign out. Try again.
            </p>
          ) : null}
        </div>
      </details>
      <a className={primaryClass} href="/ai">Open workspace</a>
    </div>
  );
}
