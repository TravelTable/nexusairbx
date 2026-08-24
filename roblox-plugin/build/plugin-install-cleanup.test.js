const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  CANONICAL_PLUGIN_NAME,
  quarantineStaleNexusPlugins,
  staleNexusPluginPaths,
} = require("./plugin-install-cleanup.js");

test("duplicate NexusRBX plugin builds are quarantined while the canonical and unrelated plugins remain", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nexusrbx-plugin-cleanup-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const pluginsDir = path.join(root, "Roblox", "Plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });
  const names = [
    CANONICAL_PLUGIN_NAME,
    "NexusRBXStudioBridge.pre-native-export-fix.rbxmx",
    "NexusRBXStudioBridge.plugin.rbxmx",
    "Plugin.rbxmx",
    "Unrelated.rbxmx",
  ];
  names.forEach((name) => fs.writeFileSync(path.join(pluginsDir, name), name));

  assert.deepEqual(
    staleNexusPluginPaths(pluginsDir).map((value) => path.basename(value)).sort(),
    ["NexusRBXStudioBridge.plugin.rbxmx", "NexusRBXStudioBridge.pre-native-export-fix.rbxmx", "Plugin.rbxmx"],
  );

  const moved = quarantineStaleNexusPlugins(pluginsDir, 12345);
  assert.equal(moved.length, 3);
  assert.equal(fs.existsSync(path.join(pluginsDir, CANONICAL_PLUGIN_NAME)), true);
  assert.equal(fs.existsSync(path.join(pluginsDir, "Unrelated.rbxmx")), true);
  moved.forEach(({ sourcePath, destinationPath }) => {
    assert.equal(fs.existsSync(sourcePath), false);
    assert.equal(fs.existsSync(destinationPath), true);
    assert.match(destinationPath, /NexusRBXPluginBackups[\\/]12345/);
  });
});
