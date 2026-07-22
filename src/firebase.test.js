jest.mock("firebase/app", () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
  setLogLevel: jest.fn(),
}));

jest.mock("firebase/app-check", () => ({
  getToken: jest.fn(),
  initializeAppCheck: jest.fn(() => ({ token: "app-check" })),
  ReCaptchaV3Provider: jest.fn(function ReCaptchaV3Provider(siteKey) {
    this.siteKey = siteKey;
  }),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  initializeFirestore: jest.fn(),
}));

import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { initializeFirebaseAppCheck, waitForFirebaseAppCheck } from "./firebase";

describe("initializeFirebaseAppCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    initializeAppCheck.mockReturnValue({ token: "app-check" });
  });

  test("does not initialize outside a browser runtime", () => {
    const result = initializeFirebaseAppCheck(
      { name: "client" },
      {
        environment: "production",
        siteKey: "public-site-key",
        windowObject: null,
        documentObject: null,
      }
    );

    expect(result).toBeNull();
    expect(initializeAppCheck).not.toHaveBeenCalled();
  });

  test("does not initialize while tests are running", () => {
    const result = initializeFirebaseAppCheck(
      { name: "client" },
      {
        environment: "test",
        siteKey: "public-site-key",
        windowObject: {},
        documentObject: {},
      }
    );

    expect(result).toBeNull();
    expect(initializeAppCheck).not.toHaveBeenCalled();
  });

  test("initializes once in the browser with automatic token refresh", () => {
    const windowObject = {};
    const documentObject = {};
    const firebaseApp = { name: "client" };

    const first = initializeFirebaseAppCheck(firebaseApp, {
      environment: "production",
      siteKey: "public-site-key",
      windowObject,
      documentObject,
    });
    const second = initializeFirebaseAppCheck(firebaseApp, {
      environment: "production",
      siteKey: "public-site-key",
      windowObject,
      documentObject,
    });

    expect(second).toBe(first);
    expect(ReCaptchaV3Provider).toHaveBeenCalledWith("public-site-key");
    expect(initializeAppCheck).toHaveBeenCalledTimes(1);
    expect(initializeAppCheck).toHaveBeenCalledWith(firebaseApp, {
      provider: expect.any(ReCaptchaV3Provider),
      isTokenAutoRefreshEnabled: true,
    });
  });

  test("warns in development when the public site key is missing", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const result = initializeFirebaseAppCheck(
      { name: "client" },
      {
        environment: "development",
        siteKey: "",
        windowObject: {},
        documentObject: {},
      }
    );

    expect(result).toBeNull();
    expect(initializeAppCheck).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Firebase App Check is disabled: set REACT_APP_RECAPTCHA_SITE_KEY to enable reCAPTCHA v3."
    );
    warn.mockRestore();
  });

  test("enables a debug token only in development", () => {
    const developmentWindow = {};
    const productionWindow = {};

    initializeFirebaseAppCheck(
      { name: "development-client" },
      {
        environment: "development",
        siteKey: "public-site-key",
        debugToken: "development-debug-token",
        windowObject: developmentWindow,
        documentObject: {},
      }
    );
    initializeFirebaseAppCheck(
      { name: "production-client" },
      {
        environment: "production",
        siteKey: "public-site-key",
        debugToken: "development-debug-token",
        windowObject: productionWindow,
        documentObject: {},
      }
    );

    expect(developmentWindow.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(
      "development-debug-token"
    );
    expect(productionWindow.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });
});

describe("waitForFirebaseAppCheck", () => {
  it("keeps Firestore ready when App Check was not initialized", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await waitForFirebaseAppCheck(null, { environment: "production" });

    expect(result.ready).toBe(true);
    expect(result.available).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    log.mockRestore();
  });

  it("waits for a non-empty App Check token", async () => {
    const appCheck = {};
    const result = await waitForFirebaseAppCheck(appCheck, {
      environment: "production",
      getTokenFn: jest.fn().mockResolvedValue({ token: "test-app-check-token" }),
    });

    expect(result).toEqual({ ready: true, available: true });
  });

  it("keeps Firestore ready when the App Check token probe fails", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("captcha blocked");
    const result = await waitForFirebaseAppCheck({}, {
      environment: "production",
      getTokenFn: jest.fn().mockRejectedValue(error),
    });

    expect(result).toEqual({ ready: true, available: false, error });
    log.mockRestore();
  });
});
