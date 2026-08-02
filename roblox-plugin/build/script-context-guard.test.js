const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing section start: ${startMarker}`);
  assert.ok(end > start, `missing section end: ${endMarker}`);
  return source.slice(start, end);
}

function assertBefore(source, earlier, later, message) {
  const earlierIndex = source.indexOf(earlier);
  const laterIndex = source.indexOf(later);
  assert.ok(earlierIndex >= 0, `missing earlier marker: ${earlier}`);
  assert.ok(laterIndex >= 0, `missing later marker: ${later}`);
  assert.ok(earlierIndex < laterIndex, message);
}

test("the context guard is shared by every bundled plugin section", () => {
  const bundler = read("build/bundle-plugin.js");
  const artifact = read("NexusRBXStudioBridge.plugin.lua");

  assert.match(bundler, /"ScriptContextGuard"/);
  assert.match(artifact, /local [^\n]*ScriptContextGuard[^\n]*\ndo\n/);
  assert.match(artifact, /ScriptContextGuard = \{\}/);
  assert.doesNotMatch(artifact, /local ScriptContextGuard = \{\}/);
});

test("the plugin guard detects real GetService calls while blanking ordinary strings", () => {
  const readTools = read("src/commands/readTools.lua");

  assert.match(readTools, /isGetServiceArgument = prefix:match\("GetService%s\*%\(%s\*\$"\) ~= nil/);
  assert.match(readTools, /isGetServiceArgument and segment or blankSegment\(segment\)/);
  assert.match(readTools, /function ScriptContextGuard\.resolveScriptClassName\(value\)/);
  assert.match(readTools, /\{ name = "Players\.LocalPlayer", token = "LocalPlayer" \}/);
  assert.match(readTools, /\{ name = "DataStoreService", token = "DataStoreService" \}/);
  for (const code of [
    "SCRIPT_CLASS_REQUIRED",
    "CLIENT_API_ON_SERVER",
    "SERVER_API_ON_CLIENT",
    "SCRIPT_LOCATION_MISMATCH",
    "MIXED_RUNTIME_CONTEXT",
  ]) {
    assert.match(readTools, new RegExp(`"${code}"`));
  }
});

test("create, write, patch, and replace validate before snapshots or source changes", () => {
  const readTools = read("src/commands/readTools.lua");
  const writeTools = read("src/commands/writeTools.lua");
  const writeScript = section(readTools, "local function writeScript(payload)", "local function createInstanceTool");
  const patchScript = section(writeTools, "local function patchScript(payload)", "local function renameInstanceTool");
  const replaceInFiles = section(writeTools, "local function replaceInFiles(payload)", "local function createSnapshotTool");

  assertBefore(
    writeScript,
    "local contextValidation = ScriptContextGuard.validate",
    "appendSnapshotTree(existing, snapshots)",
    "write_script must reject context mistakes before snapshotting or mutation",
  );
  assertBefore(
    writeScript,
    "local contextValidation = ScriptContextGuard.validate",
    "Instance.new(className)",
    "create_script must reject context mistakes before creating an instance",
  );
  assertBefore(
    patchScript,
    "local contextValidation = ScriptContextGuard.validate",
    "snapshotInstance(fullPath(inst))",
    "patch_script must validate the complete candidate before snapshotting",
  );
  assertBefore(
    patchScript,
    "local contextValidation = ScriptContextGuard.validate",
    "writeScriptSource(inst, nextSource)",
    "patch_script must validate the complete candidate before writing source",
  );
  assertBefore(
    replaceInFiles,
    "local contextValidation = ScriptContextGuard.validate",
    "table.insert(snapshots, snapshotInstance(candidate.path))",
    "replace_in_files must validate every candidate before any snapshot or write",
  );
});

test("existing class conversion requires consent, inspection evidence, and a pre-mutation snapshot", () => {
  const readTools = read("src/commands/readTools.lua");
  const writeTools = read("src/commands/writeTools.lua");
  const writeScript = section(readTools, "local function writeScript(payload)", "local function createInstanceTool");
  const managedUpsert = section(
    writeTools,
    "local function applyManagedUpsert(spec, resolved, indexes, snapshots, seenPaths)",
    "local function buildManagedFileRecord",
  );

  assert.match(writeScript, /payload\.allowClassChange == true/);
  assert.match(writeScript, /payload\.inspectedClassName/);
  assert.match(writeScript, /payload\.expectedSourceHash/);
  assertBefore(
    writeScript,
    "verifyExpectedScriptHash(existing, payload.expectedSourceHash",
    "appendSnapshotTree(existing, snapshots)",
    "write_script must verify the inspected source before snapshotting",
  );
  assertBefore(
    writeScript,
    "appendSnapshotTree(existing, snapshots)",
    "previous:Destroy()",
    "write_script must snapshot the inspected script before replacing its class",
  );

  assert.match(managedUpsert, /canChangeManagedClass\(spec, indexes, inst, expectedClass\)/);
  assertBefore(
    managedUpsert,
    "checkStudioPreconditions(inst, spec, manifestEntry, indexes)",
    "snapshotOnce(inst, snapshots, seenPaths)",
    "managed apply must verify inspected source state before snapshotting",
  );
  assertBefore(
    managedUpsert,
    "snapshotOnce(inst, snapshots, seenPaths)",
    "previous:Destroy()",
    "managed apply must snapshot before replacing a script class",
  );
});

test("legacy and managed artifact application validate all scripts before mutation", () => {
  const writeTools = read("src/commands/writeTools.lua");
  const legacyApply = section(writeTools, "local function applyArtifactLegacy(payload)", "local function leafNameFromPath");
  const managedApply = writeTools.slice(writeTools.indexOf("local function applyArtifact(payload)"));

  assertBefore(
    legacyApply,
    "local contextValidation = ScriptContextGuard.validateScriptDescriptors",
    "ensureCleanFolder(serviceRoot, projectName, snapshots)",
    "legacy artifacts must validate before cleaning or creating folders",
  );
  assertBefore(
    managedApply,
    "local contextValidation = ScriptContextGuard.validateManagedScriptContexts",
    "snapshotOnce(resolved.instance, snapshots, seenPaths)",
    "managed artifacts must validate before their first snapshot or mutation",
  );
});

test("plugin smoke checks report script-context findings", () => {
  const writeTools = read("src/commands/writeTools.lua");
  const smokeCheck = section(writeTools, "local function runSmokeCheck(payload)", "local function parseLuau(payload)");

  assert.match(smokeCheck, /ScriptContextGuard\.validate\(\{/);
  assert.match(smokeCheck, /ruleCode = finding\.ruleCode/);
  assert.match(smokeCheck, /severity = finding\.severity/);
});

test("whole-project validation reports existing script-context findings", () => {
  const validation = read("src/commands/validation.lua");
  const projectValidation = section(validation, "local function runProjectValidation(payload)", "local function collectDiagnostics");

  assert.match(projectValidation, /ScriptContextGuard\.validate\(\{/);
  assert.match(projectValidation, /ruleCode = finding\.ruleCode/);
  assert.match(projectValidation, /requiredContext = contextValidation\.requiredContext/);
  assert.match(projectValidation, /"SCRIPT_SOURCE_UNREADABLE"/);
});
