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
  assert.match(artifact, /nexusrbx-studio-0\.10\.3-session-attestation\.2/);
  assert.match(artifact, /INVALID_TARGET_ENVELOPE/);
  assert.match(artifact, /OPERATION_OUTCOME_UNCERTAIN/);
  assert.match(artifact, /Heartbeat %s · Commands %s · Place %s/);
});
