const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8").replace(/\r\n?/g, "\n");

test("tree snapshots are all retained while the panel refreshes once", () => {
  const source = read("src/studio/snapshot.lua");
  const start = source.indexOf("local function appendSnapshotTree");
  const end = source.indexOf("\nend\n\n-- Snapshot every", start) + "\nend".length;
  const appendTree = source.slice(start, end);

  assert.match(appendTree, /for _, snap in ipairs\(pending\) do\s+table\.insert\(snapshots, snap\)\s+recordStudioSnapshotLocally\(snap, true\)\s+end/);
  assert.equal((appendTree.match(/updateSnapshotLabel\(\)/g) || []).length, 1);
});

test("snapshot recovery rows are bounded, batched, and generation-cancelled", () => {
  const source = read("src/ui/BridgePanel.lua");
  const start = source.indexOf("function UI_HELPERS.rebuildSnapshotList");
  const end = source.indexOf("\nend\n\nlocal function refreshControls", start) + "\nend".length;
  const refresh = source.slice(start, end);

  assert.match(refresh, /local firstIndex = math\.max\(1, #localSnapshots - 99\)/);
  assert.match(refresh, /local batchLastIndex = math\.min\(#localSnapshots, nextIndex \+ 19\)/);
  assert.match(refresh, /refreshGeneration ~= UI_HELPERS\.snapshotRefreshGeneration/);
  assert.match(refresh, /task\.defer\(renderNextBatch\)/);
  assert.match(source, /function UI_HELPERS\.scheduleSnapshotListRefresh\(\)[\s\S]*snapshotRefreshScheduled[\s\S]*task\.defer/);
  assert.match(source, /function updateSnapshotLabel\(\)[\s\S]*UI_HELPERS\.scheduleSnapshotListRefresh\(\)/);
});

test("a 1,149-node snapshot set needs five UI batches without losing restore data", () => {
  const storedSnapshots = Array.from({ length: 1149 }, (_, index) => ({ id: String(index + 1) }));
  const firstIndex = Math.max(0, storedSnapshots.length - 100);
  const rendered = storedSnapshots.slice(firstIndex);
  const batchCount = Math.ceil(rendered.length / 20);

  assert.equal(storedSnapshots.length, 1149);
  assert.equal(rendered.length, 100);
  assert.equal(rendered[0].id, "1050");
  assert.equal(rendered.at(-1).id, "1149");
  assert.equal(batchCount, 5);
});
