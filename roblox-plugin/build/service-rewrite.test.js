const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { rewriteLuaServiceIdentifiers, rewriteServices } = require("./bundle-plugin.js");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8").replace(/\r\n?/g, "\n");

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing section start: ${startMarker}`);
  assert.ok(end > start, `missing section end: ${endMarker}`);
  return source.slice(start, end);
}

test("service rewriting changes unqualified code identifiers only", () => {
  const source = [
    "local camera = Workspace.CurrentCamera",
    "local tags = CollectionService:GetTags(instance)",
    "local existing = Services.Workspace.CurrentCamera",
    "local property = object.Workspace",
    "local method = object:Selection()",
    "local names = { Workspace = Workspace, Selection = Selection }",
    "local concatenated = prefix .. ReplicatedStorage.Name",
  ].join("\n");

  assert.equal(
    rewriteLuaServiceIdentifiers(source),
    [
      "local camera = Services.Workspace.CurrentCamera",
      "local tags = Services.CollectionService:GetTags(instance)",
      "local existing = Services.Workspace.CurrentCamera",
      "local property = object.Workspace",
      "local method = object:Selection()",
      "local names = { Workspace = Services.Workspace, Selection = Services.Selection }",
      "local concatenated = prefix .. Services.ReplicatedStorage.Name",
    ].join("\n"),
  );
});

test("service rewriting preserves short and long string literals byte-for-byte", () => {
  const source = [
    'local path = "Workspace/NexusImports"',
    "local root = 'ServerStorage'",
    'local escaped = "\\\"Workspace\\\" and \\\\ReplicatedStorage"',
    "local long = [[Workspace/NexusImports\nServices.Workspace = Services.Workspace]]",
    "local level = [==[ServerScriptService and ReplicatedStorage]==]",
  ].join("\n");

  assert.equal(rewriteLuaServiceIdentifiers(source), source);
});

test("service rewriting preserves line and long comments byte-for-byte", () => {
  const source = [
    "-- Workspace.CurrentCamera and ServerStorage",
    "local camera = Workspace.CurrentCamera -- ReplicatedStorage stays prose",
    "--[[",
    "Services.Workspace = Services.Workspace",
    "ServerScriptService",
    "]]",
    "--[==[ CollectionService:GetTags(instance) ]==]",
  ].join("\n");

  const expected = source.replace(
    "local camera = Workspace.CurrentCamera",
    "local camera = Services.Workspace.CurrentCamera",
  );
  assert.equal(rewriteLuaServiceIdentifiers(source), expected);
});

test("bundle rewriting leaves config and CRLF literal data untouched", () => {
  const source = [
    'local configPath = "Workspace/Config"',
    "-- END src/config.lua",
    "-- Workspace remains prose",
    'local runtimePath = "Workspace/Runtime"',
    "local camera = Workspace.CurrentCamera",
  ].join("\r\n");
  const expected = source.replace(
    "local camera = Workspace.CurrentCamera",
    "local camera = Services.Workspace.CurrentCamera",
  );

  assert.equal(rewriteServices(source), expected);
});

test("the generated artifact preserves canonical path and diagnostic strings", () => {
  const artifact = read("NexusRBXStudioBridge.plugin.lua");
  const importedAsset = section(
    artifact,
    "function ImportedAsset.isAllowedTarget(path)",
    "function ImportedAsset.safeIsA(inst, className)",
  );
  const importedCommand = section(
    artifact,
    "function ImportedAsset.insertTrustedRobloxAsset(payload, commandType)",
    "-- END src/commands/importedAsset.lua",
  );
  const guard = section(
    artifact,
    "function ScriptContextGuard.placementContext(path)",
    "function ScriptContextGuard.validateScriptDescriptors",
  );

  assert.match(importedAsset, /root ~= "Workspace" and root ~= "ReplicatedStorage" and root ~= "ServerStorage"/);
  assert.doesNotMatch(importedAsset, /root ~= "Services\./);
  assert.match(importedCommand, /payload\.targetParentPath or "Workspace\/NexusImports"/);
  assert.match(importedCommand, /Imports can only target Workspace, ReplicatedStorage, or ServerStorage\./);
  assert.match(artifact, /local camera = Services\.Workspace\.CurrentCamera/);

  assert.match(guard, /root == "ServerScriptService" or root == "Workspace"/);
  assert.match(guard, /\{ name = "StarterGui", token = "StarterGui" \}/);
  assert.match(guard, /\{ name = "ServerStorage", token = "ServerStorage" \}/);
  assert.match(guard, /Script must be placed in ServerScriptService or Workspace\./);
  assert.doesNotMatch(guard, /"Services\.(?:Workspace|ServerScriptService|ServerStorage|ReplicatedStorage|StarterGui)"/);
  assert.doesNotMatch(artifact, /Services\.Services\./);
});
