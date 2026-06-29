import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

import { auth } from "../../firebase";
import { useBilling } from "../../context/BillingContext";
import { beginRobloxOAuth, beginRobloxReauthorization, getRobloxOAuthStatus } from "../../lib/robloxOAuthApi";
import {
  formatHeaderPlan,
  getRobloxProfileFromStatus,
  getRobloxUsername,
  selectHeaderAvatar,
} from "./siteHeaderIdentity";

export default function useHeaderIdentity({
  robloxStatusOverride,
  robloxLoadingOverride,
} = {}) {
  const billing = useBilling() || {};
  const user = billing.user || null;
  const location = useLocation();
  const navigate = useNavigate();
  const [robloxStatus, setRobloxStatus] = useState(null);
  const [robloxLoading, setRobloxLoading] = useState(false);
  const [robloxError, setRobloxError] = useState("");
  const [robloxAction, setRobloxAction] = useState("");

  const hasRobloxStatusOverride = typeof robloxStatusOverride !== "undefined";
  const effectiveRobloxStatus = hasRobloxStatusOverride ? robloxStatusOverride : robloxStatus;
  const effectiveRobloxLoading =
    typeof robloxLoadingOverride === "boolean" ? robloxLoadingOverride : robloxLoading;

  const refreshRobloxStatus = useCallback(async () => {
    if (!user || hasRobloxStatusOverride) return null;
    setRobloxLoading(true);
    setRobloxError("");
    try {
      const status = await getRobloxOAuthStatus();
      setRobloxStatus(status);
      return status;
    } catch (err) {
      setRobloxError(err?.message || "Could not check Roblox connection.");
      setRobloxStatus(null);
      return null;
    } finally {
      setRobloxLoading(false);
    }
  }, [hasRobloxStatusOverride, user]);

  useEffect(() => {
    if (!user) {
      setRobloxStatus(null);
      setRobloxError("");
      return;
    }
    if (hasRobloxStatusOverride) return;
    void refreshRobloxStatus();
  }, [hasRobloxStatusOverride, refreshRobloxStatus, user]);

  const robloxProfile = useMemo(
    () => getRobloxProfileFromStatus(effectiveRobloxStatus),
    [effectiveRobloxStatus]
  );
  const robloxUsername = getRobloxUsername(robloxProfile);
  const robloxConnected = effectiveRobloxStatus?.connected === true;
  const avatar = useMemo(
    () => selectHeaderAvatar({ user, robloxProfile }),
    [robloxProfile, user]
  );

  const returnPath = `${location.pathname}${location.search}${location.hash}`;

  const connectRoblox = useCallback(async () => {
    if (!user) {
      navigate("/signin", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setRobloxAction("connect");
    setRobloxError("");
    try {
      await beginRobloxOAuth({ returnPath, bundles: ["core"] });
    } catch (err) {
      setRobloxError(err?.message || "Could not start Roblox connection.");
    } finally {
      setRobloxAction("");
    }
  }, [location.pathname, navigate, returnPath, user]);

  const reconnectRoblox = useCallback(async () => {
    if (!user) {
      navigate("/signin", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setRobloxAction("reconnect");
    setRobloxError("");
    try {
      await beginRobloxReauthorization({ returnPath, bundles: ["core"] });
    } catch (err) {
      setRobloxError(err?.message || "Could not start Roblox reauthorization.");
    } finally {
      setRobloxAction("");
    }
  }, [location.pathname, navigate, returnPath, user]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    navigate("/");
  }, [navigate]);

  const displayName = robloxUsername || user?.displayName || user?.email?.split("@")[0] || "Creator";
  const email = user?.email || "";
  const planLabel = formatHeaderPlan(billing.plan);
  const tokensLabel = billing.loading
    ? "Loading usage"
    : billing.unlimitedTokens || billing.devOverride
      ? "Unlimited usage"
      : user
        ? `${Number(billing.totalRemaining || 0).toLocaleString()} prompts left`
        : "Sign in to track usage";

  return {
    user,
    billing,
    avatar,
    displayName,
    email,
    planLabel,
    tokensLabel,
    robloxStatus: effectiveRobloxStatus,
    robloxProfile,
    robloxUsername,
    robloxConnected,
    robloxLoading: effectiveRobloxLoading,
    robloxError,
    robloxAction,
    refreshRobloxStatus,
    connectRoblox,
    reconnectRoblox,
    signOutUser,
  };
}
