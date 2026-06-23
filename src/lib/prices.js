// Frontend-safe plan and package identifiers. Stripe Price IDs live only in
// backend environment variables.

export const PLAN = {
  FREE: "FREE",
  PRO: "PRO",
  PRO_PLUS: "PRO_PLUS",
  TEAM: "TEAM",
};

export const BILLING_INTERVAL = {
  MONTH: "month",
  YEAR: "year",
};

export const PREMIUM_BALANCE_PACKAGE = {
  PREMIUM_10: "PREMIUM_10",
  PREMIUM_25: "PREMIUM_25",
  PREMIUM_50: "PREMIUM_50",
};

export const PRICE = {
  sub: {
    proMonthly: PLAN.PRO,
    proYearly: PLAN.PRO,
    proPlusMonthly: PLAN.PRO_PLUS,
    proPlusYearly: PLAN.PRO_PLUS,
    teamMonthly: PLAN.TEAM,
    teamYearly: PLAN.TEAM,
  },
  premiumBalance: PREMIUM_BALANCE_PACKAGE,
};

export const PLAN_LIMITS = {
  FREE: 20_000,
  PRO: 500_000,
  PRO_PLUS: 1_000_000,
  TEAM: 1_500_000,
  ANON: 5_000,
};

export const classifyPrice = () => null;
