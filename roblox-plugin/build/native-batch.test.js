"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const luaparse = require("../../backend/node_modules/luaparse");
const root = path.resolve(__dirname, "..");
for (const name of ["src/commands/registry.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${name}: native batches pass stable command identity to child handlers`, () => {
    const source = fs.readFileSync(path.join(root, name), "utf8");
    const start = source.indexOf("local function batchOperations(payload, command)");
    const end = source.indexOf("TOOL_HANDLERS.batch_operations = batchOperations", start);
    assert.ok(start >= 0 && end > start);
    const batch = source.slice(start, end);
    const ast = luaparse.parse(batch);
    assert.deepEqual(ast.body[0].parameters.map(parameter => parameter.name), ["payload", "command"]);
    assert.match(batch, /childCommand\.id = parentCommandId \.\. ":operation:" \.\. tostring\(index\)/);
    assert.match(batch, /handler\(op\.payload or \{\}, childCommand\)/);
    assert.match(batch, /opType == "build_native_model" and parentCommandId == ""/);
    assert.match(batch, /restoreSnapshots\(\{ snapshots = snapshots, force = true \}\)/);
  });
}
for (const name of ["src/commands/nativeModel.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${name}: native creation snapshots missing parents and its root before insertion`, () => {
    const source = fs.readFileSync(path.join(root, name), "utf8");
    const start = Math.max(source.indexOf("local function buildNativeModel(payload, command)"), source.indexOf("buildNativeModel = function(payload, command)"));
    const end = source.indexOf("local function nativeTypedValue", start);
    const build = source.slice(start, end);
    assert.doesNotThrow(() => luaparse.parse(build));
    const parents = build.indexOf("appendMissingPathSnapshots(targetParentPath, snapshots)");
    const rootSnapshot = build.indexOf('table.insert(snapshots, snapshotInstance(fullPath(targetParent) .. "/" .. rootModel.Name))');
    const insertion = build.indexOf("rootModel.Parent = targetParent");
    assert.ok(parents > 0 && rootSnapshot > parents && insertion > rootSnapshot);
    assert.match(build, /receipt\.snapshots = snapshots/);
    assert.match(build, /rootModel:SetAttribute\("NexusCommandId", command and tostring\(command.id/);
  });
}
