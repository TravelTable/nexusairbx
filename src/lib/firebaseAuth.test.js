jest.mock("firebase/auth", () => ({
  browserLocalPersistence: { type: "LOCAL" },
  browserSessionPersistence: { type: "SESSION" },
  getRedirectResult: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn((idToken, accessToken) => ({ idToken, accessToken })),
  },
  setPersistence: jest.fn(() => Promise.resolve()),
  signInWithCredential: jest.fn(),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(() => Promise.resolve()),
}));

jest.mock("../firebase", () => ({
  firebaseAppCheckEnabled: false,
  appCheckReady: Promise.resolve({ status: "disabled" }),
}));

import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import {
  AUTH_PERSISTENCE_PREFERENCE_KEY,
  AUTH_REDIRECT_ERROR_KEY,
  consumeAuthRedirectError,
  getFriendlyAuthErrorMessage,
  isMissingRedirectStateError,
  readAuthPersistencePreference,
  redirectSignInWithOAuthProvider,
  shouldFallbackToAuthRedirect,
  signInWithOAuthProvider,
  storeAuthRedirectError,
  writeAuthPersistencePreference,
} from "./firebaseAuth";

describe("firebaseAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
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

  test("recognizes Google Identity popup failures that need a same-tab redirect", () => {
    expect(shouldFallbackToAuthRedirect({ code: "auth/popup-closed-by-user" })).toBe(true);
    expect(shouldFallbackToAuthRedirect({ code: "popup_failed_to_open" })).toBe(true);
    expect(shouldFallbackToAuthRedirect({ code: "auth/invalid-credential" })).toBe(false);
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

  test("forces the account chooser for Google sign-in", async () => {
    const setCustomParameters = jest.fn();
    class GoogleProvider {
      setCustomParameters = setCustomParameters;
    }
    const credential = { user: { uid: "google-user" } };
    signInWithPopup.mockResolvedValue(credential);

    await expect(
      signInWithOAuthProvider({}, GoogleProvider, { method: "google", rememberMe: true })
    ).resolves.toBe(credential);

    expect(setCustomParameters).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(signInWithPopup).toHaveBeenCalledWith({}, expect.any(GoogleProvider));
  });

  test("stores and consumes friendly redirect errors", () => {
    expect(
      storeAuthRedirectError({ code: "auth/popup-blocked", message: "raw" })
    ).toContain("popup was blocked");
    expect(sessionStorage.getItem(AUTH_REDIRECT_ERROR_KEY)).toContain("popup was blocked");
    expect(consumeAuthRedirectError()).toContain("popup was blocked");
    expect(sessionStorage.getItem(AUTH_REDIRECT_ERROR_KEY)).toBeNull();
    expect(consumeAuthRedirectError()).toBeNull();
  });

  test("reuses the configured Google provider for redirect fallback", async () => {
    const setCustomParameters = jest.fn();
    class GoogleProvider {
      setCustomParameters = setCustomParameters;
    }
    signInWithPopup.mockRejectedValue({ code: "auth/popup-blocked" });

    await expect(
      signInWithOAuthProvider({}, GoogleProvider, {
        method: "google",
        returnPath: "/ai",
      })
    ).resolves.toBeNull();

    const popupProvider = signInWithPopup.mock.calls[0][1];
    expect(setCustomParameters).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(signInWithRedirect).toHaveBeenCalledWith({}, popupProvider);
  });

  test("can start the Google redirect directly after the GIS popup is unavailable", async () => {
    const setCustomParameters = jest.fn();
    class GoogleProvider {
      setCustomParameters = setCustomParameters;
    }

    await expect(
      redirectSignInWithOAuthProvider({}, GoogleProvider, {
        method: "google",
        rememberMe: true,
        returnPath: "/ai?project=one",
      })
    ).resolves.toBeNull();

    expect(setCustomParameters).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(signInWithRedirect).toHaveBeenCalledWith({}, expect.any(GoogleProvider));
    expect(sessionStorage.getItem("nexusrbx:authRedirectReturn")).toBe("/ai?project=one");
  });

  test("does not fall back to redirect on auth/internal-error", async () => {
    class GoogleProvider {
      setCustomParameters = jest.fn();
    }
    signInWithPopup.mockRejectedValue({ code: "auth/internal-error" });

    await expect(
      signInWithOAuthProvider({}, GoogleProvider, {
        method: "google",
        returnPath: "/account",
      })
    ).rejects.toEqual({ code: "auth/internal-error" });

    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  test("does not apply Google account parameters to other providers", async () => {
    const setCustomParameters = jest.fn();
    class GithubProvider {
      setCustomParameters = setCustomParameters;
    }
    signInWithPopup.mockResolvedValue({ user: { uid: "github-user" } });

    await signInWithOAuthProvider({}, GithubProvider, { method: "github" });

    expect(setCustomParameters).not.toHaveBeenCalled();
  });
});
