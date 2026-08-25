const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

for (const target of ["src/ui/BridgePanel.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${target} presents MCP as an optional enhanced connection`, () => {
    const source = read(target);
    assert.match(source, /Enhanced connection/);
    assert.match(source, /Studio plugin remains fully available/);
    assert.match(source, /continue through the Studio plugin/);
    assert.match(source, /enhanced connection is ready/i);
    assert.doesNotMatch(source, /Install MCP to continue|Nexus requires MCP/);
  });
}
