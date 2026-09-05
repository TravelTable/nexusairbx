export const STUDIO_APPLY_POLICIES = Object.freeze([
  "ask_before_applying",
  "after_validation",
  "after_playtest",
  "never_automatically",
]);

export const STUDIO_VALIDATION_MODES = Object.freeze(["quick", "standard", "playtest"]);

export const STUDIO_SAFETY_MODES = Object.freeze([
  "review_destructive",
  "auto_apply_verified",
  "developer_mode",
]);

export const DEFAULT_STUDIO_PREFERENCES = Object.freeze({
  applyPolicy: "after_validation",
  validationMode: "standard",
  safetyMode: "developer_mode",
});

const APPLY_POLICY_SET = new Set(STUDIO_APPLY_POLICIES);
const VALIDATION_MODE_SET = new Set(STUDIO_VALIDATION_MODES);
const SAFETY_MODE_SET = new Set(STUDIO_SAFETY_MODES);

export function normalizeStudioPreferences(settings = {}) {
  let applyPolicy = String(settings?.studioApplyPolicy || settings?.applyPolicy || "").trim();
  if (!APPLY_POLICY_SET.has(applyPolicy)) {
    const legacyPolicy = String(settings?.studioAutoPushPolicy || "").trim();
    if (legacyPolicy === "manual_only" || legacyPolicy === "off") {
      applyPolicy = "never_automatically";
    } else if (legacyPolicy === "manual_review") {
      applyPolicy = "ask_before_applying";
    } else if (settings?.studioAutoPushEnabled === true && legacyPolicy === "after_playtest") {
      applyPolicy = "after_playtest";
    } else if (settings?.studioAutoPushEnabled === true) {
      applyPolicy = "after_validation";
    } else {
      applyPolicy = Object.keys(settings).length && !settings.studioPreferencesVersion && !settings.applyPolicy ? "ask_before_applying" : DEFAULT_STUDIO_PREFERENCES.applyPolicy;
    }
  }

  const requestedValidationMode = settings?.studioValidationMode || settings?.validationMode;
  const validationMode = VALIDATION_MODE_SET.has(requestedValidationMode)
    ? requestedValidationMode
    : DEFAULT_STUDIO_PREFERENCES.validationMode;
  const requestedSafetyMode = settings?.studioSafetyMode || settings?.safetyMode;
  const safetyMode = SAFETY_MODE_SET.has(requestedSafetyMode)
    ? requestedSafetyMode
    : settings?.studioApplyMode === "unrestricted_dev"
      ? "developer_mode"
      : settings?.studioApplyMode === "auto_after_approval"
        ? "auto_apply_verified"
        : Object.keys(settings).length && !settings.studioPreferencesVersion && !settings.safetyMode ? "review_destructive" : DEFAULT_STUDIO_PREFERENCES.safetyMode;

  return { applyPolicy, validationMode, safetyMode };
}

export function studioPreferencesToRuntime(settings = {}) {
  const preferences = normalizeStudioPreferences(settings);
  const reviewAll = ["ask_before_applying", "never_automatically"].includes(preferences.applyPolicy);
  const autoPushToStudio = ["after_validation", "after_playtest"].includes(preferences.applyPolicy);
  return {
    ...preferences,
    studioEnabled: true,
    applyMode: reviewAll ? "manual_review" : preferences.safetyMode === "developer_mode"
      ? "unrestricted_dev"
      : preferences.safetyMode === "auto_apply_verified"
        ? "auto_after_approval"
        : "manual_review",
    autoPushToStudio,
    autoPushPolicy: preferences.applyPolicy === "after_playtest"
      ? "after_playtest"
      : preferences.applyPolicy === "after_validation"
        ? "after_validation"
        : "manual_only",
  };
}

export function studioPreferencePatch(preferences = {}) {
  const normalized = normalizeStudioPreferences(preferences);
  const runtime = studioPreferencesToRuntime(normalized);
  return {
    studioPreferencesVersion: 2,
    studioApplyPolicy: normalized.applyPolicy,
    studioValidationMode: normalized.validationMode,
    studioSafetyMode: normalized.safetyMode,
    // Keep older workers and in-flight jobs compatible while the canonical
    // controls live in the three settings above.
    studioAutoPushEnabled: runtime.autoPushToStudio,
    studioAutoPushPolicy: runtime.autoPushPolicy,
  };
}
