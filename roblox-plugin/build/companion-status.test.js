const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

for (const target of ["src/ui/BridgePanel.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${target} presents Studio MCP as an optional advanced connection`, () => {
    const source = read(target);
    assert.match(source, /Advanced local connection/);
    assert.match(source, /Optional Connector diagnostics/);
    assert.match(source, /Studio Plugin (?:works independently|remains fully available)/);
    assert.match(source, /continue through the Studio Plugin/);
    assert.match(source, /advanced local connection is ready/i);
    assert.doesNotMatch(source, /Install MCP to continue|Nexus requires MCP/);
  });

  test(`${target} uses the canonical change-set and recovery vocabulary`, () => {
    const source = read(target);
    assert.match(source, /Restore latest change set/);
    assert.match(source, /No change set to restore/);
    assert.doesNotMatch(source, /Restore Latest Change Set|No Change Set To Restore/);
    assert.doesNotMatch(source, /0\.14\.0-r15-animation|2026-08-27-r15-animation/);
  });
}
