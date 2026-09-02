const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pluginRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");
}

test("create_instance accepts only allowlisted native BasePart properties", () => {
  for (const source of [read("src/studio/path.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    assert.match(source, /local nativeAllow = NATIVE_PROPERTY_ALLOWLIST\[inst\.ClassName\]/);
    assert.match(source, /key == "Position" and inst:IsA\("BasePart"\) and typeof\(value\) == "Vector3"/);
    assert.match(source, /elseif nativeAllow and nativeAllow\[key\] == true then/);
  }
});
