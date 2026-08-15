const mockGetIdToken = jest.fn(async () => "test-token");

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("../config", () => ({
  BACKEND_URL: "http://backend.test",
}));

jest.mock("./productAnalytics", () => ({
  getProductAnalyticsHeaders: jest.fn(() => ({ "X-Product-Test": "1" })),
}));

import { generateQuickScript } from "./quickScriptApi";

describe("quickScriptApi", () => {
  beforeEach(() => {
    const { getAuth } = require("firebase/auth");
    mockGetIdToken.mockResolvedValue("test-token");
    getAuth.mockReturnValue({ currentUser: { getIdToken: mockGetIdToken } });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: { code: "print('ok')" } }),
    }));
  });

  afterEach(() => {
    delete global.fetch;
    jest.clearAllMocks();
  });

  it("leaves example context selection to the backend for Quick Script generation", async () => {
    await generateQuickScript({
      prompt: "make a shop ui",
      idempotencyKey: "test-key",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://backend.test/api/quick-script/generate");
    expect(options.headers["Idempotency-Key"]).toBe("test-key");
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(options.body)).toEqual({
      prompt: "make a shop ui",
      generatorMode: "quick_script",
    });
  });

  it("requires a signed-in user before sending a Quick Script request", async () => {
    const { getAuth } = require("firebase/auth");
    getAuth.mockReturnValue({ currentUser: null });

    await expect(generateQuickScript({ prompt: "make a shop ui" })).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      status: 401,
      authRequired: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends priorResult when updating an existing Quick Script", async () => {
    await generateQuickScript({
      prompt: "add altitude controls",
      priorResult: {
        title: "Checkpoint HUD",
        scriptType: "LocalScript",
        studioLocation: "StarterPlayer/StarterPlayerScripts",
        code: 'local flying = false',
      },
      idempotencyKey: "update-key",
    });

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      prompt: "add altitude controls",
      generatorMode: "quick_script",
      priorResult: {
        title: "Checkpoint HUD",
        scriptType: "LocalScript",
        studioLocation: "StarterPlayer/StarterPlayerScripts",
        code: 'local flying = false',
      },
    });
  });
});
