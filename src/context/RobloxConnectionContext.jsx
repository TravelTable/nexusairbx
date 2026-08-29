import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useBilling } from "./BillingContext";
import { getRobloxOAuthStatus, requireRobloxOnboarding } from "../lib/robloxOAuthApi";

const RobloxConnectionContext = createContext(null);
const DEFAULT_STALE_MS = 60_000;
const FALLBACK_CONTEXT = Object.freeze({
  user: null,
  authReady: false,
  status: null,
  phase: "checking",
  error: null,
  loading: true,
  connected: false,
  onboarding: Object.freeze({ required: false, requiredCapabilities: [], satisfied: true, gateActive: false }),
  refresh: async () => null,
  registerOnboardingRequirement: async () => null,
});

export function RobloxConnectionProvider({ children, staleMs = DEFAULT_STALE_MS }) {
  const billing = useBilling() || {};
  const user = billing.user || null;
  const uid = user?.uid || null;
  const authReady = billing.authReady === true;
  const [status, setStatus] = useState(null);
  const [statusUid, setStatusUid] = useState(null);
  const [phase, setPhase] = useState("checking");
  const [error, setError] = useState(null);
  const lastUpdatedAtRef = useRef(0);
  const inFlightRef = useRef(null);
  const uidRef = useRef(uid);
  const statusRef = useRef(status);

  uidRef.current = uid;
  statusRef.current = status;

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (!uid) {
      setStatus(null);
      setStatusUid(null);
      setError(null);
      setPhase(authReady ? "idle" : "checking");
      return null;
    }
    const currentStatus = statusRef.current;
    if (!force && currentStatus && Date.now() - lastUpdatedAtRef.current < staleMs) return currentStatus;
    if (inFlightRef.current?.uid === uid) return inFlightRef.current.promise;

    setPhase(currentStatus ? "refreshing" : "checking");
    setError(null);
    const promise = getRobloxOAuthStatus()
      .then((nextStatus) => {
        if (uidRef.current !== uid) return null;
        setStatus(nextStatus);
        setStatusUid(uid);
        setPhase(nextStatus.connected ? "connected" : "disconnected");
        setError(null);
        lastUpdatedAtRef.current = Date.now();
        return nextStatus;
      })
      .catch((nextError) => {
        if (uidRef.current !== uid) return null;
        setStatusUid(uid);
        setError(nextError);
        const lastStatus = statusRef.current;
        setPhase(lastStatus ? (lastStatus.connected ? "connected" : "disconnected") : "unavailable");
        return null;
      })
      .finally(() => {
        if (inFlightRef.current?.promise === promise) inFlightRef.current = null;
      });
    inFlightRef.current = { uid, promise };
    return promise;
  }, [authReady, staleMs, uid]);

  const registerOnboardingRequirement = useCallback(async () => {
    await requireRobloxOnboarding();
    return refresh({ force: true });
  }, [refresh]);

  useEffect(() => {
    lastUpdatedAtRef.current = 0;
    inFlightRef.current = null;
    if (!uid) {
      setStatus(null);
      setStatusUid(null);
      setError(null);
      setPhase(authReady ? "idle" : "checking");
      return;
    }
    setStatus(null);
    setStatusUid(uid);
    setError(null);
    setPhase("checking");
    void refresh({ force: true });
  }, [authReady, refresh, uid]);

  useEffect(() => {
    if (!uid) return undefined;
    const refreshIfStale = () => {
      if (Date.now() - lastUpdatedAtRef.current >= staleMs) void refresh();
    };
    window.addEventListener("focus", refreshIfStale);
    window.addEventListener("online", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      window.removeEventListener("online", refreshIfStale);
    };
  }, [refresh, staleMs, uid]);

  const scopedStatus = uid && statusUid === uid ? status : null;
  const scopedError = uid && statusUid === uid ? error : null;
  const scopedPhase = !uid
    ? (authReady ? "idle" : "checking")
    : statusUid === uid
      ? phase
      : "checking";

  const value = useMemo(() => ({
    user,
    authReady,
    status: scopedStatus,
    phase: scopedPhase,
    error: scopedError,
    loading: scopedPhase === "checking" || scopedPhase === "refreshing",
    connected: scopedStatus?.connected === true,
    onboarding: scopedStatus?.onboarding || {
      required: false,
      requiredCapabilities: [],
      satisfied: true,
      gateActive: false,
    },
    refresh,
    registerOnboardingRequirement,
  }), [authReady, refresh, registerOnboardingRequirement, scopedError, scopedPhase, scopedStatus, user]);

  return (
    <RobloxConnectionContext.Provider value={value}>
      {children}
    </RobloxConnectionContext.Provider>
  );
}

export function useRobloxConnection() {
  return useContext(RobloxConnectionContext) || FALLBACK_CONTEXT;
}
