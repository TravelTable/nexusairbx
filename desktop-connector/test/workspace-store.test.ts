import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceStore } from "../src/workspace-store.js";

test("local writes survive restart and interrupted runs cannot resume silently", () => {
  const dir = mkdtempSync(join(tmpdir(), "nexus-workspace-"));
  try {
    const path = join(dir, "test.sqlite"); let store = new WorkspaceStore(path);
    store.save("conversation", "chat", { title: "My work" });
    store.setMeta("deviceId", "local");
    store.save("run", "run", { status: "running", deviceId: "local", conversationId: "chat" });
    store.putCommand("command", "hash", "started", null); store.close();
    store = new WorkspaceStore(path);
    assert.equal(store.get("chat")?.data.title, "My work");
    assert.equal(store.get("run")?.data.status, "interrupted");
    assert.equal(store.getCommand("command")?.state, "started");
    assert.equal(store.pending().length, 2); store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("schema upgrades preserve a backup and startup does not interrupt another device's run", () => {
  const dir = mkdtempSync(join(tmpdir(), "nexus-upgrade-"));
  try {
    const path = join(dir, "history.sqlite"); let store = new WorkspaceStore(path);
    store.setMeta("deviceId", "this-device"); store.save("run", "remote", { status: "running", deviceId: "other-device" });
    store.db.exec("PRAGMA user_version=1"); store.close();
    store = new WorkspaceStore(path);
    assert.equal(store.get("remote")?.data.status, "running");
    assert(readdirSync(dir).some(name => name.endsWith(".backup")));
    store.db.exec("PRAGMA user_version=99"); store.close();
    assert.throws(() => new WorkspaceStore(path), /newer NexusRBX/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("a sync acknowledgement cannot discard edits made while uploading", () => {
  const store = new WorkspaceStore(":memory:");
  try {
    store.save("message", "m", { content: "before" });
    const first = store.pending()[0]!;
    store.markSent([first]);
    store.save("message", "m", { content: "after" });
    store.acknowledge({ acknowledged: [{ operationId: first.operationId, revision: 1 }], conflicts: [] });
    assert.equal(store.get("m")?.data.content, "after"); assert.equal(store.pending().length, 1);
    assert.equal(store.get("m")?.revision, 1);
    assert.equal(store.pending()[0]?.baseRevision, 1);
    assert.equal(store.list("message").length, 1);
  } finally { store.close(); }
});
test("a lost upload reply retries the original operation before a newer edit", () => {
  const store = new WorkspaceStore(":memory:");
  try {
    store.save("message", "m", { content: "first" });
    const first = store.pending()[0]!; store.markSent([first]);
    store.save("message", "m", { content: "second" });
    assert.deepEqual(store.pending(), [first]);
    store.acknowledge({ acknowledged: [{ operationId: first.operationId, revision: 1 }], conflicts: [] });
    assert.equal(store.pending()[0]?.entity.data.content, "second");
    assert.equal(store.pending()[0]?.baseRevision, 1);
  } finally { store.close(); }
});
test("conflicting revisions retain both copies and don't overwrite pending local work", () => {
  const store = new WorkspaceStore(":memory:");
  try {
    store.save("message", "m", { content: "local" });
    const change = store.pending()[0]!;
    const remote = { ...change.entity, revision: 1, data: { content: "remote" } };
    store.applyRemote([remote], "7"); assert.equal(store.get("m")?.data.content, "local");
    store.acknowledge({ acknowledged: [], conflicts: [{ operationId: change.operationId, entity: remote }] });
    assert.equal(store.get("m")?.data.content, "remote");
    const copy = store.list("message").find(item => item.id !== "m")!;
    assert.equal(copy.data.content, "local"); assert.equal(copy.data.conflictOf, "m");
    assert.equal(store.pending().length, 1);
  } finally { store.close(); }
});
test("a failed transaction leaves neither an entity nor an outbox operation", () => {
  const store = new WorkspaceStore(":memory:");
  try {
    store.db.exec("CREATE TRIGGER reject_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT,'disk full'); END");
    assert.throws(() => store.save("message", "m", { content: "test" }));
    assert.equal(store.get("m"), null); assert.equal(store.pending().length, 0);
  } finally { store.close(); }
});
test("history pages stay scoped and stable across equal timestamps and new inserts", () => {
  const store = new WorkspaceStore(":memory:");
  try {
    for (const id of ['a','b','c','d','e']) store.save('message', id, { conversationId: 'one', content: id, createdAt: 10 });
    store.save('message', 'other', { conversationId: 'two', createdAt: 10 });
    const first = store.page({ kind: 'message', conversationId: 'one', limit: 2 });
    assert.deepEqual(first.entities.map(item => item.id), ['e', 'd']);
    store.save('message', 'new', { conversationId: 'one', createdAt: 11 });
    const second = store.page({ kind: 'message', conversationId: 'one', limit: 2, cursor: first.nextCursor! });
    const third = store.page({ kind: 'message', conversationId: 'one', limit: 2, cursor: second.nextCursor! });
    assert.deepEqual([...second.entities, ...third.entities].map(item => item.id), ['c','b','a']);
    assert.equal(third.nextCursor, null);
    assert.throws(() => store.page({ kind: 'message', limit: 201 }));
    assert.throws(() => store.page({ kind: 'message', cursor: 'bad' }));
  } finally { store.close(); }
});
