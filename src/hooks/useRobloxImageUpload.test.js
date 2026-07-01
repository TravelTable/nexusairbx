import {
  extensionFor,
  isRobloxDecalImage,
  readinessCheck,
  displayNameFor,
} from "./useRobloxImageUpload";

describe("useRobloxImageUpload helpers", () => {
  test("isRobloxDecalImage accepts supported extensions only", () => {
    expect(isRobloxDecalImage(new File(["x"], "icon.png", { type: "image/png" }))).toBe(true);
    expect(isRobloxDecalImage(new File(["x"], "photo.jpeg", { type: "image/jpeg" }))).toBe(true);
    expect(isRobloxDecalImage(new File(["x"], "shot.heic", { type: "image/heic" }))).toBe(false);
    expect(extensionFor("tree.tga")).toBe(".tga");
  });

  test("displayNameFor strips extension and normalizes separators", () => {
    expect(displayNameFor({ name: "my_decal-icon.png" })).toBe("my decal icon");
  });

  test("readinessCheck requires Roblox connection, scopes, and creator target", () => {
    expect(readinessCheck({ connected: false }).ready).toBe(false);
    expect(readinessCheck({
      connected: true,
      connection: { selectedCreator: { id: "1", type: "User" } },
      capabilities: { roblox_upload_asset: { authorized: false, missingScopes: ["asset:write"] } },
    }).action).toBe("reauthorize");
    expect(readinessCheck({
      connected: true,
      connection: {},
      capabilities: { roblox_upload_asset: { authorized: true, missingScopes: [] } },
    }).action).toBe("settings");
    expect(readinessCheck({
      connected: true,
      connection: { selectedCreator: { id: "1", type: "User" } },
      capabilities: { roblox_upload_asset: { authorized: true, missingScopes: [] } },
    }).ready).toBe(true);
  });
});
