#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { resolvePluginsDirectory } = require("./plugin-install-path.js");
const { CANONICAL_PLUGIN_NAME, quarantineStaleNexusPlugins } = require("./plugin-install-cleanup.js");
const { buildRbxmx } = require("./rbxmx-artifact.js");
const { applyPluginBackendOverride } = require("./plugin-backend-override.js");

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
const backendUrlIndex = process.argv.indexOf("--backend-url");
const backendUrl = backendUrlIndex >= 0 ? process.argv[backendUrlIndex + 1] : "";
if (backendUrlIndex >= 0 && !backendUrl) {
  throw new Error("--backend-url requires a URL");
}

if (!fromBundle) {
  require("./bundle-plugin.js");
  require("./verify-plugin-artifact.js");
}

if (!fs.existsSync(bundledPath)) {
  throw new Error(`Missing bundled plugin: ${bundledPath}`);
}

const canonicalSource = fs.readFileSync(bundledPath, "utf8");
const source = applyPluginBackendOverride(canonicalSource, backendUrl);
const rbxmx = buildRbxmx(source);

if (!backendUrl) {
  fs.mkdirSync(path.dirname(buildRbxmxPath), { recursive: true });
  fs.writeFileSync(buildRbxmxPath, rbxmx, "utf8");
}

if (!buildOnly) {
  fs.mkdirSync(pluginsDir, { recursive: true });
  const quarantined = quarantineStaleNexusPlugins(pluginsDir);
  fs.writeFileSync(installedPath, rbxmx, "utf8");

  for (const moved of quarantined) {
    console.log(`Quarantined duplicate plugin: ${moved.sourcePath} -> ${moved.destinationPath}`);
  }

  console.log(`Installed local plugin: ${installedPath}`);
  if (backendUrl) console.log(`Local plugin API: ${backendUrl}`);
}

if (!backendUrl) console.log(`Build artifact: ${buildRbxmxPath}`);
console.log(`Source bytes: ${source.length}`);
