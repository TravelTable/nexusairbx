"use client";

import { useEffect, useState } from "react";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10131b]";

export default function PublicAccountState({ mobile = false }) {
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

  const wrapperClass = mobile ? "grid gap-2" : "flex items-center gap-2";
  const primaryClass = `${focusClass} inline-flex h-10 items-center justify-center rounded-md bg-[#00f5d4] px-4 text-sm font-semibold text-[#06100e] transition-colors hover:bg-[#32f7dc]`;
  const secondaryClass = `${focusClass} inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-3.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white`;

  if (!authReady) {
    return (
      <div className={wrapperClass} aria-label="Loading account controls">
        <span className="h-10 w-20 animate-pulse rounded-md bg-white/[0.06]" aria-hidden="true" />
        <span className="h-10 w-28 animate-pulse rounded-md bg-white/[0.06]" aria-hidden="true" />
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
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#00f5d4] px-1.5 text-[11px] font-bold text-[#06100e]" aria-label={`${supportUnreadCount} unread support ${supportUnreadCount === 1 ? "reply" : "replies"}`}>
              {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
            </span>
          ) : null}
          <span aria-hidden="true" className="text-[10px] text-zinc-500 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className={mobile
          ? "mt-2 rounded-md border border-white/10 bg-[#090b11] p-2"
          : "absolute right-0 top-12 z-50 w-64 rounded-lg border border-white/10 bg-[#10131b] p-2 shadow-xl shadow-black/30"
        }>
          <p className="truncate border-b border-white/10 px-3 pb-2 pt-1 text-xs text-zinc-500" title={account.email}>
            {account.email}
          </p>
          <a className={`${focusClass} mt-1 block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] hover:text-white`} href="/settings?tab=roblox">
            Roblox + Studio
          </a>
          <a className={`${focusClass} block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] hover:text-white`} href="/billing">
            Billing
          </a>
          <a className={`${focusClass} block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] hover:text-white`} href="/settings">
            Settings
          </a>
          <a className={`${focusClass} flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] hover:text-white`} href="/support">
            <span>Support</span>
            {supportUnreadCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#00f5d4] px-1.5 text-[11px] font-bold text-[#06100e]">
                {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
              </span>
            ) : null}
          </a>
          <button
            className={`${focusClass} block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06] hover:text-white disabled:cursor-wait disabled:text-zinc-500`}
            type="button"
            onClick={handleSignOut}
            disabled={signOutState === "loading"}
          >
            {signOutState === "loading" ? "Signing out…" : "Sign out"}
          </button>
          {signOutState === "error" ? (
            <p className="px-3 pb-1 pt-2 text-xs text-rose-300" role="status">
              Could not sign out. Try again.
            </p>
          ) : null}
        </div>
      </details>
      <a className={primaryClass} href="/ai">Open workspace</a>
    </div>
  );
}
