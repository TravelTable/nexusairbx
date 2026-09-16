import catalog from "../data/billingCatalog.v2.json";
import { withDisplayCatalogCredits } from './creditDenomination';
const publicPlanCatalog = catalog.plans;
export const BILLING_CATALOG = catalog;
export const CREDIT_PACKS = Object.freeze(catalog.packs.map(entry => Object.freeze(withDisplayCatalogCredits(entry))));

export const PUBLIC_PLAN_CATALOG = Object.freeze(
  publicPlanCatalog.map((plan) => {
    const presented = withDisplayCatalogCredits(plan);
    return Object.freeze({ ...presented,
      features: Object.freeze([...(presented.features || [])]),
      recommended: plan.featured === true,
    });
  })
);

export const SUBSCRIPTION_PLANS = PUBLIC_PLAN_CATALOG.filter(
  (plan) => plan.id !== "FREE" && plan.selectable !== false
);

export function getPublicPlan(planId) {
  return PUBLIC_PLAN_CATALOG.find((plan) => plan.id === String(planId || "").toUpperCase()) || null;
}

export function formatMoney(value) {
  if (value === 0) return "$0";
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function formatMonthlyPrice(plan) {
  if (plan.monthly === 0) return "$0";
  const base = formatMoney(plan.monthly);
  return plan.perSeat ? `${base}/user/mo` : `${base}/mo`;
}

export function formatAnnualMonthlyEquivalent(plan) {
  if (!Number.isFinite(plan?.yearly)) return null;
  return formatMoney(Math.round((plan.yearly / 12) * 100) / 100);
}
