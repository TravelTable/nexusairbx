import {
  beginCreatorStoreReauthorization,
  creatorStoreAccessError,
  isCreatorStoreReadAuthorized,
  isRobloxReauthorizationError,
} from "./robloxOAuthApi";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

const { authedFetch } = require("./billing");

describe("robloxOAuthApi capability helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.location;
    window.location = { assign: jest.fn() };
  });

  test("isCreatorStoreReadAuthorized supports granted/missing capability lists", () => {
    expect(isCreatorStoreReadAuthorized({ connected: true, capabilities: { granted: [], missing: [] } })).toBe(false);
    expect(isCreatorStoreReadAuthorized({
      connected: true,
      capabilities: {
        granted: [{ id: "roblox_search_creator_store", available: true, missingScopes: [] }],
        missing: [],
      },
    })).toBe(true);
    expect(isCreatorStoreReadAuthorized({
      connected: true,
      capabilities: {
        missing: [{ id: "roblox_search_creator_store", available: false, missingScopes: ["creator-store-product:read"] }],
      },
    })).toBe(false);
  });

  test("isCreatorStoreReadAuthorized supports indexed capability mocks", () => {
    expect(isCreatorStoreReadAuthorized({
      connected: true,
      capabilities: { roblox_search_creator_store: { authorized: true, missingScopes: [] } },
    })).toBe(true);
  });

  test("isRobloxReauthorizationError recognizes auth error codes", () => {
    expect(isRobloxReauthorizationError("CREATOR_STORE_REAUTHORIZATION_REQUIRED")).toBe(true);
    expect(isRobloxReauthorizationError("ROBLOX_AUTH_REQUIRED")).toBe(true);
    expect(isRobloxReauthorizationError("PROJECT_NOT_FOUND")).toBe(false);
  });

  test("creatorStoreAccessError returns a typed local error", () => {
    const error = creatorStoreAccessError();
    expect(error.code).toBe("CREATOR_STORE_REAUTHORIZATION_REQUIRED");
    expect(error.message).toMatch(/reauthorize/i);
  });

  test("beginCreatorStoreReauthorization requests creator store bundles", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ authorizationUrl: "https://roblox.example/oauth" }),
    });
    await beginCreatorStoreReauthorization("/ai");
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/reauthorize", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ bundles: ["core", "creator_store_read"], returnPath: "/ai" }),
    }));
    expect(window.location.assign).toHaveBeenCalledWith("https://roblox.example/oauth");
  });
});
