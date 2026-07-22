import { act, renderHook, waitFor } from "@testing-library/react";
import usePlanWorkspace from "./usePlanWorkspace";
import {
  checkWorkflowPlanReadiness,
  executeWorkflowPlan,
  getWorkflowPlan,
  getWorkflowPlanVersions,
  restoreWorkflowPlanVersion,
  updateWorkflowPlan,
} from "../lib/workflowApi";
import {
  normalizeWorkflowPlan,
  planDraftStorageKey,
  savePlanDraft,
  updatePlanSection,
} from "../lib/workflowPlan";

jest.mock("../lib/workflowApi", () => {
  class WorkflowApiError extends Error {
    constructor(message, { status = 0, code = "workflow_request_failed", payload = null } = {}) {
      super(message);
      this.status = status;
      this.code = code;
      this.payload = payload;
    }
  }
  return {
    WorkflowApiError,
    askWorkflowPlan: jest.fn(),
    checkWorkflowPlanReadiness: jest.fn(),
    executeWorkflowPlan: jest.fn(),
    getWorkflowPlan: jest.fn(),
    getWorkflowPlanVersions: jest.fn(),
    regenerateWorkflowPlanSection: jest.fn(),
    restoreWorkflowPlanVersion: jest.fn(),
    updateWorkflowPlan: jest.fn(),
  };
});

const message = {
  id: "message-plan",
  role: "assistant",
  stage: "plan",
  planId: "plan-1",
  planVersion: 3,
  planHash: "hash-3",
  structuredPlan: {
    planId: "plan-1",
    planVersion: 3,
    planHash: "hash-3",
    requiresStudio: true,
    projectTargetRequired: true,
    assumptions: ["Preserve the current inventory UI contract"],
    constraints: ["Do not replace the core runtime"],
    assets: [{ type: "image", label: "Inventory icon" }],
    capabilities: [{ capabilityId: "studio_inspection", name: "Studio inspection" }],
    sections: {
      goal: "Add an inventory",
      implementationSteps: [{ stepId: "step-1", value: "Inspect the current inventory" }],
      verificationSteps: [{ stepId: "verify-1", value: "Verify inventory persistence" }],
    },
  },
};

const envelope = (plan, version = plan.version, hash = plan.hash) => ({
  planId: plan.planId,
  version,
  hash,
  status: "draft",
  plan: { ...plan, version, hash },
});

const studioTarget = { placeId: "place-22", universeId: "universe-8", label: "Main place" };

