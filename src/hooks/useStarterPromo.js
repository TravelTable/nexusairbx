import { useCallback, useEffect, useRef, useState } from "react";
import { dismissStarterPromo, isStarterPromoSnoozed } from "../lib/starterPromo";
import { trackProductEvent } from "../lib/productAnalytics";
import { resolveUsagePercent } from "../lib/billing";

const LIMIT_ERROR_DELAY_MS = 1000;

export function useStarterPromo({
  blocking = false,
  isFreeUsagePlan = false,
  isSubscriber = false,
  dailyUsage = null,
  includedUsage = null,
  user = null,
  isGenerating = false,
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState(blocking ? "subscription_required" : "workspace_visit");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const shownThisSession = useRef(false);

  const dailyUsagePercent = resolveUsagePercent({
    isFreeUsagePlan,
    dailyUsage,
    includedUsage,
  });

  const needsSubscription = Boolean(user) && !isSubscriber;
  const canShowSoftPromo = needsSubscription && isFreeUsagePlan && !isStarterPromoSnoozed();
  const shouldBlock = blocking && needsSubscription;

  useEffect(() => {
    if (shouldBlock) {
      setIsOpen(true);
      setTrigger("subscription_required");
      return;
    }
    if (!needsSubscription) {
      setIsOpen(false);
    }
  }, [shouldBlock, needsSubscription]);

  const openPromo = useCallback((nextTrigger) => {
    if (blocking) {
      if (!needsSubscription) return false;
      setTrigger(nextTrigger || "subscription_required");
      setIsOpen(true);
      return true;
    }
    if (!canShowSoftPromo || shownThisSession.current || isGenerating) return false;
    shownThisSession.current = true;
    setTrigger(nextTrigger);
    setIsOpen(true);
    void trackProductEvent("starter_promo_viewed", {
      promo_trigger: nextTrigger,
      daily_usage_percent: dailyUsagePercent,
    }, { dedupeKey: `starter_promo:${nextTrigger}` });
    return true;
  }, [blocking, canShowSoftPromo, dailyUsagePercent, isGenerating, needsSubscription]);

  useEffect(() => {
    if (blocking || !canShowSoftPromo || dailyUsagePercent < 70) return;
    openPromo("daily_usage_high");
  }, [blocking, canShowSoftPromo, dailyUsagePercent, openPromo]);

  const notifyLimitHit = useCallback((code) => {
    if (!needsSubscription) return;
    const mapped = code === "FREE_CONCURRENT_JOB_LIMIT" ? "concurrent_limit" : "daily_limit";
    window.setTimeout(() => openPromo(mapped), LIMIT_ERROR_DELAY_MS);
  }, [needsSubscription, openPromo]);

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
    if (blocking) return;
    dismissStarterPromo("short");
    void trackProductEvent("starter_promo_dismissed", {
      promo_trigger: trigger,
      dismiss_type: "short",
    });
    setIsOpen(false);
  }, [blocking, trigger]);

  const handleDismissLong = useCallback(() => {
    if (blocking) return;
    dismissStarterPromo("long");
    void trackProductEvent("starter_promo_dismissed", {
      promo_trigger: trigger,
      dismiss_type: "long",
    });
    setIsOpen(false);
  }, [blocking, trigger]);

  return {
    isOpen: shouldBlock ? true : isOpen,
    blocking: shouldBlock,
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
