"use client";

import { createContext, useContext, useEffect, useState } from "react";

const PublicAccountContext = createContext(null);

const focusClass = "focus-visible:outline-none";

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

export default function PublicAccountState({ mobile = false, compact = false }) {
  const accountState = useContext(PublicAccountContext);
  if (!accountState) return null;

  const { account, authReady, signOutState, supportUnreadCount, handleSignOut } = accountState;

  const wrapperClass = compact ? "flex items-center" : mobile ? "grid gap-2" : "flex items-center gap-3";
  const controlHeightClass = "h-11 md:h-9";
  const primaryClass = `${focusClass} ${controlHeightClass} inline-flex items-center justify-center border-0 border-b border-[var(--nx-text-secondary)] bg-transparent px-[9px] text-[13px] font-semibold text-[var(--nx-text)] no-underline hover:border-[var(--nx-purple-muted)] hover:text-[var(--nx-purple)]`;
  const secondaryClass = `${focusClass} ${controlHeightClass} inline-flex items-center justify-center border-0 border-b border-[var(--nx-rule)] bg-transparent px-[9px] text-[13px] font-medium text-[var(--nx-text-secondary)] no-underline hover:border-[var(--nx-text-secondary)] hover:text-[var(--nx-text)]`;
  const menuItemClass = `${focusClass} flex min-h-11 items-center border-b border-[var(--nx-rule-quiet)] px-[9px] text-sm text-[var(--nx-text-secondary)] no-underline hover:text-[var(--nx-purple)]`;

  if (!authReady) {
    return (
      <div className={`${wrapperClass} text-[12px] font-semibold tracking-[0.055em] text-[var(--nx-text-muted)]`} role="status">
        ACCOUNT / CHECKING
      </div>
    );
  }

  if (!account) {
    if (compact) {
      return <a className={`${focusClass} inline-flex h-11 items-center rounded-full border border-[var(--nx-rule)] bg-[var(--nx-card)] px-3 text-xs font-semibold text-[var(--nx-text)] no-underline shadow-[var(--nx-shadow-control)] md:h-9`} href="/signin">Sign in</a>;
    }
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
            <span className="inline-flex min-w-5 items-center justify-center border border-[var(--nx-rule)] px-1.5 text-[11px] font-bold text-[var(--nx-warning)]" aria-label={`${supportUnreadCount} unread support ${supportUnreadCount === 1 ? "reply" : "replies"}`}>
              {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
            </span>
          ) : null}
          <span aria-hidden="true" className="text-[10px] text-[var(--nx-text-muted)]">/</span>
        </summary>
        <div className={mobile
          ? "mt-[9px] border border-[var(--nx-rule)] bg-[var(--nx-work)] p-[9px]"
          : "absolute right-0 top-12 z-50 w-64 border border-[var(--nx-rule)] bg-[var(--nx-work)] p-[9px]"
        }>
          <p className="truncate border-b border-[var(--nx-rule)] px-[9px] pb-[9px] pt-[5px] text-xs text-[var(--nx-text-muted)]" title={account.email}>
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
              <span className="inline-flex min-w-5 items-center justify-center border border-[var(--nx-rule)] px-1.5 text-[11px] font-bold text-[var(--nx-warning)]">
                {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
              </span>
            ) : null}
          </a>
          <button
            className={`${menuItemClass} w-full bg-transparent text-left disabled:cursor-wait disabled:text-[var(--nx-text-muted)]`}
            type="button"
            onClick={handleSignOut}
            disabled={signOutState === "loading"}
          >
            {signOutState === "loading" ? "Signing out…" : "Sign out"}
          </button>
          {signOutState === "error" ? (
            <p className="px-[9px] pb-[5px] pt-[9px] text-xs text-[var(--nx-danger)]" role="status">
              Could not sign out. Try again.
            </p>
          ) : null}
        </div>
      </details>
      {!compact ? <a className={primaryClass} href="/ai">Open workspace</a> : null}
    </div>
  );
}
