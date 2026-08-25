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

test("an authenticated heartbeat resumes a restarted plugin at the server generation", () => {
  const targetIntegrity = read("src/studio/targetIntegrity.lua");
  const main = read("src/Main.server.lua");
  const artifact = read("NexusRBXStudioBridge.plugin.lua");
  const resume = section(
    targetIntegrity,
    "function TargetPrivate.resumeServerGeneration(target)",
    "function updateStudioServerTarget(response)",
  );
  const update = section(
    targetIntegrity,
    "function updateStudioServerTarget(response)",
    "function clearStudioServerTarget()",
  );

  assert.match(resume, /authoritativeGeneration = tonumber\(target\.targetGeneration\)/);
  assert.match(resume, /authoritativeGeneration > 9007199254740991/);
  assert.match(resume, /authoritativeGeneration ~= math\.floor\(authoritativeGeneration\)/);
  assert.match(resume, /localGeneration ~= math\.floor\(localGeneration\)/);
  for (const mismatch of [
    "invalid_target_generation",
    "session_mismatch",
    "connector_mismatch",
    "target_id_missing",
    "place_mismatch",
    "universe_mismatch",
    "signature_mismatch",
  ]) {
    assert.match(resume, new RegExp(`"${mismatch}"`));
  }
  assert.match(resume, /resumedGeneration = math\.max\(localGeneration, authoritativeGeneration\)/);
  assert.doesNotMatch(
    resume,
    /serverTarget\.(?:targetId|sessionId)/,
    "an exact new-place heartbeat must be able to replace a previously rejected stale target",
  );
  assert.doesNotMatch(resume, /plugin:SetSetting\("nexusrbxStudioPlaceIdentity"/);
  assert.match(resume, /if resumedGeneration > localGeneration then/);
  assert.match(resume, /plugin:SetSetting\("nexusrbxStudioTargetGeneration", resumedGeneration\)/);
  assert.equal(
    (resume.match(/plugin:SetSetting\("nexusrbxStudioTargetGeneration"/g) || []).length,
    1,
    "a higher server generation is persisted once; equal/lower generations remain write-free",
  );
  assert.match(update, /TargetPrivate\.resumeServerGeneration\(target\)/);
  assert.match(update, /generationResumeError = generationResumeError/);

  const pairSession = main.indexOf('plugin:SetSetting("nexusrbxStudioSessionId", dataOrError.sessionId)');
  const pairTarget = main.indexOf("updateStudioServerTarget(dataOrError)", pairSession);
  assert.ok(pairSession >= 0 && pairTarget > pairSession, "pairing must persist the authoritative session before generation resume");

  const heartbeatTarget = main.indexOf("updateStudioServerTarget(heartbeat)");
  const heartbeatCompatibility = main.indexOf("applyCompatibility(heartbeat)", heartbeatTarget);
  assert.ok(
    heartbeatTarget >= 0 && heartbeatCompatibility > heartbeatTarget,
    "heartbeat generation resume must finish before compatibility opens command delivery",
  );
  const compatibility = section(main, "local function applyCompatibility(heartbeat)", "local function pairStudio()");
  const readiness = compatibility.indexOf("getStudioTargetReadiness()");
  const deliveryReady = compatibility.indexOf("compatibilityHandshakeReady = true");
  assert.ok(readiness >= 0 && deliveryReady > readiness, "target resume must be ready before command delivery opens");
  assert.match(compatibility, /targetReady == false[\s\S]*compatibilityHandshakeReady = false/);

  assert.match(artifact, /function TargetPrivate\.resumeServerGeneration\(target\)/);
  assert.match(artifact, /resumedGeneration = math\.max\(localGeneration, authoritativeGeneration\)/);
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

test("safe GUI properties accept planner shapes and participate in readback verification", () => {
  const pathTools = read("src/studio/path.lua");
  const serialization = read("src/studio/serialization.lua");

  assert.match(pathTools, /value\["\$type"\]/);
  assert.match(pathTools, /typeof\(value\.X\) == "table" and typeof\(value\.Y\) == "table"/);
  assert.match(pathTools, /key == "TextColor3"[\s\S]*inst\.TextColor3 = value/);
  assert.match(pathTools, /key == "BackgroundColor3"[\s\S]*inst\.BackgroundColor3 = value/);
  assert.match(pathTools, /key == "TextSize"[\s\S]*inst\.TextSize = math\.max/);
  for (const property of ["BackgroundColor3", "TextColor3", "TextSize"]) {
    assert.match(serialization, new RegExp(`"${property}"`));
  }
});
