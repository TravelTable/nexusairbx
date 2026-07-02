"use client";

import { useEffect, useState } from "react";

export default function PublicAccountState() {
  const [email, setEmail] = useState("");
  const [authReady, setAuthReady] = useState(false);

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
          setEmail(user?.email || "");
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

  if (!authReady) {
    return (
      <span
        className="account-link account-link--loading"
        aria-hidden="true"
        style={{ visibility: "hidden" }}
      >
        Loading
      </span>
    );
  }

  if (email) {
    return (
      <a className="account-link" href="/ai" aria-label={`Open workspace for ${email}`}>
        Workspace
      </a>
    );
  }

  return <a className="account-link" href="/signin">Sign in</a>;
}
