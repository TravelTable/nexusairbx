jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
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
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: { code: "print('ok')" } }),
    }));
  });

  afterEach(() => {
    delete global.fetch;
    jest.clearAllMocks();
  });

  it("sends optional example context settings with Quick Script generation", async () => {
    await generateQuickScript({
      prompt: "make a shop ui",
      idempotencyKey: "test-key",
      useExamples: true,
      selectedExampleIds: ["ItemShopUI"],
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://backend.test/api/quick-script/generate");
    expect(options.headers["Idempotency-Key"]).toBe("test-key");
    expect(JSON.parse(options.body)).toEqual({
      prompt: "make a shop ui",
      generatorMode: "quick_script",
      useExamples: true,
      selectedExampleIds: ["itemshopui"],
    });
  });
});
