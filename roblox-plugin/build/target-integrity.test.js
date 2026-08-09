const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

test("v2 mutations require the complete immutable target envelope", () => {
  const targetIntegrity = read("src/studio/targetIntegrity.lua");
  for (const field of [
    "targetId",
    "sessionId",
    "expectedPlaceId",
    "expectedUniverseId",
    "expectedPlaceSignature",
    "targetGeneration",
    "operationId",
    "idempotencyKey",
  ]) {
    assert.match(targetIntegrity, new RegExp(`"${field}"`));
  }
  assert.match(targetIntegrity, /tonumber\(command\.lifecycleVersion\) == 2/);
  assert.match(targetIntegrity, /"INVALID_TARGET_ENVELOPE"/);
  assert.match(targetIntegrity, /retryable = false/);
});

test("target identity is checked before approval and at the final mutation boundary", () => {
  const registry = read("src/commands/registry.lua");
  const approvalCheck = registry.indexOf('validateCommandStudioTarget(command, "before_approval"');
  const mutationCheck = registry.indexOf('validateCommandStudioTarget(command, "before_mutation"');
  const handlerCall = registry.indexOf("local result = handler(payload, command)");
  assert.ok(approvalCheck >= 0, "missing approval-time target check");
  assert.ok(mutationCheck >= 0, "missing final mutation-boundary target check");
  assert.ok(handlerCall > mutationCheck, "write handler must run after the final target check");
});

test("move and duplicate refuse source-descendant destinations before snapshot mutation", () => {
  const writeTools = read("src/commands/writeTools.lua");
  const pathTools = read("src/studio/path.lua");
  const guards = writeTools.match(/parent == inst or parent:IsDescendantOf\(inst\)/g) || [];
  assert.equal(guards.length >= 2, true, "move and duplicate must both guard source descendants");
  assert.match(pathTools, /raw = raw:gsub\("\^game\[\/.\]", ""\)/);
  assert.match(pathTools, /raw = raw:gsub\("\^Services\[\/.\]", ""\)/);
  assert.match(writeTools, /payload\.newPath and canonicalizePath\(payload\.newPath\) or ""/);
  assert.match(writeTools, /local targetPath = canonicalizePath\(payload\.newPath\)/);
  assert.match(writeTools, /parentPath = canonicalizePath\(payload\.newParentPath\)/);
  assert.match(writeTools, /instance cannot be moved into its own descendant tree/);
  assert.match(writeTools, /instance cannot be duplicated into its own descendant tree/);
  assert.match(writeTools, /code = "destination_invalid"/);
});

test("operation receipts are bounded, durable, and reconciled before redelivery", () => {
  const registry = read("src/commands/registry.lua");
  assert.match(registry, /COMMAND_RECEIPT_LIMIT\s*=\s*[\s\S]*50/);
  assert.match(registry, /plugin:SetSetting\(COMMAND_RECEIPTS_SETTING, receipts\)/);
  assert.match(registry, /storeCommandReceipt\(command, "started"/);
  assert.match(registry, /status == "succeeded" or status == "failed"/);
  assert.match(registry, /reconcileStoredCommandReceipt\(command\)/);
  assert.match(registry, /"OPERATION_OUTCOME_UNCERTAIN"/);

  const reconciliation = registry.indexOf("reconcileStoredCommandReceipt(command)");
  const queueInsertion = registry.indexOf("table.insert(commandQueue, command)");
  assert.ok(reconciliation >= 0 && queueInsertion > reconciliation, "stored receipt must reconcile before queue insertion");
});

test("generated install artifact contains target diagnostics and the current build", () => {
  const artifact = read("NexusRBXStudioBridge.plugin.lua");
  const config = read("src/config.lua");
  const buildId = config.match(/local PLUGIN_BUILD_ID = "([^"]+)"/);
  assert.ok(buildId, "plugin config must declare a build identifier");
  assert.ok(artifact.includes(buildId[1]), "generated artifact must contain the configured build identifier");
  assert.match(artifact, /INVALID_TARGET_ENVELOPE/);
  assert.match(artifact, /OPERATION_OUTCOME_UNCERTAIN/);
  assert.match(artifact, /cannot be moved into its own descendant tree/);
  assert.match(artifact, /cannot be duplicated into its own descendant tree/);
  assert.match(artifact, /Heartbeat %s · Commands %s · Place %s/);
});
