const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

function applyArtifactVerifier(contents) {
  const start = contents.indexOf('elseif commandType == "apply_artifact" then');
  const end = contents.indexOf('elseif commandType == "replace_in_files" then', start);
  assert.notEqual(start, -1, "apply_artifact verifier start must exist");
  assert.notEqual(end, -1, "apply_artifact verifier end must exist");
  return contents.slice(start, end);
}

function assertBoundedAuthoritativeReadback(contents) {
  const applyVerifier = applyArtifactVerifier(contents);

  assert.match(applyVerifier, /for attempt = 1, 12 do/);
  assert.match(applyVerifier, /inst, currentHash, sourceRead = currentScriptHashAt\(p\)/);
  assert.doesNotMatch(applyVerifier, /local inst = resolvePath\(p\)/);
  assert.match(applyVerifier, /math\.min\(0\.05 \* \(2 \^ \(attempt - 1\)\), 1\)/);
  assert.match(applyVerifier, /task\.wait\(delaySeconds\)/);
  assert.match(applyVerifier, /currentHash == expected/);
  assert.match(applyVerifier, /expectedClassName == "" or inst\.ClassName == expectedClassName/);
  assert.match(applyVerifier, /classMatches and expected ~= nil and currentHash == expected/);
  assert.match(applyVerifier, /actualClassName = actualClassName or ""/);
  assert.match(applyVerifier, /targetFound = inst ~= nil/);
  assert.match(applyVerifier, /classMatches = classMatches == true/);
  assert.match(applyVerifier, /sourceReadable = currentHash ~= nil/);
  assert.match(applyVerifier, /readbackAttempts = readbackAttempts/);
  assert.match(applyVerifier, /readbackWaitMs = readbackWaitMs/);
  assert.match(applyVerifier, /readbackMaxAttempts = 12/);
  assert.match(applyVerifier, /sourceRead = sourceRead or \{\}/);
  assert.match(applyVerifier, /readFailureCounts = readFailureCounts/);
  assert.match(applyVerifier, /if expected == nil then\s+break\s+end/);
  assert.match(
    applyVerifier,
    /never\s+-- substitute the handler's claimed hash for this authoritative read-back\./,
  );
  for (const reason of [
    "missing_expected_hash",
    "target_not_found",
    "class_mismatch",
    "source_unreadable",
    "source_hash_mismatch",
  ]) {
    assert.match(applyVerifier, new RegExp(`failureReason = "${reason}"`));
  }
}

test("managed artifact writes wait for Studio source to match the requested content", () => {
  const writeTools = read("src/commands/writeTools.lua");

  assert.match(writeTools, /for attempt = 1, 6 do/);
  assert.match(writeTools, /waitForExpectedScriptSource\(inst, tostring\(spec\.content or ""\)\)/);
  assert.match(writeTools, /if lastHash == expectedHash then/);
  assert.match(writeTools, /return nil, \("Studio source did not settle to the applied content/);
  assert.match(writeTools, /buildManagedFileRecord\(inst, spec, appliedHash\)/);
});

test("apply_artifact verification re-resolves the Studio path on every retry", () => {
  const registry = read("src/commands/registry.lua");
  const artifact = read("NexusRBXStudioBridge.plugin.lua");

  assertBoundedAuthoritativeReadback(registry);
  assertBoundedAuthoritativeReadback(artifact);
});

test("source read failures preserve bounded editor and property diagnostics", () => {
  for (const contents of [read("src/studio/path.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    assert.match(contents, /method = "ScriptEditorService\.GetEditorSource"/);
    assert.match(contents, /method = "Instance\.Source"/);
    assert.match(contents, /code = "source_unreadable"/);
    assert.match(contents, /editorError = editorError/);
    assert.match(contents, /propertyError = ok and \("unexpected source type: " \.\. type\(source\)\)/);
    assert.match(contents, /string\.sub\(tostring\(source or "unknown error"\), 1, 240\)/);
  }

  for (const contents of [read("src/commands/registry.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    assert.match(contents, /local ok, source, readEvidence = readScriptSource\(inst\)/);
    assert.match(contents, /return inst, ok and stableHash\(source\) or nil, readEvidence/);
  }
});

test("bundled script hashing captures the live source reader", () => {
  const artifact = read("NexusRBXStudioBridge.plugin.lua");
  const forwardDeclaration = artifact.indexOf("local fullPath, resolvePath, readScriptSource, writeScriptSource");
  const scriptHashDefinition = artifact.indexOf("scriptHash = function(inst)");
  const pathAssignment = artifact.indexOf("readScriptSource = function(inst)");

  assert.ok(forwardDeclaration >= 0, "path helpers must be forward-declared");
  assert.ok(forwardDeclaration < scriptHashDefinition, "source reader must be in scriptHash's lexical scope");
  assert.ok(scriptHashDefinition < pathAssignment, "path.lua should populate the captured binding later");
  assert.equal(
    artifact.indexOf("local fullPath, resolvePath, readScriptSource, writeScriptSource", forwardDeclaration + 1),
    -1,
    "path.lua must not shadow the shared source-reader binding",
  );
});

test("managed artifact projection is unique in source and bundled artifact", () => {
  for (const contents of [read("src/commands/writeTools.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    assert.equal(
      contents.match(/table\.insert\(finalFiles, spec\)/g)?.length || 0,
      1,
      "each managed file spec must be inserted into finalFiles exactly once",
    );
  }

  for (const contents of [read("src/commands/registry.lua"), read("NexusRBXStudioBridge.plugin.lua")]) {
    assert.match(contents, /local affectedSeen = \{\}/);
    assert.match(contents, /if path and path ~= "" and not affectedSeen\[path\] then/);
    assert.match(contents, /affectedSeen\[path\] = true/);
    assert.match(contents, /addAffectedPath\(file\.path\)/);
    assert.match(contents, /addAffectedPath\(file\.canonicalPath\)/);
    assert.doesNotMatch(contents, /table\.insert\(affected, file\.(?:path|canonicalPath)\)/);
  }
});
