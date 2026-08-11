import {
  createPlanSyncOperations,
  loadPlanDraft,
  normalizeReadiness,
  normalizeWorkflowPlan,
  planDraftStorageKey,
  removePlanSectionItem,
  reorderPlanSectionItem,
  savePlanDraft,
  serializePlanSection,
  setPlanSectionLock,
  updatePlanSection,
  updatePlanSectionItem,
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
      expect.objectContaining({ id: "studio_inspection", label: "Studio inspection", available: null }),
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

  it("serializes edited list, asset, and step fields with backend-native names", () => {
    const normalized = normalizeWorkflowPlan({
      planId: "plan-aliases",
      sections: {
        userExperience: [{
          itemId: "ux-1",
          label: "Replace the existing HUD",
          description: "Stale list details",
          category: "player-facing",
        }],
        assetsRequired: [{
          itemId: "asset-1",
          label: "Old inventory icon",
          description: "Stale asset details",
          type: "image",
          status: "required",
        }],
        implementationSteps: [{
          stepId: "step-1",
          label: "Old implementation title",
          instructions: "Old implementation instructions",
          capabilityIds: ["patch_script"],
          stage: 2,
        }],
        verificationSteps: [{
          stepId: "verify-1",
          title: "Old verification title",
          instructions: "Old verification instructions",
          verification: { method: "play_test", required: true },
        }],
      },
    });
    const editedList = updatePlanSectionItem(normalized, "userExperience", "ux-1", {
      title: "Keep the existing HUD",
      details: "Place the inventory beside it.",
    });
    const editedAsset = updatePlanSectionItem(editedList, "assetsRequired", "asset-1", {
      title: "Six-slot inventory icon",
      details: "Use the approved asset library.",
    });
    const editedImplementation = updatePlanSectionItem(editedAsset, "implementationSteps", "step-1", {
      title: "Update InventoryController",
      details: "Preserve the HUD and expose inventory state to the client.",
    });
    const edited = updatePlanSectionItem(editedImplementation, "verificationSteps", "verify-1", {
      title: "Verify respawn behavior",
      details: "Respawn twice and confirm all six slots restore.",
    });

    expect(serializePlanSection(edited, "userExperience")).toEqual([{
      id: "ux-1",
      itemId: "ux-1",
      category: "player-facing",
      label: "Keep the existing HUD",
      details: "Place the inventory beside it.",
    }]);
    expect(serializePlanSection(edited, "assetsRequired")).toEqual([{
      id: "asset-1",
      itemId: "asset-1",
      type: "image",
      status: "required",
      label: "Six-slot inventory icon",
      details: "Use the approved asset library.",
    }]);
    expect(serializePlanSection(edited, "implementationSteps")).toEqual([{
      stepId: "step-1",
      id: "step-1",
      itemId: "step-1",
      capabilityIds: ["patch_script"],
      stage: 2,
      title: "Update InventoryController",
      instructions: "Preserve the HUD and expose inventory state to the client.",
    }]);
    expect(serializePlanSection(edited, "verificationSteps")).toEqual([{
      stepId: "verify-1",
      id: "verify-1",
      itemId: "verify-1",
      verification: { method: "play_test", required: true },
      title: "Verify respawn behavior",
      instructions: "Respawn twice and confirm all six slots restore.",
    }]);
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
