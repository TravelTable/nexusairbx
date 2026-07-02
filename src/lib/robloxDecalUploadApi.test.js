import { uploadRobloxDecalBatch, uploadRobloxDecalBatchStream } from "./robloxDecalUploadApi";
import { authedFetch } from "./billing";
import { TextDecoder, TextEncoder } from "util";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

beforeAll(() => {
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
});

function sseResponse(chunks) {
  const encoded = chunks.map((chunk) => Buffer.from(chunk, "utf8"));
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (index >= encoded.length) {
            return { done: true, value: undefined };
          }
          const value = encoded[index];
          index += 1;
          return { done: false, value };
        },
      }),
    },
  };
}

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
      projectId: "chat-abc",
      files: [new File(["image"], "decal.png", { type: "image/png" })],
      items: [{ clientId: "one", fileName: "decal.png", displayName: "Decal" }],
    });

    expect(payload.batchId).toBe("batch-1");
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/decal-uploads", {
      method: "POST",
      body: expect.any(FormData),
    });
    const form = authedFetch.mock.calls[0][1].body;
    expect(form.get("projectId")).toBe("chat-abc");
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

describe("uploadRobloxDecalBatchStream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("streams progress events and resolves with the completion payload", async () => {
    const progress = [];
    authedFetch.mockResolvedValue(sseResponse([
      'event: progress\ndata: {"clientId":"one","status":"succeeded","assetId":"9001"}\n\n',
      'event: complete\ndata: {"batchId":"batch-1","results":[{"clientId":"one","status":"succeeded"}]}\n\n',
    ]));

    const payload = await uploadRobloxDecalBatchStream({
      requestId: "request-3",
      files: [new File(["image"], "decal.png", { type: "image/png" })],
      items: [{ clientId: "one", fileName: "decal.png", displayName: "Decal" }],
      onProgress: (item) => progress.push(item),
    });

    expect(payload.batchId).toBe("batch-1");
    expect(progress).toEqual([{ clientId: "one", status: "succeeded", assetId: "9001" }]);
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/decal-uploads?stream=1", {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: expect.any(FormData),
      signal: undefined,
    });
  });

  test("throws when the stream emits an error event", async () => {
    authedFetch.mockResolvedValue(sseResponse([
      'event: error\ndata: {"error":"Reconnect Roblox","code":"ROBLOX_REAUTHORIZATION_REQUIRED"}\n\n',
    ]));

    await expect(uploadRobloxDecalBatchStream({
      files: [new File(["image"], "decal.png", { type: "image/png" })],
      items: [{ clientId: "one", fileName: "decal.png", displayName: "Decal" }],
    })).rejects.toMatchObject({
      message: "Reconnect Roblox",
      code: "ROBLOX_REAUTHORIZATION_REQUIRED",
    });
  });
});
