const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

for (const target of ["src/ui/BridgePanel.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${target} keeps optional companion failures distinct from the core bridge`, () => {
    const source = read(target);
    assert.match(source, /MCP Companion \(optional\)/);
    assert.match(source, /Core bridge is still live\. Enable the MCP server in Studio Assistant settings/);
    assert.match(source, /Core bridge is still live\. Update Studio/);
    assert.match(source, /Direct Studio inspection tools are available\./);
    assert.doesNotMatch(source, /connector_offline = "Connector offline"/);
  });
}
