jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("../config", () => ({
  BACKEND_URL: "https://api.test",
}));

jest.mock("./productAnalytics", () => ({
  getProductAnalyticsHeaders: () => ({}),
}));

const { getAuth } = require("firebase/auth");
const { submitBrowserTimezone } = require("./billing");

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => headers[name] || headers[name.toLowerCase()] || null,
    },
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("submitBrowserTimezone", () => {
  const user = { uid: "user_1", getIdToken: jest.fn().mockResolvedValue("token") };

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    getAuth.mockReturnValue({ currentUser: user });
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
  });

  test("throttles duplicate timezone submissions for the same user and timezone", async () => {
    await submitBrowserTimezone("Australia/Sydney");
    await submitBrowserTimezone("Australia/Sydney");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("suppresses repeated retryable timezone failures until the retry window expires", async () => {
    global.fetch.mockResolvedValue(jsonResponse(
      { error: "Database temporarily unavailable", code: "FIRESTORE_QUOTA_EXCEEDED", retryable: true },
      { status: 503, headers: { "Retry-After": "60" } }
    ));

    await submitBrowserTimezone("Australia/Sydney");
    await submitBrowserTimezone("Australia/Sydney");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
