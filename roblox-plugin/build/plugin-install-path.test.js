const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  PLUGINS_DIR_OVERRIDE,
  resolvePluginsDirectory,
} = require("./plugin-install-path.js");

test("Windows install uses Roblox Studio's LOCALAPPDATA plugins directory", () => {
  const pluginsDir = resolvePluginsDirectory({
    platform: "win32",
    env: { LOCALAPPDATA: "C:\\Users\\jackt\\AppData\\Local" },
    homedir: () => "C:\\Users\\jackt",
  });

  assert.equal(
    pluginsDir,
    "C:\\Users\\jackt\\AppData\\Local\\Roblox\\Plugins",
  );
});

test("Windows environment lookup is case-insensitive", () => {
  const pluginsDir = resolvePluginsDirectory({
    platform: "win32",
    env: { LocalAppData: "D:\\Windows Data\\Local" },
    homedir: () => "C:\\Users\\ignored",
  });

  assert.equal(pluginsDir, "D:\\Windows Data\\Local\\Roblox\\Plugins");
});

test("explicit plugin-directory override wins without querying Windows", () => {
  const override = "D:\\Studio Data\\Roblox\\Plugins";
  const pluginsDir = resolvePluginsDirectory({
    platform: "win32",
    env: {
      LOCALAPPDATA: "C:\\Users\\jackt\\AppData\\Local",
      [PLUGINS_DIR_OVERRIDE]: override,
    },
  });

  assert.equal(pluginsDir, override);
});

test("override rejects paths outside a Roblox Plugins directory", () => {
  assert.throws(
    () =>
      resolvePluginsDirectory({
        platform: "win32",
        env: { [PLUGINS_DIR_OVERRIDE]: "C:\\Users\\jackt\\Documents" },
      }),
    /must point to a Roblox\/Plugins directory/,
  );
});

test("Windows retains an AppData Local fallback when LOCALAPPDATA is unavailable", () => {
  const failures = [];
  const pluginsDir = resolvePluginsDirectory({
    platform: "win32",
    env: {},
    homedir: () => "C:\\Users\\fallback",
    onFallback(error, fallbackPath) {
      failures.push({ error, fallbackPath });
    },
  });

  assert.equal(
    pluginsDir,
    "C:\\Users\\fallback\\AppData\\Local\\Roblox\\Plugins",
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0].error.message, /LOCALAPPDATA is unavailable/);
  assert.equal(
    failures[0].fallbackPath,
    "C:\\Users\\fallback\\AppData\\Local",
  );
});

test("Windows rejects a non-absolute LOCALAPPDATA value before using fallback", () => {
  const failures = [];
  const pluginsDir = resolvePluginsDirectory({
    platform: "win32",
    env: { LOCALAPPDATA: "AppData\\Local" },
    homedir: () => "C:\\Users\\fallback",
    onFallback(error) {
      failures.push(error.message);
    },
  });

  assert.equal(
    pluginsDir,
    "C:\\Users\\fallback\\AppData\\Local\\Roblox\\Plugins",
  );
  assert.deepEqual(failures, ["LOCALAPPDATA is not an absolute path"]);
});

test("non-Windows installs retain the home Documents behavior", () => {
  const pluginsDir = resolvePluginsDirectory({
    platform: "linux",
    env: {},
    homedir: () => "/home/nexus",
  });

  assert.equal(pluginsDir, path.join("/home/nexus", "Documents", "Roblox", "Plugins"));
});
