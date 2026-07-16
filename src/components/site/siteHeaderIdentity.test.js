import {
  getHeaderVariantForPath,
  getInitials,
  getRobloxProfileFromStatus,
  selectHeaderAvatar,
} from "./siteHeaderIdentity";

describe("siteHeaderIdentity", () => {
  it("selects the best avatar source in priority order", () => {
    const user = {
      displayName: "Avery Builder",
      email: "avery@example.com",
      photoURL: "https://example.com/google.png",
    };
    const robloxProfile = {
      username: "AveryRBX",
      picture: "https://example.com/roblox.png",
    };

    expect(selectHeaderAvatar({ user, robloxProfile })).toEqual({
      src: "https://example.com/roblox.png",
      source: "roblox",
      fallback: "AV",
    });

    expect(selectHeaderAvatar({ user, robloxProfile: { username: "AveryRBX" } })).toEqual({
      src: "https://example.com/google.png",
      source: "firebase",
      fallback: "AV",
    });

    expect(selectHeaderAvatar({ user: { email: "solo@example.com" }, robloxProfile: null })).toEqual({
      src: "",
      source: "initials",
      fallback: "SO",
    });
  });

  it("normalizes Roblox status profile shapes", () => {
    expect(getRobloxProfileFromStatus({ connection: { profile: { username: "BuilderOne" } } })).toEqual({
      username: "BuilderOne",
    });
    expect(getRobloxProfileFromStatus({ profile: { name: "BuilderTwo" } })).toEqual({
      name: "BuilderTwo",
    });
    expect(getRobloxProfileFromStatus(null)).toBe(null);
  });

  it("maps paths to adaptive header variants", () => {
    expect(getHeaderVariantForPath("/")).toBe("marketing");
    expect(getHeaderVariantForPath("/ai")).toBe("workspace");
    expect(getHeaderVariantForPath("/ai/session/123")).toBe("workspace");
    expect(getHeaderVariantForPath("/settings")).toBe("account");
    expect(getHeaderVariantForPath("/billing")).toBe("account");
    expect(getHeaderVariantForPath("/subscribe")).toBe("checkout");
    expect(getHeaderVariantForPath("/signin")).toBe("auth");
    expect(getHeaderVariantForPath("/signup")).toBe("auth");
    expect(getHeaderVariantForPath("/contact")).toBe("marketing");
    expect(getHeaderVariantForPath("/pricing")).toBe("marketing");
    expect(getHeaderVariantForPath("/support")).toBe("account");
    expect(getHeaderVariantForPath("/support/ticket-1")).toBe("account");
    expect(getHeaderVariantForPath("/admin/support")).toBe("account");
    expect(getHeaderVariantForPath("/privacy")).toBe("legal");
    expect(getHeaderVariantForPath("/terms")).toBe("legal");
    expect(getHeaderVariantForPath("/tools/icon-generator")).toBe("tools");
    expect(getHeaderVariantForPath("/icons-market")).toBe("tools");
    expect(getHeaderVariantForPath("/script/demo")).toBe("tools");
  });

  it("creates useful initials from display names, emails, or Roblox names", () => {
    expect(getInitials({ displayName: "Avery Builder" })).toBe("AB");
    expect(getInitials({ email: "solo@example.com" })).toBe("SO");
    expect(getInitials({ robloxName: "RobloxMaker" })).toBe("RO");
    expect(getInitials({})).toBe("NX");
  });
});
