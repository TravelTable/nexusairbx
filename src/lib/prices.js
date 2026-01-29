// src/lib/prices.js (frontend ESM)
// Switch by env. For Vite use VITE_STRIPE_MODE; for CRA use REACT_APP_STRIPE_MODE.

const MODE =
  (process.env.REACT_APP_STRIPE_MODE ||
    "test").toLowerCase();

// LIVE price IDs (from your Stripe dashboard)
const LIVE = {
  sub: {
    proMonthly:  "price_1SucJPAu3NmqHUAuf44Zz9cy",
    proYearly:   "price_1SucJPAu3NmqHUAuPtYsDJp2",
    teamMonthly: "price_1SucGXAu3NmqHUAuDM99Hs1w",
    teamYearly:  "price_1SucGXAu3NmqHUAubiUt4tTV",
  },
  payg: {
    pack100k: "price_1SucGjAu3NmqHUAuD7hUMi86",
    pack500k: "price_1SucGhAu3NmqHUAu7s6DiP7Y",
    pack1m:   "price_1SucGfAu3NmqHUAuJWfoBMX6",
  },
};

// TEST price IDs — paste your Stripe test-mode IDs here
const TEST = {
  sub: {
    proMonthly:  "price_1Rz8AsAu3NmqHUAu2X27DNPq", // replace with your TEST id if different
    proYearly:   "price_1Rz8CGAu3NmqHUAulBRTflg5", // replace with your TEST id if different
    teamMonthly: "price_1Rz8FWAu3NmqHUAuJXQXYqxZ", // replace with your TEST id if different
    teamYearly:  "price_1Rz8IrAu3NmqHUAu4YSpwuTP", // replace with your TEST id if different
  },
  payg: {
    pack100k: "price_1Ryxw6Au3NmqHUAuyZl1DyKw",   // replace with TEST id
    pack500k: "price_1RyxymAu3NmqHUAua7cZm7PH",   // replace with TEST id
    pack1m:   "price_1Ryy0kAu3NmqHUAudDjtBdeg",   // replace with TEST id
  },
};

export const PRICE = MODE === "live" ? LIVE : TEST;

export const PLAN_LIMITS = {
  FREE:  20_000,
  PRO:   500_000,
  TEAM:  1_500_000,
  ANON:  5_000,
};

export const classifyPrice = (priceId) => {
  const { sub, payg } = PRICE;

  if (priceId === sub.proMonthly)  return { kind: "sub", plan: "PRO",  cycle: "MONTHLY" };
  if (priceId === sub.proYearly)   return { kind: "sub", plan: "PRO",  cycle: "YEARLY"  };
  if (priceId === sub.teamMonthly) return { kind: "sub", plan: "TEAM", cycle: "MONTHLY" };
  if (priceId === sub.teamYearly)  return { kind: "sub", plan: "TEAM", cycle: "YEARLY"  };

  if (priceId === payg.pack100k)   return { kind: "payg", tokens: 100_000  };
  if (priceId === payg.pack500k)   return { kind: "payg", tokens: 500_000  };
  if (priceId === payg.pack1m)     return { kind: "payg", tokens: 1_000_000 };

  return null;
};
