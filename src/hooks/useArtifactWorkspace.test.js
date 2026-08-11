import { renderHook } from "@testing-library/react";
import { useArtifactWorkspace } from "./useArtifactWorkspace";

describe("useArtifactWorkspace run projection", () => {
  test("keeps a jobless completed inspection in the succeeded state", () => {
    const { result } = renderHook(() => useArtifactWorkspace([{
      id: "inspection-result",
      role: "assistant",
      runId: "run-inspection",
      summary: "Inspected the current Studio target.",
      metadata: {
        type: "studio_inspection",
        runState: "completed",
        inspectionEvidence: { commandId: "command-1", itemCount: 14 },
      },
    }], {
      isGenerating: false,
      generationStage: "",
      pendingMessage: null,
    }));

    expect(result.current.agentRun).toEqual(expect.objectContaining({
      status: "succeeded",
      runId: "run-inspection",
    }));
  });
});
