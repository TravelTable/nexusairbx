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

jest.mock("./appCheck", () => ({
  getFirebaseAppCheckHeaders: jest.fn().mockResolvedValue({}),
}));

const { getAuth } = require("firebase/auth");
const { authedFetch, isNexusApiUrl } = require("./billing");

function response(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: jest.fn(() => null) },
  };
}

describe("authedFetch authentication recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shares one proactive refresh across concurrent requests", async () => {
    const user = {
      uid: "user-1",
      stsTokenManager: { expirationTime: Date.now() + 30_000 },
      getIdToken: jest.fn().mockResolvedValue("fresh-token"),
    };
    getAuth.mockReturnValue({ currentUser: user });
    global.fetch = jest.fn().mockResolvedValue(response(200));

    await Promise.all([
      authedFetch("/api/v2/runtime-capabilities"),
      authedFetch("/api/v2/agents"),
    ]);

    expect(user.getIdToken).toHaveBeenCalledTimes(1);
    expect(user.getIdToken).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("retries one 401 with a forced token and keeps the request id", async () => {
    const user = {
      uid: "user-1",
      stsTokenManager: { expirationTime: Date.now() + 60 * 60 * 1000 },
      getIdToken: jest.fn()
        .mockResolvedValueOnce("cached-token")
        .mockResolvedValueOnce("refreshed-token"),
    };
    getAuth.mockReturnValue({ currentUser: user });
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200));

    await expect(authedFetch("/api/v2/runs", {
      headers: { "X-Request-ID": "request-stable" },
    })).resolves.toMatchObject({ status: 200 });

    expect(user.getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const firstHeaders = global.fetch.mock.calls[0][1].headers;
    const retryHeaders = global.fetch.mock.calls[1][1].headers;
    expect(global.fetch.mock.calls[0][1].credentials).toBe("include");
    expect(global.fetch.mock.calls[1][1].credentials).toBe("include");
    expect(firstHeaders.Authorization).toBe("Bearer cached-token");
    expect(retryHeaders.Authorization).toBe("Bearer refreshed-token");
    expect(firstHeaders["X-Request-ID"]).toBe("request-stable");
    expect(retryHeaders["X-Request-ID"]).toBe("request-stable");
    expect(retryHeaders["X-Nexus-Client-Deployment"]).toEqual(expect.any(String));
  });

  test("does not loop after a second 401", async () => {
    const user = {
      uid: "user-1",
      stsTokenManager: { expirationTime: Date.now() + 60 * 60 * 1000 },
      getIdToken: jest.fn()
        .mockResolvedValueOnce("cached-token")
        .mockResolvedValueOnce("refreshed-token"),
    };
    getAuth.mockReturnValue({ currentUser: user });
    global.fetch = jest.fn().mockResolvedValue(response(401));

    await expect(authedFetch("/api/v2/runs")).resolves.toMatchObject({ status: 401 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("never attaches Nexus headers or auth to third-party URLs", async () => {
    getAuth.mockReturnValue({ currentUser: null });
    global.fetch = jest.fn().mockResolvedValue(response(200));

    await authedFetch("https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel", {
      headers: { Accept: "application/json" },
    });

    expect(getAuth).not.toHaveBeenCalled();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/firestore\.googleapis\.com\//);
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers["X-Firebase-AppCheck"]).toBeUndefined();
    expect(init.headers["X-Nexus-Client-Deployment"]).toBeUndefined();
    expect(init.credentials).toBeUndefined();
  });

  test("matches the configured Nexus API origin exactly", () => {
    expect(isNexusApiUrl("/api/v2/events")).toBe(true);
    expect(isNexusApiUrl("https://api.test/api/v2/events")).toBe(true);
    expect(isNexusApiUrl("https://api.test.evil.example/api/v2/events")).toBe(false);
    expect(isNexusApiUrl("//firestore.googleapis.com/listen")).toBe(false);
  });
});
