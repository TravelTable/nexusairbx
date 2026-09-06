import { execFile } from "node:child_process";
import { win32 } from "node:path";
import { promisify } from "node:util";
import { ConnectorError } from "./errors.js";
import type { Logger } from "./logger.js";

export const STUDIO_MCP_PORT = 13469;
export interface PortOwner {
  pid: number;
  name: string;
  path: string;
  createdAt: string;
  sameUser: boolean;
}
export interface PortOperations {
  inspect(signal?: AbortSignal): Promise<PortOwner[]>;
  release(owner: PortOwner, signal?: AbortSignal): Promise<void>;
}

const execFileAsync = promisify(execFile);
// Read only process identity; never collect command lines, environment, or credentials.
const identityScript = String.raw`
$ErrorActionPreference = 'Stop'
$taskSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$taskPort = [int]$env:NEXUS_MCP_GUARD_PORT
function Get-TaskIdentity($taskProcess) {
  $taskOwner = Invoke-CimMethod -InputObject $taskProcess -MethodName GetOwnerSid
  [pscustomobject]@{
    pid = [int]$taskProcess.ProcessId
    name = [string]$taskProcess.Name
    path = [string]$taskProcess.ExecutablePath
    createdAt = $taskProcess.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
    sameUser = ($taskOwner.ReturnValue -eq 0 -and $taskOwner.Sid -eq $taskSid)
  }
}
function Get-TaskListeners {
  @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -eq $taskPort } | Select-Object -ExpandProperty OwningProcess -Unique)
}
`;

const inspectScript = identityScript + String.raw`
$taskOwners = @(foreach ($taskOwnerId in (Get-TaskListeners)) {
  $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$taskOwnerId"
  if ($taskProcess) { Get-TaskIdentity $taskProcess }
})
ConvertTo-Json -InputObject $taskOwners -Compress
`;

const releaseScript = identityScript + String.raw`
$taskExpected = $env:NEXUS_MCP_EXPECTED_OWNER | ConvertFrom-Json
$taskAllowedPath = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'ropilot\bin\ropilot-infra-helper.exe'))
function Test-TaskRopilot($taskIdentity) {
  $taskIdentity.sameUser -and $taskIdentity.name -ieq 'ropilot-infra-helper.exe' -and $taskIdentity.path -ieq $taskAllowedPath
}
# Re-check ownership and process creation time inside the process that will stop it.
# PID reuse, changed port ownership, another user, and relocated binaries fail closed.
if ([int]$taskExpected.pid -notin (Get-TaskListeners)) { throw 'MCP port ownership changed; retry discovery.' }
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$taskExpected.pid)"
if (-not $taskProcess) { throw 'The conflicting process exited.' }
$taskIdentity = Get-TaskIdentity $taskProcess
if (-not (Test-TaskRopilot $taskIdentity) -or $taskIdentity.createdAt -cne $taskExpected.createdAt -or $taskIdentity.path -ine $taskExpected.path) {
  throw 'Conflicting process identity changed; no process was stopped.'
}
# Ropilot's same-user supervisor otherwise immediately recreates its proxy.
# Never stop a general parent (Studio, a shell, an editor, or another application).
$taskParent = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskProcess.ParentProcessId)"
if ($taskParent -and $taskParent.CreationDate -le $taskProcess.CreationDate) {
  $taskParentIdentity = Get-TaskIdentity $taskParent
  if (Test-TaskRopilot $taskParentIdentity) {
    $taskParentHandle = Get-Process -Id $taskParentIdentity.pid -ErrorAction Stop
    if ($taskParentHandle.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ') -cne $taskParentIdentity.createdAt) { throw 'Supervisor identity changed.' }
    $taskParentHandle.Kill()
    [void]$taskParentHandle.WaitForExit(2000)
  }
}
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$taskExpected.pid)"
if ($taskProcess) {
  $taskIdentity = Get-TaskIdentity $taskProcess
  if (-not (Test-TaskRopilot $taskIdentity) -or $taskIdentity.createdAt -cne $taskExpected.createdAt) { throw 'Proxy identity changed.' }
  $taskHandle = Get-Process -Id $taskIdentity.pid -ErrorAction Stop
  if ($taskHandle.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ') -cne $taskIdentity.createdAt) { throw 'Proxy identity changed.' }
  $taskHandle.Kill()
  if (-not $taskHandle.WaitForExit(2000)) { throw 'Proxy did not exit.' }
}
`;

async function powershell(script: string, signal: AbortSignal | undefined, expected: PortOwner | undefined, options: { port?: number; appData?: string }): Promise<string> {
  const port = options.port ?? STUDIO_MCP_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port.");
  const executable = win32.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const { stdout } = await execFileAsync(executable, ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
    windowsHide: true, timeout: 12_000, maxBuffer: 64 * 1024,
    ...(signal ? { signal } : {}),
    env: { ...process.env, NEXUS_MCP_GUARD_PORT: String(port), ...(options.appData ? { APPDATA: options.appData } : {}), ...(expected ? { NEXUS_MCP_EXPECTED_OWNER: JSON.stringify(expected) } : {}) },
  });
  return stdout;
}

