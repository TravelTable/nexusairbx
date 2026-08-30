const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

test("v3 UI artifacts snapshot, conflict-check, apply, and read back managed ScreenGui trees", () => {
  const source = read("src/commands/writeTools.lua");

  assert.match(source, /existing:GetAttribute\("NexusDesignId"\)/);
  assert.match(source, /existing:GetAttribute\("NexusRootId"\)/);
  assert.match(source, /existing:GetAttribute\(AGENT_ARTIFACT_ID_ATTRIBUTE\)/);
  assert.match(source, /container:GetAttribute\("NexusUiContainer"\)/);
  assert.match(source, /parent:SetAttribute\("NexusUiContainer", true\)/);
  assert.match(source, /code = "ui_tree_conflict"/);
  assert.match(source, /Expected UI tree %s but found %s/);
  assert.match(source, /snapshotOnce\(existing, snapshots, seenPaths\)[\s\S]*existing:Destroy\(\)/);
  assert.match(source, /UiArtifact\.applyRoot\(rootSpec, payload\.artifactId, snapshots, seenPaths\)/);
  assert.match(source, /node:SetAttribute\("NexusNodeId"/);
  assert.match(source, /ui_readback_failed: expected %d nodes but found %d/);
  assert.match(source, /ui_readback_failed: managed UI node IDs do not match/);
  assert.match(source, /sourceHashes = sourceHashes/);
  assert.match(source, /root:SetAttribute\("NexusTreeHash", uiResult\.treeHash\)/);
  assert.match(source, /uiRoots = uiRootResults/);
});

test("UI artifact creation remains allowlisted and does not execute document-provided Luau", () => {
  const source = read("src/commands/writeTools.lua");
  const start = source.indexOf("UiArtifact.NODE_CLASSES");
  const end = source.indexOf("local function applyArtifact(payload)", start);
  const section = source.slice(start, end);

  for (const className of ["Frame", "TextLabel", "TextButton", "ImageLabel", "ImageButton", "TextBox", "ScrollingFrame"]) {
    assert.match(section, new RegExp(`${className} = true`));
  }
  assert.doesNotMatch(section, /loadstring|require\(rootSpec|require\(nodeSpec/);
});

test("UI root fingerprints cover every applied property, identity, descendant, and script source", () => {
  const source = read("src/commands/writeTools.lua");
  const start = source.indexOf("UiArtifact.treeHash = function");
  const end = source.indexOf("UiArtifact.preflightRoot = function", start);
  const section = source.slice(start, end);

  for (const property of [
    "ResetOnSpawn", "IgnoreGuiInset", "DisplayOrder", "Enabled",
    "TextWrapped", "TextXAlignment", "Font", "PlaceholderText",
    "ScaleType", "CanvasSize", "PaddingTop", "FillDirection",
    "Color", "Transparency", "MinTextSize", "Scale",
  ]) {
    assert.match(section, new RegExp(`"${property}"`), `${property} must participate in the UI tree hash`);
  }
  assert.match(section, /AGENT_ARTIFACT_ID_ATTRIBUTE/);
  assert.match(section, /NexusRootId/);
  assert.match(section, /NexusRevision/);
  assert.match(section, /SourceHash=" \.\. tostring\(scriptHash\(inst\) or ""\)/);
  assert.match(section, /root:GetDescendants\(\)/);
});

test("UI-only artifacts participate in command-bound verification and affected-path receipts", () => {
  const registry = read("src/commands/registry.lua");

  assert.match(registry, /addCheck\("artifact_ui_root", path, rootVerified, details\)/);
  assert.match(registry, /actualTreeHash = root and UiArtifact\.treeHash\(root\)/);
  assert.match(registry, /storedTreeHash == expectedTreeHash/);
  assert.match(registry, /nodeIdsMatch/);
  assert.match(registry, /evidence\.uiRoots = uiEvidence/);
  assert.match(registry, /if result\.uiRoots then[\s\S]*addAffectedPath\(uiRoot\.path\)/);
});

test("snapshot serialization restores UI decorators, sequences, layout padding, and ScreenGui state", () => {
  const serialization = read("src/studio/serialization.lua");
  const pathSource = read("src/studio/path.lua");
  const snapshots = read("src/studio/snapshot.lua");

  for (const className of ["UIGradient", "UIAspectRatioConstraint", "UISizeConstraint", "UITextSizeConstraint", "UIScale"]) {
    assert.match(serialization, new RegExp(`${className} = true`));
  }
  assert.match(serialization, /valueType == "ColorSequence"/);
  assert.match(serialization, /valueType == "NumberSequence"/);
  assert.match(pathSource, /valueType == "ColorSequence"/);
  assert.match(pathSource, /valueType == "NumberSequence"/);
  assert.match(pathSource, /key == "Padding" and inst:IsA\("UIListLayout"\)/);
  assert.match(pathSource, /Enabled = true, DisplayOrder = true/);
  assert.match(snapshots, /inst:IsA\("ScreenGui"\)[\s\S]*UiArtifact\.treeHash/);
  assert.match(snapshots, /if not current then[\s\S]*creator removed or renamed it/);
  assert.match(snapshots, /deferredHashChecks/);
  assert.match(snapshots, /Restored UI tree hash does not match the pre-mutation snapshot/);
});
