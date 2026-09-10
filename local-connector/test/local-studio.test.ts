import assert from "node:assert/strict";
import test from "node:test";
import { LocalStudio } from "../src/local-studio.js";
import { sha256 } from "../src/command-executor.js";
import type { DiscoveredTool, JsonObject, McpClientLike } from "../src/types.js";

class FakeMcp implements McpClientLike {
  calls = 0; reads = 0; target = "studio-a";
  async connect() { return {}; } async disconnect() {}
  onToolsChanged() {} onDisconnect() {}
  async listTools(): Promise<DiscoveredTool[]> { return [
    { name: 'list_roblox_studios', inputSchema: { type: 'object', properties: {} } },
    { name: 'set_active_studio', inputSchema: { type: 'object', properties: { studio_id: { type: 'string' } }, required: ['studio_id'] } },
    { name: 'get_studio_state', inputSchema: { type: 'object', properties: {} } },
    { name: 'script_read', inputSchema: { type: 'object', properties: { path: { type: 'string' }, datamodel_type: { type: 'string', enum: ['Edit'] } }, required: ['path', 'datamodel_type'] } },
  ]; }
  async callTool(name: string, _args: JsonObject): Promise<any> {
    this.calls++;
    const identity = { studio_id: this.target, place_id: '101', universe_id: '201', place_name: 'Arena', place_signature: 'sig-a' };
    if (name === 'list_roblox_studios') return { structuredContent: { studios: [identity] } };
    if (name === 'get_studio_state') return { structuredContent: identity };
    if (name === 'script_read') { this.reads++; return { structuredContent: { source: 'print(1)', path: 'game.ServerScriptService.Main' } }; }
    return { structuredContent: { ok: true } };
  }
}
test('direct MCP execution records a terminal receipt and duplicate IDs never re-execute', async () => {
  const records = new Map<string, any>(); const mcp = new FakeMcp();
  const studio = new LocalStudio(mcp, { getCommand: id => records.get(id) || null, putCommand: (id, hash, state, result) => { records.set(id, { hash, state, result }); } });
  const payload = { path: 'game.ServerScriptService.Main' };
  const result = await studio.execute('read_script', payload, { id: 'cmd', studioId: 'studio-a' });
  assert.equal(result.ok, true); assert.equal(mcp.reads, 1);
  assert.deepEqual(await studio.execute('read_script', payload, { id: 'cmd', studioId: 'studio-a' }), result);
  assert.equal(mcp.reads, 1);
  await assert.rejects(() => studio.execute('read_script', { path: 'other' }, { id: 'cmd', studioId: 'studio-a' }), /different input/);
  const calls = mcp.calls; await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(mcp.calls, calls);
  await studio.close();
});
test('local script edits snapshot first, finalize undo hashes and never repeat a confirmed write', async () => {
  class EditableMcp extends FakeMcp {
    source = 'print(1)'; order: string[] = [];
    async listTools(): Promise<DiscoveredTool[]> { return [...await super.listTools(),
      { name: 'execute_luau', inputSchema: { type: 'object', properties: { code: { type: 'string' }, datamodel_type: { type: 'string', enum: ['Edit'] } }, required: ['code', 'datamodel_type'] } },
      { name: 'multi_edit', inputSchema: { type: 'object', properties: { path: { type: 'string' }, source: { type: 'string' }, datamodel_type: { type: 'string', enum: ['Edit'] } }, required: ['path', 'source', 'datamodel_type'] } },
    ]; }
    async callTool(name: string, args: JsonObject): Promise<any> {
      if (name === 'execute_luau') {
        const match = /__nexus_run\(("(?:\\.|[^"\\])*")\)\s*$/.exec(String(args.code));
        if (!match) return { content: [{ type: 'text', text: JSON.stringify({ placeId: '101', universeId: '201', placeName: 'Arena', placeSignature: 'sig-a' }) }] };
        const input = JSON.parse(JSON.parse(match[1]!)); this.order.push(input.operation);
        return { content: [{ type: 'text', text: JSON.stringify({ version: 1, nonce: input.nonce, ok: true, data: { snapshots: [{ path: 'game/ServerScriptService/Main', snapshotId: 'backup', preHash: 'before', postHash: input.operation === 'finalize_snapshots' ? 'after' : 'before' }], snapshotCount: 1 } }) }] };
      }
      if (name === 'script_read') return { structuredContent: { source: this.source } };
      if (name === 'multi_edit') { this.order.push('write'); this.source = String(args.source); return { structuredContent: { ok: true } }; }
      return super.callTool(name, args);
    }
  }
  const mcp = new EditableMcp(); const records = new Map<string, any>();
  const studio = new LocalStudio(mcp, { getCommand: id => records.get(id) || null, putCommand: (id, hash, state, result) => records.set(id, { hash, state, result }) });
  try {
    const payload = { path: 'game/ServerScriptService/Main', source: 'print(2)', expectedSourceHash: sha256('print(1)') };
    const result = await studio.execute('write_script', payload, { id: 'write', studioId: 'studio-a' });
    assert.equal(result.ok, true); assert.equal(result.verified, true);
    assert.deepEqual(mcp.order, ['create_snapshot', 'write', 'finalize_snapshots']);
    assert.equal((result.snapshots as any[])[0].postHash, 'after');
    await studio.execute('write_script', payload, { id: 'write', studioId: 'studio-a' });
    assert.equal(mcp.order.length, 3);
    await assert.rejects(() => studio.execute('read_script', { path: 'Main' }, { id: 'different-place', studioId: 'studio-a', expectedTarget: { placeId: '999', universeId: '201', placeName: 'Arena' } }), /different project/);
  } finally { await studio.close(); }
});
test('an interrupted receipt cannot execute again and an unavailable window cannot be substituted', async () => {
  const mcp = new FakeMcp(); const records = new Map<string, any>();
  const studio = new LocalStudio(mcp, { getCommand: id => records.get(id) || null, putCommand: (id, hash, state, result) => { records.set(id, { hash, state, result }); } });
  await assert.rejects(() => studio.execute('read_script', { path: 'Main' }, { id: 'x', studioId: 'studio-b' }), /Select an available/);
  assert.equal(mcp.reads, 0);
  await studio.execute('read_script', { path: 'Main' }, { id: 'x', studioId: 'studio-a' });
  records.set('x', { ...records.get('x'), state: 'started', result: null });
  await assert.rejects(() => studio.execute('read_script', { path: 'Main' }, { id: 'x', studioId: 'studio-a' }), /will not be replayed/);
  await studio.close();
});
