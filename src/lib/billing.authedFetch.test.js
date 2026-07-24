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
});
