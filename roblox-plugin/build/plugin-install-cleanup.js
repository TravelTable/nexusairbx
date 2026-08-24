const fs = require("fs");
const path = require("path");

const CANONICAL_PLUGIN_NAME = "NexusRBXStudioBridge.rbxmx";
const LEGACY_PLUGIN_NAMES = new Set([
  "plugin.rbxmx",
  "nexusrbxstudiobridge.plugin.rbxmx",
]);

function staleNexusPluginPaths(pluginsDir) {
  if (!fs.existsSync(pluginsDir)) return [];
  return fs.readdirSync(pluginsDir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isFile()) return [];
    const lower = entry.name.toLowerCase();
    const isLegacyName = LEGACY_PLUGIN_NAMES.has(lower);
    const isBridgeVariant = /^nexusrbxstudiobridge(?:[._-].*)?\.rbxmx$/i.test(entry.name)
      && lower !== CANONICAL_PLUGIN_NAME.toLowerCase();
    return isLegacyName || isBridgeVariant ? [path.join(pluginsDir, entry.name)] : [];
  });
}

function quarantineStaleNexusPlugins(pluginsDir, timestamp = Date.now()) {
  const stalePaths = staleNexusPluginPaths(pluginsDir);
  if (!stalePaths.length) return [];
  const quarantineDir = path.join(path.dirname(pluginsDir), "NexusRBXPluginBackups", String(timestamp));
  fs.mkdirSync(quarantineDir, { recursive: true });
  return stalePaths.map((sourcePath) => {
    const destinationPath = path.join(quarantineDir, path.basename(sourcePath));
    fs.renameSync(sourcePath, destinationPath);
    return { sourcePath, destinationPath };
  });
}

module.exports = {
  CANONICAL_PLUGIN_NAME,
  quarantineStaleNexusPlugins,
  staleNexusPluginPaths,
};
