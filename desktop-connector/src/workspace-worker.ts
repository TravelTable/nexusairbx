import { parentPort, workerData } from "node:worker_threads";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { LocalStudio, RobloxStudioMcpClient, ConsoleLogger, CONNECTOR_VERSION, loadConfig } from "nexusrbx-local-connector";
import { WorkspaceStore } from "./workspace-store.js";
import { WorkspaceRuntime } from "./workspace-runtime.js";
import { WorkspaceFiles, MAX_FILE_BYTES } from "./workspace-files.js";

const port = parentPort!;
const data = workerData as { accountId: string; directory: string; apiUrl: string };
const accountDirectory = join(data.directory, createHash("sha256").update(data.accountId).digest("hex"));
mkdirSync(accountDirectory, { recursive: true });
const store = new WorkspaceStore(join(accountDirectory, "workspace.sqlite"));
const config = loadConfig([], { ...process.env, NEXUSRBX_API_URL: data.apiUrl });
const mcp = new RobloxStudioMcpClient({ command: config.mcpCommand, args: config.mcpArgs,
  resolveLaunch: () => { const latest = loadConfig([]); return { command: latest.mcpCommand, args: latest.mcpArgs }; },
  connectorVersion: CONNECTOR_VERSION, requestTimeoutMs: config.requestTimeoutMs, toolTimeoutMs: config.mcpToolTimeoutMs, logger: new ConsoleLogger(false) });
let session: { token: string; expiresAt: number } | null = null;
let sessionPending: Promise<void> | null = null;
let resolveSession: (() => void) | null = null;
let rejectSession: ((error: Error) => void) | null = null;
async function ensureSession() {
  if (session && session.expiresAt > Date.now() + 30000) return;
  if (!sessionPending) {
    sessionPending = new Promise<void>((resolve, reject) => { resolveSession = resolve; rejectSession = reject; port.postMessage({ event: "session-needed" }); })
      .finally(() => { sessionPending = null; resolveSession = null; rejectSession = null; });
  }
  await sessionPending;
}
const runtime = new WorkspaceRuntime(data.accountId, store, new LocalStudio(mcp, store), {
  async uploadFile(hash, bytes) {
    await ensureSession();
    const response = await fetch(`${data.apiUrl}/api/desktop/v1/blobs/${hash}`, { method: "PUT", headers: { Authorization: `Bearer ${session!.token}`, "Content-Type": "application/octet-stream" }, body: Buffer.from(bytes), signal: AbortSignal.timeout(60000) });
    if (response.status === 401) session = null;
    if (!response.ok) throw new Error("Cloud file upload failed. Your file is saved on this device.");
  },
  async downloadFile(hash) {
    await ensureSession();
    const response = await fetch(`${data.apiUrl}/api/desktop/v1/blobs/${hash}`, { headers: { Authorization: `Bearer ${session!.token}` }, signal: AbortSignal.timeout(60000) });
    if (response.status === 401) session = null;
    if (!response.ok) throw new Error("The file could not be downloaded.");
    const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_FILE_BYTES) throw new Error("The file exceeds 10 MiB."); chunks.push(value); }
      return Buffer.concat(chunks);
    } finally { await reader.cancel(); }
  },
  async request(path, body, signal, onDelta) {
    await ensureSession();
    const timeout = AbortSignal.timeout(path === "/calls" ? 260000 : 15000);
    const response = await fetch(`${data.apiUrl}/api/desktop/v1${path}`, {
      method: body === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${session!.token}`, "Content-Type": "application/json", Accept: onDelta ? "application/x-ndjson" : "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 401) session = null;
    let result;
    if (response.headers.get('content-type')?.includes('application/x-ndjson')) {
      const reader = response.body!.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        if (buffer.length > 1000000) throw new Error('Cloud response exceeded the limit.');
        let end;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (typeof event.delta === 'string') onDelta?.(event.delta);
          else result = event;
        }
        if (chunk.done) break;
      }
      if (!result || result.error) throw new Error(result?.error || 'The cloud stream ended before its result.');
    } else result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || `Cloud request failed (${response.status}).`);
    return result;
  },
}, () => port.postMessage({ event: "changed" }), new WorkspaceFiles(join(accountDirectory, "files")));

port.on("message", async message => {
  if (message.type === "session") { session = message.value; resolveSession?.(); return; }
  if (message.type === "session-error") { rejectSession?.(new Error(message.error)); return; }
  try {
    let value: unknown;
    switch (message.method) {
      case "snapshot": value = runtime.snapshot(message.args[0]); break;
      case "createConversation": value = runtime.createConversation(message.args[0]); break;
      case "list": value = runtime.list(message.args[0]); break;
      case "getEntity": value = runtime.getEntity(message.args[0]); break;
      case "saveEntity": value = runtime.saveEntity(message.args[0]); break;
      case "editPlan": value = runtime.editPlan(message.args[0], message.args[1]); break;
      case "resolveConflict": value = runtime.resolveConflict(message.args[0], message.args[1]); break;
      case "studioAction": value = await runtime.studioAction(message.args[0]); break;
      case "request": value = await runtime.request(message.args[0]); break;
      case "submit": value = runtime.submit(message.args[0]); break;
      case "cancel": value = await runtime.cancel(); break;
      case "resume": value = runtime.resume(message.args[0]); break;
      case "approveTool": value = runtime.approveTool(message.args[0], message.args[1]); break;
      case "studio": value = await runtime.studio.inspect(message.args[0]); break;
      case "approvePlan": value = runtime.approvePlan(message.args[0]); break;
      case "attachFile": value = runtime.attachFile(message.args[0], message.args[1], message.args[2]); break;
      case "file": value = await runtime.file(message.args[0]); break;
      case "sync": value = await runtime.sync(); break;
      case "visible": value = runtime.setVisible(Boolean(message.args[0])); break;
      case "export": value = { ...runtime.snapshot(), conversations: store.list("conversation"), messages: store.list("message"), projects: store.list("project"), plans: store.list("plan"), planVersions: store.list("plan_version"), artifacts: store.list("artifact"), runs: store.list("run") }; break;
      case "close": value = await runtime.close(); break;
      default: throw new Error("Unsupported desktop action.");
    }
    port.postMessage({ id: message.id, value });
  } catch (error) { port.postMessage({ id: message.id, error: error instanceof Error ? error.message : "Desktop operation failed." }); }
});
port.postMessage({ event: "ready" });
void runtime.sync();