export function windowsPortOperations(options: { port?: number; appData?: string } = {}): PortOperations {
  return {
    async inspect(signal) {
      const parsed: unknown = JSON.parse((await powershell(inspectScript, signal, undefined, options)).replace(/^\uFEFF/, ""));
      if (!Array.isArray(parsed) || parsed.some(owner => !owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0
        || typeof owner.name !== "string" || typeof owner.path !== "string" || typeof owner.createdAt !== "string" || typeof owner.sameUser !== "boolean")) {
        throw new Error("Invalid MCP port inspection result.");
      }
      return parsed as PortOwner[];
    },
    async release(owner, signal) { await powershell(releaseScript, signal, owner, options); },
  };
}

function normalized(path: string): string { return win32.normalize(path).toLowerCase(); }
function isOfficial(path: string, localAppData: string): boolean {
  const relative = win32.relative(win32.join(localAppData, "Roblox", "Versions"), path);
  return /^version-[a-f0-9]+\\StudioMCP\.exe$/i.test(relative);
}

/** One bounded recovery per MCP client lifetime; no tool calls or mutations are replayed. */
export class McpPortGuard {
  #released = false;
  #pending: Promise<void> | null = null;
  constructor(private readonly logger: Logger, private readonly options: {
    operations?: PortOperations;
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
  } = {}) {}

  prepare(launch: { command: string; args: string[] }, signal?: AbortSignal): Promise<void> {
    if (this.#pending) return this.#pending;
    const pending = this.check(launch, signal).finally(() => { if (this.#pending === pending) this.#pending = null; });
    this.#pending = pending;
    return pending;
  }

  private async check(launch: { command: string; args: string[] }, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const env = this.options.env ?? process.env;
    if ((this.options.platform ?? process.platform) !== "win32" || !env.LOCALAPPDATA
      || launch.args.length > 0 || !isOfficial(launch.command, env.LOCALAPPDATA)
      || (env.MCP_PROXY_HTTP_PORT && env.MCP_PROXY_HTTP_PORT !== String(STUDIO_MCP_PORT))) return;
    const operations = this.options.operations ?? windowsPortOperations();
    let owners: PortOwner[];
    try { owners = await operations.inspect(signal); }
    catch { signal?.throwIfAborted(); this.logger.warn("Could not inspect the shared Studio MCP port; continuing with Roblox's handshake."); return; }
    signal?.throwIfAborted();
    const conflicts = owners.filter(owner => !isOfficial(owner.path, env.LOCALAPPDATA!));
    if (!conflicts.length) return;
    const owner = conflicts[0]!;
    const knownPath = env.APPDATA ? win32.join(env.APPDATA, "ropilot", "bin", "ropilot-infra-helper.exe") : "";
    const isRopilot = owner.name.toLowerCase() === "ropilot-infra-helper.exe" && !!knownPath && normalized(owner.path) === normalized(knownPath);
    if (owners.length !== 1 || !isRopilot || !owner.sameUser || this.#released || env.NEXUSRBX_AUTO_RESOLVE_MCP_CONFLICTS === "0") {
      throw portConflict(owner, isRopilot);
    }
    this.#released = true;
    this.logger.warn("Ropilot is occupying Studio's MCP port. Releasing its background proxy before connecting.", { port: STUDIO_MCP_PORT });
    try { await operations.release(owner, signal); }
    catch { signal?.throwIfAborted(); throw portConflict(owner, true); }
    signal?.throwIfAborted();
    // If a supervisor reclaims the port, stop here instead of repeatedly killing it.
    let remaining: PortOwner[];
    try { remaining = await operations.inspect(signal); }
    catch { signal?.throwIfAborted(); throw portConflict(owner, true); }
    signal?.throwIfAborted();
    const blocker = remaining.find(candidate => !isOfficial(candidate.path, env.LOCALAPPDATA!));
    if (blocker) throw portConflict(blocker, normalized(blocker.path) === normalized(knownPath));
    this.logger.info("Released Ropilot's conflicting background proxy. Connecting through Roblox Studio MCP.");
  }
}

function portConflict(owner: PortOwner, ropilot: boolean): ConnectorError {
  const app = ropilot ? "Ropilot" : win32.basename(owner.name).replace(/[^a-zA-Z0-9 ._()-]/g, "").slice(0, 80) || "Another application";
  const diagnostic = `${app} is using Roblox Studio's MCP port ${STUDIO_MCP_PORT}. Close its Studio integration, then try again.`;
  return new ConnectorError("MCP_PORT_CONFLICT", diagnostic, { retryable: false, details: { diagnostic, conflictingApp: app, port: STUDIO_MCP_PORT } });
}
