jest.mock("./billing", () => ({ authedFetch: jest.fn() }));

function loadApi({ reads = "", writes = "" } = {}) {
  jest.resetModules();
  if (reads) process.env.REACT_APP_ASSET_PLATFORM_READS_ENABLED = reads;
  else delete process.env.REACT_APP_ASSET_PLATFORM_READS_ENABLED;
  if (writes) process.env.REACT_APP_ASSET_PLATFORM_WRITES_ENABLED = writes;
  else delete process.env.REACT_APP_ASSET_PLATFORM_WRITES_ENABLED;
  const billing = require("./billing");
  const api = require("./assetPlatformApi");
  return { api, authedFetch: billing.authedFetch };
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  };
}

describe("assetPlatformApi rollout gates", () => {
  afterEach(() => {
    delete process.env.REACT_APP_ASSET_PLATFORM_READS_ENABLED;
    delete process.env.REACT_APP_ASSET_PLATFORM_WRITES_ENABLED;
    jest.clearAllMocks();
  });

  test("fails closed without issuing a request when reads are disabled", async () => {
    const { api, authedFetch } = loadApi();

    expect(api.ASSET_PLATFORM_READS_ENABLED).toBe(false);
    await expect(api.listAssets()).rejects.toMatchObject({ code: "ASSET_PLATFORM_DISABLED" });
    expect(authedFetch).not.toHaveBeenCalled();
  });

  test("permits catalog reads but rejects mutations when only the read flag is enabled", async () => {
    const { api, authedFetch } = loadApi({ reads: "true" });
    authedFetch.mockResolvedValueOnce(jsonResponse({ assets: [{ assetId: "asset_one" }] }));

    await expect(api.listAssets({ scope: "global" })).resolves.toMatchObject({
      assets: [{ assetId: "asset_one" }],
    });
    expect(authedFetch).toHaveBeenCalledTimes(1);
    expect(authedFetch.mock.calls[0][1].method).toBe("GET");

    await expect(api.generateAssets({ projectId: "project_one" })).rejects.toMatchObject({
      code: "ASSET_PLATFORM_WRITES_DISABLED",
    });
    expect(authedFetch).toHaveBeenCalledTimes(1);
  });

  test("reads nested safe error envelopes without exposing raw server detail", async () => {
    const { api, authedFetch } = loadApi({ reads: "true" });
    authedFetch.mockResolvedValueOnce(jsonResponse({
      error: { code: "FORBIDDEN", summary: "Raw internal detail", requestId: "req_test" },
    }, { ok: false, status: 403 }));

    let caught;
    try {
      await api.listAssets({ scope: "global" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "FORBIDDEN", requestId: "req_test" });
    expect(api.formatAssetPlatformError(caught)).toBe("You do not have access to this asset or project. Support ID: req_test");
  });
});
