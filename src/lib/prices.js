// src/pricing.js (or lib/prices.js)

// Stripe Price IDs (LIVE)
exports.PRICE = {
  sub: {
    proMonthly:  "price_1Rz8AsAu3NmqHUAu2X27DNPq", // NexusRBX Pro — $14.99 / month
    proYearly:   "price_1Rz8CGAu3NmqHUAulBRTflg5", // NexusRBX Pro — $133.99 / year
    teamMonthly: "price_1Rz8FWAu3NmqHUAuJXQXYqxZ", // NexusRBX Team — $49.99 / month
    teamYearly:  "price_1Rz8IrAu3NmqHUAu4YSpwuTP", // NexusRBX Team — $449.91 / year
  },
  payg: {
    // Packs never expire; map them to your desired token amounts
    pack100k: "price_1Ryxw6Au3NmqHUAuyZl1DyKw", // $4.99  ≈ 100k tokens
    pack500k: "price_1RyxymAu3NmqHUAua7cZm7PH", // $15.19 ≈ 500k tokens
    pack1m:   "price_1Ryy0kAu3NmqHUAudDjtBdeg", // $24.99 ≈ 1M tokens
  },
};

// Monthly subscription token allowances
exports.PLAN_LIMITS = {
  FREE:  50_000,
  PRO:   500_000,
  TEAM:  1_500_000,
};

// Map a Stripe Price ID to plan/cycle or PAYG tokens
exports.classifyPrice = (priceId) => {
  const { sub, payg } = exports.PRICE;

  if (priceId === sub.proMonthly)  return { kind: "sub", plan: "PRO",  cycle: "MONTHLY" };
  if (priceId === sub.proYearly)   return { kind: "sub", plan: "PRO",  cycle: "YEARLY" };
  if (priceId === sub.teamMonthly) return { kind: "sub", plan: "TEAM", cycle: "MONTHLY" };
  if (priceId === sub.teamYearly)  return { kind: "sub", plan: "TEAM", cycle: "YEARLY" };

  if (priceId === payg.pack100k)   return { kind: "payg", tokens: 100_000 };
  if (priceId === payg.pack500k)   return { kind: "payg", tokens: 500_000 };
  if (priceId === payg.pack1m)     return { kind: "payg", tokens: 1_000_000 };

  return null;
};
