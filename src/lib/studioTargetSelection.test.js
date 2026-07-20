import { isFirestorePermissionDenied, resolveAwaitingStudioTargetRunId, resumeStudioTargetSelection } from "./studioTargetSelection";

describe("studioTargetSelection", () => {
  test("resolveAwaitingStudioTargetRunId only returns ids while awaiting a target", () => {
    expect(resolveAwaitingStudioTargetRunId({
      pendingMessage: { runId: "run_old", runStatus: "succeeded" },
      agentRun: { runId: "run_old", status: "succeeded" },
    })).toBeNull();

    expect(resolveAwaitingStudioTargetRunId({
      pendingMessage: { runId: "run_wait", runStatus: "awaiting_studio_target" },
      agentRun: { runId: "run_other", status: "running" },
    })).toBe("run_wait");

    expect(resolveAwaitingStudioTargetRunId({
      agentRun: { id: "run_agent", status: "awaiting_studio_target" },
    })).toBe("run_agent");
  });

  test("bind failure still invokes selectAgentStudioTarget when runId exists", async () => {
    const option = { id: "studio_target_untitled", label: "Untitled Experience" };
    const bindPreference = jest.fn(async () => {
      const err = new Error("Missing or insufficient permissions.");
      err.code = "permission-denied";
      throw err;
    });
    const selectTarget = jest.fn(async () => ({ conflict: false, run: { status: "inspecting" } }));

    const out = await resumeStudioTargetSelection({
      option,
      runId: "run_1",
      bindPreference,
      selectTarget,
    });

    expect(bindPreference).toHaveBeenCalledWith(option);
    expect(selectTarget).toHaveBeenCalledWith("run_1", option);
    expect(out.resumed).toBe(true);
    expect(isFirestorePermissionDenied(out.bindError)).toBe(true);
    expect(out.result?.run?.status).toBe("inspecting");
  });

  test("without runId, bind failure does not call selectTarget", async () => {
    const selectTarget = jest.fn();
    const out = await resumeStudioTargetSelection({
      option: { id: "t1" },
      runId: null,
      bindPreference: async () => {
        throw Object.assign(new Error("Missing or insufficient permissions."), {
          code: "permission-denied",
        });
      },
      selectTarget,
    });
    expect(selectTarget).not.toHaveBeenCalled();
    expect(out.resumed).toBe(false);
    expect(isFirestorePermissionDenied(out.bindError)).toBe(true);
  });
});
