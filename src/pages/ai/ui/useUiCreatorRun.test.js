import { act, renderHook } from "@testing-library/react";

import useUiCreatorRun, { UI_RUN_MESSAGE_METADATA, UI_RUN_STAGE, UI_RUN_STEP } from "./useUiCreatorRun";
import { projectAssistantMessage } from "../../../lib/assistantMessageProjection";

function startFullRun(result, prompt = "Build a shop") {
  let requestId;
  act(() => {
    requestId = result.current.begin({
      prompt,
      stage: UI_RUN_STAGE.generating,
      steps: [{ ...UI_RUN_STEP.generate, status: "running" }, UI_RUN_STEP.apply, UI_RUN_STEP.capture, UI_RUN_STEP.render],
    });
  });
  return requestId;
}

test("begin shapes a pending assistant turn the chat components understand", () => {
  const { result } = renderHook(() => useUiCreatorRun());
  expect(result.current.pendingMessage).toBeNull();

  const requestId = startFullRun(result);
  const pending = result.current.pendingMessage;
  expect(pending).toMatchObject({ role: "assistant", pending: true, requestId, prompt: "Build a shop", stage: UI_RUN_STAGE.generating });
  expect(pending.steps.map((step) => [step.id, step.status])).toEqual([
    ["generate_ui", "running"],
    ["apply_artifact", "queued"],
    ["capture_ui", "queued"],
    ["render_preview", "queued"],
  ]);
  expect(pending.streamState).toMatchObject({ activity: [], hasVisibleOutput: false });
  expect(result.current.activeStep.id).toBe("generate_ui");
});

test("step updates upsert in place and preserve order; awaiting approval is mirrored, not terminal", () => {
  const { result } = renderHook(() => useUiCreatorRun());
  startFullRun(result);

  act(() => {
    result.current.updateStep({ ...UI_RUN_STEP.generate, status: "succeeded", result: { revision: "rev-2" } });
    result.current.updateStep({ ...UI_RUN_STEP.apply, status: "awaiting_approval", operationId: "cmd-1" });
    result.current.setStage(UI_RUN_STAGE.approval);
  });

  const steps = result.current.run.steps;
  expect(steps.map((step) => step.id)).toEqual(["generate_ui", "apply_artifact", "capture_ui", "render_preview"]);
  expect(steps[0]).toMatchObject({ status: "succeeded", result: { revision: "rev-2" } });
  expect(steps[1]).toMatchObject({ status: "awaiting_approval", requiresApproval: true, operationId: "cmd-1" });
  expect(result.current.stepStatus("apply_artifact")).toBe("awaiting_approval");
  expect(result.current.activeStep.id).toBe("apply_artifact");
  expect(result.current.pendingMessage.stage).toBe(UI_RUN_STAGE.approval);
});

test("finish turns the run into a completed message that keeps its steps through projection", () => {
  const { result } = renderHook(() => useUiCreatorRun());
  const requestId = startFullRun(result);
  act(() => {
    result.current.attachDraft("draft-1");
    result.current.updateStep({ ...UI_RUN_STEP.generate, status: "succeeded" });
    result.current.updateStep({ ...UI_RUN_STEP.apply, status: "succeeded" });
    result.current.updateStep({ ...UI_RUN_STEP.capture, status: "succeeded" });
  });

  let message;
  act(() => {
    message = result.current.finish({
      content: "UI revision rev-2 is in Studio and previewed.",
      step: { ...UI_RUN_STEP.render, status: "succeeded", result: { rendererBackend: "public" } },
    });
  });

  expect(result.current.run).toBeNull();
  expect(result.current.pendingMessage).toBeNull();
  expect(result.current.completed).toHaveLength(1);
  expect(message).toMatchObject({
    role: "assistant",
    requestId,
    draftId: "draft-1",
    content: "UI revision rev-2 is in Studio and previewed.",
    metadata: UI_RUN_MESSAGE_METADATA,
  });
  expect(message.pending).toBeUndefined();
  expect(message.steps.every((step) => step.status === "succeeded")).toBe(true);
  expect(message.steps[3].result).toEqual({ rendererBackend: "public" });
  expect(message.metadata.responseKind).toBe("ask");
  expect(message.metadata.responseKind).not.toBe("build");
  // The build projection strips steps; UI turns must survive it untouched.
  expect(projectAssistantMessage(message)).toBe(message);
});

test("fail marks only the named step failed and leaves unattempted steps queued", () => {
  const { result } = renderHook(() => useUiCreatorRun());
  startFullRun(result);
  act(() => {
    result.current.updateStep({ ...UI_RUN_STEP.generate, status: "succeeded" });
    result.current.updateStep({ ...UI_RUN_STEP.apply, status: "running" });
  });

  let message;
  act(() => {
    const reason = new Error("Studio rejected the shop frame.");
    reason.code = "APPLY_REJECTED";
    message = result.current.fail(reason, { stepId: UI_RUN_STEP.apply.id, content: "Not in Studio yet." });
  });

  expect(result.current.isActive).toBe(false);
  expect(message.error).toBe("Studio rejected the shop frame.");
  expect(message.content).toBe("Not in Studio yet.");
  expect(message.steps.map((step) => step.status)).toEqual(["succeeded", "failed", "queued", "queued"]);
  expect(message.steps[1]).toMatchObject({ error: "Studio rejected the shop frame.", errorCode: "APPLY_REJECTED" });
});

test("a new run replaces a completed message with the same request id instead of duplicating it", () => {
  const { result } = renderHook(() => useUiCreatorRun());
  startFullRun(result);
  act(() => { result.current.finish({ content: "first" }); });
  act(() => { result.current.begin({ steps: [UI_RUN_STEP.capture, UI_RUN_STEP.render] }); });
  expect(result.current.pendingMessage.prompt).toBe("");
  expect(result.current.pendingMessage.steps.map((step) => step.id)).toEqual(["capture_ui", "render_preview"]);
  act(() => { result.current.finish({ content: "second" }); });
  expect(result.current.completed.map((item) => item.content)).toEqual(["first", "second"]);
});
