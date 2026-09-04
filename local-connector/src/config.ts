import { existsSync, readFileSync, readdirSync, statSync, type Dirent } from "node:fs";
import { join } from "node:path";
import { ConnectorError } from "./errors.js";

export interface ConnectorConfig {
  apiUrl: string;
	webUrl: string;
  mcpCommand: string;
  mcpArgs: string[];
	requestTimeoutMs: number;
	mcpToolTimeoutMs: number;
  heartbeatMs: number;
  pollWaitMs: number;
  reconnectMinMs: number;
  reconnectMaxMs: number;
  verbose: boolean;
}

export const HELP_TEXT = `NexusRBX Local Connector

Usage: nexusrbx-local-connector [options]

Options:
	--api-url <url>          NexusRBX API base URL
	--web-url <url>          NexusRBX website URL for browser sign-in
  --mcp-command <path>     Roblox Studio MCP executable
  --mcp-arg <value>        MCP executable argument (repeatable)
	--request-timeout <ms>   Per-request timeout (default: 15000)
	--mcp-tool-timeout <ms>  Studio MCP tool timeout (default: 90000)
  --heartbeat <ms>         Heartbeat interval (default: 15000)
  --poll-wait <ms>         Long-poll duration (default: 20000)
  --verbose                Show sanitized diagnostic logs
  --help                   Show this help
  --version                Show connector version

Environment equivalents: NEXUSRBX_API_URL, NEXUSRBX_WEB_URL,
NEXUSRBX_MCP_COMMAND, NEXUSRBX_MCP_ARGS_JSON, NEXUSRBX_VERBOSE.
`;

export function loadConfig(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): ConnectorConfig {
  const values = new Map<string, string>();
  const mcpArgs: string[] = [];
  let verbose = env.NEXUSRBX_VERBOSE === "1" || env.NEXUSRBX_VERBOSE === "true";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--verbose") {
      verbose = true;
      continue;
    }
    if (argument === "--help" || argument === "--version") continue;
    if (!argument?.startsWith("--")) throw new ConnectorError("CONFIG_INVALID", `Unknown argument: ${argument}`);
    if (argument === "--mcp-arg") {
      const value = argv[index + 1];
      if (value === undefined) throw new ConnectorError("CONFIG_INVALID", `Missing value for ${argument}.`);
      mcpArgs.push(value);
      index += 1;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new ConnectorError("CONFIG_INVALID", `Missing value for ${argument}.`);
    }
    index += 1;
    values.set(argument, value);
  }

	const apiUrl = stripTrailingSlash(values.get("--api-url") ?? env.NEXUSRBX_API_URL ?? "https://api.nexusrbx.com");
	validateApiUrl(apiUrl);
	const webUrl = stripTrailingSlash(values.get("--web-url") ?? env.NEXUSRBX_WEB_URL ?? "https://nexusrbx.com");
	validateApiUrl(webUrl);

  let envMcpArgs: string[] = [];
  if (mcpArgs.length === 0 && env.NEXUSRBX_MCP_ARGS_JSON) {
    try {
      const parsed: unknown = JSON.parse(env.NEXUSRBX_MCP_ARGS_JSON);
      if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === "string")) throw new Error();
      envMcpArgs = parsed;
    } catch {
      throw new ConnectorError("CONFIG_INVALID", "NEXUSRBX_MCP_ARGS_JSON must be a JSON array of strings.");
    }
  }

  const defaultLaunch = defaultMcpLaunch(platform, env);
  const mcpCommand = values.get("--mcp-command") ?? env.NEXUSRBX_MCP_COMMAND ?? defaultLaunch.command;
  const resolvedArgs = mcpArgs.length > 0 ? mcpArgs : envMcpArgs.length > 0 ? envMcpArgs : defaultLaunch.args;
	return {
		apiUrl,
		webUrl,
    mcpCommand,
    mcpArgs: resolvedArgs,
		requestTimeoutMs: parseDuration(values.get("--request-timeout") ?? env.NEXUSRBX_REQUEST_TIMEOUT_MS, 15_000, 1_000, 120_000),
		mcpToolTimeoutMs: parseDuration(values.get("--mcp-tool-timeout") ?? env.NEXUSRBX_MCP_TOOL_TIMEOUT_MS, 90_000, 5_000, 300_000),
    heartbeatMs: parseDuration(values.get("--heartbeat") ?? env.NEXUSRBX_HEARTBEAT_MS, 15_000, 5_000, 300_000),
    pollWaitMs: parseDuration(values.get("--poll-wait") ?? env.NEXUSRBX_POLL_WAIT_MS, 20_000, 1_000, 30_000),
    reconnectMinMs: 1_000,
    reconnectMaxMs: 30_000,
    verbose,
  };
}

function defaultMcpLaunch(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): { command: string; args: string[] } {
  if (platform === "darwin") {
    return { command: "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP", args: [] };
  }
  if (platform === "win32") {
    const executable = findWindowsStudioMcpExecutable(env.LOCALAPPDATA);
    if (executable) return { command: executable, args: [] };
    return { command: "cmd.exe", args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"] };
  }
  throw new ConnectorError(
    "MCP_COMMAND_REQUIRED",
    "Roblox Studio MCP has no known default for this operating system. Set --mcp-command explicitly.",
  );
}

export function findWindowsStudioMcpExecutable(localAppData: string | undefined): string | null {
  const root = localAppData?.trim();
  if (!root) return null;

  const robloxRoot = join(root, "Roblox");
  const batchPath = join(robloxRoot, "mcp.bat");
  try {
    const batchSource = readFileSync(batchPath, "utf8");
    for (const match of batchSource.matchAll(/"([^"\r\n]*StudioMCP\.exe)"/gi)) {
      const candidate = match[1]?.trim();
      if (candidate && isFile(candidate)) return candidate;
    }
  } catch {
    // A missing or malformed launcher falls through to installed-version discovery.
  }

  const versionsRoot = join(robloxRoot, "Versions");
  let entries: Dirent[];
  try {
    entries = readdirSync(versionsRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const path = join(versionsRoot, entry.name, "StudioMCP.exe");
      try {
        const info = statSync(path);
        return info.isFile() ? [{ path, modifiedAt: info.mtimeMs }] : [];
      } catch {
        return [];
      }
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  return candidates[0]?.path ?? null;
}

function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function validateApiUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConnectorError("CONFIG_INVALID", "The NexusRBX API URL is invalid.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new ConnectorError("CONFIG_INSECURE_API", "The NexusRBX API must use HTTPS (HTTP is allowed only for localhost)." );
  }
  if (url.username || url.password) throw new ConnectorError("CONFIG_INVALID", "Credentials must not be embedded in the API URL.");
}

function parseDuration(raw: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ConnectorError("CONFIG_INVALID", `Duration must be an integer from ${minimum} to ${maximum} milliseconds.`);
  }
  return value;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
