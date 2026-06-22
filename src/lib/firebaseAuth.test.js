import {
  getFriendlyAuthErrorMessage,
  isMissingRedirectStateError,
} from "./firebaseAuth";

describe("firebaseAuth", () => {
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
});
