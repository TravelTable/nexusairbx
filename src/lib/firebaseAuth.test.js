import {
  AUTH_PERSISTENCE_PREFERENCE_KEY,
  getFriendlyAuthErrorMessage,
  isMissingRedirectStateError,
  readAuthPersistencePreference,
  writeAuthPersistencePreference,
} from "./firebaseAuth";

describe("firebaseAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("detects missing redirect state errors", () => {
    expect(
      isMissingRedirectStateError(
        new Error(
          "Unable to process request due to missing initial state. This may happen if browser sessionStorage is inaccessible or accidentally cleared."
        )
      )
    ).toBe(true);
  });

  test("returns a friendly message for missing redirect state", () => {
    expect(
      getFriendlyAuthErrorMessage(
        new Error("Unable to process request due to missing initial state.")
      )
    ).toContain("browser storage");
  });

  test("returns a friendly message for popup blocked", () => {
    expect(
      getFriendlyAuthErrorMessage({ code: "auth/popup-blocked", message: "raw" })
    ).toContain("popup was blocked");
  });

  test("defaults auth persistence preference to local", () => {
    expect(readAuthPersistencePreference()).toBe(true);
  });

  test("reads and writes auth persistence preference", () => {
    writeAuthPersistencePreference(false);
    expect(localStorage.getItem(AUTH_PERSISTENCE_PREFERENCE_KEY)).toBe("session");
    expect(readAuthPersistencePreference()).toBe(false);

    writeAuthPersistencePreference(true);
    expect(localStorage.getItem(AUTH_PERSISTENCE_PREFERENCE_KEY)).toBe("local");
    expect(readAuthPersistencePreference()).toBe(true);
  });
});
