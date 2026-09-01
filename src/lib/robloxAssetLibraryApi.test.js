import { normalizeRobloxAssetUrls } from "./robloxAssetLibraryApi";

jest.mock("../config", () => ({ BACKEND_URL: "https://backend.test" }));
jest.mock("./billing", () => ({ authedFetch: jest.fn() }));

test("normalizes backend-relative Roblox thumbnail URLs", () => {
  expect(normalizeRobloxAssetUrls({
    thumbnailUrl: "/api/roblox/thumbnail?assetId=123",
    previewCapabilities: {
      thumbnailUrl: "/api/roblox/thumbnail?assetId=123",
      imageUrl: "/api/roblox/thumbnail?assetId=456",
    },
  })).toMatchObject({
    thumbnailUrl: "https://backend.test/api/roblox/thumbnail?assetId=123",
    previewCapabilities: {
      thumbnailUrl: "https://backend.test/api/roblox/thumbnail?assetId=123",
      imageUrl: "https://backend.test/api/roblox/thumbnail?assetId=456",
    },
  });
});
