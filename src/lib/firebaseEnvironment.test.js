import {
  EXPECTED_FIREBASE_API_KEY,
  EXPECTED_FIREBASE_APP_ID,
  EXPECTED_FIREBASE_PROJECT_ID,
  EXPECTED_RECAPTCHA_SITE_KEY,
  FIREBASE_CONFIG_ENV_KEYS,
  isLocalAppCheckDebugAllowed,
  readFirebaseConfig,
  validateFirebaseAppCheckSiteKey,
  validateFirebaseConfig,
} from "./firebaseEnvironment";

describe("Firebase environment validation", () => {
  test("uses the intended NexusRBX project and app by default", () => {
    const config = validateFirebaseConfig(readFirebaseConfig({}));

    expect(config.projectId).toBe(EXPECTED_FIREBASE_PROJECT_ID);
    expect(config.appId).toBe(EXPECTED_FIREBASE_APP_ID);
    expect(Object.isFrozen(config)).toBe(true);
  });

  test("fails fast when deployment variables point at a different Firebase app", () => {
    const config = readFirebaseConfig({
      REACT_APP_FIREBASE_PROJECT_ID: "wrong-project",
      REACT_APP_FIREBASE_APP_ID: "1:000:web:wrong",
    });

    expect(() => validateFirebaseConfig(config)).toThrow(
      expect.objectContaining({
        code: "FIREBASE_CONFIG_INVALID",
        mismatches: expect.arrayContaining([
          `${FIREBASE_CONFIG_ENV_KEYS.projectId} must be ${EXPECTED_FIREBASE_PROJECT_ID}`,
          `${FIREBASE_CONFIG_ENV_KEYS.appId} must be ${EXPECTED_FIREBASE_APP_ID}`,
        ]),
      })
    );
  });

  test("rejects an API key from a different Firebase web app", () => {
    const config = readFirebaseConfig({
      REACT_APP_FIREBASE_API_KEY: "AIzaSyWrongProjectKey",
    });

    expect(() => validateFirebaseConfig(config)).toThrow(
      expect.objectContaining({
        code: "FIREBASE_CONFIG_INVALID",
        mismatches: expect.arrayContaining([
          `${FIREBASE_CONFIG_ENV_KEYS.apiKey} must match the ${EXPECTED_FIREBASE_PROJECT_ID} web app`,
        ]),
      })
    );
  });

  test("rejects newline or quote contamination in deployment variables", () => {
    expect(() =>
      readFirebaseConfig({
        REACT_APP_FIREBASE_API_KEY: `${EXPECTED_FIREBASE_API_KEY}\n`,
      })
    ).toThrow(expect.objectContaining({
      code: "FIREBASE_CONFIG_INVALID",
      invalid: [FIREBASE_CONFIG_ENV_KEYS.apiKey],
    }));
  });

  test("reports missing required configuration fields clearly", () => {
    expect(() =>
      validateFirebaseConfig({
        projectId: EXPECTED_FIREBASE_PROJECT_ID,
        appId: EXPECTED_FIREBASE_APP_ID,
      })
    ).toThrow(expect.objectContaining({
      code: "FIREBASE_CONFIG_INVALID",
      missing: expect.arrayContaining([
        FIREBASE_CONFIG_ENV_KEYS.apiKey,
        FIREBASE_CONFIG_ENV_KEYS.authDomain,
        FIREBASE_CONFIG_ENV_KEYS.storageBucket,
        FIREBASE_CONFIG_ENV_KEYS.messagingSenderId,
      ]),
    }));
  });

  test("requires explicit Firebase variables for production builds", () => {
    const config = readFirebaseConfig(
      { NODE_ENV: "production" },
      { requireEnvironment: true }
    );

    expect(() => validateFirebaseConfig(config)).toThrow(
      expect.objectContaining({
        code: "FIREBASE_CONFIG_INVALID",
        missing: expect.arrayContaining([
          FIREBASE_CONFIG_ENV_KEYS.apiKey,
          FIREBASE_CONFIG_ENV_KEYS.authDomain,
          FIREBASE_CONFIG_ENV_KEYS.storageBucket,
          FIREBASE_CONFIG_ENV_KEYS.messagingSenderId,
        ]),
      })
    );
  });

  test("requires the App Check site key for production builds", () => {
    expect(() =>
      validateFirebaseAppCheckSiteKey("", { required: true })
    ).toThrow(expect.objectContaining({
      code: "FIREBASE_APP_CHECK_CONFIG_INVALID",
      missing: ["REACT_APP_RECAPTCHA_SITE_KEY"],
    }));
  });

  test("requires the App Check key registered for the intended web app", () => {
    expect(() =>
      validateFirebaseAppCheckSiteKey("wrong-site-key", { required: true })
    ).toThrow(expect.objectContaining({
      code: "FIREBASE_APP_CHECK_CONFIG_INVALID",
      mismatches: [
        `REACT_APP_RECAPTCHA_SITE_KEY must match the ${EXPECTED_FIREBASE_PROJECT_ID} web app`,
      ],
    }));
    expect(
      validateFirebaseAppCheckSiteKey(EXPECTED_RECAPTCHA_SITE_KEY, {
        required: true,
      })
    ).toBe(EXPECTED_RECAPTCHA_SITE_KEY);
  });

  test("rejects quote contamination in the App Check site key", () => {
    expect(() =>
      validateFirebaseAppCheckSiteKey(`"${EXPECTED_RECAPTCHA_SITE_KEY}"`)
    ).toThrow(expect.objectContaining({
      code: "FIREBASE_APP_CHECK_CONFIG_INVALID",
      invalid: ["REACT_APP_RECAPTCHA_SITE_KEY"],
    }));
  });

  test("allows App Check debug tokens only for a local development host", () => {
    expect(
      isLocalAppCheckDebugAllowed({
        environment: "development",
        hostname: "localhost",
      })
    ).toBe(true);
    expect(
      isLocalAppCheckDebugAllowed({
        environment: "production",
        hostname: "localhost",
      })
    ).toBe(false);
    expect(
      isLocalAppCheckDebugAllowed({
        environment: "development",
        hostname: "app.nexusrbx.com",
      })
    ).toBe(false);
  });
});