describe("usePlanWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    const plan = normalizeWorkflowPlan(message, message);
    getWorkflowPlan.mockResolvedValue(envelope(plan));
    updateWorkflowPlan.mockImplementation(async (_planId, input) => envelope({
      ...plan,
      sections: input.operations.reduce((sections, operation) => (
        operation.type === "replace_section"
          ? { ...sections, [operation.sectionId]: operation.value }
          : sections
      ), plan.sections),
      locks: input.operations.reduce((locks, operation) => (
        operation.type === "set_section_lock"
          ? { ...locks, [operation.sectionId]: operation.locked }
          : locks
      ), plan.locks),
    }, input.version + 1, `hash-${input.version + 1}`));
    checkWorkflowPlanReadiness.mockResolvedValue({ ready: true, canExecute: true, issues: [] });
    executeWorkflowPlan.mockResolvedValue({ task: { taskId: "task-1", status: "pending" } });
    getWorkflowPlanVersions.mockResolvedValue({ versions: [] });
    restoreWorkflowPlanVersion.mockImplementation(async (_planId, input) => (
      envelope(plan, input.version + 1, `hash-${input.version + 1}`)
    ));
  });

  it("syncs a recovered dirty draft before one-click execution and preserves current targeting", async () => {
    const serverPlan = normalizeWorkflowPlan(message, message);
    const recoveredPlan = updatePlanSection(serverPlan, "goal", "Keep the current HUD and add inventory beside it");
    const storageKey = planDraftStorageKey({ userId: "user-1", chatId: "chat-1", planId: "plan-1" });
    const onExecute = jest.fn();
    savePlanDraft(storageKey, recoveredPlan, { dirty: true });

    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
      studioConnected: true,
      studioTarget,
      onExecute,
    }));

    await waitFor(() => expect(updateWorkflowPlan).toHaveBeenCalledTimes(1));
    expect(updateWorkflowPlan.mock.calls[0][1].operations).toContainEqual({
      type: "replace_section",
      sectionId: "goal",
      value: "Keep the current HUD and add inventory beside it",
    });
    await waitFor(() => expect(result.current.saveStatus).toBe("saved"));

    let executionResult;
    await act(async () => {
      executionResult = await result.current.execute();
    });

    expect(executeWorkflowPlan).toHaveBeenCalledTimes(1);
    expect(executeWorkflowPlan).toHaveBeenCalledWith("plan-1", {
      version: 4,
      hash: "hash-4",
    });
    expect(checkWorkflowPlanReadiness).toHaveBeenCalledWith("plan-1", expect.objectContaining({
      projectId: "project-current-chat",
      studioTarget,
    }));
    expect(onExecute).toHaveBeenCalledTimes(1);
    expect(onExecute).toHaveBeenCalledWith(expect.objectContaining({
      result: executionResult,
      projectId: "project-current-chat",
      studioTarget,
      plan: expect.objectContaining({
        sections: expect.objectContaining({ goal: "Keep the current HUD and add inventory beside it" }),
      }),
    }));
  });

  it("does not call execution when readiness returns a blocker", async () => {
    checkWorkflowPlanReadiness.mockResolvedValue({
      ready: false,
      canExecute: false,
      issues: [{
        id: "wrong-project",
        code: "missing_project_target",
        severity: "blocker",
        title: "Choose a project target",
        message: "Execution could affect the wrong project.",
        affectedStepIds: [],
        suggestedFix: { action: "select_project", label: "Choose the current project." },
      }],
    });
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      studioConnected: true,
      studioTarget,
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));

    let response;
    await act(async () => {
      response = await result.current.execute();
    });

    expect(response).toEqual(expect.objectContaining({ blocked: true }));
    expect(executeWorkflowPlan).not.toHaveBeenCalled();
    expect(result.current.executionState.status).toBe("blocked");
  });

  it("queues one replace operation for a normal section edit", async () => {
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));

    await act(async () => {
      result.current.replaceSection("goal", "Add inventory beside the current HUD");
      await result.current.flushEdits();
    });

    expect(updateWorkflowPlan).toHaveBeenCalledTimes(1);
    expect(updateWorkflowPlan.mock.calls[0][1].operations).toEqual([{
      type: "replace_section",
      sectionId: "goal",
      value: "Add inventory beside the current HUD",
    }]);
  });

  it("marks readiness stale after an edit and only marks the saved version checked", async () => {
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
      studioConnected: true,
      studioTarget,
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));

    expect(result.current.readiness).toEqual(expect.objectContaining({
      status: "unchecked",
      canExecute: false,
      checkedAt: null,
    }));

    act(() => {
      result.current.replaceSection("goal", "Add inventory beside the current HUD");
    });
    expect(result.current.readiness).toEqual(expect.objectContaining({
      status: "stale",
      canExecute: false,
      checkedAt: null,
    }));

    await act(async () => {
      await result.current.checkReadiness();
    });

    expect(checkWorkflowPlanReadiness).toHaveBeenCalledWith("plan-1", expect.objectContaining({
      version: 4,
      hash: "hash-4",
    }));
    expect(result.current.readiness).toEqual(expect.objectContaining({
      status: "checked",
      canExecute: true,
    }));
  });

  it("freezes mutations while checking and executes the exact checked version fence", async () => {
    let resolveReadiness;
    checkWorkflowPlanReadiness.mockReturnValueOnce(new Promise((resolve) => {
      resolveReadiness = resolve;
    }));
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
      studioConnected: true,
      studioTarget,
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    const goalAtExecutionStart = result.current.plan.sections.goal;

    let executionPromise;
    act(() => {
      executionPromise = result.current.execute();
    });
    await waitFor(() => expect(checkWorkflowPlanReadiness).toHaveBeenCalledTimes(1));
    expect(result.current.editingLocked).toBe(true);

    act(() => {
      result.current.replaceSection("goal", "A racing edit that must not enter this execution");
    });
    expect(result.current.plan.sections.goal).toBe(goalAtExecutionStart);

    const checkedFence = checkWorkflowPlanReadiness.mock.calls[0][1];
    await act(async () => {
      resolveReadiness({ ready: true, canExecute: true, issues: [] });
      await executionPromise;
    });

    expect(executeWorkflowPlan).toHaveBeenCalledWith("plan-1", expect.objectContaining({
      version: checkedFence.version,
      hash: checkedFence.hash,
    }));
    expect(result.current.editingLocked).toBe(false);
  });

  it("exposes version history failures and clears them after a successful retry", async () => {
    getWorkflowPlanVersions
      .mockRejectedValueOnce(new Error("History connection failed"))
      .mockResolvedValueOnce({ versions: [{ version: 2, hash: "hash-2" }] });
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));

    await act(async () => {
      await expect(result.current.loadVersions()).rejects.toThrow("History connection failed");
    });
    expect(result.current.versionsError).toEqual(expect.objectContaining({ message: "History connection failed" }));
    expect(result.current.versions).toEqual([]);

    await act(async () => {
      await result.current.loadVersions();
    });
    expect(result.current.versionsError).toBeNull();
    expect(result.current.versions).toEqual([{ version: 2, hash: "hash-2" }]);
  });

  it("keeps the current plan and exposes an error when version restore fails", async () => {
    restoreWorkflowPlanVersion.mockRejectedValueOnce(new Error("Restore failed"));
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    const currentPlan = result.current.plan;

    await act(async () => {
      await expect(result.current.restoreVersion(1, "hash-1")).rejects.toThrow("Restore failed");
    });

    expect(result.current.plan).toEqual(currentPlan);
    expect(result.current.restoreError).toEqual(expect.objectContaining({ message: "Restore failed" }));
    expect(result.current.restoringVersion).toBeNull();
    expect(result.current.editingLocked).toBe(false);
  });

  it("restores history with current and source version/hash fences", async () => {
    const { result } = renderHook(() => usePlanWorkspace({
      messages: [message],
      userId: "user-1",
      chatId: "chat-1",
      projectId: "project-current-chat",
    }));
    await waitFor(() => expect(result.current.loadState).toBe("ready"));

    await act(async () => {
      await result.current.restoreVersion(1, "hash-1");
    });

    expect(restoreWorkflowPlanVersion).toHaveBeenCalledWith("plan-1", {
      version: 3,
      hash: "hash-3",
      sourceVersion: 1,
      sourceHash: "hash-1",
    });
  });
});
