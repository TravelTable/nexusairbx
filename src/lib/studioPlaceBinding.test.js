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
      placeId: "p1",
      label: "Obby",
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
      { id: "studio_target_a", placeId: "111", label: "Place A" },
      { id: "studio_target_b", placeId: "222", label: "Place B" },
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

  test("evaluateStudioPlaceGate asks to connect when Studio is offline", () => {
    expect(evaluateStudioPlaceGate({
      studioEnabled: true,
      connected: false,
      options: [],
    }).status).toBe("needs_connect");
  });
});
