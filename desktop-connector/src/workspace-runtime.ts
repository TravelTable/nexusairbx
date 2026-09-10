import { createHash, randomUUID } from "node:crypto";
import type { JsonObject, LocalStudio } from "nexusrbx-local-connector";
import { WorkspaceStore } from "./workspace-store.js";
import { WorkspaceFiles } from "./workspace-files.js";
import type { WorkspaceApi, WorkspaceMode, WorkspaceSnapshot, EntityPageQuery, StudioAction, DesktopRequest, DesktopResponse } from "./workspace-contracts.js";

const MODES = new Set<WorkspaceMode>(["ask", "plan", "agent", "debug", "quick_script", "studio_agent"]);
const READ = new Set(["get_project_manifest","read_script","read_scripts","search_project","search_source","get_studio_context","get_output_logs","collect_output","inspect_instances","read_instance","read_properties","get_selection"]);
const CONFIRM = new Set(["run_play_test", "run_test_service", "stop_play_test", "delete_instance", "restore_snapshot", "undo_last_batch", "batch_operations"]);
type Checkpoint = { step: number; history: { role: unknown; content: unknown }[]; body?: Record<string, unknown>; response?: any; target?: { placeId: string; universeId: string; placeName: string } };
export interface CloudApi {
  request(path: string, body?: unknown, signal?: AbortSignal, onDelta?: (delta: string) => void): Promise<any>;
  uploadFile?(hash: string, bytes: Uint8Array): Promise<void>;
  downloadFile?(hash: string): Promise<Uint8Array>;
}

