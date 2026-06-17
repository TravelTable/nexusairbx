import {
  ONBOARDING_CHECKLIST_DISMISSED_KEY,
  ONBOARDING_MANUAL_STEPS_KEY,
  ONBOARDING_STEP_IDS,
  ONBOARDING_VERSION,
  ONBOARDING_VERSION_KEY,
  clearOnboardingState,
  createDefaultOnboardingManualSteps,
  hasSeenCurrentOnboardingVersion,
  markOnboardingVersionSeen,
  normalizeOnboardingManualSteps,
  readOnboardingChecklistDismissed,
  readOnboardingManualSteps,
  writeOnboardingChecklistDismissed,
  writeOnboardingManualSteps,
} from "./onboarding";

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

describe("onboarding helpers", () => {
  test("normalizes manual step payloads", () => {
    expect(normalizeOnboardingManualSteps(null)).toEqual(createDefaultOnboardingManualSteps());
    expect(
      normalizeOnboardingManualSteps({
        [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: 1,
        unexpected: true,
      })
    ).toEqual({
      [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: true,
      [ONBOARDING_STEP_IDS.VERIFY_IN_STUDIO]: false,
    });
  });

  test("reads and writes version, dismissal, and manual step state", () => {
    const storage = createStorage();

    expect(hasSeenCurrentOnboardingVersion(storage)).toBe(false);
    markOnboardingVersionSeen(storage);
    expect(storage.getItem(ONBOARDING_VERSION_KEY)).toBe(ONBOARDING_VERSION);
    expect(hasSeenCurrentOnboardingVersion(storage)).toBe(true);

    expect(readOnboardingChecklistDismissed(storage)).toBe(false);
    writeOnboardingChecklistDismissed(true, storage);
    expect(storage.getItem(ONBOARDING_CHECKLIST_DISMISSED_KEY)).toBe("true");
    expect(readOnboardingChecklistDismissed(storage)).toBe(true);

    writeOnboardingManualSteps(
      {
        [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: true,
      },
      storage
    );
    expect(JSON.parse(storage.getItem(ONBOARDING_MANUAL_STEPS_KEY))).toEqual({
      [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: true,
      [ONBOARDING_STEP_IDS.VERIFY_IN_STUDIO]: false,
    });
    expect(readOnboardingManualSteps(storage)).toEqual({
      [ONBOARDING_STEP_IDS.INSTALL_PLUGIN]: true,
      [ONBOARDING_STEP_IDS.VERIFY_IN_STUDIO]: false,
    });
  });

  test("clears onboarding keys", () => {
    const storage = createStorage();
    storage.setItem(ONBOARDING_VERSION_KEY, "old");
    storage.setItem(ONBOARDING_CHECKLIST_DISMISSED_KEY, "true");
    storage.setItem(ONBOARDING_MANUAL_STEPS_KEY, "{}");
    storage.setItem("nexusrbx:onboardingComplete", "true");

    clearOnboardingState(storage);

    expect(storage.getItem(ONBOARDING_VERSION_KEY)).toBe(null);
    expect(storage.getItem(ONBOARDING_CHECKLIST_DISMISSED_KEY)).toBe(null);
    expect(storage.getItem(ONBOARDING_MANUAL_STEPS_KEY)).toBe(null);
    expect(storage.getItem("nexusrbx:onboardingComplete")).toBe(null);
  });
});
