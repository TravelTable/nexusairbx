import {
  CHECKOUT_INTENT_KEY,
  CHECKOUT_INTENT_TTL_MS,
  checkoutIntentFromSearchParams,
  clearCheckoutIntent,
  createCheckoutIntent,
  readCheckoutIntent,
  saveCheckoutIntent,
  validateCheckoutIntent,
} from "./checkoutIntent";
import { BILLING_INTERVAL, PLAN } from "./prices";

const NOW = 2_000_000;

beforeEach(() => {
  window.sessionStorage.clear();
});

test("creates a bounded checkout intent with a fixed review return path", () => {
  expect(createCheckoutIntent({ plan: PLAN.PRO, interval: BILLING_INTERVAL.YEAR }, NOW)).toEqual({
    plan: PLAN.PRO,
    interval: BILLING_INTERVAL.YEAR,
    returnPath: "/subscribe",
    createdAt: NOW,
    expiresAt: NOW + CHECKOUT_INTENT_TTL_MS,
  });
});

test("enforces Starter monthly billing and Team seat limits", () => {
  expect(createCheckoutIntent({ plan: PLAN.STARTER, interval: BILLING_INTERVAL.YEAR }, NOW)?.interval)
    .toBe(BILLING_INTERVAL.MONTH);
  expect(createCheckoutIntent({ plan: PLAN.TEAM, interval: BILLING_INTERVAL.MONTH, seatCount: 1 }, NOW)?.seatCount)
    .toBe(2);
  expect(createCheckoutIntent({ plan: PLAN.TEAM, interval: BILLING_INTERVAL.YEAR, seatCount: 99 }, NOW)?.seatCount)
    .toBe(50);
});

test("rejects expired, overlong, and future-dated intents", () => {
  expect(validateCheckoutIntent({
    plan: PLAN.PRO,
    interval: BILLING_INTERVAL.MONTH,
    createdAt: NOW - CHECKOUT_INTENT_TTL_MS,
    expiresAt: NOW,
  }, NOW)).toBeNull();
  expect(validateCheckoutIntent({
    plan: PLAN.PRO,
    interval: BILLING_INTERVAL.MONTH,
    createdAt: NOW,
    expiresAt: NOW + CHECKOUT_INTENT_TTL_MS + 1,
  }, NOW)).toBeNull();
  expect(validateCheckoutIntent({
    plan: PLAN.PRO,
    interval: BILLING_INTERVAL.MONTH,
    createdAt: NOW + 1,
    expiresAt: NOW + CHECKOUT_INTENT_TTL_MS,
  }, NOW)).toBeNull();
});

test("restores a valid same-tab intent and clears it after expiry", () => {
  saveCheckoutIntent({ plan: PLAN.PRO_PLUS, interval: BILLING_INTERVAL.YEAR }, NOW);
  expect(readCheckoutIntent(NOW + 1)).toMatchObject({
    plan: PLAN.PRO_PLUS,
    interval: BILLING_INTERVAL.YEAR,
  });

  expect(readCheckoutIntent(NOW + CHECKOUT_INTENT_TTL_MS)).toBeNull();
  expect(window.sessionStorage.getItem(CHECKOUT_INTENT_KEY)).toBeNull();
  clearCheckoutIntent();
});

test("accepts only known plans from public pricing query parameters", () => {
  const valid = checkoutIntentFromSearchParams(
    new URLSearchParams("plan=team&interval=year&seats=7"),
    NOW
  );
  expect(valid).toMatchObject({ plan: PLAN.TEAM, interval: BILLING_INTERVAL.YEAR, seatCount: 7 });
  expect(checkoutIntentFromSearchParams(new URLSearchParams("plan=enterprise"), NOW)).toBeNull();
});
