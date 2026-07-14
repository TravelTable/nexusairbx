import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { collectDiagnostics, resolveMcpProbePath } from "../src/diagnostics.js";

test("reports a missing Studio MCP executable without launching it", async () => {
  const result = await collectDiagnostics({ mcpCommand: "/definitely/missing/StudioMCP", connectorVersion: "test" });
  assert.equal(result.studioInstalled, false);
  assert.equal(result.connectorVersion, "test");
});

test("Windows detection probes Roblox mcp.bat instead of treating cmd.exe as Studio MCP", async () => {
  const localAppData = join(tmpdir(), `nexusrbx-diagnostics-${process.pid}`);
  const args = ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"];
  await rm(localAppData, { recursive: true, force: true });

  assert.equal(resolveMcpProbePath({
    mcpCommand: "cmd.exe",
    mcpArgs: args,
    platform: "win32",
    environment: { LOCALAPPDATA: localAppData },
  }), join(localAppData, "Roblox", "mcp.bat"));

  const missing = await collectDiagnostics({
    mcpCommand: "cmd.exe",
    mcpArgs: args,
    connectorVersion: "test",
    platform: "win32",
    environment: { LOCALAPPDATA: localAppData },
  });
  assert.equal(missing.studioInstalled, false);

  await mkdir(join(localAppData, "Roblox"), { recursive: true });
  await writeFile(join(localAppData, "Roblox", "mcp.bat"), "@echo off\n");
  const installed = await collectDiagnostics({
    mcpCommand: "cmd.exe",
    mcpArgs: args,
    connectorVersion: "test",
    platform: "win32",
    environment: { LOCALAPPDATA: localAppData },
  });
  assert.equal(installed.studioInstalled, true);
  await rm(localAppData, { recursive: true, force: true });
});

test("diagnostics contain health summaries without session secrets or command payloads", async () => {
  const result = await collectDiagnostics({
    mcpCommand: "studio-mcp",
    connectorVersion: "1.2.3",
    backendUrl: "https://api.nexusrbx.com",
    logLocation: "/tmp/nexusrbx-logs",
    snapshot: {
      state: "ready",
      message: "Connected",
      updatedAt: 1,
      autoStart: true,
      updateState: "idle",
      preferences: {
        autoStart: true,
        minimizeToTray: true,
        startMinimized: false,
        theme: "dark",
        autoReconnect: true,
        reconnectDelayMs: 2_000,
        automaticUpdates: true,
      },
      cloudHealth: "connected",
      runtimeHealth: "connected",
      mcpHealth: "connected",
      connectionStage: null,
      degradedReason: null,
      pairingError: null,
      experienceName: "Example Place",
      supportedToolCount: 9,
      supportedTools: ["read_script", "write_script"],
      lastActivityAt: 2,
      lastHeartbeatAt: 3,
      connectorVersion: "1.2.3",
      mcpServerVersion: "4.5.6",
      lastCommand: { name: "read_script", status: "succeeded", at: 2 },
    },
  });

  assert.deepEqual(result.lastCommand, { name: "read_script", status: "succeeded", at: 2 });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("supportedTools"), false);
  assert.equal(serialized.includes("Example Place"), false);
  assert.equal(serialized.includes("token"), false);
  assert.equal(serialized.includes("payload"), false);
});
