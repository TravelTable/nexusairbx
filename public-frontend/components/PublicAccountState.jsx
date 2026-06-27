"use client";

import { useEffect, useState } from "react";

export default function PublicAccountState() {
  const [email, setEmail] = useState("");

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
        });
      } catch (_) {
        // Public pages keep the anonymous sign-in link if Firebase is unavailable.
      }
    }

    void subscribeToAuth();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (email) {
    return (
      <a className="account-link" href="/ai" aria-label={`Open workspace for ${email}`}>
        Workspace
      </a>
    );
  }

  return <a className="account-link" href="/signin">Sign in</a>;
}