export class WorkspaceRuntime {
  activeRunId: string | null = null;
  syncStatus = "Saved on this device";
  private abort: AbortController | null = null;
  private running: Promise<void> | null = null;
  private syncing: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private error: string | null = null;
  private preview = "";
  private approval: WorkspaceSnapshot["approval"] = null;
  private approvalReply: ((allow: boolean) => void) | null = null;
  private stopped = false;
  private visible = true;
  private pendingSince = 0;
  private syncBackoff = 60_000;
  constructor(readonly accountId: string, readonly store: WorkspaceStore, readonly studio: LocalStudio, private cloud: CloudApi, private changed: () => void, private files?: WorkspaceFiles) {}
  snapshot(conversationId?: string): WorkspaceSnapshot {
    const conversations = this.store.page({ kind: "conversation" });
    const current = conversationId ? this.store.get(conversationId) : null;
    if (current && current.kind === 'conversation' && !current.deleted && !conversations.entities.some(item => item.id === current.id)) conversations.entities.unshift(current);
    const scope = conversationId ? { conversationId } : {};
    const messages = this.store.page({ kind: "message", ...scope, limit: 100 });
    return { accountId: this.accountId, conversations: conversations.entities, messages: messages.entities.reverse(),
      runs: this.store.page({ kind: "run", ...scope }).entities, plans: this.store.page({ kind: "plan", ...scope }).entities,
      artifacts: this.store.page({ kind: "artifact", ...scope }).entities, projects: this.store.page({ kind: "project" }).entities,
      nextConversationCursor: conversations.nextCursor, nextMessageCursor: messages.nextCursor,
      activeRunId: this.activeRunId, sync: this.syncStatus, error: this.error, preview: this.preview, approval: this.approval };
  }
  list(query: EntityPageQuery) { return this.store.page(query); }
  getEntity(id: string) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9:_-]{1,180}$/.test(id)) throw new Error('Invalid record ID.');
    return this.store.get(id);
  }
  createConversation(projectId?: string) {
    if (projectId && (this.store.get(projectId)?.kind !== "project" || this.store.get(projectId)?.deleted)) throw new Error("Project not found.");
    const id = randomUUID(); this.store.save("conversation", id, { title: "New conversation", ...(projectId ? { projectId } : {}), createdAt: Date.now() }); this.dirty(); return id;
  }
  saveEntity(input: Parameters<WorkspaceApi["saveEntity"]>[0]) {
    if (!input || !["project", "conversation", "artifact", "settings"].includes(input.kind) || !input.data || typeof input.data !== "object" || Array.isArray(input.data) || Buffer.byteLength(JSON.stringify(input.data)) > 240000) throw new Error("Invalid workspace record.");
    const id = input.id || randomUUID();
    if (!/^[A-Za-z0-9:_-]{1,180}$/.test(id)) throw new Error("Invalid record ID.");
    const previous = this.store.get(id);
    if (input.id && !previous && input.kind !== "settings") throw new Error("Record not found.");
    if (previous?.deleted) throw new Error("This record has been deleted.");
    const data = { ...previous?.data, ...input.data, createdAt: previous?.data.createdAt ?? Date.now(), updatedAt: Date.now() };
    for (const [key, kind] of [["conversationId", "conversation"], ["projectId", "project"]] as const) {
      const parent = input.data[key];
      if (parent && (typeof parent !== "string" || this.store.get(parent)?.kind !== kind || this.store.get(parent)?.deleted)) throw new Error("The parent record is unavailable.");
    }
    if (input.deleted && this.activeRunId) throw new Error("Stop the active operation before deleting records.");
    if (input.deleted && input.kind === "project" && this.store.page({ kind: "conversation", projectId: id, limit: 1 }).entities.length) throw new Error("Move or delete this project's conversations first.");
    // The renderer cannot replace an immutable file hash with a foreign blob reference.
    if (input.kind === "artifact" && ("hash" in input.data || "size" in input.data)) throw new Error("Use the file picker to attach files.");
    const entity = this.store.save(input.kind, id, data, input.deleted === true); this.dirty(); return entity;
  }
  editPlan(id: string, content: string) {
    const plan = this.store.get(id);
    if (!plan || plan.kind !== "plan" || plan.deleted || typeof content !== "string" || !content.trim() || content.length > 48000) throw new Error("Invalid plan edit.");
    if (this.activeRunId) throw new Error("Stop the active run before revising its plan.");
    const version = Number(plan.data.version || 1);
    if (!Number.isSafeInteger(version) || version < 1) throw new Error('This imported plan needs its version reconciled.');
    const [, entity] = this.store.saveMany([
      { kind: 'plan_version', id: `${id}:v${version}`, data: { ...plan.data, planId: id } },
      { kind: 'plan', id, data: { ...plan.data, content, hash: createHash("sha256").update(content).digest("hex"), version: version + 1, approvedAt: null, approvedBy: null, updatedAt: Date.now() } },
    ]);
    this.dirty(); return entity;
  }
  resolveConflict(id: string, choice: 'keep_both' | 'use_copy' | 'use_current') {
    if (this.activeRunId) throw new Error('Stop the active run before resolving conflicting history.');
    const copy = this.store.get(id);
    const original = copy && typeof copy.data.conflictOf === 'string' ? this.store.get(copy.data.conflictOf) : null;
    if (!copy || copy.deleted || !original || copy.kind !== original.kind || !['keep_both','use_copy','use_current'].includes(choice)) throw new Error('This conflict is no longer available. Refresh history.');
    if (choice === 'use_current') this.store.save(copy.kind, copy.id, copy.data, true);
    else {
      const data: Record<string, unknown> = { ...copy.data, conflictOf: null, resolvedConflictOf: original.id, updatedAt: Date.now() };
      if (typeof data.title === 'string') data.title = data.title.replace(/ \(conflict copy\)$/, '');
      if (copy.kind === 'plan') Object.assign(data, { approvedAt: null, approvedBy: null, version: Math.max(Number(copy.data.version) || 1, Number(original.data.version) || 1) + 1,
        hash: createHash('sha256').update(String(data.content || '')).digest('hex') });
      if (choice === 'keep_both') this.store.save(copy.kind, copy.id, data);
      else this.store.saveMany([{ kind: original.kind, id: original.id, data }, { kind: copy.kind, id: copy.id, data: copy.data, deleted: true }]);
    }
    this.dirty();
  }
  async studioAction(input: StudioAction) {
    if (!input || typeof input.command !== "string" || !input.payload || typeof input.payload !== "object" || Array.isArray(input.payload) || Buffer.byteLength(JSON.stringify(input.payload)) > 240000
      || typeof input.studioId !== "string" || !input.studioId || !/^[A-Za-z0-9:_-]{1,180}$/.test(input.operationId)) throw new Error("Invalid Studio operation.");
    if (this.activeRunId) throw new Error("Finish or stop the active run before using Studio controls.");
    if (![...READ, ...CONFIRM, "write_script", "create_snapshot"].includes(input.command)) throw new Error("This action is not exposed to the editor.");
    if (input.command === "write_script" && (typeof input.payload.expectedSourceHash !== "string" || !input.payload.expectedSourceHash)) throw new Error("Read the current script before saving it.");
    if (input.command === 'write_script' && (typeof input.expectedPlaceSignature !== 'string' || !input.expectedPlaceSignature || input.expectedPlaceSignature.length > 128)) throw new Error('Reload this script to confirm which Studio project owns it.');
    const abort = new AbortController(); this.abort = abort; this.activeRunId = input.operationId; this.changed();
    const operation = (async () => {
      try {
        const target = await this.studio.inspect(input.studioId, abort.signal);
        if (input.expectedPlaceSignature && target.placeSignature !== input.expectedPlaceSignature) throw new Error('This Studio window now contains a different project. Reload the file before saving.');
        if (CONFIRM.has(input.command) && !this.store.getCommand(input.operationId)) await this.confirmTool(input.operationId, input.command, input.payload, input.studioId, abort.signal);
        const confirmed = CONFIRM.has(input.command);
        const result = await this.studio.execute(input.command, { ...input.payload, confirmed, explicitConfirmation: confirmed, destructiveConfirmed: confirmed } as JsonObject,
          { id: input.operationId, studioId: input.studioId, signal: abort.signal, expectedPlaceSignature: typeof target.placeSignature === "string" ? target.placeSignature : undefined });
        if (!result.ok || (!READ.has(input.command) && input.command !== "create_snapshot" && result.verified !== true)) throw new Error(`Studio needs attention: ${JSON.stringify(result.error || result).slice(0, 500)}`);
        return { ...result, desktopPlaceSignature: target.placeSignature };
      } finally { this.activeRunId = null; this.abort = null; this.running = null; this.changed(); }
    })();
    this.running = operation.then(() => undefined, () => undefined);
    return operation;
  }
  async request(input: DesktopRequest): Promise<DesktopResponse> {
    if (!input || typeof input.path !== "string" || input.path.length > 2000 || !['GET','POST','PATCH','DELETE'].includes(input.method || 'GET')
      || (input.body !== undefined && (typeof input.body !== 'string' || input.body.length > 240000))) throw new Error("Unsupported desktop service request.");
    const url = new URL(input.path, "https://desktop.invalid");
    if (url.origin !== "https://desktop.invalid" || !input.path.startsWith("/api/")) throw new Error("Invalid service path.");
    if (url.pathname === '/api/ai/verify' && input.method === 'POST') {
      const result = await this.cloud.request('/readiness', JSON.parse(input.body || '{}'));
      return { status: 200, body: JSON.stringify(result), headers: { 'Content-Type': 'application/json' } };
    }
    const routes: Record<string, string> = { "/api/models": "/models", "/api/billing/entitlements": "/account", "/api/desktop/account": "/account" };
    const service = /^\/api\/(?:user\/(?:usage|teams)|roblox\/(?:oauth\/status|operations)|billing\/(?:catalog|estimate|cancel|teams(?:\/[A-Za-z0-9_-]+)*)|checkout|portal|support\/tickets(?:\/[A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+)?)$/.test(url.pathname);
    if (!routes[url.pathname] && !service) throw new Error("This cloud operation has not been adapted for desktop.");
    if (routes[url.pathname] && (input.method && input.method !== 'GET' || input.body !== undefined)) throw new Error('Unsupported desktop service request.');
    const body = routes[url.pathname] ? await this.cloud.request(routes[url.pathname]) : await this.cloud.request('/services', input);
    return { status: 200, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } };
  }
  private dirty() {
    this.syncStatus = "Saved on this device"; this.changed();
    if (this.stopped) return;
    this.pendingSince ||= Date.now();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; this.pendingSince = 0; void this.sync(); }, Math.max(0, Math.min(2000, 10000 - (Date.now() - this.pendingSince))));
  }
  setVisible(visible: boolean) { this.visible = visible; if (visible) void this.sync(); }
  async sync() {
    if (this.stopped) return;
    if (this.syncing) return this.syncing;
    this.syncing = this.doSync().finally(() => {
      this.syncing = null; if (this.syncTimer) clearTimeout(this.syncTimer);
      if (!this.stopped && this.visible) this.syncTimer = setTimeout(() => void this.sync(), this.syncBackoff);
    });
    return this.syncing;
  }
  private async doSync() {
    try {
      this.syncStatus = "Syncing"; this.changed();
      // Bound each pass. A huge offline backlog cannot monopolize the worker.
      for (let i = 0; i < 10; i++) {
        const changes = this.store.pending(); if (!changes.length) break;
        for (const { entity } of changes) {
          const hash = entity.kind === "artifact" && typeof entity.data.hash === "string" ? entity.data.hash : null;
          if (hash && !entity.deleted && !this.store.getMeta(`uploaded:${hash}`)) {
            const bytes = this.files?.get(hash);
            if (!bytes || !this.cloud.uploadFile) throw new Error("File upload is unavailable.");
            await this.cloud.uploadFile(hash, bytes); this.store.setMeta(`uploaded:${hash}`, "1");
          }
        }
        this.store.markSent(changes);
        this.store.acknowledge(await this.cloud.request("/sync/push", { changes }));
      }
      for (let i = 0; i < 10; i++) {
        const result = await this.cloud.request(`/sync/pull?cursor=${this.store.getMeta("cursor") || "0"}`);
        this.store.applyRemote(result.entities, result.cursor); if (!result.hasMore) break;
      }
      this.syncStatus = this.store.pending().length ? "Syncing" : "Synced"; this.syncBackoff = 60000;
    } catch { this.syncStatus = "Saved on this device — sync unavailable"; this.syncBackoff = Math.min(this.syncBackoff * 2, 300000); }
    this.changed();
  }
  approvePlan(id: string) {
    const plan = this.store.get(id);
    if (!plan || plan.kind !== "plan") throw new Error("Plan not found.");
    this.store.save("plan", id, { ...plan.data, approvedAt: Date.now(), approvedBy: this.accountId }); this.dirty();
  }
  attachFile(conversationId: string, name: string, bytes: Uint8Array) {
    if (!this.files || this.store.get(conversationId)?.kind !== "conversation") throw new Error("Open a conversation first.");
    if (typeof name !== "string" || !name || name.length > 180 || /[\\/\x00-\x1f]/.test(name) || !(bytes instanceof Uint8Array)) throw new Error("Invalid file.");
    const file = this.files.put(bytes); const id = randomUUID();
    this.store.save("artifact", id, { ...file, name, conversationId, createdAt: Date.now() }); this.dirty(); return id;
  }
  async file(id: string) {
    const artifact = this.store.get(id);
    if (!artifact || artifact.kind !== "artifact" || artifact.deleted || !this.files) throw new Error("File not found.");
    const hash = String(artifact.data.hash || "");
    if (!hash) {
      const source = artifact.data.code ?? artifact.data.source ?? JSON.stringify(artifact.data, null, 2);
      return { name: String(artifact.data.name || "Imported-history.json"), bytes: Buffer.from(String(source)) };
    }
    let bytes = this.files.get(hash);
    if (!bytes) {
      if (!this.cloud.downloadFile) throw new Error("The file is not available offline yet.");
      bytes = Buffer.from(await this.cloud.downloadFile(hash)); this.files.put(bytes, hash);
      this.store.setMeta(`uploaded:${hash}`, "1");
    }
    return { name: String(artifact.data.name || "artifact.bin"), bytes };
  }
  submit(input: Parameters<WorkspaceApi["submit"]>[0]) {
    if (this.activeRunId) throw new Error("Finish or stop the active run first.");
    if (!MODES.has(input.mode) || typeof input.instruction !== "string" || !input.instruction.trim() || input.instruction.length > 16000) throw new Error("Enter an instruction of at most 16,000 characters.");
    const conversation = this.store.get(input.conversationId);
    if (!conversation || conversation.kind !== "conversation" || conversation.deleted) throw new Error("Conversation not found.");
    const id = randomUUID();
    this.store.save("message", randomUUID(), { conversationId: conversation.id, role: "user", content: input.instruction, createdAt: Date.now() });
    this.store.save("conversation", conversation.id, { ...conversation.data, title: conversation.data.title === "New conversation" ? input.instruction.slice(0, 80) : conversation.data.title, updatedAt: Date.now() });
    this.store.save("run", id, { conversationId: conversation.id, status: "running", mode: input.mode, deviceId: this.deviceId(), createdAt: Date.now() });
    this.store.setMeta(`input:${id}`, JSON.stringify(input));
    this.dirty();
    this.startRun(id, input);
    return id;
  }
  resume(id: string) {
    if (this.activeRunId) throw new Error("Finish or stop the active run first.");
    const run = this.store.get(id); const input = this.store.getMeta(`input:${id}`);
    if (!run || run.kind !== "run" || run.data.status !== "interrupted" || run.data.deviceId !== this.deviceId() || !input) throw new Error("This run can only resume on the device where it started.");
    this.store.save("run", id, { ...run.data, status: "running", error: null });
    this.startRun(id, JSON.parse(input));
  }
  private startRun(id: string, input: Parameters<WorkspaceApi["submit"]>[0]) {
    this.activeRunId = id; this.abort = new AbortController(); this.error = null;
    this.running = this.execute(id, input, this.abort.signal).finally(() => {
      this.activeRunId = null; this.abort = null; this.running = null; this.preview = ""; this.approval = null; this.dirty();
    });
  }
  approveTool(id: string, allow: boolean) {
    if (this.approval?.runId !== id || typeof allow !== "boolean") throw new Error("This confirmation has expired.");
    this.approvalReply?.(allow);
  }
  private async confirmTool(runId: string, command: string, payload: Record<string, unknown>, studioId: string, signal: AbortSignal) {
    signal.throwIfAborted();
    this.approval = { runId, command, payload, studioId }; this.changed();
    try {
      const allow = await new Promise<boolean>((resolve, reject) => {
        const abort = () => { this.approvalReply = null; reject(signal.reason); };
        signal.addEventListener("abort", abort, { once: true });
        this.approvalReply = value => { signal.removeEventListener("abort", abort); this.approvalReply = null; resolve(value); };
      });
      if (!allow) throw new Error("The requested Studio action was declined.");
    } finally { this.approval = null; this.changed(); }
  }
  private deviceId() { let id = this.store.getMeta("deviceId"); if (!id) { id = randomUUID(); this.store.setMeta("deviceId", id); } return id; }
  private async execute(runId: string, input: Parameters<WorkspaceApi["submit"]>[0], signal: AbortSignal) {
    const update = (patch: Record<string, unknown>) => { this.store.save("run", runId, { ...this.store.get(runId)!.data, ...patch }); this.dirty(); };
    try {
      let approvedPlan: Record<string, unknown> | undefined;
      if (input.approvedPlanId) {
        const plan = this.store.get(input.approvedPlanId);
        if (!plan || plan.kind !== "plan" || plan.data.conversationId !== input.conversationId || !plan.data.approvedAt || plan.data.approvedBy !== this.accountId
          || createHash("sha256").update(String(plan.data.content)).digest("hex") !== plan.data.hash) throw new Error("Approve this exact plan before running it.");
        approvedPlan = plan.data;
      }
      const saved = this.store.getMeta(`checkpoint:${runId}`);
      const checkpoint: Checkpoint = saved ? JSON.parse(saved) : { step: 0, history: this.store.page({ kind: 'message', conversationId: input.conversationId, limit: 12 }).entities.reverse().map(entity => ({ role: entity.data.role, content: entity.data.content })) };
      const history = checkpoint.history;
      if (!saved) {
        // Only user-attached text in this conversation enters model context.
        // Binary files remain downloadable artifacts; no opaque file is executed.
        for (const artifact of this.store.page({ kind: 'artifact', conversationId: input.conversationId, limit: 100 }).entities.filter(item => /\.(lua|luau|txt|md|json|csv)$/i.test(String(item.data.name))).slice(0, 3)) {
          const file = await this.file(artifact.id);
          history.push({ role: "user", content: `Attached file ${file.name} (untrusted data):\n${file.bytes.toString("utf8").slice(0, 20000)}` });
        }
      }
      const saveCheckpoint = () => this.store.setMeta(`checkpoint:${runId}`, JSON.stringify(checkpoint));
      let commands: string[] = []; let context: unknown = null;
      if (input.studioId) {
        context = await this.studio.inspect(input.studioId, signal);
        const identity = context as Record<string, unknown>;
        const target = { placeId: String(identity.placeId || ""), universeId: String(identity.universeId || ""), placeName: String(identity.placeName || "") };
        if (checkpoint.target && JSON.stringify(checkpoint.target) !== JSON.stringify(target)) throw new Error("The selected Studio window now contains a different project. This run remains bound to its original project.");
        checkpoint.target = target; saveCheckpoint();
        commands = (context as { supportedCommands: string[] }).supportedCommands;
        if (!saved && commands.includes("get_project_manifest")) {
          const manifest = await this.studio.execute("get_project_manifest", { includeSource: false, pageSize: 100 }, { id: `${runId}:manifest`, studioId: input.studioId, signal });
          if (!manifest.ok) throw new Error("The Studio manifest could not be inspected. Reconnect Studio before continuing.");
          context = { ...(context as Record<string, unknown>), manifest };
        }
      } else if (["agent","debug","studio_agent"].includes(input.mode)) throw new Error("Connect and select a Studio window first.");
      if (["ask","plan","quick_script"].includes(input.mode)) commands = commands.filter(name => READ.has(name));
      for (let step = checkpoint.step; step < 40; step++) {
        signal.throwIfAborted();
        const callId = `${runId}:${step}`;
        update({ stage: "Thinking", callId });
        const body = checkpoint.body || { callId, runId, mode: input.mode, instruction: input.instruction, model: input.model,
          conversation: history.slice(-12).map(item => ({ ...item, content: String(item.content || "").slice(0, 12000) })), commands,
          studioContext: JSON.stringify(context).length < 40000 ? context : { activeStudioId: input.studioId, note: "Manifest metadata exceeds context limit. Use paged manifest and targeted search tools." }, approvedPlan };
        checkpoint.body = body; checkpoint.step = step; saveCheckpoint();
        let response;
        let partial = ''; let savedAt = 0;
        try { response = checkpoint.response || await this.cloud.request("/calls", body, signal, delta => {
          partial += delta; this.preview = visiblePartial(partial);
          if (Date.now() - savedAt > 1000) { this.store.setMeta(`partial:${runId}`, this.preview); savedAt = Date.now(); this.changed(); }
        }); }
        catch (error) {
          if (signal.aborted) throw error;
          const previous = await this.cloud.request(`/calls/${encodeURIComponent(callId)}`).catch(() => null);
          if (previous?.state === "settling") response = await this.cloud.request("/calls", body);
          else if (previous?.state === "completed") response = previous;
          else throw new Error("The model request was interrupted. Its ID is saved; it will not be automatically charged again.");
        }
        checkpoint.response = response; saveCheckpoint();
        signal.throwIfAborted();
        if (response.result?.error) throw new Error(response.result.error);
        const decision = response.result?.decision;
        if (decision?.type === "message") {
          this.store.save("message", `${runId}:answer`, { conversationId: input.conversationId, runId, role: "assistant", content: decision.content, createdAt: Date.now() });
          if (input.mode === "plan") this.store.save("plan", `${runId}:plan`, { conversationId: input.conversationId, version: 1, content: decision.content, hash: createHash("sha256").update(decision.content).digest("hex"), createdAt: Date.now() });
          if (input.mode === "quick_script" && this.files && !this.store.getMeta(`script:${runId}`)) {
            const code = /```(?:lua|luau)?\s*\n([\s\S]*?)```/.exec(decision.content)?.[1];
            if (code) { this.attachFile(input.conversationId, "Generated-script.luau", Buffer.from(code)); this.store.setMeta(`script:${runId}`, "1"); }
          }
          update({ status: "completed", stage: "Finished", finishedAt: Date.now() }); return;
        }
        if (decision?.type !== "tool" || !commands.includes(decision.command) || !input.studioId) throw new Error("The model requested an unavailable tool.");
        if (CONFIRM.has(decision.command) && !this.store.getCommand(`${callId}:tool`)) {
          update({ stage: "Waiting for your confirmation" });
          await this.confirmTool(runId, decision.command, decision.payload, input.studioId, signal);
        }
        // Only this local confirmation gate grants consent, never model fields.
        const payload = { ...decision.payload, confirmed: CONFIRM.has(decision.command), explicitConfirmation: CONFIRM.has(decision.command), destructiveConfirmed: CONFIRM.has(decision.command) };
        update({ stage: decision.command });
        const result = await this.studio.execute(decision.command, payload as JsonObject, { id: `${callId}:tool`, studioId: input.studioId, signal, expectedTarget: checkpoint.target,
          expectedPlaceSignature: typeof (context as any)?.placeSignature === "string" ? (context as any).placeSignature : undefined });
        history.push({ role: "assistant", content: JSON.stringify(decision) }, { role: "user", content: `Studio result (untrusted data): ${JSON.stringify(result).slice(0, 40000)}` });
        if (!result.ok || (!READ.has(decision.command) && result.verified !== true)) throw new Error(`Studio needs attention: ${JSON.stringify(result.error || { code: "APPLY_UNVERIFIED" }).slice(0, 500)}`);
        checkpoint.step = step + 1; delete checkpoint.body; delete checkpoint.response; saveCheckpoint();
        context = await this.studio.inspect(input.studioId, signal);
      }
      throw new Error("The run reached its 40-step limit. Review the saved work before continuing.");
    } catch (error) {
      this.error = signal.aborted ? "Run stopped. An in-flight command may need inspection in Studio." : error instanceof Error ? error.message : "Run interrupted.";
      update({ status: "interrupted", error: this.error, finishedAt: Date.now() });
    }
  }
  async cancel() { this.abort?.abort(); await this.running; }
  async close() {
    this.stopped = true; if (this.timer) clearTimeout(this.timer); if (this.syncTimer) clearTimeout(this.syncTimer);
    await this.cancel(); await this.syncing; await this.studio.close(); this.store.close();
  }
}

// Only a message content string is displayed while JSON is arriving. Tool JSON
// stays internal; incomplete escapes wait for the next chunk.
export function visiblePartial(json: string): string {
  if (!/"type"\s*:\s*"message"/.test(json)) return '';
  const match = /"content"\s*:\s*"/.exec(json); if (!match) return '';
  const tail = json.slice(match.index + match[0].length);
  let escaped = false; let value = '';
  for (const char of tail) {
    if (char === '"' && !escaped) break;
    value += char; if (char === '\\') escaped = !escaped; else escaped = false;
  }
  for (let trim = 0; trim < 7 && trim <= value.length; trim++) {
    try { return JSON.parse('"' + value.slice(0, value.length - trim) + '"'); } catch { /* wait for complete JSON escape */ }
  }
  return '';
}
