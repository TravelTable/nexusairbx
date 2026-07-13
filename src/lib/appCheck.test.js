import { getToken } from "firebase/app-check";
import { installAppCheckFetchInterceptor } from "./appCheck";

jest.mock("firebase/app-check", () => ({
  getToken: jest.fn(),
}));

jest.mock("../firebase", () => ({
  appCheck: { app: "test" },
}));

jest.mock("../config", () => ({
  BACKEND_URL: "https://api.nexusrbx.test",
}));

describe("installAppCheckFetchInterceptor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("adds a valid App Check token only to backend fetches", async () => {
    getToken.mockResolvedValue({ token: "valid-app-check-token" });
    const originalFetch = jest.fn().mockResolvedValue({ ok: true });
    const windowObject = {
      fetch: originalFetch,
      location: { origin: "https://app.nexusrbx.test" },
    };

    installAppCheckFetchInterceptor({ windowObject, backendUrl: "https://api.nexusrbx.test" });
    await windowObject.fetch("https://api.nexusrbx.test/api/ai/chat", {
      headers: { "X-Request-ID": "request-1" },
    });

    expect(getToken).toHaveBeenCalled();
    expect(originalFetch).toHaveBeenCalledTimes(1);
    const [, requestInit] = originalFetch.mock.calls[0];
    expect(requestInit.headers.get("X-Firebase-AppCheck")).toBe("valid-app-check-token");
    expect(requestInit.headers.get("X-Request-ID")).toBe("request-1");

    await windowObject.fetch("https://example.test/asset");
    expect(originalFetch).toHaveBeenCalledTimes(2);
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
