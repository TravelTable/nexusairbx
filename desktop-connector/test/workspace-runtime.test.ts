import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LocalStudio } from "nexusrbx-local-connector";
import { WorkspaceRuntime, visiblePartial, type CloudApi } from "../src/workspace-runtime.js";
import { WorkspaceStore } from "../src/workspace-store.js";
import { WorkspaceFiles } from "../src/workspace-files.js";
import type { WorkspaceMode } from "../src/workspace-contracts.js";

const completed = (content = "Done") => ({ state: "completed", result: { decision: { type: "message", content } } });
const action = (command: string) => ({ state: "completed", result: { decision: { type: "tool", command, payload: { path: "game/Workspace/Part" } } } });
const waitFor = async (condition: () => boolean) => {
  for (let i = 0; i < 500; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail("Runtime did not reach the expected state.");
};
function setup(cloud: CloudApi, commands: string[] = []) {
  const store = new WorkspaceStore(":memory:");
  const executed: { command: string; payload: any; id: string }[] = [];
  const studio = { inspect: async () => ({ activeStudioId: "studio", placeSignature: "project-a", supportedCommands: commands }),
    execute: async (command: string, payload: any, options: any) => { executed.push({ command, payload, id: options.id }); return { ok: true, verified: true }; }, close: async () => {} } as unknown as LocalStudio;
  const runtime = new WorkspaceRuntime("alice", store, studio, cloud, () => {});
  const conversationId = runtime.createConversation();
  return { runtime, store, executed, conversationId };
}

test("all six desktop modes finish locally; plans have version-bound approval", async () => {
  for (const mode of ["ask", "plan", "agent", "debug", "quick_script", "studio_agent"] as WorkspaceMode[]) {
    const { runtime, store, conversationId } = setup({ request: async () => completed("A complete response") });
    try {
      const id = runtime.submit({ conversationId, mode, instruction: "Build a door", studioId: "studio" });
      await waitFor(() => runtime.activeRunId === null);
      assert.equal(store.get(id)?.data.status, "completed"); assert.equal(store.list("message").length, 2);
      if (mode === "plan") {
        const plan = store.list("plan")[0]!; assert.equal(plan.data.approvedAt, undefined);
        runtime.approvePlan(plan.id); assert.equal(store.get(plan.id)?.data.approvedBy, "alice");
      }
    } finally { await runtime.close(); }
  }
});
test("manifest inspection precedes inference and read-only mode cannot execute a model-requested write", async () => {
  let sawManifest = false;
  const { runtime, store, executed, conversationId } = setup({ request: async (path, body: any) => {
    if (path === "/calls") { sawManifest = !!body.studioContext.manifest; assert(!body.commands.includes("write_script")); return action("write_script"); }
    throw new Error("Unexpected cloud path");
  } }, ["get_project_manifest", "write_script"]);
  try {
    const id = runtime.submit({ conversationId, mode: "ask", instruction: "Inspect", studioId: "studio" });
    await waitFor(() => !runtime.activeRunId);
    assert.equal(sawManifest, true); assert.equal(store.get(id)?.data.status, "interrupted");
    assert.deepEqual(executed.map(item => item.command), ["get_project_manifest"]);
  } finally { await runtime.close(); }
});
test("resume reuses the exact saved model body after a lost response", async () => {
  const bodies: any[] = []; let recoverable = false;
  const { runtime, store, conversationId } = setup({ request: async (path, body) => {
    if (path === "/calls") { bodies.push(JSON.parse(JSON.stringify(body))); if (recoverable) return completed(); throw new Error("connection lost"); }
    if (path.startsWith("/calls/")) return null;
    throw new Error("Unexpected request");
  } });
  try {
    const id = runtime.submit({ conversationId, mode: "ask", instruction: "Explain" });
    await waitFor(() => !runtime.activeRunId);
    assert.equal(store.get(id)?.data.status, "interrupted");
    recoverable = true; runtime.resume(id); await waitFor(() => !runtime.activeRunId);
    assert.equal(store.get(id)?.data.status, "completed"); assert.deepEqual(bodies[0], bodies[1]);
    assert.equal(store.list("message").length, 2);
  } finally { await runtime.close(); }
});
test("playtest output cannot grant itself permission; declining never executes Studio", async () => {
  const { runtime, executed, conversationId } = setup({ request: async () => action("run_play_test") }, ["run_play_test"]);
  try {
    const id = runtime.submit({ conversationId, mode: "agent", instruction: "Test", studioId: "studio" });
    await waitFor(() => !!runtime.snapshot().approval);
    assert.equal(executed.length, 0); runtime.approveTool(id, false);
    await waitFor(() => !runtime.activeRunId); assert.equal(executed.length, 0);
  } finally { await runtime.close(); }
});
test("approving a concrete playtest permits exactly that command and cancellation clears pending approval", async () => {
  let calls = 0;
  const { runtime, executed, conversationId } = setup({ request: async () => ++calls === 1 ? action("run_play_test") : completed() }, ["run_play_test"]);
  try {
    const id = runtime.submit({ conversationId, mode: "agent", instruction: "Test", studioId: "studio" });
    await waitFor(() => !!runtime.snapshot().approval); runtime.approveTool(id, true);
    await waitFor(() => !runtime.activeRunId);
    assert.equal(executed.length, 1); assert.equal(executed[0]?.payload.confirmed, true);
    calls = 0; runtime.submit({ conversationId, mode: "agent", instruction: "Again", studioId: "studio" });
    await waitFor(() => !!runtime.snapshot().approval); await runtime.cancel();
    assert.equal(runtime.snapshot().approval, null); assert.equal(executed.length, 1);
  } finally { await runtime.close(); }
});
test("streaming progress remains local and only complete entities enter the sync outbox", async () => {
  const { runtime, store, conversationId } = setup({ request: async (_path, _body, _signal, delta) => {
    for (const char of JSON.stringify({ type: "message", content: "A streamed response" })) delta?.(char);
    return completed("A streamed response");
  } });
  try {
    runtime.submit({ conversationId, mode: "ask", instruction: "Explain" });
    await waitFor(() => !runtime.activeRunId);
    assert.equal(store.pending().length, 4); // conversation, user, run, answer
    assert(store.pending().every(item => !("preview" in item.entity.data)));
    assert.equal(visiblePartial('{"type":"tool","content":"secret"'), "");
    assert.equal(visiblePartial('{"type":"message","content":"Hello\\nworld'), "Hello\nworld");
  } finally { await runtime.close(); }
});
test("hashed files upload before metadata and another device downloads the identical bytes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nexus-files-"));
  const cloudFiles = new Map<string, Uint8Array>(); const entities = new Map<string, any>();
  const cloud: CloudApi = {
    uploadFile: async (hash, bytes) => { cloudFiles.set(hash, bytes); },
    downloadFile: async hash => cloudFiles.get(hash)!,
    request: async (path, body: any) => {
      if (path === "/sync/push") {
        for (const { entity } of body.changes) { if (entity.data.hash) assert(cloudFiles.has(entity.data.hash)); entities.set(entity.id, { ...entity, revision: 1 }); }
        return { acknowledged: body.changes.map((item: any) => ({ operationId: item.operationId, revision: 1 })), conflicts: [] };
      }
      return { entities: [...entities.values()], cursor: "1", hasMore: false };
    },
  };
  const studio = { close: async () => {} } as unknown as LocalStudio;
  const a = new WorkspaceRuntime("alice", new WorkspaceStore(":memory:"), studio, cloud, () => {}, new WorkspaceFiles(join(dir, "a")));
  const b = new WorkspaceRuntime("alice", new WorkspaceStore(":memory:"), studio, cloud, () => {}, new WorkspaceFiles(join(dir, "b")));
  try {
    const chat = a.createConversation(); const bytes = Buffer.from("print('hello')");
    const id = a.attachFile(chat, "Main.luau", bytes); await a.sync(); await b.sync();
    assert.deepEqual((await b.file(id)).bytes, bytes);
    assert.throws(() => a.attachFile(chat, "../secret", bytes));
    assert.throws(() => new WorkspaceFiles(join(dir, "c")).put(bytes, "0".repeat(64)), /integrity/);
  } finally { await a.close(); await b.close(); rmSync(dir, { recursive: true, force: true }); }
});
test("editor writes require a read hash and destructive controls wait for local approval", async () => {
  const { runtime, executed } = setup({ request: async () => ({}) });
  try {
    await assert.rejects(runtime.studioAction({ command: 'write_script', payload: { path: 'game/Script', source: 'x' }, studioId: 'studio', operationId: 'write' }), /Read the current/);
    const operation = runtime.studioAction({ command: 'undo_last_batch', payload: { confirmed: true }, studioId: 'studio', operationId: 'undo' });
    await waitFor(() => !!runtime.snapshot().approval);
    assert.equal(executed.length, 0);
    runtime.approveTool('undo', false);
    await assert.rejects(operation, /declined/);
    assert.equal(executed.length, 0);
    assert.equal(runtime.activeRunId, null);
  } finally { await runtime.close(); }
});

