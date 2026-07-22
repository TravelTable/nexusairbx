import type { PlanReadiness, WorkflowPlan, WorkflowPlanOperation } from "./workflowPlan";

export class WorkflowApiError extends Error {
  status: number;
  code: string;
  payload: unknown;
}

export interface WorkflowPlanEnvelope {
  ok?: boolean;
  planId: string;
  version: number;
  hash: string;
  status?: string;
  plan: WorkflowPlan;
}

export interface WorkflowPlanTargeting {
  projectId?: string | null;
  studioConnected?: boolean;
  studioTarget?: unknown;
  [key: string]: unknown;
}

export function getWorkflowPlan(planId: string, options?: { signal?: AbortSignal }): Promise<WorkflowPlanEnvelope>;
export function updateWorkflowPlan(planId: string, input: { version: number; hash: string; operations: WorkflowPlanOperation[] }, options?: { signal?: AbortSignal }): Promise<WorkflowPlanEnvelope>;
export function regenerateWorkflowPlanSection(planId: string, sectionId: string, input?: { version?: number; hash?: string; instruction?: string }): Promise<WorkflowPlanEnvelope>;
export function checkWorkflowPlanReadiness(planId: string, input?: { version?: number; hash?: string; projectId?: string; studioConnected?: boolean; studioTarget?: unknown; targeting?: WorkflowPlanTargeting }): Promise<PlanReadiness>;
export function getWorkflowPlanVersions(planId: string, options?: { signal?: AbortSignal }): Promise<unknown[] | { versions: unknown[] }>;
export function restoreWorkflowPlanVersion(planId: string, input?: {
  version?: number;
  hash?: string;
  sourceVersion?: number;
  sourceHash?: string;
}): Promise<WorkflowPlanEnvelope>;
export function askWorkflowPlan(planId: string, input?: { version?: number; hash?: string; question?: string; projectId?: string }): Promise<{ answer: string; proposedOperations: WorkflowPlanOperation[] }>;
export function executeWorkflowPlan(planId: string, input?: {
  version?: number;
  hash?: string;
}): Promise<Record<string, unknown>>;
