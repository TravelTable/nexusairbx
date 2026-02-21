import {
  createHeuristicRouteDecision,
  resolveAiRouteDecision,
} from "./aiRouter";

describe("aiRouter fallback", () => {
  test("routes UI prompts to pipeline", () => {
    const result = createHeuristicRouteDecision({
      prompt: "Build UI for a shop screen",
      activeMode: "general",
      hasActiveUi: false,
    });

    expect(result.action).toBe("pipeline");
    expect(result.targetMode).toBe("ui");
    expect(result.source).toBe("fallback");
  });

  test("routes security prompts to lint", () => {
    const result = createHeuristicRouteDecision({
      prompt: "Audit my RemoteEvents for vulnerabilities",
      activeMode: "general",
      hasActiveUi: false,
    });

    expect(result.action).toBe("lint");
    expect(result.targetMode).toBe("security");
  });

  test("routes refine intent when active ui exists", () => {
    const result = createHeuristicRouteDecision({
      prompt: "Refine this ui with better spacing",
      activeMode: "ui",
      hasActiveUi: true,
    });

    expect(result.action).toBe("refine");
    expect(result.targetMode).toBe("ui");
  });

  test("falls back safely when route endpoint fails", async () => {
    const user = {
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    };
    const fetchImpl = jest.fn().mockRejectedValue(new Error("network down"));

    const result = await resolveAiRouteDecision({
      user,
      prompt: "Build ui for shop",
      activeMode: "general",
      hasActiveUi: false,
      fetchImpl,
    });

    expect(result.action).toBe("pipeline");
    expect(result.source).toBe("fallback");
  });
});
