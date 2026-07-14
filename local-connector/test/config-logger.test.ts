import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import { ConnectorError } from "../src/errors.js";
import { redact } from "../src/logger.js";

test("configuration uses the documented macOS launch and applies CLI precedence", () => {
  const config = loadConfig(
    ["--api-url", "http://localhost:3001/", "--pair-code", "ABCD-1234", "--mcp-arg", "one", "--verbose"],
    {
      NEXUSRBX_API_URL: "https://ignored.example",
      NEXUSRBX_PAIR_CODE: "IGNORED",
      NEXUSRBX_MCP_ARGS_JSON: '["ignored"]',
    },
    "darwin",
  );

  assert.equal(config.apiUrl, "http://localhost:3001");
  assert.equal(config.pairCode, "ABCD-1234");
  assert.equal(config.mcpCommand, "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP");
  assert.deepEqual(config.mcpArgs, ["one"]);
  assert.equal(config.verbose, true);
});

test("configuration uses the documented Windows MCP launcher", () => {
  const config = loadConfig([], {}, "win32");
  assert.equal(config.mcpCommand, "cmd.exe");
  assert.deepEqual(config.mcpArgs, ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"]);
});

test("configuration fails closed for unsafe URLs, malformed values, and unknown Linux defaults", () => {
  assert.throws(
    () => loadConfig(["--api-url", "http://remote.example"], {}, "darwin"),
    (error: unknown) => error instanceof ConnectorError && error.code === "CONFIG_INSECURE_API",
  );
  assert.throws(
    () => loadConfig(["--api-url", "https://user:pass@example.test"], {}, "darwin"),
    (error: unknown) => error instanceof ConnectorError && error.code === "CONFIG_INVALID",
  );
  assert.throws(
    () => loadConfig([], { NEXUSRBX_MCP_ARGS_JSON: "{}" }, "darwin"),
    (error: unknown) => error instanceof ConnectorError && error.code === "CONFIG_INVALID",
  );
  assert.throws(
    () => loadConfig([], {}, "linux"),
    (error: unknown) => error instanceof ConnectorError && error.code === "MCP_COMMAND_REQUIRED",
  );
  assert.throws(
    () => loadConfig(["--heartbeat", "100"], {}, "darwin"),
    (error: unknown) => error instanceof ConnectorError && error.code === "CONFIG_INVALID",
  );
});

test("redaction removes connector tokens, bearer credentials, configured secrets, and bounds output", () => {
  const token = "nsmcp_session123_super-secret.value";
  const result = redact(
    {
      token,
      authorization: `Bearer ${token}`,
      other: `prefix custom-secret ${"x".repeat(8_000)}`,
    },
    ["custom-secret"],
  );

  assert.equal(result.includes(token), false);
  assert.equal(result.includes("custom-secret"), false);
  assert.match(result, /\[REDACTED\]/);
  assert.match(result, /…\[truncated\]$/);
  assert.ok(result.length < 4_200);
});
