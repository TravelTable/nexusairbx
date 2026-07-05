jest.mock("../config", () => ({
  BACKEND_URL: "http://backend.test",
}));

import { fetchRobloxExamples } from "./robloxExamplesApi";

describe("robloxExamplesApi", () => {
  afterEach(() => {
    delete global.fetch;
    jest.clearAllMocks();
  });

  it("loads converted Roblox examples from the backend", async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, examples: [{ id: "shop" }] }),
    }));

    await expect(fetchRobloxExamples()).resolves.toEqual({
      ok: true,
      examples: [{ id: "shop" }],
    });

    expect(global.fetch).toHaveBeenCalledWith("http://backend.test/api/roblox-examples", {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  });

  it("throws response payload messages on failures", async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ message: "Examples unavailable" }),
    }));

    await expect(fetchRobloxExamples()).rejects.toMatchObject({
      message: "Examples unavailable",
      status: 503,
    });
  });
});
