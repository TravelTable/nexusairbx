import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

import { auth } from "../../firebase";
import { useBilling } from "../../context/BillingContext";
import { isRetryableApiError } from "../../lib/apiErrors";
import { beginRobloxOAuth, beginRobloxReauthorization, getRobloxOAuthStatus } from "../../lib/robloxOAuthApi";
import { getSupportUnreadCount } from "../../lib/supportApi";
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
  const authReady = billing.authReady === true;
  const location = useLocation();
  const navigate = useNavigate();
  const [robloxStatus, setRobloxStatus] = useState(null);
  const [robloxLoading, setRobloxLoading] = useState(false);
  const [robloxError, setRobloxError] = useState("");
  const [robloxAction, setRobloxAction] = useState("");
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [isSupportStaff, setIsSupportStaff] = useState(false);

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
      if (isRetryableApiError(err)) {
        setRobloxError("Roblox connection is temporarily unavailable while the database is busy.");
      } else {
        setRobloxError(err?.message || "Could not check Roblox connection.");
        setRobloxStatus(null);
      }
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

  const refreshSupportUnreadCount = useCallback(async () => {
    if (!user) {
      setSupportUnreadCount(0);
      return 0;
    }
    try {
      const count = await getSupportUnreadCount();
      setSupportUnreadCount(count);
      return count;
    } catch (_) {
      return 0;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSupportUnreadCount(0);
      return undefined;
    }
    void refreshSupportUnreadCount();
    const timer = window.setInterval(refreshSupportUnreadCount, 60_000);
    window.addEventListener("nexusrbx:support-unread-changed", refreshSupportUnreadCount);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("nexusrbx:support-unread-changed", refreshSupportUnreadCount);
    };
  }, [location.pathname, refreshSupportUnreadCount, user]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsSupportStaff(false);
      return undefined;
    }
    void user.getIdTokenResult().then((token) => {
      if (active) setIsSupportStaff(token.claims?.admin === true || token.claims?.supportAgent === true);
    }).catch(() => {
      if (active) setIsSupportStaff(false);
    });
    return () => { active = false; };
  }, [user]);

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
      await beginRobloxOAuth({ returnPath });
    } catch (err) {
      setRobloxError(
        isRetryableApiError(err)
          ? "Roblox authorization is temporarily unavailable while the database is busy. Try again shortly."
          : err?.message || "Could not start Roblox connection."
      );
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
      await beginRobloxReauthorization({ returnPath });
    } catch (err) {
      setRobloxError(
        isRetryableApiError(err)
          ? "Roblox reauthorization is temporarily unavailable while the database is busy. Try again shortly."
          : err?.message || "Could not start Roblox reauthorization."
      );
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
  return {
    user,
    authReady,
    billing,
    avatar,
    displayName,
    email,
    planLabel,
    supportUnreadCount,
    isSupportStaff,
    robloxStatus: effectiveRobloxStatus,
    robloxProfile,
    robloxUsername,
    robloxConnected,
    robloxLoading: effectiveRobloxLoading,
    robloxError,
    robloxAction,
    refreshRobloxStatus,
    refreshSupportUnreadCount,
    connectRoblox,
    reconnectRoblox,
    signOutUser,
  };
}
