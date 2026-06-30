import { uploadRobloxDecalBatch } from "./robloxDecalUploadApi";
import { authedFetch } from "./billing";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

describe("uploadRobloxDecalBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("sends multipart form data without manually setting content type", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ batchId: "batch-1", results: [] }),
    });

    const payload = await uploadRobloxDecalBatch({
      requestId: "request-1",
      files: [new File(["image"], "decal.png", { type: "image/png" })],
      items: [{ clientId: "one", fileName: "decal.png", displayName: "Decal" }],
    });

    expect(payload.batchId).toBe("batch-1");
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/decal-uploads", {
      method: "POST",
      body: expect.any(FormData),
    });
    expect(authedFetch.mock.calls[0][1].headers).toBeUndefined();
  });

  test("surfaces backend upload error codes", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Reconnect Roblox", code: "ROBLOX_REAUTHORIZATION_REQUIRED" }),
    });

    await expect(uploadRobloxDecalBatch({ files: [], items: [], requestId: "request-2" }))
      .rejects
      .toMatchObject({
        message: "Reconnect Roblox",
        code: "ROBLOX_REAUTHORIZATION_REQUIRED",
        status: 403,
      });
  });
});
