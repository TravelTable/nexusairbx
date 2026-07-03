import { buildCreatorStoreThumbnailCandidates } from "./creatorStoreThumbnail";

jest.mock("../config", () => ({
  BACKEND_URL: "https://backend.test",
}));

describe("buildCreatorStoreThumbnailCandidates", () => {
  test("dedupes direct, preview, and asset fallback URLs", () => {
    const candidates = buildCreatorStoreThumbnailCandidates({
      thumbnailUrl: "https://cdn.test/direct.png",
      previewAssetIds: ["123", "456"],
      assetId: "123",
    });
    expect(candidates).toEqual([
      "https://cdn.test/direct.png",
      "https://backend.test/api/roblox/thumbnail?assetId=123&size=420x420",
      "https://backend.test/api/roblox/thumbnail?assetId=456&size=420x420",
    ]);
  });

  test("builds preview and asset fallback URLs when direct thumbnail is missing", () => {
    const candidates = buildCreatorStoreThumbnailCandidates({
      previewAssetIds: ["555"],
      assetId: "123",
    });
    expect(candidates).toEqual([
      "https://backend.test/api/roblox/thumbnail?assetId=555&size=420x420",
      "https://backend.test/api/roblox/thumbnail?assetId=123&size=420x420",
    ]);
  });
});
