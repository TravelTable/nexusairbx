import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ConnectorError } from "../src/errors.js";
import type { Logger } from "../src/logger.js";
import { RobloxStudioMcpClient } from "../src/mcp-client.js";

const fixture = fileURLToPath(new URL("./fixtures/mock-mcp-server.mjs", import.meta.url));

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
  addSecret() {},
};

function client(mode = "normal", requestTimeoutMs = 5_000): RobloxStudioMcpClient {
  return new RobloxStudioMcpClient({
    command: process.execPath,
    args: [fixture, mode],
    connectorVersion: "0.1.0-test",
    requestTimeoutMs,
    logger,
  });
}

test("official MCP client initializes, discovers every page, calls tools, and receives list changes", async (t) => {
  const mcp = client();
  t.after(async () => mcp.disconnect());

  const listChanged = new Promise<void>((resolve) => mcp.onToolsChanged(resolve));
  const server = await mcp.connect();
  assert.deepEqual(server, { serverName: "nexusrbx-test-mcp", serverVersion: "1.2.3-test" });

  const tools = await mcp.listTools();
  assert.deepEqual(tools.map((tool) => tool.name), ["script_read", "get_studio_state", "disconnect_test_server"]);

  const result = await mcp.callTool("script_read", { path: "game.ServerScriptService.Main", datamodel_type: "Edit" });
  assert.equal(result.isError, undefined);
  assert.match(JSON.stringify(result.content), /script_read/);

  await Promise.race([
    listChanged,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("tools/list_changed was not delivered")), 1_000)),
  ]);
});

test("tool discovery rejects a repeated pagination cursor", async (t) => {
  const mcp = client("cycle");
  t.after(async () => mcp.disconnect());
  await mcp.connect();
  await assert.rejects(
    mcp.listTools(),
    (error: unknown) => error instanceof ConnectorError && error.code === "MCP_CURSOR_CYCLE",
  );
});

test("an unexpected stdio server exit emits disconnect and calls fail closed", async (t) => {
  const mcp = client();
  t.after(async () => mcp.disconnect());
  const disconnected = new Promise<Error | undefined>((resolve) => mcp.onDisconnect(resolve));
  await mcp.connect();
  await mcp.callTool("disconnect_test_server", {});

  const error = await Promise.race([
    disconnected,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("disconnect was not delivered")), 1_000)),
  ]);
  assert.equal(error instanceof ConnectorError && error.code === "MCP_DISCONNECTED", true);
  await assert.rejects(
    mcp.callTool("script_read", { path: "x" }),
    (callError: unknown) => callError instanceof ConnectorError && callError.code === "MCP_NOT_CONNECTED",
  );
});

test("startup failure is structured and retryable", async () => {
  const mcp = client("exit", 500);
  await assert.rejects(
    mcp.connect(),
    (error: unknown) => error instanceof ConnectorError && error.code === "MCP_CONNECT_FAILED" && error.retryable,
  );
});
