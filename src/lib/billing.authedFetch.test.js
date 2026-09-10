import { getAuth } from "firebase/auth";
import { getFirebaseAppCheckHeaders } from "./appCheck";
import { authedFetch } from "./billing";

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("./appCheck", () => ({
  getFirebaseAppCheckHeaders: jest.fn(),
}));

jest.mock("./productAnalytics", () => ({
  getProductAnalyticsHeaders: jest.fn(() => ({})),
}));

jest.mock("../config", () => ({
  BACKEND_URL: "https://api.nexusrbx.com",
}));

describe("shared authenticated backend requests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuth.mockReturnValue({
      currentUser: {
        uid: "user-1",
        getIdToken: jest.fn().mockResolvedValue("id-token"),
      },
    });
    getFirebaseAppCheckHeaders.mockResolvedValue({
      "X-Firebase-AppCheck": "app-check-token",
    });
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });
  });

  test("attaches the ID token, App Check token, and request ID to backend calls", async () => {
    await authedFetch("/api/studio/status", { method: "GET" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.nexusrbx.com/api/studio/status");
    expect(init.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer id-token",
      "X-Firebase-AppCheck": "app-check-token",
      "X-Request-ID": expect.any(String),
    }));
  });

  test("does not attach Nexus credentials to third-party URLs", async () => {
    await authedFetch("https://example.com/public.json", { method: "GET" });

    expect(getAuth).not.toHaveBeenCalled();
    expect(getFirebaseAppCheckHeaders).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/public.json",
      expect.objectContaining({ method: "GET" })
    );
  });

  test("backs off failed reads across cache busters, then reconnects", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1000);
    global.fetch.mockResolvedValueOnce({ status: 500, ok: false });
    try {
      expect((await authedFetch("/api/test-outage?t=1")).status).toBe(500);
      await expect(authedFetch("/api/test-outage?t=2")).rejects.toMatchObject({
        code: "API_RETRY_COOLDOWN", retryAfterMs: 30000,
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      now.mockReturnValue(31001);
      expect((await authedFetch("/api/test-outage?t=3")).ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally { now.mockRestore(); }
  });

  test("honors Retry-After without blocking another signed-in user", async () => {
    global.fetch.mockResolvedValueOnce({ status: 503, ok: false, headers: { get: () => "45" } });
    await authedFetch("/api/test-user-outage");
    await expect(authedFetch("/api/test-user-outage")).rejects.toMatchObject({ code: "API_RETRY_COOLDOWN" });
    getAuth.mockReturnValue({ currentUser: { uid: "user-2", getIdToken: jest.fn().mockResolvedValue("second-token") } });
    expect((await authedFetch("/api/test-user-outage")).ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("does not replay or suppress writes after a failed read", async () => {
    global.fetch.mockResolvedValue({ status: 500, ok: false });
    await authedFetch("/api/test-write-outage");
    expect((await authedFetch("/api/test-write-outage", { method: "POST" })).status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
