import {
  createPlanSyncOperations,
  loadPlanDraft,
  normalizeReadiness,
  normalizeWorkflowPlan,
  planDraftStorageKey,
  removePlanSectionItem,
  reorderPlanSectionItem,
  savePlanDraft,
  setPlanSectionLock,
  updatePlanSection,
} from "./workflowPlan";

const planMessage = {
  id: "message-plan-1",
  role: "assistant",
  stage: "plan",
  planId: "plan-1",
  planVersion: 3,
  planHash: "hash-3",
  targeting: { projectId: "project-chat" },
  templateId: "add_feature",
  capabilities: [{ capabilityId: "studio_inspection", name: "Studio inspection" }],
  structuredPlan: {
    requiresStudio: true,
    projectTargetRequired: true,
    sections: {
      goal: "Add a durable inventory",
      implementationSteps: [
        { stepId: "inspect", value: "Inspect the current inventory", instructions: "Record existing UI and remotes." },
        { stepId: "build", value: "Implement the server-owned inventory" },
      ],
      verificationSteps: ["Verify save and restore"],
    },
    lockedSectionIds: ["goal"],
  },
};

describe("workflowPlan", () => {
  beforeEach(() => window.localStorage.clear());

  it("normalizes structured plans without dropping targeting, capabilities, or item instructions", () => {
    const plan = normalizeWorkflowPlan(planMessage, planMessage);

    expect(plan).toMatchObject({
      planId: "plan-1",
      version: 3,
      hash: "hash-3",
      templateId: "add_feature",
      requiresStudio: true,
      projectTargetRequired: true,
      targeting: { projectId: "project-chat" },
      locks: { goal: true },
    });
    expect(plan.capabilities).toEqual([
      expect.objectContaining({ id: "studio_inspection", label: "Studio inspection", available: true }),
    ]);
    expect(plan.sections.implementationSteps[0]).toEqual(expect.objectContaining({
      itemId: "inspect",
      title: "Inspect the current inventory",
      details: "Record existing UI and remotes.",
    }));
  });

  it("honors the top-level Studio requirement alias", () => {
    const plan = normalizeWorkflowPlan({
      ...planMessage,
      studioRequired: true,
      structuredPlan: {
        ...planMessage.structuredPlan,
        requiresStudio: undefined,
      },
    });

    expect(plan.requiresStudio).toBe(true);
  });

  it("supports section editing, item removal/reordering, locks, and local draft recovery", () => {
    const initial = normalizeWorkflowPlan(planMessage, planMessage);
    const reordered = reorderPlanSectionItem(initial, "implementationSteps", "build", "up");
    const removed = removePlanSectionItem(reordered, "implementationSteps", "inspect");
    const edited = updatePlanSection(removed, "goal", "Ship the inventory without replacing the current HUD");
    const locked = setPlanSectionLock(edited, "implementationSteps", true);
    const key = planDraftStorageKey({ userId: "user-1", chatId: "chat-1", planId: locked.planId });

    savePlanDraft(key, locked, { dirty: true });

    expect(locked.sections.implementationSteps.map((item) => item.itemId)).toEqual(["build"]);
    expect(loadPlanDraft(key)).toMatchObject({
      dirty: true,
      plan: {
        sections: { goal: "Ship the inventory without replacing the current HUD" },
        locks: { implementationSteps: true },
      },
    });
  });

  it("reconstructs a complete sync patch for a dirty recovered draft", () => {
    const plan = setPlanSectionLock(normalizeWorkflowPlan(planMessage, planMessage), "goal", false);
    const operations = createPlanSyncOperations(plan);

    expect(operations.filter((operation) => operation.type === "replace_section")).toHaveLength(9);
    expect(operations).toContainEqual({
      type: "replace_section",
      sectionId: "goal",
      value: "Add a durable inventory",
    });
    expect(operations).toContainEqual({
      type: "set_section_lock",
      sectionId: "goal",
      locked: false,
    });
  });

  it("temporarily unlocks recovered locked sections before replacing and restores their lock", () => {
    const plan = normalizeWorkflowPlan(planMessage, planMessage);
    const operations = createPlanSyncOperations(plan);

    expect(operations.filter((operation) => operation.sectionId === "goal")).toEqual([
      { type: "set_section_lock", sectionId: "goal", locked: false },
      { type: "replace_section", sectionId: "goal", value: "Add a durable inventory" },
      { type: "set_section_lock", sectionId: "goal", locked: true },
    ]);
  });

  it("only blocks readiness for predictable targeting failures", () => {
    const plan = normalizeWorkflowPlan(planMessage, planMessage);
    const untargetedPlan = { ...plan, targeting: {} };
    const disconnected = normalizeReadiness({}, untargetedPlan, { projectId: "", studioConnected: false });
    const connected = normalizeReadiness({}, plan, { projectId: "project-chat", studioConnected: true });
    const checked = normalizeReadiness(
      { canExecute: true, issues: [] },
      plan,
      { projectId: "project-chat", studioConnected: true }
    );
    const stale = normalizeReadiness(
      { status: "stale" },
      plan,
      { projectId: "project-chat", studioConnected: true }
    );

    expect(disconnected.blockers.map((issue) => issue.code)).toEqual([
      "missing_studio_connection",
      "missing_project_target",
    ]);
    expect(disconnected.blockers[0]).toEqual(expect.objectContaining({
      affectedStepIds: [],
      suggestedFix: expect.objectContaining({ action: "connect_studio" }),
    }));
    expect(connected).toEqual(expect.objectContaining({ status: "unchecked", canExecute: false, checkedAt: null }));
    expect(checked).toEqual(expect.objectContaining({ status: "checked", canExecute: true }));
    expect(stale).toEqual(expect.objectContaining({ status: "stale", canExecute: false, checkedAt: null }));
  });
});
