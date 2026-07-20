import {
  buildStudioTargetPreference,
  evaluateStudioPlaceGate,
  normalizeStudioTargetOption,
  readChatStudioPreference,
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
});
