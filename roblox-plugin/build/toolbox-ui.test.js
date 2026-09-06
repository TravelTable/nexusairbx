const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("the installable plugin exposes native tools and no conversation UI", () => {
  const source = read("NexusRBXStudioBridge.plugin.lua");
  assert.match(source, /\{ "Tools", "Activity", "Recovery", "Settings" \}/);
  assert.match(source, /tabBar.Visible = paired/);
  for (const name of ["Inspect selection", "Fix selection", "Improve selection", "Create script", "Check playtest output"]) {
    assert.ok(source.includes(name), name);
  }
  assert.doesNotMatch(source, /createNexusComposer|createNexusChatMessage|NewChat|ChatMessages/);
  assert.match(source, /settings\(\).Studio.Theme:GetColor/);
  assert.match(source, /ScriptContextGuard.validate\(\{ path = path, className = form.className/);
  assert.match(source, /No output captured yet/);
});

test("Studio result capture is attached after execution and verification", () => {
  const registry = read("src/commands/registry.lua");
  assert.match(registry, /pcall\(recordToolboxReceipt, command, resultOrError\)/);
  const bundle = read("NexusRBXStudioBridge.plugin.lua");
  // These helpers must be lexical bindings, not unresolved globals in UI closures.
  for (const module of ["readTools", "writeTools"]) {
    assert.ok(bundle.indexOf(`-- BEGIN src/commands/${module}.lua`) < bundle.indexOf("-- BEGIN src/ui/BridgePanel.lua"));
  }
  assert.ok(bundle.indexOf("-- BEGIN src/studio/targetIntegrity.lua") < bundle.indexOf("-- BEGIN src/ui/BridgePanel.lua"));
});

const luau = process.env.LUAU_BIN || "luau";
const runtimeAvailable = !spawnSync(luau, ["--help"], { encoding: "utf8", windowsHide: true }).error;
test("toolbox task lifecycle executes safely through retries, resumption, cancellation, and receipts", {
  skip: runtimeAvailable ? false : "Set LUAU_BIN to the Luau CLI to run lifecycle scenarios",
}, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nexusrbx-toolbox-tests-"));
  try {
    const file = path.join(temp, "controller.luau");
    fs.writeFileSync(file, read("src/ui/TaskController.lua") + "\n" + read("build/toolbox-lifecycle.luau"));
    const run = spawnSync(luau, [file], { encoding: "utf8", timeout: 15000, windowsHide: true });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /toolbox lifecycle: all scenarios passed/);
  } finally {
    // Exact test-created temporary directory; no user files live here.
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
