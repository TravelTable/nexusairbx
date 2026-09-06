const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("runtime copies exit before shared connector, UI, and network initialization", () => {
  for (const source of [read("src/config.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    const guard = source.indexOf('if not game:GetService("RunService"):IsEdit() then return end');
    assert.ok(guard >= 0);
    assert.ok(guard < source.indexOf("local BACKEND_URL"));
  }
  const main = read("src/Main.server.lua");
  for (const marker of ["-- Poll loop:", "-- Executor loop:", "-- Heartbeat loop:"]) {
    const section = main.slice(main.indexOf(marker), main.indexOf(marker) + 950);
    assert.match(section, /RunService"\):IsEdit\(\)/);
  }
  const ping = main.indexOf("local ok, latency, authExpired, heartbeat = pingSession");
  const nextCheck = main.indexOf('if not game:GetService("RunService"):IsEdit()', ping);
  assert.ok(nextCheck > ping && nextCheck < main.indexOf("updateStudioServerTarget(heartbeat)", ping));
});

test("a long poll crossing into Play rejects claimed work before queueing or execution", () => {
  const registry = read("src/commands/registry.lua");
  const poll = registry.slice(registry.indexOf("function pullOnce(waitMs)"), registry.indexOf("function processNextCommand()"));
  assert.ok(poll.indexOf('RunService"):IsEdit()') < poll.indexOf('"GET"'));
  const lateGuard = poll.indexOf('if not game:GetService("RunService"):IsEdit()', poll.indexOf("setPollingPulse(false)"));
  assert.ok(lateGuard > 0 && lateGuard < poll.indexOf("table.insert(commandQueue, command)"));
  assert.match(poll, /ack\(command, "failed", failure, failure\.error\.message\)/);
  assert.match(registry, /code = "STUDIO_EDIT_MODE_REQUIRED"/);
  assert.match(registry, /executionStarted = false, sideEffectStarted = false/);
  assert.match(registry, /executeCommand = function\(command\)\s+if not game:GetService\("RunService"\):IsEdit\(\)/);
});

test("explicit property readback is bounded, keeps false values and uses the canonical serializer", () => {
  for (const source of [read("src/commands/readTools.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    const start = source.indexOf("readInstance = function(payload)") >= 0
      ? source.indexOf("readInstance = function(payload)") : source.indexOf("local function readInstance(payload)");
    assert.ok(start >= 0);
    const body = source.slice(start, source.indexOf("local function getSelectionTool", start) > start
      ? source.indexOf("local function getSelectionTool", start) : start + 2700);
    assert.match(body, /type\(payload\.properties\) == "table"/);
    assert.match(body, /if index > 100 then break end/);
    assert.match(body, /local value, propertyError = safePropertyValue\(inst, key\)/);
    assert.match(body, /if value ~= nil then\s+record\.properties\[key\] = value/);
    assert.match(body, /record\.propertyErrors = errors/);
    assert.match(body, /PROPERTY_READ_REQUIRES_SCRIPT_TOOL/);
    assert.match(body, /record\.propertiesTruncated = true/);
  }
  const serialization = read("src/studio/serialization.lua");
  assert.match(serialization, /PROPERTY_READ_FAILED/);
  assert.match(serialization, /PROPERTY_VALUE_UNSUPPORTED/);
  const defaults = serialization.slice(serialization.indexOf("local function propertiesOf(inst)"));
  for (const property of ["Anchored", "CanCollide", "CanTouch", "CanQuery", "Massless", "CastShadow"]) {
    assert.ok(defaults.includes(`"${property}"`));
  }
});
