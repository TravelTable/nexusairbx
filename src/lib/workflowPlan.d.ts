export type PlanSectionId =
  | "goal"
  | "userExperience"
  | "systemsAffected"
  | "objectsToCreate"
  | "objectsToModify"
  | "assetsRequired"
  | "implementationSteps"
  | "verificationSteps"
  | "risksAndAssumptions";

export interface WorkflowPlanItem {
  id: string;
  itemId?: string;
  title: string;
  details: string;
  planStepId?: string;
  [key: string]: unknown;
}

export interface WorkflowCapability {
  id: string;
  label: string;
  available: boolean;
  [key: string]: unknown;
}

export interface WorkflowPlanTargeting {
  projectId?: string | null;
  studioTarget?: Record<string, unknown> | string | null;
  studioRequired?: boolean;
  [key: string]: unknown;
}

export interface WorkflowPlan {
  planId: string;
  version: number;
  hash: string;
  status: string;
  templateId: string | null;
  requiresStudio: boolean;
  projectTargetRequired: boolean;
  sections: Record<PlanSectionId, string | WorkflowPlanItem[]>;
  locks: Partial<Record<PlanSectionId, boolean>>;
  targeting: WorkflowPlanTargeting;
  constraints: unknown[];
  assets: unknown[];
  capabilities: WorkflowCapability[];
  clarificationAnswers: Record<string, unknown>;
  assumptions: unknown[];
  originalRequest: string;
  [key: string]: unknown;
}

export type WorkflowPlanOperation =
  | { type: "replace_section"; sectionId: PlanSectionId; value: string | WorkflowPlanItem[] }
  | { type: "set_section_lock"; sectionId: PlanSectionId; locked: boolean }
  | { type: "reorder_item"; sectionId: PlanSectionId; itemId: string; toIndex: number }
  | { type: "remove_item"; sectionId: PlanSectionId; itemId: string }
  | { type: "add_item"; sectionId: PlanSectionId; value: Partial<WorkflowPlanItem>; index?: number };

export interface PlanReadinessIssue {
  id: string;
  code: string;
  severity: "warning" | "blocker" | "error" | "critical" | string;
  title: string;
  message: string;
  suggestedFix: {
    action: string;
    label: string;
  };
  sectionId: PlanSectionId | null;
  affectedStepIds: string[];
}

export interface PlanReadiness {
  status: "unchecked" | "stale" | "checking" | "checked" | "error";
  ready: boolean;
  issues: PlanReadinessIssue[];
  blockers: PlanReadinessIssue[];
  warnings: PlanReadinessIssue[];
  canExecute: boolean;
  checkedAt: string | null;
  [key: string]: unknown;
}

export const PLAN_SECTION_DEFINITIONS: ReadonlyArray<{
  id: PlanSectionId;
  label: string;
  kind: "text" | "list" | "steps";
  defaultOpen?: boolean;
}>;

export const PLAN_TEMPLATES: ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  starterPrompt: string;
}>;

export function normalizeWorkflowPlan(input: unknown, fallbackMessage?: unknown): WorkflowPlan;
export function findLatestPlanMessage(messages?: unknown[]): Record<string, unknown> | null;
export function updatePlanSection(plan: WorkflowPlan, sectionId: PlanSectionId, value: string | WorkflowPlanItem[]): WorkflowPlan;
export function updatePlanSectionItem(plan: WorkflowPlan, sectionId: PlanSectionId, itemId: string, patch: Partial<WorkflowPlanItem>): WorkflowPlan;
export function addPlanSectionItem(plan: WorkflowPlan, sectionId: PlanSectionId, item?: Partial<WorkflowPlanItem>): WorkflowPlan;
export function removePlanSectionItem(plan: WorkflowPlan, sectionId: PlanSectionId, itemId: string): WorkflowPlan;
export function reorderPlanSectionItem(plan: WorkflowPlan, sectionId: PlanSectionId, itemId: string, direction: "up" | "down"): WorkflowPlan;
export function setPlanSectionLock(plan: WorkflowPlan, sectionId: PlanSectionId, locked: boolean): WorkflowPlan;
export function createReplaceSectionOperation(plan: WorkflowPlan, sectionId: PlanSectionId): WorkflowPlanOperation;
export function createPlanSyncOperations(plan: WorkflowPlan | null): WorkflowPlanOperation[];
export function normalizeReadiness(input: unknown, plan: WorkflowPlan | null, context?: { projectId?: string; studioConnected?: boolean; studioTarget?: Record<string, unknown> | string | null }): PlanReadiness;
export function planDraftStorageKey(input?: { userId?: string; chatId?: string; planId?: string }): string;
export function loadPlanDraft(key: string): { plan: WorkflowPlan; savedAt?: string; dirty?: boolean } | null;
export function savePlanDraft(key: string, plan: WorkflowPlan | null, metadata?: Record<string, unknown>): void;
