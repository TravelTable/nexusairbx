import { useCallback, useEffect, useRef, useState } from "react";
import { dismissStarterPromo, isStarterPromoSnoozed } from "../lib/starterPromo";
import { trackProductEvent } from "../lib/productAnalytics";
import { resolveUsagePercent } from "../lib/billing";

const FIRST_VISIT_DELAY_MS = 4000;
const LIMIT_ERROR_DELAY_MS = 1000;

export function useStarterPromo({
  isFreeUsagePlan = false,
  isSubscriber = false,
  dailyUsage = null,
  includedUsage = null,
  user = null,
  isGenerating = false,
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState("workspace_visit");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const shownThisSession = useRef(false);
  const visitTimer = useRef(null);

  const dailyUsagePercent = resolveUsagePercent({
    isFreeUsagePlan,
    dailyUsage,
    includedUsage,
  });

  const canShow = Boolean(user) && isFreeUsagePlan && !isSubscriber && !isStarterPromoSnoozed();

  const openPromo = useCallback((nextTrigger) => {
    if (!canShow || shownThisSession.current || isGenerating) return false;
    shownThisSession.current = true;
    setTrigger(nextTrigger);
    setIsOpen(true);
    void trackProductEvent("starter_promo_viewed", {
      promo_trigger: nextTrigger,
      daily_usage_percent: dailyUsagePercent,
    }, { dedupeKey: `starter_promo:${nextTrigger}` });
    return true;
  }, [canShow, dailyUsagePercent, isGenerating]);

  useEffect(() => {
    if (!canShow || shownThisSession.current) return undefined;
    visitTimer.current = window.setTimeout(() => {
      openPromo("workspace_visit");
    }, FIRST_VISIT_DELAY_MS);
    return () => {
      if (visitTimer.current) window.clearTimeout(visitTimer.current);
    };
  }, [canShow, openPromo]);

  useEffect(() => {
    if (!canShow || dailyUsagePercent < 70) return;
    openPromo("daily_usage_high");
  }, [canShow, dailyUsagePercent, openPromo]);

  const notifyLimitHit = useCallback((code) => {
    if (!canShow) return;
    const mapped = code === "FREE_CONCURRENT_JOB_LIMIT" ? "concurrent_limit" : "daily_limit";
    window.setTimeout(() => openPromo(mapped), LIMIT_ERROR_DELAY_MS);
  }, [canShow, openPromo]);

  const notifyProjectBlocked = useCallback(() => {
    openPromo("project_limit");
  }, [openPromo]);

  const notifyStarterGate = useCallback((reason) => {
    const mapped = reason?.toLowerCase().includes("script")
      ? "save_script"
      : reason?.toLowerCase().includes("refine")
        ? "refine"
        : reason?.toLowerCase().includes("model")
          ? "model_selection"
          : "feature_gate";
    openPromo(mapped);
  }, [openPromo]);

  const handleClose = useCallback(() => {
    dismissStarterPromo("short");
    void trackProductEvent("starter_promo_dismissed", {
      promo_trigger: trigger,
      dismiss_type: "short",
    });
    setIsOpen(false);
  }, [trigger]);

  const handleDismissLong = useCallback(() => {
    dismissStarterPromo("long");
    void trackProductEvent("starter_promo_dismissed", {
      promo_trigger: trigger,
      dismiss_type: "long",
    });
    setIsOpen(false);
  }, [trigger]);

  return {
    isOpen,
    trigger,
    checkoutBusy,
    setCheckoutBusy,
    dailyUsagePercent,
    openPromo,
    notifyLimitHit,
    notifyProjectBlocked,
    notifyStarterGate,
    handleClose,
    handleDismissLong,
  };
}
