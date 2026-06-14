/**
 * Mode gating.
 *
 * With the Cursor-style 4-mode model (Agent, Plan, Debug, Ask) all operating
 * modes are free. Premium is gated on model selection + token limits instead of
 * the mode. These helpers are kept for back-compat with callers that still ask
 * whether a mode is premium.
 */

export const PREMIUM_MODE_IDS = Object.freeze([]);

export function isPremiumMode() {
  return false;
}

export function getPremiumModeIds() {
  return PREMIUM_MODE_IDS;
}
