import {
  countStepSnapshots,
  normalizeToolStep,
  summarizeStepResult,
  upsertAgentStep,
} from "./agentSteps";

describe("agentSteps", () => {
  test("normalizeToolStep maps SSE payload", () => {
    const step = normalizeToolStep({
      id: "s1",
      type: "write_script",
      label: "Write handler",
      status: "succeeded",
      result: { path: "ServerScriptService/Foo" },
      snapshotCount: 1,
    });
    expect(step.id).toBe("s1");
    expect(step.type).toBe("write_script");
    expect(step.snapshotCount).toBe(1);
  });

  test("upsertAgentStep merges by id", () => {
    const first = upsertAgentStep([], { id: "a", type: "inspect_place", status: "running" });
    const second = upsertAgentStep(first, { id: "a", status: "succeeded", result: { count: 3 } });
    expect(second).toHaveLength(1);
    expect(second[0].status).toBe("succeeded");
    expect(second[0].result.count).toBe(3);
  });

  test("summarizeStepResult covers studio tools", () => {
    expect(
      summarizeStepResult({ type: "write_script", status: "succeeded", result: { path: "X" } })
    ).toBe("Wrote X");
    expect(
      summarizeStepResult({ type: "generate_artifact", status: "succeeded", result: { fileCount: 4 } })
    ).toBe("Generated 4 file(s)");
  });

  test("countStepSnapshots sums snapshotCount", () => {
    expect(
      countStepSnapshots([
        { snapshotCount: 2 },
        { snapshotCount: 1 },
      ])
    ).toBe(3);
  });
});
