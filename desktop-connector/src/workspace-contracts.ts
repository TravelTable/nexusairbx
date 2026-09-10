export type WorkspaceMode = "ask" | "plan" | "agent" | "debug" | "quick_script" | "studio_agent";
export type EntityKind = "conversation" | "message" | "plan" | "run" | "artifact" | "project" | "settings" | "plan_version";
export interface EntityPageQuery { kind: EntityKind; conversationId?: string; projectId?: string; cursor?: string; limit?: number; conflictsOnly?: boolean }
export interface EntityPage { entities: WorkspaceEntity[]; nextCursor: string | null }
export interface StudioAction { command: string; payload: Record<string, unknown>; studioId: string; operationId: string; expectedPlaceSignature?: string }
export interface DesktopRequest { path: string; method?: string; body?: string; idempotencyKey?: string }
export interface DesktopResponse { status: number; body: string; headers?: Record<string, string> }
export interface WorkspaceEntity {
  id: string; kind: EntityKind; revision: number; data: Record<string, unknown>; deleted: boolean;
}
export interface SyncChange { operationId: string; entity: WorkspaceEntity; baseRevision: number }
export interface SyncReply { acknowledged: { operationId: string; revision: number }[]; conflicts: { operationId: string; entity: WorkspaceEntity }[] }
export interface WorkspaceSnapshot {
  accountId: string | null; conversations: WorkspaceEntity[]; messages: WorkspaceEntity[];
  runs: WorkspaceEntity[]; plans: WorkspaceEntity[]; activeRunId: string | null;
  sync: string; error: string | null; preview?: string;
  approval?: { runId: string; command: string; studioId: string; payload: Record<string, unknown> } | null;
  artifacts?: WorkspaceEntity[];
  projects?: WorkspaceEntity[];
  nextConversationCursor?: string | null;
  nextMessageCursor?: string | null;
}
export interface WorkspaceApi {
  open(): Promise<WorkspaceSnapshot>;
  snapshot(conversationId?: string): Promise<WorkspaceSnapshot>;
  createConversation(projectId?: string): Promise<string>;
  list(query: EntityPageQuery): Promise<EntityPage>;
  getEntity(id: string): Promise<WorkspaceEntity | null>;
  saveEntity(input: { kind: "project" | "conversation" | "artifact" | "settings"; id?: string; data: Record<string, unknown>; deleted?: boolean }): Promise<WorkspaceEntity>;
  editPlan(id: string, content: string): Promise<WorkspaceEntity>;
  resolveConflict(id: string, choice: 'keep_both' | 'use_copy' | 'use_current'): Promise<void>;
  studioAction(input: StudioAction): Promise<Record<string, unknown>>;
  request(input: DesktopRequest): Promise<DesktopResponse>;
  openExternal(url: string): Promise<void>;
  submit(input: { conversationId: string; instruction: string; mode: WorkspaceMode; model?: string; studioId?: string; approvedPlanId?: string }): Promise<string>;
  cancel(): Promise<void>;
  resume(runId: string): Promise<void>;
  approveTool(runId: string, allow: boolean): Promise<void>;
  studio(studioId?: string): Promise<Record<string, unknown>>;
  sync(): Promise<void>;
  approvePlan(planId: string): Promise<void>;
  exportHistory(): Promise<void>;
  attachFile(conversationId: string): Promise<void>;
  saveFile(artifactId: string): Promise<void>;
  downloadBytes(name: string, bytes: Uint8Array): Promise<boolean>;
  onChange(listener: () => void): () => void;
}
