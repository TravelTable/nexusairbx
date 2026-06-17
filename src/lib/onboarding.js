export const ONBOARDING_VERSION = "2026-06-ai-studio-core";
export const ONBOARDING_VERSION_KEY = "nexusrbx:onboardingVersion";
export const ONBOARDING_CHECKLIST_DISMISSED_KEY = "nexusrbx:onboardingChecklistDismissed";
export const ONBOARDING_MANUAL_STEPS_KEY = "nexusrbx:onboardingManualSteps";

export const ONBOARDING_STEP_IDS = Object.freeze({
  SIGN_IN: "sign_in",
  INSTALL_PLUGIN: "install_plugin",
  PAIR_STUDIO: "pair_studio",
  ENABLE_LIVE_STUDIO: "enable_live_studio",
  CONFIRM_APPROVAL_MODE: "confirm_approval_mode",
  SUBMIT_FIRST_PROMPT: "submit_first_prompt",
  APPROVE_AND_APPLY: "approve_and_apply",
  VERIFY_IN_STUDIO: "verify_in_studio",
});

export function createDefaultOnboardingManualSteps() {
  return {
    [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: false,
    [ONBOARDING_STEP_IDS.VERIFY_IN_STUDIO]: false,
  };
}

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function normalizeOnboardingManualSteps(raw) {
  const defaults = createDefaultOnboardingManualSteps();
  if (!raw || typeof raw !== "object") return defaults;
  return {
    ...defaults,
    [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: Boolean(raw[ONBOARDING_STEP_IDS.INSTALL_PLUGIN]),
    [ONBOARDING_STEP_IDS.VERIFY_IN_STUDIO]: Boolean(raw[ONBOARDING_STEP_IDS.VERIFY_IN_STUDIO]),
  };
}

export function readOnboardingVersion(storage) {
  return getStorage(storage)?.getItem(ONBOARDING_VERSION_KEY) || "";
}

export function markOnboardingVersionSeen(storage) {
  getStorage(storage)?.setItem(ONBOARDING_VERSION_KEY, ONBOARDING_VERSION);
}

export function hasSeenCurrentOnboardingVersion(storage) {
  return readOnboardingVersion(storage) === ONBOARDING_VERSION;
}

export function readOnboardingChecklistDismissed(storage) {
  return getStorage(storage)?.getItem(ONBOARDING_CHECKLIST_DISMISSED_KEY) === "true";
}

export function writeOnboardingChecklistDismissed(dismissed, storage) {
  getStorage(storage)?.setItem(ONBOARDING_CHECKLIST_DISMISSED_KEY, dismissed ? "true" : "false");
}

export function readOnboardingManualSteps(storage) {
  const target = getStorage(storage);
  if (!target) return createDefaultOnboardingManualSteps();
  try {
    return normalizeOnboardingManualSteps(JSON.parse(target.getItem(ONBOARDING_MANUAL_STEPS_KEY) || "null"));
  } catch (_) {
    return createDefaultOnboardingManualSteps();
  }
}

export function writeOnboardingManualSteps(steps, storage) {
  getStorage(storage)?.setItem(
    ONBOARDING_MANUAL_STEPS_KEY,
    JSON.stringify(normalizeOnboardingManualSteps(steps))
  );
}

export function clearOnboardingState(storage) {
  const target = getStorage(storage);
  if (!target) return;
  target.removeItem(ONBOARDING_VERSION_KEY);
  target.removeItem(ONBOARDING_CHECKLIST_DISMISSED_KEY);
  target.removeItem(ONBOARDING_MANUAL_STEPS_KEY);
  target.removeItem("nexusrbx:onboardingComplete");
}
