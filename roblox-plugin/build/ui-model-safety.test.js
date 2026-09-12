const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8").replace(/\r\n?/g, "\n");

test("files-first replacement verifies the complete source set and live UI tree", () => {
  const source = read("src/commands/chatModel.lua");
  assert.match(source, /Controller\.client\.luau/);
  assert.match(source, /_NexusSource/);
  assert.match(source, /for relativePath, expectedHash in pairs\(expectedHashes or \{\}\)/);
  assert.match(source, /actualCount ~= expectedCount/);
  assert.match(source, /actualTreeHash ~= expectedTreeHash/);
  assert.doesNotMatch(source, /ipairs\(\{\s*"View",\s*"Controller"\s*\}\)/);
});

test("files-first replacement snapshots and restores the complete old subtree", () => {
  const apply = read("src/commands/chatModel.lua");
  const snapshots = read("src/studio/snapshot.lua");
  assert.match(apply, /appendSnapshotTree\(previous, snapshots\)/);
  assert.match(apply, /snapshots\[#snapshots\]\.replaceSubtree = true/);
  assert.match(snapshots, /if current then current:Destroy\(\) end/);
  assert.match(snapshots, /withinSubtree\(snap\.path, replacedSubtrees\)/);
  assert.match(snapshots, /table\.insert\(deferredHashChecks, snap\)/);
});

test("UI fingerprints include captured properties, all attributes, tags, and source", () => {
  const source = read("src/commands/writeTools.lua");
  const start = source.indexOf("UiArtifact.treeHash = function(root)");
  const end = source.indexOf("UiArtifact.preflightRoot", start);
  const treeHash = source.slice(start, end);
  assert.match(treeHash, /propertyHash\(inst, \{ NexusTreeHash = true \}\)/);
  assert.match(treeHash, /SourceHash=/);
  const serialization = read("src/studio/serialization.lua");
  assert.match(serialization, /local attributes = attributesOf\(inst\)/);
  assert.match(serialization, /attributes\[attributeName\] = nil/);
  assert.match(serialization, /CollectionService:GetTags\(inst\)/);
});
