const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyPluginBackendOverride,
  parsePluginBackendUrl,
} = require("./plugin-backend-override");

test("accepts a loopback HTTP backend for local Studio testing", () => {
  assert.deepEqual(parsePluginBackendUrl("http://localhost:5001/"), {
    url: "http://localhost:5001",
    hostname: "localhost",
  });
});

test("rejects insecure non-local plugin backends", () => {
  assert.throws(() => parsePluginBackendUrl("http://example.com"), /HTTPS/);
});

test("rewrites only the bundled plugin endpoint declarations", () => {
  const source = [
    'local BACKEND_URL = "https://api.nexusrbx.com"',
    'local BACKEND_HOST = "api.nexusrbx.com"',
    'local copy = "https://api.nexusrbx.com"',
  ].join("\n");
  const output = applyPluginBackendOverride(source, "http://localhost:5001");
  assert.match(output, /local BACKEND_URL = "http:\/\/localhost:5001"/);
  assert.match(output, /local BACKEND_HOST = "localhost"/);
  assert.match(output, /local copy = "https:\/\/api\.nexusrbx\.com"/);
});

