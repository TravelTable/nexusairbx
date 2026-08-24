#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { resolvePluginsDirectory } = require("./plugin-install-path.js");
const { CANONICAL_PLUGIN_NAME, quarantineStaleNexusPlugins } = require("./plugin-install-cleanup.js");
const { buildRbxmx } = require("./rbxmx-artifact.js");

const pluginRoot = path.resolve(__dirname, "..");
const bundledPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua");
const buildRbxmxPath = path.join(pluginRoot, "build", "NexusRBXStudioBridge.rbxmx");
const pluginsDir = resolvePluginsDirectory({
  onFallback(error, fallbackPath) {
    console.warn(
      `Could not resolve the Windows local app-data folder (${error.message}); ` +
        `falling back to ${fallbackPath}`,
    );
  },
});
const installedPath = path.join(pluginsDir, CANONICAL_PLUGIN_NAME);
const buildOnly = process.argv.includes("--build-only");
const fromBundle = process.argv.includes("--from-bundle");

if (!fromBundle) {
  require("./bundle-plugin.js");
  require("./verify-plugin-artifact.js");
}

if (!fs.existsSync(bundledPath)) {
  throw new Error(`Missing bundled plugin: ${bundledPath}`);
}

const source = fs.readFileSync(bundledPath, "utf8");
const rbxmx = buildRbxmx(source);

fs.mkdirSync(path.dirname(buildRbxmxPath), { recursive: true });
fs.writeFileSync(buildRbxmxPath, rbxmx, "utf8");

if (!buildOnly) {
  fs.mkdirSync(pluginsDir, { recursive: true });
  const quarantined = quarantineStaleNexusPlugins(pluginsDir);
  fs.writeFileSync(installedPath, rbxmx, "utf8");

  for (const moved of quarantined) {
    console.log(`Quarantined duplicate plugin: ${moved.sourcePath} -> ${moved.destinationPath}`);
  }

  console.log(`Installed local plugin: ${installedPath}`);
}

console.log(`Build artifact: ${buildRbxmxPath}`);
console.log(`Source bytes: ${source.length}`);
