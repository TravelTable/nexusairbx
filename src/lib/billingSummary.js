function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Format provider-cost micros as a USD string for Premium Balance display. */
export function dollarsFromMicros(micros) {
  const value = Math.max(0, Number(micros || 0)) / 1_000_000;
  return `$${value.toFixed(2)}`;
}

export function resolveUsagePercent({
  isFreeUsagePlan = false,
  dailyUsage = null,
  includedUsage = null,
  tokensLeft = null,
  tokensLimit = null,
  usageLoading = false,
} = {}) {
  if (usageLoading) return null;
  if (isFreeUsagePlan && dailyUsage?.percentUsed != null) {
    return clampPercent(dailyUsage.percentUsed);
  }
  if (includedUsage?.percentUsed != null) {
    return clampPercent(includedUsage.percentUsed);
  }
  if (typeof tokensLeft === "number" && typeof tokensLimit === "number" && tokensLimit > 0) {
    return clampPercent(((tokensLimit - tokensLeft) / tokensLimit) * 100);
  }
  if (isFreeUsagePlan && !dailyUsage) return null;
  return 0;
}

export function normalizePlanKey(plan) {
  return String(plan || "FREE").toUpperCase();
}

export function isStarterPlan(plan, entitlements = []) {
  const normalized = normalizePlanKey(plan);
  if (normalized === "STARTER") return true;
  const list = Array.isArray(entitlements) ? entitlements : [];
  return list.includes("starter");
}

export function isPremiumPlan(plan, entitlements = []) {
  const normalized = normalizePlanKey(plan);
  if (normalized === "PRO" || normalized === "PRO_PLUS" || normalized === "TEAM") return true;
  const list = Array.isArray(entitlements) ? entitlements : [];
  return list.includes("pro") || list.includes("pro_plus") || list.includes("team");
}

export function isSubscriberPlan(plan, entitlements = []) {
  return isStarterPlan(plan, entitlements) || isPremiumPlan(plan, entitlements);
}

export function isStarterOrAbove(plan, entitlements = []) {
  return isSubscriberPlan(plan, entitlements);
}

export function summarizeEntitlements(e) {
  const plan = e?.plan || "FREE";
  const cycle = e?.cycle || null;
  const limit = Number(e?.sub?.limit ?? 0);
  const used = Number(e?.sub?.used ?? 0);
  const paygRemaining = Math.max(0, Number(e?.payg?.remaining ?? 0));
  const flags = {
    isAdmin: Boolean(e?.flags?.isAdmin),
    unlimitedTokens: Boolean(e?.flags?.unlimitedTokens),
    devOverride: Boolean(e?.flags?.devOverride),
  };

  const subRemaining = Math.max(0, limit - used);
  return {
    ...(e?.catalogVersion === "v2" ? { catalogVersion: "v2", billingScope: e.billingScope,
      includedCredits: e.includedCredits, purchasedCredits: e.purchasedCredits,
      totalAvailableCreditsMicros: e.totalAvailableCreditsMicros, usageWindow: e.usageWindow, refreshAt: e.refreshAt } : {}),
    plan,
    cycle,
    subRemaining,
    paygRemaining,
    totalRemaining: subRemaining + paygRemaining,
    resetsAt: e?.sub?.resetsAt ? new Date(e.sub.resetsAt) : null,
    subLimit: limit,
    isAdmin: flags.isAdmin,
    unlimitedTokens: flags.unlimitedTokens,
    devOverride: flags.devOverride,
    flags,
    entitlements: e?.entitlements || [],
    modelAccess: e?.modelAccess || null,
    subscription: e?.subscription || null,
    pricingVersion: e?.pricingVersion || "CURRENT",
    grandfathered: Boolean(e?.grandfathered),
    includedUsage: e?.includedUsage || null,
    premiumBalance: e?.premiumBalance || null,
    team: e?.team || null,
    dailyUsage: e?.dailyUsage || null,
    fairUse: e?.fairUse || null,
    limits: e?.limits || null,
    isFreeUsagePlan: plan === "FREE" || plan === "ANON",
    isStarter: isStarterPlan(plan, e?.entitlements),
    isSubscriber: isSubscriberPlan(plan, e?.entitlements),
    isStarterOrAbove: isStarterOrAbove(plan, e?.entitlements),
    isPremium: isPremiumPlan(plan, e?.entitlements),
    canUseAi: isStarterOrAbove(plan, e?.entitlements) || Boolean(flags.unlimitedTokens),
  };
}

