import { FEATURE_FLAGS } from "./featureFlags";

const LEGACY_PREMIUM_MODE_IDS = Object.freeze([
  "security",
  "performance",
  "data",
  "system",
  "animator",
]);

const SYSTEM_ONLY_PREMIUM_MODE_IDS = Object.freeze(["system"]);

export const PREMIUM_MODE_IDS = Object.freeze(
  FEATURE_FLAGS.systemOnlyPremium
    ? [...SYSTEM_ONLY_PREMIUM_MODE_IDS]
    : [...LEGACY_PREMIUM_MODE_IDS]
);

export function isPremiumMode(modeId) {
  return PREMIUM_MODE_IDS.includes(String(modeId || "").toLowerCase());
}

export function getPremiumModeIds() {
  return PREMIUM_MODE_IDS;
}
