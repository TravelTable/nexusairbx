import { BILLING_INTERVAL, PLAN } from "./prices";

export const CHECKOUT_INTENT_KEY = "nexusrbx:checkout-intent:v1";
export const CHECKOUT_INTENT_TTL_MS = 60 * 60 * 1000;

const ALLOWED_PLANS = new Set([PLAN.STARTER, PLAN.PRO, PLAN.PRO_PLUS, PLAN.TEAM]);
const ALLOWED_INTERVALS = new Set([BILLING_INTERVAL.MONTH, BILLING_INTERVAL.YEAR]);

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (_) {
    return null;
  }
}

function normalizeSeats(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 2;
  return Math.min(50, Math.max(2, Math.round(number)));
}

export function validateCheckoutIntent(value, now = Date.now()) {
  if (!value || typeof value !== "object") return null;
  const plan = String(value.plan || "").toUpperCase();
  if (!ALLOWED_PLANS.has(plan)) return null;

  let interval = String(value.interval || BILLING_INTERVAL.MONTH).toLowerCase();
  if (!ALLOWED_INTERVALS.has(interval)) return null;
  if (plan === PLAN.STARTER) interval = BILLING_INTERVAL.MONTH;

  const createdAt = Number(value.createdAt ?? now);
  const expiresAt = Number(value.expiresAt ?? createdAt + CHECKOUT_INTENT_TTL_MS);
  const lifetime = expiresAt - createdAt;
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    createdAt > now ||
    expiresAt <= now ||
    lifetime <= 0 ||
    lifetime > CHECKOUT_INTENT_TTL_MS
  ) {
    return null;
  }

  return {
    plan,
    interval,
    ...(plan === PLAN.TEAM ? { seatCount: normalizeSeats(value.seatCount) } : {}),
    returnPath: "/subscribe",
    createdAt,
    expiresAt,
  };
}

export function createCheckoutIntent({ plan, interval, seatCount } = {}, now = Date.now()) {
  return validateCheckoutIntent({
    plan,
    interval,
    seatCount,
    returnPath: "/subscribe",
    createdAt: now,
    expiresAt: now + CHECKOUT_INTENT_TTL_MS,
  }, now);
}

export function saveCheckoutIntent(input, now = Date.now()) {
  const intent = input?.expiresAt ? validateCheckoutIntent(input, now) : createCheckoutIntent(input, now);
  if (!intent) return null;
  try {
    storage()?.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(intent));
  } catch (_) {
    // Checkout still works when storage is unavailable; only auth continuity is lost.
  }
  return intent;
}

export function readCheckoutIntent(now = Date.now()) {
  let parsed = null;
  try {
    parsed = JSON.parse(storage()?.getItem(CHECKOUT_INTENT_KEY) || "null");
  } catch (_) {
    parsed = null;
  }
  const intent = validateCheckoutIntent(parsed, now);
  if (!intent) clearCheckoutIntent();
  return intent;
}

export function clearCheckoutIntent() {
  try {
    storage()?.removeItem(CHECKOUT_INTENT_KEY);
  } catch (_) {
    // Best effort.
  }
}

export function checkoutIntentFromSearchParams(searchParams, now = Date.now()) {
  if (!searchParams) return null;
  return createCheckoutIntent({
    plan: searchParams.get("plan"),
    interval: searchParams.get("interval"),
    seatCount: searchParams.get("seats"),
  }, now);
}
