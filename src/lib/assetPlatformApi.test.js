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

  test("permits read-only tools that use the canonical POST transport when writes are disabled", async () => {
    const { api, authedFetch } = loadApi({ reads: "true" });
    authedFetch.mockResolvedValueOnce(jsonResponse({
      result: { operationState: "succeeded", data: { creators: [{ type: "Group", id: "42" }] } },
    }));

    await expect(api.listAuthorizedCreators({ projectId: "project_one" })).resolves.toMatchObject({
      creators: [{ type: "Group", id: "42" }],
    });
    expect(authedFetch).toHaveBeenCalledWith(
      "/api/asset-platform/tools/list_authorized_creators",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ projectId: "project_one" }) })
    );

    await expect(api.publishAssetToRoblox("asset_one")).rejects.toMatchObject({
      code: "ASSET_PLATFORM_WRITES_DISABLED",
    });
    expect(authedFetch).toHaveBeenCalledTimes(1);
  });

  test("loads private asset files through authenticated blob requests and rejects invalid roles locally", async () => {
    const { api, authedFetch } = loadApi({ reads: "true" });
    const blob = new Blob(["preview"], { type: "image/png" });
    const signal = new AbortController().signal;
    authedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      blob: async () => blob,
    });

    await expect(api.getAssetFileBlob("asset one", "preview", {
      projectId: "project_one",
      universeId: "universe_one",
      signal,
    })).resolves.toBe(blob);
    expect(authedFetch).toHaveBeenCalledWith(
      "/api/asset-platform/assets/asset%20one/files/preview?projectId=project_one&universeId=universe_one",
      { method: "GET", noCache: true, signal }
    );

    await expect(api.getAssetFileBlob("asset_one", "source")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(api.getAssetFileBlob("", "preview")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
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

  test("requires both rollout flags and server-advertised capabilities for writes", () => {
    const { api } = loadApi({ reads: "true", writes: "true" });

    expect(api.getAssetPlatformCapabilities({ capabilities: { reads: true } })).toMatchObject({
      reads: true,
      writes: false,
      externalWrites: false,
    });

    const capabilities = api.getAssetPlatformCapabilities({
      capabilities: {
        reads: true,
        writes: true,
        externalWrites: false,
        actions: {
          generate_asset: true,
          attach_asset_to_project: true,
          publish_asset_to_roblox: false,
        },
      },
    });
    expect(capabilities).toMatchObject({ reads: true, writes: true, externalWrites: false });
    expect(capabilities.actions).toEqual({
      generate_asset: true,
      attach_asset_to_project: true,
      publish_asset_to_roblox: false,
    });
    expect(api.canAssetPlatformAction(capabilities, "generate_asset")).toBe(true);
    expect(api.canAssetPlatformAction(capabilities, "publish_asset_to_roblox")).toBe(false);
    expect(api.canAssetPlatformAction(capabilities, "unknown_action")).toBe(false);

    const externalCapabilities = api.getAssetPlatformCapabilities({
      capabilities: {
        reads: true,
        writes: true,
        externalWrites: true,
        actions: ["publish_asset_to_roblox", "verify_asset_in_studio"],
      },
    });
    expect(api.canAssetPlatformAction(externalCapabilities, "publish_asset_to_roblox")).toBe(true);
    expect(api.canAssetPlatformAction(externalCapabilities, "verify_asset_in_studio")).toBe(true);

    const directCapabilities = api.getAssetPlatformCapabilities({
      capabilities: {
        reads: true,
        writes: true,
        externalWrites: true,
        generate_asset: true,
        publish_asset_to_roblox: true,
        archive_asset: false,
      },
    });
    expect(api.canAssetPlatformAction(directCapabilities, "generate_asset")).toBe(true);
    expect(api.canAssetPlatformAction(directCapabilities, "publish_asset_to_roblox")).toBe(true);
    expect(api.canAssetPlatformAction(directCapabilities, "archive_asset")).toBe(false);
  });

  test("uses the canonical generic tool route and rejects unrecognized tools locally", async () => {
    const { api, authedFetch } = loadApi({ reads: "true", writes: "true" });
    authedFetch.mockResolvedValueOnce(jsonResponse({
      tool: "publish_asset_to_roblox",
      result: {
        operationId: "operation_1",
        operationState: "queued",
        data: { asset: { nexusAssetId: "asset_one", displayName: "Sword" } },
      },
    }));

    await expect(api.publishAssetToRoblox("asset_one", {
      projectId: "project_one",
      idempotencyKey: "publish-key",
      unexpectedBrowserField: "drop-me",
    })).resolves.toMatchObject({
      operationId: "operation_1",
      tool: "publish_asset_to_roblox",
      asset: { assetId: "asset_one", name: "Sword" },
    });
    expect(authedFetch).toHaveBeenCalledWith("/api/asset-platform/tools/publish_asset_to_roblox", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ assetId: "asset_one", projectId: "project_one" }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "publish-key",
      },
    }));

    await expect(api.runAssetPlatformTool("unrestricted_tool", { assetId: "asset_one" })).rejects.toMatchObject({
      code: "CAPABILITY_UNSUPPORTED",
    });
    expect(authedFetch).toHaveBeenCalledTimes(1);
  });

  test("exposes only the backend-supported asset tools", () => {
    const { api } = loadApi({ reads: "true", writes: "true" });

    expect(api.ASSET_PLATFORM_TOOL_NAMES).toEqual([
      "inspect_asset_capabilities",
      "list_authorized_creators",
      "search_project_assets",
      "get_asset_details",
      "generate_asset",
      "generate_asset_pack",
      "generate_asset_variation",
      "validate_asset",
      "publish_asset_to_roblox",
      "get_roblox_upload_status",
      "attach_asset_to_project",
      "implement_asset_in_studio",
      "verify_asset_in_studio",
      "create_game_pass",
      "update_game_pass",
      "create_developer_product",
      "update_developer_product",
      "archive_asset",
    ]);
  });

  test("maps generation compatibility helpers to strict tool inputs", async () => {
    const { api, authedFetch } = loadApi({ reads: "true", writes: "true" });
    authedFetch.mockResolvedValue(jsonResponse({ result: { operationState: "succeeded", data: {} } }));

    await api.generateAssets({
      mode: "single",
      projectId: "project_one",
      prompt: "Sword icon",
      assetType: "icon",
      universeId: "not-supported-here",
      idempotencyKey: "single-key",
    });
    await api.extendAssetPack("pack_one", {
      projectId: "project_one",
      prompt: "Add a cash icon",
      conceptNames: ["Cash"],
      requestedCount: 8,
      autoUpload: true,
      idempotencyKey: "pack-key",
    });
    await api.generateSimilarAsset("asset_one", {
      projectId: "project_one",
      prompt: "Three variations",
      variationCount: 3,
      universeId: "not-supported-here",
      idempotencyKey: "variation-key",
    });
    await api.getRobloxUploadStatus("asset_one", {
      assetId: "must-not-be-sent-with-operation-id",
      operationId: "operation_one",
      projectId: "project_one",
    });

    expect(authedFetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/asset-platform/tools/generate_asset",
      "/api/asset-platform/tools/generate_asset_pack",
      "/api/asset-platform/tools/generate_asset_variation",
      "/api/asset-platform/tools/get_roblox_upload_status",
    ]);
    expect(JSON.parse(authedFetch.mock.calls[0][1].body)).toEqual({
      projectId: "project_one",
      prompt: "Sword icon",
      assetType: "icon",
    });
    expect(JSON.parse(authedFetch.mock.calls[1][1].body)).toEqual({
      projectId: "project_one",
      concepts: ["Cash"],
      prompt: "Add a cash icon",
      packId: "pack_one",
    });
    expect(JSON.parse(authedFetch.mock.calls[2][1].body)).toEqual({
      assetId: "asset_one",
      projectId: "project_one",
      prompt: "Three variations",
      variationCount: 3,
    });
    expect(JSON.parse(authedFetch.mock.calls[3][1].body)).toEqual({
      operationId: "operation_one",
      projectId: "project_one",
    });
    expect(authedFetch.mock.calls.slice(0, 3).map(([, options]) => options.headers["Idempotency-Key"])).toEqual([
      "single-key",
      "pack-key",
      "variation-key",
    ]);
    expect(authedFetch.mock.calls[3][1].headers).toEqual({ "Content-Type": "application/json" });
  });

  test("normalizes canonical Nexus and Roblox relationship metadata", () => {
    const { api } = loadApi({ reads: "true" });
    const asset = api.normalizeAsset({
      nexusAssetId: "nexus_asset_1",
      displayName: "Double cash",
      assetType: "game_pass_icon",
      originalUserRequest: "Create a double cash pass icon",
      storageObjects: {
        master: { url: "https://cdn.example/master.png", format: "png", mimeType: "image/png", width: 1024, height: 1024, size: 4096 },
        roblox_ready: { url: "https://cdn.example/icon.png", format: "png", mimeType: "image/png", width: 512, height: 512, size: 2048 },
      },
      relationships: {
        roblox: [
          { assetId: "12345", operationId: "operation_1", creatorType: "Group", creatorId: "99", updatedAt: "2026-07-22T02:00:00Z" },
        ],
      },
      projectAssociations: [{ projectId: "project_1" }],
    });

    expect(asset).toMatchObject({
      assetId: "nexus_asset_1",
      name: "Double cash",
      originalUserRequest: "Create a double cash pass icon",
      robloxAssetId: "12345",
      robloxOperationId: "operation_1",
      creator: { type: "Group", id: "99" },
      previewUrl: "https://cdn.example/icon.png",
      fileFormat: "png",
      mimeType: "image/png",
      width: 512,
      height: 512,
      fileSize: 2048,
    });
    expect(asset.sourceFile).toMatchObject({ role: "master", url: "https://cdn.example/master.png" });
    expect(asset.processedFile).toMatchObject({ role: "roblox_ready", url: "https://cdn.example/icon.png" });
    expect(asset.projectAssociations).toEqual([{ projectId: "project_1" }]);
  });
});
