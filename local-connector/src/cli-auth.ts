import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import type { NexusBackendClient } from "./backend-client.js";
import type { ConnectorSession } from "./types.js";

const execFileAsync = promisify(execFile);
const SERVICE = "NexusRBX CLI";
const ACCOUNT = "connector-session";

export async function loginWithBrowser(options: { webUrl: string; backend: NexusBackendClient; connectorVersion: string; signal?: AbortSignal }): Promise<ConnectorSession> {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callback = await createLoopbackCallback(state);
  try {
    const url = new URL("/cli/authorize", options.webUrl);
    url.searchParams.set("redirect_uri", callback.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("connector_version", options.connectorVersion);
    openBrowser(url.toString());
    const code = await callback.waitForCode(options.signal);
    const session = await options.backend.exchangeCliAuthorization({ code, codeVerifier: verifier, redirectUri: callback.redirectUri }, options.signal);
    await saveCliSession(session);
    return session;
  } finally { callback.close(); }
}

export async function loadCliSession(): Promise<ConnectorSession | null> {
  try {
    let value = "";
    if (process.platform === "darwin") value = (await execFileAsync("security", ["find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"])).stdout.trim();
    else if (process.platform === "linux") value = (await execFileAsync("secret-tool", ["lookup", "service", SERVICE, "account", ACCOUNT])).stdout.trim();
    else if (process.platform === "win32") value = await windowsCredential("decrypt");
    else return null;
    return JSON.parse(value) as ConnectorSession;
  } catch { return null; }
}

export async function saveCliSession(session: ConnectorSession): Promise<void> {
  const value = JSON.stringify(session);
  if (process.platform === "darwin") await execFileAsync("security", ["add-generic-password", "-U", "-s", SERVICE, "-a", ACCOUNT, "-w", value]);
  else if (process.platform === "linux") await runWithInput("secret-tool", ["store", "--label=NexusRBX CLI", "service", SERVICE, "account", ACCOUNT], value);
  else if (process.platform === "win32") await windowsCredential("encrypt", value);
  else throw new Error("This platform has no supported OS credential store.");
}

export async function deleteCliSession(): Promise<void> {
  try {
    if (process.platform === "darwin") await execFileAsync("security", ["delete-generic-password", "-s", SERVICE, "-a", ACCOUNT]);
    else if (process.platform === "linux") await execFileAsync("secret-tool", ["clear", "service", SERVICE, "account", ACCOUNT]);
    else if (process.platform === "win32") await windowsCredential("delete");
  } catch { /* already absent */ }
}

async function createLoopbackCallback(expectedState: string) {
  let resolveCode!: (code: string) => void; let rejectCode!: (error: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") return void response.writeHead(404).end();
    if (url.searchParams.get("state") !== expectedState) { response.writeHead(400).end("Invalid authorization state."); rejectCode(new Error("CLI authorization state mismatch.")); return; }
    const code = url.searchParams.get("code");
    if (!code) { response.writeHead(400).end("Authorization code missing."); rejectCode(new Error("Authorization code missing.")); return; }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); response.end("<!doctype html><h2>NexusRBX connected</h2><p>You can close this window.</p>"); resolveCode(code);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Could not create CLI callback server.");
  return { redirectUri: `http://127.0.0.1:${address.port}/callback`, waitForCode: (signal?: AbortSignal) => signal ? Promise.race([codePromise, new Promise<string>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))]) : codePromise, close: () => server.close() };
}

function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd.exe" : "xdg-open";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "start", "", url] : [url];
  spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

async function runWithInput(command: string, args: string[], input: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (data) => { out += data; });
    child.stderr.on("data", (data) => { err += data; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || `${command} failed`));
    });
    child.stdin.end(input);
  });
}

async function windowsCredential(mode: "encrypt" | "decrypt" | "delete", value = ""): Promise<string> {
  const path = `${process.env.APPDATA}\\NexusRBX\\cli-session.dpapi`;
  const script = mode === "encrypt" ? `$p='${path.replace(/'/g, "''")}';New-Item -ItemType Directory -Force (Split-Path $p)|Out-Null;$input|ConvertTo-SecureString -AsPlainText -Force|ConvertFrom-SecureString|Set-Content -NoNewline $p`
    : mode === "decrypt" ? `$p='${path.replace(/'/g, "''")}';$s=Get-Content -Raw $p|ConvertTo-SecureString;$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}`
    : `$p='${path.replace(/'/g, "''")}';if(Test-Path $p){Remove-Item -LiteralPath $p}`;
  return runWithInput("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], value);
}
