import {
  describeRobloxCapabilities,
  formatRobloxErrorMessage,
  robloxAuthorizationBody,
  robloxAuthorizationHeadline,
} from "./robloxAuthorizationMessages";

describe("robloxAuthorizationMessages", () => {
  test("headline explains one-time upgrade for existing users", () => {
    expect(robloxAuthorizationHeadline({ upgradeRequired: true })).toMatch(/one-time permission upgrade/i);
  });

  test("headline explains initial connect for new users", () => {
    expect(robloxAuthorizationHeadline({ connected: false })).toMatch(/connect roblox once/i);
  });

  test("body mentions preserving creator during upgrade", () => {
    expect(robloxAuthorizationBody({ upgradeRequired: true })).toMatch(/selected creator/i);
  });

  test("describeRobloxCapabilities joins multiple capabilities", () => {
    expect(describeRobloxCapabilities(["roblox_upload_asset", "roblox_search_creator_store"]))
      .toBe("upload assets to Roblox and search the Creator Store");
  });

  test("formatRobloxErrorMessage converts stable backend codes", () => {
    expect(formatRobloxErrorMessage({ code: "ROBLOX_REAUTHORIZATION_REQUIRED" }))
      .toMatch(/updated permissions/i);
    expect(formatRobloxErrorMessage({ code: "ROBLOX_NOT_CONNECTED" }))
      .toMatch(/connect roblox/i);
  });
});
