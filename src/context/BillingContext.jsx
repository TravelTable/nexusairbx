// src/context/BillingContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase"; // keep your existing init
import {
  getEntitlements,
  summarizeEntitlements,
  startCheckout,
  startSubscriptionCheckout,
  startPremiumBalanceCheckout,
  openPortal,
  cancelSubscription,
  submitBrowserTimezone,
} from "../lib/billing";
import { onAiEvent } from "../lib/aiEvents";

const BillingCtx = createContext(null);

export function BillingProvider({ children, pollMs = 60_000 }) {
  const [user, setUser] = useState(auth.currentUser);
  const [state, setState] = useState({
    loading: true,
    error: null,
    plan: "FREE",
    cycle: null,
    subRemaining: 0,
    paygRemaining: 0,
    totalRemaining: 0,
    resetsAt: null,
    isAdmin: false,
    unlimitedTokens: false,
    devOverride: false,
    flags: {
      isAdmin: false,
      unlimitedTokens: false,
      devOverride: false,
    },
    entitlements: [],
    modelAccess: null,
    dailyUsage: null,
    fairUse: null,
    limits: null,
    isFreeUsagePlan: true,
    isPremium: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(s => ({
        ...s,
        loading: false,
        error: null,
        plan: "FREE",
        totalRemaining: 0,
        subRemaining: 0,
        paygRemaining: 0,
        resetsAt: null,
        unlimitedTokens: false,
        devOverride: false,
        flags: {
          isAdmin: false,
          unlimitedTokens: false,
          devOverride: false,
        },
        isPremium: false,
      }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const ent = await getEntitlements();
      const summary = summarizeEntitlements(ent);
      
      setState(prev => {
        return { 
          ...prev, 
          loading: false, 
          error: null, 
          ...summary,
        };
      });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err?.message || "Failed to load billing" }));
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    const unbindJob = onAiEvent("JOB_COMPLETE", () => refresh());
    const unbindJobFail = onAiEvent("JOB_FAILURE", () => refresh());
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      unbindJob();
      unbindJobFail();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, pollMs]);

  useEffect(() => {
    if (!user) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    submitBrowserTimezone(timezone).catch(() => {});
  }, [user]);

  const actions = useMemo(() => ({
    refresh,
    checkout: async (payload) => user && startCheckout(payload),
    subscriptionCheckout: async (payload) => user && startSubscriptionCheckout(payload),
    premiumBalanceCheckout: async (payload) => user && startPremiumBalanceCheckout(payload),
    portal: async () => user && openPortal(),
    cancel: async () => {
      if (!user) return;
      const res = await cancelSubscription();
      await refresh();
      return res;
    },
  }), [user, refresh]);

  return (
    <BillingCtx.Provider value={{ ...state, ...actions }}>
      {children}
    </BillingCtx.Provider>
  );
}

export function useBilling() {
  return useContext(BillingCtx);
}
