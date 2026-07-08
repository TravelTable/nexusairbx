import { PRICE, PLAN, PREMIUM_BALANCE_PACKAGE } from "./prices";

test("frontend price catalog exposes safe identifiers, not Stripe price IDs", () => {
  const text = JSON.stringify(PRICE);
  expect(text).not.toMatch(/price_/);
  expect(PRICE.sub.starterMonthly).toBe(PLAN.STARTER);
  expect(PRICE.sub.proMonthly).toBe(PLAN.PRO);
  expect(PRICE.sub.proPlusYearly).toBe(PLAN.PRO_PLUS);
  expect(PRICE.premiumBalance.PREMIUM_25).toBe(PREMIUM_BALANCE_PACKAGE.PREMIUM_25);
});
