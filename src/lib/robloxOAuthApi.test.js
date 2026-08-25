import {
  beginCreatorStoreReauthorization,
  beginRobloxReauthorization,
  ensureRobloxCapabilities,
  creatorStoreAccessError,
  getRobloxExperiences,
  getRobloxExperienceCatalog,
  getRobloxOAuthStatus,
  isCapabilityAuthorized,
  isCreatorStoreReadAuthorized,
  isRobloxReauthorizationError,
  isRobloxProjectDiscoveryAuthorized,
  needsRobloxUpgrade,
  normalizeRobloxExperience,
  normalizeRobloxConnectionStatus,
  readPendingRobloxAction,
  ROBLOX_PRODUCT_DEFAULT_CAPABILITIES,
  ROBLOX_PROJECT_DISCOVERY_CAPABILITIES,
  revokeRobloxOAuth,
} from "./robloxOAuthApi";
import { clearApiRetryCooldown } from "./apiErrors";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

const { authedFetch } = require("./billing");

describe("robloxOAuthApi capability helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearApiRetryCooldown("roblox-oauth:ensure");
    clearApiRetryCooldown("roblox-oauth:status");
    clearApiRetryCooldown("roblox-oauth:revoke");
    clearApiRetryCooldown("roblox-oauth:reauthorize");
    clearApiRetryCooldown("roblox-oauth:experiences");
    window.sessionStorage.clear();
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
    expect(isRobloxReauthorizationError("ROBLOX_EXPERIENCE_READ_REAUTHORIZATION_REQUIRED")).toBe(true);
    expect(isRobloxReauthorizationError("ROBLOX_AUTH_REQUIRED")).toBe(true);
    expect(isRobloxReauthorizationError("PROJECT_NOT_FOUND")).toBe(false);
  });

  test("creatorStoreAccessError returns a typed local error", () => {
    const error = creatorStoreAccessError();
    expect(error.code).toBe("CREATOR_STORE_REAUTHORIZATION_REQUIRED");
    expect(error.message).toMatch(/reauthorize/i);
  });

  test("ensureRobloxCapabilities requests capabilities and stores safe pending action before redirect", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ authorizationUrl: "https://roblox.example/oauth" }),
    });
    await ensureRobloxCapabilities({
      capabilities: ["roblox_upload_asset"],
      returnPath: "/ai",
      pendingAction: {
        type: "roblox_image_upload",
        id: "asset-1",
        requiresFileReselect: true,
        token: "must-not-persist",
      },
    });

    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/ensure", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        capabilities: ["roblox_upload_asset"],
        returnPath: "/ai",
        pendingAction: {
          type: "roblox_image_upload",
          id: "asset-1",
          requiresFileReselect: true,
          token: "must-not-persist",
        },
      }),
    }));
    expect(window.location.assign).toHaveBeenCalledWith("https://roblox.example/oauth");
    expect(readPendingRobloxAction()).toEqual(expect.objectContaining({
      type: "roblox_image_upload",
      id: "asset-1",
      requiresFileReselect: true,
      returnPath: "/ai",
    }));
    expect(readPendingRobloxAction().token).toBeUndefined();
  });

  test("beginCreatorStoreReauthorization requests creator store capability", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ authorizationUrl: "https://roblox.example/oauth" }),
    });
    await beginCreatorStoreReauthorization("/ai");
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/ensure", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        capabilities: ["roblox_search_creator_store"],
        returnPath: "/ai",
        pendingAction: { type: "creator_store_search" },
      }),
    }));
    expect(window.location.assign).toHaveBeenCalledWith("https://roblox.example/oauth");
  });

  test("ensureRobloxCapabilities does not redirect when already authorized", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ authorized: true, missingScopes: [] }),
    });
    const result = await ensureRobloxCapabilities({
      capabilities: ROBLOX_PRODUCT_DEFAULT_CAPABILITIES,
      returnPath: "/ai",
    });
    expect(result.authorized).toBe(true);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  test("revokeRobloxOAuth calls the explicit server-owned revocation endpoint", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ revoked: true }),
    });

    await expect(revokeRobloxOAuth()).resolves.toEqual({ revoked: true });
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/revoke", { method: "POST" });
  });

  test("project discovery authorization is exposed as a dedicated capability", () => {
    expect(ROBLOX_PROJECT_DISCOVERY_CAPABILITIES).toEqual(["roblox_list_experiences"]);
    expect(isRobloxProjectDiscoveryAuthorized({
      connected: true,
      capabilities: {
        roblox_list_experiences: { authorized: true, missingScopes: [] },
      },
    })).toBe(true);
    expect(isRobloxProjectDiscoveryAuthorized({
      connected: true,
      capabilities: {
        roblox_list_experiences: { authorized: false, missingScopes: ["universe:read"] },
      },
    })).toBe(false);
  });

  test("getRobloxExperiences returns normalized real project metadata", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        experiences: [
          {
            universeId: 101,
            rootPlaceId: 202,
            name: "Blade Arena",
            thumbnailUrl: "https://tr.rbxcdn.com/game.webp",
            creator: { type: "Group", id: 303, name: "TravelTable" },
            visits: 42,
          },
          { universeId: "invalid", rootPlaceId: 1, name: "Ignored" },
        ],
      }),
    });

    await expect(getRobloxExperiences()).resolves.toEqual([
      expect.objectContaining({
        universeId: "101",
        rootPlaceId: "202",
        name: "Blade Arena",
        thumbnailUrl: "https://tr.rbxcdn.com/game.webp",
        creator: expect.objectContaining({ type: "Group", id: "303", name: "TravelTable" }),
        visits: 42,
      }),
    ]);
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/experiences?limit=200", {
      method: "GET",
      noCache: true,
    });
    expect(normalizeRobloxExperience({ universeId: 1, rootPlaceId: null })).toBeNull();
  });

  test("getRobloxExperienceCatalog preserves authorization and partial-result metadata", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        experiences: [{
          universeId: 101,
          rootPlaceId: 202,
          name: "Private Obby",
          visibility: "private",
          authorized: true,
        }],
        authorization: { scopeGranted: true, authorizedUniverseCount: 3 },
        partial: true,
        warnings: [{ code: "ROBLOX_AUTHORIZED_EXPERIENCES_PARTIAL", message: "Some games were unavailable." }],
      }),
    });

    await expect(getRobloxExperienceCatalog()).resolves.toEqual({
      experiences: [expect.objectContaining({
        name: "Private Obby",
        visibility: "private",
        authorized: true,
      })],
      authorization: { scopeGranted: true, authorizedUniverseCount: 3 },
      partial: true,
      warnings: [{
        code: "ROBLOX_AUTHORIZED_EXPERIENCES_PARTIAL",
        message: "Some games were unavailable.",
      }],
    });
  });

  test("forced project reauthorization persists the selector action and redirects", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ authorizationUrl: "https://roblox.example/project-consent" }),
    });

    await beginRobloxReauthorization({
      capabilities: ROBLOX_PROJECT_DISCOVERY_CAPABILITIES,
      returnPath: "/ai",
      pendingAction: { type: "select_project" },
      force: true,
    });

    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/reauthorize", expect.objectContaining({
      body: JSON.stringify({
        returnPath: "/ai",
        capabilities: ["roblox_list_experiences"],
        pendingAction: { type: "select_project" },
      }),
    }));
    expect(readPendingRobloxAction()).toEqual(expect.objectContaining({ type: "select_project", returnPath: "/ai" }));
    expect(window.location.assign).toHaveBeenCalledWith("https://roblox.example/project-consent");
  });

  test("ensureRobloxCapabilities can request multiple capabilities in one call", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ authorized: true }),
    });
    await ensureRobloxCapabilities({
      capabilities: ["roblox_upload_asset", "roblox_search_creator_store"],
      returnPath: "/ai",
    });
    expect(authedFetch).toHaveBeenCalledWith("/api/roblox/oauth/ensure", expect.objectContaining({
      body: JSON.stringify({
        capabilities: ["roblox_search_creator_store", "roblox_upload_asset"],
        returnPath: "/ai",
      }),
    }));
  });

  test("getRobloxOAuthStatus preserves retryable backend metadata", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: (name) => (name === "Retry-After" ? "30" : null),
      },
      text: async () => JSON.stringify({
        error: "Database temporarily unavailable. Please retry shortly.",
        code: "FIRESTORE_QUOTA_EXCEEDED",
        retryable: true,
      }),
    });

    await expect(getRobloxOAuthStatus()).rejects.toMatchObject({
      status: 503,
      code: "FIRESTORE_QUOTA_EXCEEDED",
      retryable: true,
      retryAfter: "30",
      retryAfterMs: 30000,
    });
  });

  test("capability helpers detect upgrade and authorization state", () => {
    expect(needsRobloxUpgrade({ connected: true, upgradeRequired: true })).toBe(true);
    expect(isCapabilityAuthorized({
      connected: true,
      capabilities: { roblox_upload_asset: { authorized: true, missingScopes: [] } },
    }, "roblox_upload_asset")).toBe(true);
    expect(isCreatorStoreReadAuthorized({
      connected: true,
      capabilities: { roblox_search_creator_store: { authorized: false, missingScopes: ["creator-store-product:read"] } },
    })).toBe(false);
  });

  test("normalizes creator connection metadata and discards OAuth credentials", () => {
    const status = normalizeRobloxConnectionStatus({
      connected: true,
      accessToken: "root-access-secret",
      refreshToken: "root-refresh-secret",
      connection: {
        status: "connected",
        robloxUserId: "101",
        accessToken: "connection-access-secret",
        profile: { username: "BuilderOne", displayName: "Builder One" },
        selectedCreator: { type: "Group", id: "202", name: "Build Group" },
      },
      authorizedCreators: [
        { type: "User", id: "101", name: "Builder One" },
        { type: "Group", id: "202", name: "Build Group", permissions: ["asset:write"] },
      ],
      accessibleUniverses: [
        { universeId: "303", name: "Simulator", creator: { type: "Group", id: "202", name: "Build Group" } },
      ],
      grantedScopes: ["openid", "asset:write"],
      tokenHealth: { status: "healthy", hasRefreshToken: true, accessTokenExpiresAt: "2026-07-22T03:00:00Z" },
      lastSuccessfulOperation: { type: "asset_publish", completedAt: "2026-07-22T02:30:00Z" },
    });

    expect(status).toMatchObject({
      connected: true,
      credentialFieldsDiscarded: true,
      grantedScopes: ["openid", "asset:write"],
      tokenHealth: { status: "healthy", hasRefreshToken: true },
      connection: {
        identity: { userId: "101", username: "BuilderOne", displayName: "Builder One" },
        selectedCreator: { type: "Group", id: "202", name: "Build Group" },
      },
      accessibleUniverses: [{ id: "303", name: "Simulator" }],
    });
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("root-access-secret");
    expect(serialized).not.toContain("root-refresh-secret");
    expect(serialized).not.toContain("connection-access-secret");
    expect(status.connection.personalCreator).toMatchObject({ type: "User", id: "101" });
    expect(status.connection.groups).toEqual([expect.objectContaining({ type: "Group", id: "202" })]);
  });
});
