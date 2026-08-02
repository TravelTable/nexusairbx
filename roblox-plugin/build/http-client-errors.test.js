const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

test("HTTP failures are converted to user-facing strings before reaching plugin UI", () => {
  const httpClient = read("src/net/httpClient.lua");
  const main = read("src/Main.server.lua");

  assert.match(httpClient, /local function requestErrorMessage\(value, depth\)/);
  assert.match(httpClient, /\{ "message", "error", "detail", "code" \}/);
  assert.match(httpClient, /return false, requestErrorMessage\(result\.data\), result\.status/);
  assert.doesNotMatch(main, /local message = tostring\(dataOrError\)\s*\n\s*local parsed/);
});
