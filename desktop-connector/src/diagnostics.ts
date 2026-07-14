import { access } from "node:fs/promises";
import { basename, join } from "node:path";
import type { CompanionDiagnostics } from "./contracts.js";

export function resolveMcpProbePath({
  mcpCommand,
  mcpArgs = [],
  platform = process.platform,
  environment = process.env,
}: {
  mcpCommand: string;
  mcpArgs?: string[];
  platform?: string;
  environment?: NodeJS.ProcessEnv;
}): string | null {
  if (platform === "win32") {
    const executable = basename(mcpCommand).toLowerCase();
    if (executable === "cmd" || executable === "cmd.exe") {
      const expected = mcpArgs.find((argument) => /(?:%LOCALAPPDATA%|\$LOCALAPPDATA|\$env:LOCALAPPDATA)[\\/]Roblox[\\/]mcp\.bat/i.test(argument));
      if (!expected || !environment.LOCALAPPDATA) return null;
      return join(environment.LOCALAPPDATA, "Roblox", "mcp.bat");
    }
  }
  return mcpCommand.includes("/") || mcpCommand.includes("\\") ? mcpCommand : null;
}

export async function collectDiagnostics({
  mcpCommand,
  mcpArgs = [],
  connectorVersion,
  backendUrl = "Not configured",
  logLocation = "Not available",
  snapshot,
  platform = process.platform,
  environment = process.env,
}: {
  mcpCommand: string;
  mcpArgs?: string[];
  connectorVersion: string;
  backendUrl?: string;
  logLocation?: string;
  snapshot?: import("./contracts.js").CompanionSnapshot;
  platform?: string;
  environment?: NodeJS.ProcessEnv;
}): Promise<CompanionDiagnostics> {
  const probePath = resolveMcpProbePath({ mcpCommand, mcpArgs, platform, environment });
  const isWindowsShellWrapper = platform === "win32" && ["cmd", "cmd.exe"].includes(basename(mcpCommand).toLowerCase());
  let mcpCommandAvailable = !probePath && !isWindowsShellWrapper;
  if (probePath) {
    try { await access(probePath); mcpCommandAvailable = true; } catch { mcpCommandAvailable = false; }
  }
  return {
    studioInstalled: mcpCommandAvailable,
    mcpCommandAvailable,
    platform,
    architecture: process.arch,
    connectorVersion,
    mcpCommand,
    backendUrl,
    logLocation,
    mcpServerVersion: snapshot?.mcpServerVersion ?? null,
    mcpHealth: snapshot?.mcpHealth ?? "disconnected",
    backendHealth: snapshot?.cloudHealth ?? "disconnected",
    lastHeartbeatAt: snapshot?.lastHeartbeatAt ?? null,
    lastActivityAt: snapshot?.lastActivityAt ?? null,
    lastCommand: snapshot?.lastCommand ?? null,
  };
}
