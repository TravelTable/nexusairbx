import {
  buildProjectBindingPayloadFromIdentity,
  buildStudioTargetPreference,
  evaluateStudioPlaceGate,
  findProjectByPlaceId,
  normalizeStudioTargetOption,
  readChatStudioPreference,
  resolveGameIdentityFromStudioStatus,
  resolveGameTitleFromTarget,
  targetingOptionsFromStatus,
} from "./studioPlaceBinding";

describe("studioPlaceBinding", () => {
  test("normalizeStudioTargetOption requires an id", () => {
    expect(normalizeStudioTargetOption({ label: "x" })).toBeNull();
    expect(normalizeStudioTargetOption({ id: "t1", placeId: "p1", label: "Obby" })).toEqual({
      id: "t1",
      studioTargetId: "t1",
      placeId: "p1",
      label: "Obby",
      experienceName: null,
      placeName: null,
      universeId: null,
      isUntitled: false,
      pluginSessionId: null,
      source: null,
      connectionType: null,
    });
  });

  test("targetingOptionsFromStatus prefers targeting.targets", () => {
    expect(targetingOptionsFromStatus({
      targeting: {
        targets: [
          { id: "studio_target_a", placeId: "111", label: "Place A" },
          { id: "studio_target_b", placeId: "222", label: "Place B" },
        ],
      },
      sessions: [{ live: true, studio: { placeId: "999", placeName: "Ignored" } }],
    })).toEqual([
      {
        id: "studio_target_a",
        studioTargetId: "studio_target_a",
        placeId: "111",
        label: "Place A",
        experienceName: null,
        placeName: null,
        universeId: null,
        isUntitled: false,
        pluginSessionId: null,
        source: null,
        connectionType: null,
      },
      {
        id: "studio_target_b",
        studioTargetId: "studio_target_b",
        placeId: "222",
        label: "Place B",
        experienceName: null,
        placeName: null,
        universeId: null,
        isUntitled: false,
        pluginSessionId: null,
        source: null,
        connectionType: null,
      },
    ]);
  });

  test("evaluateStudioPlaceGate auto-binds a single live place", () => {
    const gate = evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: true,
      preference: null,
      options: [{ id: "t1", placeId: "1", label: "Only" }],
    });
    expect(gate.status).toBe("auto_bind");
    expect(gate.target.id).toBe("t1");
  });

  test("evaluateStudioPlaceGate requires selection for multiple places", () => {
    const gate = evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: true,
      preference: null,
      options: [
        { id: "t1", placeId: "1", label: "A" },
        { id: "t2", placeId: "2", label: "B" },
      ],
    });
    expect(gate.status).toBe("needs_selection");
  });

  test("evaluateStudioPlaceGate is ready when preference matches a live option", () => {
    const gate = evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: true,
      preference: readChatStudioPreference({
        studioTargetPreference: { targetId: "t2", placeId: "2", label: "B" },
      }),
      options: [
        { id: "t1", placeId: "1", label: "A" },
        { id: "t2", placeId: "2", label: "B" },
      ],
    });
    expect(gate.status).toBe("ready");
    expect(buildStudioTargetPreference(gate.target)).toEqual({
      targetId: "t2",
      placeId: "2",
      label: "B",
    });
  });

  test("normalizeStudioTargetOption accepts studioTargetId and Untitled placeId 0", () => {
    expect(normalizeStudioTargetOption({
      studioTargetId: "studio_target_u",
      placeId: "0",
      label: "Untitled Experience",
      isUntitled: true,
    })).toMatchObject({
      id: "studio_target_u",
      placeId: "0",
      isUntitled: true,
    });
  });

  test("evaluateStudioPlaceGate asks to connect when Studio is offline", () => {
    expect(evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: false,
      options: [],
    }).status).toBe("needs_connect");
  });

  test("targetingOptionsFromStatus keeps Untitled placeId 0 from backend targeting", () => {
    expect(targetingOptionsFromStatus({
      targeting: {
        targets: [{
          id: "studio_target_untitled",
          studioTargetId: "studio_target_untitled",
          placeId: "0",
          label: "Untitled Experience",
          isUntitled: true,
        }],
      },
    })).toEqual([{
      id: "studio_target_untitled",
      studioTargetId: "studio_target_untitled",
      placeId: "0",
      label: "Untitled Experience",
      experienceName: null,
      placeName: null,
      universeId: null,
      isUntitled: true,
      pluginSessionId: null,
      source: null,
      connectionType: null,
    }]);
  });

  test("evaluateStudioPlaceGate auto-binds a single Untitled place", () => {
    const gate = evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: true,
      pluginConnected: true,
      requirePlugin: true,
      preference: null,
      options: [{
        id: "studio_target_u",
        placeId: "0",
        label: "Untitled Experience",
        isUntitled: true,
      }],
    });
    expect(gate.status).toBe("auto_bind");
    expect(gate.target.id).toBe("studio_target_u");
  });

  test("evaluateStudioPlaceGate requires plugin when requirePlugin is set", () => {
    expect(evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: true,
      pluginConnected: false,
      requirePlugin: true,
      options: [{ id: "t1", placeId: "1", label: "A" }],
    }).status).toBe("needs_plugin");
  });

  test("resolveGameTitleFromTarget prefers experienceName then placeName", () => {
    expect(resolveGameTitleFromTarget({
      experienceName: "Neon Obby",
      placeName: "Lobby",
      label: "studio_target_x",
    })).toBe("Neon Obby");
    expect(resolveGameTitleFromTarget({
      placeName: "Arena",
      label: "fallback",
    })).toBe("Arena");
    expect(resolveGameTitleFromTarget({}, { universeName: "OAuth World" })).toBe("OAuth World");
    expect(resolveGameTitleFromTarget({})).toBe("Untitled game");
  });

  test("resolveGameIdentityFromStudioStatus auto-binds a single Studio game", () => {
    const identity = resolveGameIdentityFromStudioStatus({
      targeting: {
        targets: [{
          id: "studio_target_1",
          placeId: "4242",
          label: "My Obby",
          experienceName: "My Obby",
        }],
      },
    });
    expect(identity.status).toBe("auto_bind");
    expect(identity.source).toBe("studio");
    expect(identity.title).toBe("My Obby");
    expect(identity.placeId).toBe("4242");
    expect(identity.studioTargetId).toBe("studio_target_1");
  });

  test("resolveGameIdentityFromStudioStatus requires selection for multiple games", () => {
    const identity = resolveGameIdentityFromStudioStatus({
      targeting: {
        targets: [
          { id: "a", placeId: "1", label: "Alpha" },
          { id: "b", placeId: "2", label: "Beta" },
        ],
      },
    });
    expect(identity.status).toBe("needs_selection");
    expect(identity.options).toHaveLength(2);
  });

  test("resolveGameIdentityFromStudioStatus falls back to OAuth then draft", () => {
    expect(resolveGameIdentityFromStudioStatus({}, {
      oauthFallback: { universeId: "99", universeName: "Cloud Game" },
    })).toMatchObject({
      status: "oauth",
      title: "Cloud Game",
      universeId: "99",
      source: "oauth",
    });
    expect(resolveGameIdentityFromStudioStatus({})).toMatchObject({
      status: "needs_connect",
      title: "Untitled game",
      source: "draft",
    });
  });

  test("findProjectByPlaceId dedupes by placeId", () => {
    const projects = [
      { projectId: "p1", placeId: "111", title: "A" },
      { projectId: "p2", defaultPlaceId: "222", title: "B" },
    ];
    expect(findProjectByPlaceId(projects, "222")?.projectId).toBe("p2");
    expect(findProjectByPlaceId(projects, "0")).toBeNull();
    expect(findProjectByPlaceId(projects, "")).toBeNull();
  });

  test("buildProjectBindingPayloadFromIdentity omits untitled placeId 0", () => {
    expect(buildProjectBindingPayloadFromIdentity({
      title: "Draft",
      placeId: "0",
      studioTargetId: "t1",
      studioTargetLabel: "Draft",
    })).toEqual({
      title: "Draft",
      studioTargetId: "t1",
      studioTargetLabel: "Draft",
    });
    expect(buildProjectBindingPayloadFromIdentity({
      title: "Live Game",
      placeId: "555",
      universeId: "9",
      studioTargetId: "t2",
    })).toEqual({
      title: "Live Game",
      defaultPlaceId: "555",
      placeId: "555",
      universeId: "9",
      studioTargetId: "t2",
      studioTargetLabel: "Live Game",
    });
  });
});
