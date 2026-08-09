const os = require("os");
const path = require("path");

const PLUGINS_DIR_OVERRIDE = "NEXUSRBX_STUDIO_PLUGINS_DIR";

function getEnvironmentValue(env, name) {
  const match = Object.entries(env || {}).find(
    ([candidate]) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return match ? String(match[1] || "").trim() : "";
}

function assertSafePluginsDirectory(pluginsDir, platform = process.platform) {
  const pathApi = platform === "win32" ? path.win32 : path;
  const normalized = pathApi.normalize(String(pluginsDir || "").trim());
  if (!pathApi.isAbsolute(normalized)) {
    throw new Error(`${PLUGINS_DIR_OVERRIDE} must be an absolute path`);
  }

  const pluginsName = pathApi.basename(normalized).toLowerCase();
  const robloxName = pathApi.basename(pathApi.dirname(normalized)).toLowerCase();
  if (pluginsName !== "plugins" || robloxName !== "roblox") {
    throw new Error(
      `${PLUGINS_DIR_OVERRIDE} must point to a Roblox/Plugins directory`,
    );
  }
  return normalized;
}

function resolvePluginsDirectory(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const homeDirectory = options.homedir || os.homedir;
  const pathApi = platform === "win32" ? path.win32 : path;
  const override = getEnvironmentValue(env, PLUGINS_DIR_OVERRIDE);

  if (override) {
    return assertSafePluginsDirectory(override, platform);
  }

  if (platform === "win32") {
    const localAppData = getEnvironmentValue(env, "LOCALAPPDATA");
    if (localAppData && path.win32.isAbsolute(localAppData)) {
      return assertSafePluginsDirectory(
        path.win32.join(localAppData, "Roblox", "Plugins"),
        platform,
      );
    }

    const fallbackRoot = path.win32.join(homeDirectory(), "AppData", "Local");
    if (typeof options.onFallback === "function") {
      const reason = localAppData
        ? new Error("LOCALAPPDATA is not an absolute path")
        : new Error("LOCALAPPDATA is unavailable");
      options.onFallback(reason, fallbackRoot);
    }
    return assertSafePluginsDirectory(
      path.win32.join(fallbackRoot, "Roblox", "Plugins"),
      platform,
    );
  }

  return assertSafePluginsDirectory(
    pathApi.join(homeDirectory(), "Documents", "Roblox", "Plugins"),
    platform,
  );
}

module.exports = {
  PLUGINS_DIR_OVERRIDE,
  assertSafePluginsDirectory,
  getEnvironmentValue,
  resolvePluginsDirectory,
};
