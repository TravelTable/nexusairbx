export const EXPECTED_FIREBASE_PROJECT_ID = "nexusrbx";
export const EXPECTED_FIREBASE_APP_ID =
  "1:834738385750:web:7f877b6dd0228c11fa1cf7";
export const EXPECTED_FIREBASE_AUTH_DOMAIN = "nexusrbx.firebaseapp.com";
export const EXPECTED_FIREBASE_STORAGE_BUCKET = "nexusrbx.appspot.com";
export const EXPECTED_FIREBASE_MESSAGING_SENDER_ID = "834738385750";
export const EXPECTED_FIREBASE_API_KEY =
  "AIzaSyCT6UZdUWmWdaJgKYhCSAzmr0pM-UU6-Tg";
export const EXPECTED_RECAPTCHA_SITE_KEY =
  "6Ld2jU4tAAAAAJxnNADHP1rJW-TvG98gE1YRKIFU";
export const APP_CHECK_SITE_KEY_ENV = "REACT_APP_RECAPTCHA_SITE_KEY";

const checkedInPublicConfig = {
  apiKey: EXPECTED_FIREBASE_API_KEY,
  authDomain: EXPECTED_FIREBASE_AUTH_DOMAIN,
  projectId: EXPECTED_FIREBASE_PROJECT_ID,
  storageBucket: EXPECTED_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: EXPECTED_FIREBASE_MESSAGING_SENDER_ID,
  appId: EXPECTED_FIREBASE_APP_ID,
  measurementId: "G-4V4T613MJ7",
};

export const FIREBASE_CONFIG_ENV_KEYS = Object.freeze({
  apiKey: "REACT_APP_FIREBASE_API_KEY",
  authDomain: "REACT_APP_FIREBASE_AUTH_DOMAIN",
  projectId: "REACT_APP_FIREBASE_PROJECT_ID",
  storageBucket: "REACT_APP_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REACT_APP_FIREBASE_APP_ID",
  measurementId: "REACT_APP_FIREBASE_MEASUREMENT_ID",
});

function assertCleanEnvironmentValue(value, envKey, code) {
  const raw = String(value ?? "");
  if (/[\r\n"'`]/.test(raw)) {
    const error = new Error(
      `${envKey} contains a newline or quote character. Re-enter the value without wrapping quotes.`
    );
    error.code = code;
    error.invalid = [envKey];
    throw error;
  }
  return raw.trim();
}

export function readFirebaseConfig(
  environment = process.env,
  {
    requireEnvironment = environment?.NODE_ENV === "production",
  } = {}
) {
  return Object.fromEntries(
    Object.entries(FIREBASE_CONFIG_ENV_KEYS).map(([key, envKey]) => {
      const value =
        environment?.[envKey]
        || (!requireEnvironment ? checkedInPublicConfig[key] : "")
        || "";
      return [
        key,
        assertCleanEnvironmentValue(value, envKey, "FIREBASE_CONFIG_INVALID"),
      ];
    })
  );
}

export function validateFirebaseConfig(
  config,
  {
    expectedProjectId = EXPECTED_FIREBASE_PROJECT_ID,
    expectedAppId = EXPECTED_FIREBASE_APP_ID,
    expectedAuthDomain = EXPECTED_FIREBASE_AUTH_DOMAIN,
    expectedStorageBucket = EXPECTED_FIREBASE_STORAGE_BUCKET,
    expectedMessagingSenderId = EXPECTED_FIREBASE_MESSAGING_SENDER_ID,
    expectedApiKey = EXPECTED_FIREBASE_API_KEY,
  } = {}
) {
  const required = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missing = required
    .filter((key) => !String(config?.[key] || "").trim())
    .map((key) => FIREBASE_CONFIG_ENV_KEYS[key]);
  const mismatches = [];

  if (config?.apiKey !== expectedApiKey) {
    mismatches.push(
      `${FIREBASE_CONFIG_ENV_KEYS.apiKey} must match the ${expectedProjectId} web app`
    );
  }
  if (config?.projectId !== expectedProjectId) {
    mismatches.push(
      `${FIREBASE_CONFIG_ENV_KEYS.projectId} must be ${expectedProjectId}`
    );
  }
  if (config?.appId !== expectedAppId) {
    mismatches.push(`${FIREBASE_CONFIG_ENV_KEYS.appId} must be ${expectedAppId}`);
  }
  if (config?.authDomain !== expectedAuthDomain) {
    mismatches.push(
      `${FIREBASE_CONFIG_ENV_KEYS.authDomain} must be ${expectedAuthDomain}`
    );
  }
  if (config?.storageBucket !== expectedStorageBucket) {
    mismatches.push(
      `${FIREBASE_CONFIG_ENV_KEYS.storageBucket} must be ${expectedStorageBucket}`
    );
  }
  if (config?.messagingSenderId !== expectedMessagingSenderId) {
    mismatches.push(
      `${FIREBASE_CONFIG_ENV_KEYS.messagingSenderId} must be ${expectedMessagingSenderId}`
    );
  }

  if (missing.length || mismatches.length) {
    const error = new Error(
      [
        missing.length ? `Missing Firebase config: ${missing.join(", ")}` : "",
        ...mismatches,
      ].filter(Boolean).join(". ")
    );
    error.code = "FIREBASE_CONFIG_INVALID";
    error.missing = missing;
    error.mismatches = mismatches;
    throw error;
  }

  return Object.freeze({ ...config });
}

export function validateFirebaseAppCheckSiteKey(
  siteKey,
  {
    required = process.env.NODE_ENV === "production",
    expectedSiteKey = EXPECTED_RECAPTCHA_SITE_KEY,
  } = {}
) {
  const normalized = assertCleanEnvironmentValue(
    siteKey,
    APP_CHECK_SITE_KEY_ENV,
    "FIREBASE_APP_CHECK_CONFIG_INVALID"
  );
  if (required && !normalized) {
    const error = new Error(
      `Missing Firebase App Check config: ${APP_CHECK_SITE_KEY_ENV}`
    );
    error.code = "FIREBASE_APP_CHECK_CONFIG_INVALID";
    error.missing = [APP_CHECK_SITE_KEY_ENV];
    throw error;
  }
  if (normalized && expectedSiteKey && normalized !== expectedSiteKey) {
    const error = new Error(
      `${APP_CHECK_SITE_KEY_ENV} must match the ${EXPECTED_FIREBASE_PROJECT_ID} web app`
    );
    error.code = "FIREBASE_APP_CHECK_CONFIG_INVALID";
    error.mismatches = [
      `${APP_CHECK_SITE_KEY_ENV} must match the ${EXPECTED_FIREBASE_PROJECT_ID} web app`,
    ];
    throw error;
  }
  return normalized;
}

export function isLocalAppCheckDebugAllowed({
  environment = process.env.NODE_ENV,
  hostname = typeof window !== "undefined" ? window.location?.hostname : "",
} = {}) {
  return (
    environment === "development" &&
    ["localhost", "127.0.0.1", "::1"].includes(String(hostname || "").toLowerCase())
  );
}
