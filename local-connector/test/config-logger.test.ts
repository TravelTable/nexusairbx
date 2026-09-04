import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import { ConnectorError } from "../src/errors.js";
import { ConsoleLogger, redact } from "../src/logger.js";

test("configuration uses the documented macOS launch and applies CLI precedence", () => {
  const config = loadConfig(
    ["--api-url", "http://localhost:3001/", "--web-url", "https://nexusrbx.com/", "--mcp-tool-timeout", "90000", "--mcp-arg", "one", "--verbose"],
    {
      NEXUSRBX_API_URL: "https://ignored.example",
      NEXUSRBX_WEB_URL: "https://ignored.example",
      NEXUSRBX_MCP_ARGS_JSON: '["ignored"]',
    },
    "darwin",
  );

  assert.equal(config.apiUrl, "http://localhost:3001");
  assert.equal(config.webUrl, "https://nexusrbx.com");
  assert.equal(config.mcpToolTimeoutMs, 90_000);
  assert.equal(config.mcpCommand, "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP");
  assert.deepEqual(config.mcpArgs, ["one"]);
  assert.equal(config.verbose, true);
});

test("configuration retains the Windows batch launcher as a last-resort fallback", () => {
  const config = loadConfig([], {}, "win32");
  assert.equal(config.mcpCommand, "cmd.exe");
  assert.deepEqual(config.mcpArgs, ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"]);
});

test("configuration launches the newest installed Windows StudioMCP executable directly", async (t) => {
  const localAppData = await mkdtemp(join(tmpdir(), "nexusrbx-config-"));
  t.after(() => rm(localAppData, { recursive: true, force: true }));
  const older = join(localAppData, "Roblox", "Versions", "version-older", "StudioMCP.exe");
  const newer = join(localAppData, "Roblox", "Versions", "version-newer", "StudioMCP.exe");
  await mkdir(dirname(older), { recursive: true });
  await mkdir(dirname(newer), { recursive: true });
  await writeFile(older, "older");
  await writeFile(newer, "newer");
  await utimes(older, new Date(1_000), new Date(1_000));
  await utimes(newer, new Date(2_000), new Date(2_000));

  const config = loadConfig([], { LOCALAPPDATA: localAppData }, "win32");
  assert.equal(config.mcpCommand, newer);
  assert.deepEqual(config.mcpArgs, []);
});

test("configuration prefers the valid StudioMCP executable named by Roblox's batch launcher", async (t) => {
  const localAppData = await mkdtemp(join(tmpdir(), "nexusrbx-config-"));
  t.after(() => rm(localAppData, { recursive: true, force: true }));
  const executable = join(localAppData, "Roblox", "Versions", "version-batch", "StudioMCP.exe");
  await mkdir(dirname(executable), { recursive: true });
  await writeFile(executable, "mcp");
  await writeFile(join(localAppData, "Roblox", "mcp.bat"), `@echo off\r\n"${executable}"\r\n`);

  const config = loadConfig([], { LOCALAPPDATA: localAppData }, "win32");
  assert.equal(config.mcpCommand, executable);
  assert.deepEqual(config.mcpArgs, []);
});

test("configuration accepts MCP executable flags as repeatable argument values", () => {
  const config = loadConfig(
    ["--verbose", "--mcp-arg", "--stdio", "--mcp-arg", "--verbose"],
    {},
    "darwin",
  );

  assert.deepEqual(config.mcpArgs, ["--stdio", "--verbose"]);
  assert.equal(config.verbose, true);
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

test("rotating observation secrets stay bounded while current retries and permanent credentials remain redacted", () => {
  const logger = new ConsoleLogger();
  const permanent = "permanent-credential-value";
  logger.addSecret(permanent);
  for (let index = 0; index < 10_000; index += 1) {
    logger.addTransientSecret(`observation-credential-${index}-value`);
  }
  const current = "observation-credential-9999-value";
  const previous = "observation-credential-9998-value";
  const evicted = "observation-credential-0-value";
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (line?: unknown) => { lines.push(String(line)); };
  try {
    logger.info("redaction probe", { permanent, current, previous, evicted });
  } finally {
    console.log = originalLog;
  }

  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.includes(permanent), false);
  assert.equal(lines[0]?.includes(current), false);
  assert.equal(lines[0]?.includes(previous), false);
  assert.equal(lines[0]?.includes(evicted), true);
});