test("local project ownership and plan revisions cannot inherit execution approval", async () => {
  const { runtime, store, conversationId } = setup({ request: async () => ({}) });
  try {
    assert.throws(() => runtime.createConversation('missing'), /Project not found/);
    const project = runtime.saveEntity({ kind: 'project', data: { title: 'Game' } });
    runtime.createConversation(project.id);
    assert.throws(() => runtime.saveEntity({ kind: 'project', id: project.id, data: {}, deleted: true }), /conversations first/);
    store.save('plan', 'plan', { conversationId, content: 'Original', version: 1, approvedAt: 1, approvedBy: 'alice' });
    runtime.editPlan('plan', 'Revised');
    assert.equal(store.get('plan')?.data.approvedAt, null);
    assert.equal(store.get('plan')?.data.version, 2);
    assert.equal(store.list('plan_version')[0]?.data.content, 'Original');
    await assert.rejects(runtime.request({ path: 'https://untrusted.invalid/api/models' }), /Invalid service path/);
    await assert.rejects(runtime.request({ path: '/api/studio/commands' }), /not been adapted/);
    await assert.rejects(runtime.request({ path: '/api/models', method: 'POST' }), /Unsupported/);
  } finally { await runtime.close(); }
});

test('editor source is bound to the place it was read from, including the same window', async () => {
  const { runtime, executed } = setup({ request: async () => ({}) });
  try {
    const result = await runtime.studioAction({ command: 'read_script', payload: { path: 'game/Script' }, studioId: 'studio', operationId: 'read' });
    assert.equal(result.desktopPlaceSignature, 'project-a');
    const input = { command: 'write_script', payload: { path: 'game/Script', source: 'x', expectedSourceHash: 'hash' }, studioId: 'studio', operationId: 'write' };
    await assert.rejects(runtime.studioAction(input), /Reload this script/);
    await assert.rejects(runtime.studioAction({ ...input, expectedPlaceSignature: 'different-project' }), /different project/);
    assert.equal(executed.length, 1);
    await runtime.studioAction({ ...input, expectedPlaceSignature: 'project-a' });
    assert.equal(executed.length, 2);
  } finally { await runtime.close(); }
});

test('conflict resolution retains evidence and requires fresh approval for a recovered plan', async () => {
  const { runtime, store, conversationId } = setup({ request: async () => ({}) });
  try {
    store.save('plan', 'original', { conversationId, content: 'Remote plan', version: 2, approvedAt: 10 });
    store.save('plan', 'recovered', { conversationId, content: 'Local plan', version: 1, approvedAt: 8, conflictOf: 'original' });
    assert.equal(runtime.list({ kind: 'plan', conflictsOnly: true }).entities.length, 1);
    runtime.resolveConflict('recovered', 'use_copy');
    assert.equal(runtime.getEntity('original')?.data.content, 'Local plan');
    assert.equal(runtime.getEntity('original')?.data.approvedAt, null);
    assert.equal(runtime.getEntity('original')?.data.version, 3);
    assert.equal(runtime.getEntity('recovered')?.deleted, true);
    assert.equal(runtime.list({ kind: 'plan', conflictsOnly: true }).entities.length, 0);
    assert.throws(() => runtime.resolveConflict('recovered', 'use_copy'), /no longer available/);
  } finally { await runtime.close(); }
});
