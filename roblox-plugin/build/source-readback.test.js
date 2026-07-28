const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

test("managed artifact writes wait for Studio source to match the requested content", () => {
  const writeTools = read("src/commands/writeTools.lua");

  assert.match(writeTools, /for attempt = 1, 6 do/);
  assert.match(writeTools, /waitForExpectedScriptSource\(inst, tostring\(spec\.content or ""\)\)/);
  assert.match(writeTools, /if lastHash == expectedHash then/);
  assert.match(writeTools, /return nil, \("Studio source did not settle to the applied content/);
  assert.match(writeTools, /buildManagedFileRecord\(inst, spec, appliedHash\)/);
});

test("apply_artifact verification retries the Studio editor read-back before failing", () => {
  const registry = read("src/commands/registry.lua");
  const applyVerifier = registry.slice(
    registry.indexOf('elseif commandType == "apply_artifact" then'),
    registry.indexOf('elseif commandType == "replace_in_files" then'),
  );

  assert.match(applyVerifier, /for attempt = 2, 6 do/);
  assert.match(applyVerifier, /task\.wait\(0\.05\)/);
  assert.match(applyVerifier, /currentHash == expected/);
});
