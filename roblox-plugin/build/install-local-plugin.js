#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { resolvePluginsDirectory } = require("./plugin-install-path.js");
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
const installedPath = path.join(pluginsDir, "NexusRBXStudioBridge.rbxmx");
const buildOnly = process.argv.includes("--build-only");
const fromBundle = process.argv.includes("--from-bundle");
const legacyPaths = [
  path.join(pluginsDir, "Plugin.rbxmx"),
  path.join(pluginsDir, "NexusRBXStudioBridge.plugin.rbxmx"),
];

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
  fs.writeFileSync(installedPath, rbxmx, "utf8");

  for (const legacyPath of legacyPaths) {
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
      console.log(`Removed legacy plugin: ${legacyPath}`);
    }
  }

  console.log(`Installed local plugin: ${installedPath}`);
}

console.log(`Build artifact: ${buildRbxmxPath}`);
console.log(`Source bytes: ${source.length}`);
