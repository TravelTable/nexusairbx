import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, Notification, powerMonitor, safeStorage, shell, Tray } from "electron";
import electronUpdater from "electron-updater";
import { appendFile, chmod, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import {
  CONNECTOR_VERSION, ConsoleLogger, loadConfig, loginWithBrowser, NexusBackendClient, NexusLocalConnector, RobloxStudioMcpClient,
  type ConnectorLifecycleState, type ConnectorSession, type ConnectorTelemetry,
} from "nexusrbx-local-connector";
import type { CompanionPreferences, CompanionSnapshot, CompanionState, CompanionUpdateState, RendererDestination, WindowMode } from "./contracts.js";
import { collectDiagnostics } from "./diagnostics.js";
import { DEFAULT_PREFERENCES, getAutoStart, PreferenceStore, setAutoStart, validatePreferenceUpdate } from "./preferences.js";
import { EncryptedTokenStore, type EncryptedStorage, type StoredConnectorSession } from "./token-store.js";
import { ConnectorUpdater } from "./updater.js";
import { ConnectionAttemptCoordinator } from "./connection-attempt.js";
import { completedConnectionPatch, connectionFailureCopy } from "./connection-state.js";
import { connectionLogSink } from "./connection-log.js";
import { isTerminalSessionError, resetLocalSession } from "./session-lifecycle.js";
import { WorkspaceHost } from "./workspace-host.js";

// electron-updater is published as CommonJS. Reading autoUpdater from its default
// namespace keeps the packaged ESM main process compatible with Node's CJS bridge.
const { autoUpdater } = electronUpdater;

const HELP_PAGE = "https://www.nexusrbx.com/docs/studio-plugin";
const DOWNLOADS_PAGE = "https://www.nexusrbx.com/downloads";
const API_URL = process.env.NEXUSRBX_API_URL || "https://api.nexusrbx.com";
const COMPACT_SIZE = { width: 460, height: 640 };
const SETTINGS_SIZE = { width: 760, height: 620 };
const STARTUP_WATCHDOG_MS = 35_000;
const SECURE_WEB_PREFERENCES = {
  preload: join(import.meta.dirname, "preload.cjs"),
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
} as const;
const INSTALLED_SMOKE_MODE = process.argv.includes("--smoke-test") && process.env.NEXUS_CONNECTOR_CI_SMOKE === "1";
const SMOKE_REPORT_PATH = process.env.NEXUS_CONNECTOR_SMOKE_REPORT;

async function recordUpdaterError(message: string): Promise<void> {
  const logDirectory = app.getPath("logs");
  await mkdir(logDirectory, { recursive: true });
  await appendFile(join(logDirectory, "updater.log"), `${new Date().toISOString()} ${message}\n`, { encoding: "utf8", mode: 0o600 });
}
if (INSTALLED_SMOKE_MODE) {
  // Keep verification isolated from a customer's running connector and stored
  // session. A unique user-data directory also gives the smoke process its own
  // single-instance lock when the normal app is already open.
  app.setPath("userData", join(tmpdir(), `nexusrbx-connector-smoke-${process.pid}`));
}

export function validateWindowMode(value: unknown): WindowMode {
  if (value !== "compact" && value !== "settings") throw new TypeError("Invalid window mode.");
  return value;
}

class DesktopController {
  #workspaceMode = false;
  #workspaceOpening: Promise<unknown> | null = null;
  #window: BrowserWindow | null = null;
  #attempts = new ConnectionAttemptCoordinator();
  #startupWatchdog: ReturnType<typeof setTimeout> | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #backend: NexusBackendClient | null = null;
  #snapshot: CompanionSnapshot;
  #store: EncryptedTokenStore;
  #preferenceStore: PreferenceStore;
  #preferences: CompanionPreferences = { ...DEFAULT_PREFERENCES };
  #tray: Tray | null = null;
  #studioInstalled = true;
  #lastNotifiedState: CompanionState | null = null;
  #hasExplainedCloseToTray = false;
  #discoveryComplete = false;
  #logSink = connectionLogSink(app.getPath("logs"));

  constructor() {
    const userData = app.getPath("userData");
    this.#store = new EncryptedTokenStore(fileEncryptedStorage(join(userData, "connector-session.bin")));
    this.#preferenceStore = new PreferenceStore(join(userData, "preferences.json"));
    this.#snapshot = this.makeSnapshot("awaiting_sign_in", "Sign in with your browser to connect NexusRBX.");
  }

  async initialize(): Promise<void> {
    this.#preferences = await this.#preferenceStore.load();
    this.#workspaceMode = this.#preferences.workspaceEnabled === true;
    this.#preferences.autoStart = getAutoStart(app);
    this.#snapshot = { ...this.#snapshot, autoStart: this.#preferences.autoStart, preferences: { ...this.#preferences } };
  }

  attachWindow(window: BrowserWindow): void { this.#window = window; this.publish(); }
  get state(): CompanionSnapshot { return this.#snapshot; }
  get preferences(): CompanionPreferences { return this.#preferences; }
  get hasTray(): boolean { return this.#tray !== null; }

  async diagnostics() {
    const config = this.config();
    return collectDiagnostics({
      mcpCommand: config.mcpCommand, mcpArgs: config.mcpArgs, connectorVersion: CONNECTOR_VERSION, backendUrl: config.apiUrl,
      logLocation: app.getPath("logs"), snapshot: this.#snapshot,
    });
  }

  async start(): Promise<CompanionSnapshot> {
    if (this.#workspaceMode) {
      const saved = await this.#store.load();
      if (!saved) this.setSignInState();
      else this.patchSnapshot({ state: "stopped", message: "Open your desktop workspace to continue. History is available offline." });
      return this.state;
    }
    this.clearReconnectTimer();
    if (this.#attempts.active) return this.state;
    const saved = await this.#store.load();
    if (!saved) { this.setSignInState(); return this.state; }
    await this.startSession(saved);
    return this.state;
  }

  async signIn(): Promise<CompanionSnapshot> {
    await workspaceHost?.close();
    this.#workspaceMode = this.#preferences.workspaceEnabled === true;
    if (this.#attempts.active) await this.stop(false);
    const config = this.config();
    const logger = new ConsoleLogger(config.verbose, this.#logSink);
    const backend = this.createBackend(config, logger);
    this.patchSnapshot({ state: "connecting", message: "Waiting for browser sign-in…", connectionStage: "cloud", cloudHealth: "connecting", runtimeHealth: "disconnected", mcpHealth: "disconnected" });
    try {
      const session = await loginWithBrowser({
        webUrl: config.webUrl,
        backend,
        connectorVersion: CONNECTOR_VERSION,
      });
      if (this.#workspaceMode) {
        await this.#store.save(session); this.#backend = backend;
        this.patchSnapshot({ state: "stopped", message: "Signed in. Open your desktop workspace to continue.", cloudHealth: "connected", connectionStage: null });
      } else await this.startSession(session, backend, logger);
    } catch (error) {
      await backend.revokeCurrentSession().catch(() => undefined);
      logger.warn("Browser sign-in did not complete.", { error: error instanceof Error ? error.message : "unknown" });
      this.setSignInState("Browser sign-in did not complete. Try again when you are ready.");
    }
    return this.state;
  }

  async retry(): Promise<CompanionSnapshot> { await this.stop(false); return this.start(); }

  async stop(publish = true): Promise<CompanionSnapshot> {
    this.clearStartupWatchdog();
    this.clearReconnectTimer();
    await this.#attempts.stop();
    this.#backend = null;
    if (publish) this.patchSnapshot({ state: "stopped", message: "Connector paused. Your encrypted sign-in is retained.", cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null });
    return this.state;
  }

  async revokeSession(): Promise<CompanionSnapshot> {
    await workspaceHost?.close();
    this.#workspaceMode = this.#preferences.workspaceEnabled === true;
    let backend = this.#backend;
    if (!backend) {
      const saved = await this.#store.load();
      if (saved) {
        const config = this.config();
        const logger = new ConsoleLogger(config.verbose, this.#logSink);
        backend = this.createBackend(config, logger);
        backend.restoreSession(saved);
      }
    }
    const remoteError = await resetLocalSession({
      revokeRemote: backend ? async () => { await backend.revokeCurrentSession(AbortSignal.timeout(10_000)); } : undefined,
      stopLocal: () => this.stop(false).then(() => undefined),
      clearLocal: () => this.#store.clear(),
    });
    backend?.clearToken();
    if (remoteError) {
      const config = this.config();
      new ConsoleLogger(config.verbose, this.#logSink).warn("Remote session revocation failed; local sign-in was still cleared.", {
        error: remoteError instanceof Error ? remoteError.message : "unknown",
      });
    }
    this.setSignInState();
    return this.state;
  }

  async openHelp(): Promise<void> { await shell.openExternal(HELP_PAGE); }
  async openDownloads(): Promise<void> { await shell.openExternal(DOWNLOADS_PAGE); }

  async setPreference(key: unknown, value: unknown): Promise<CompanionSnapshot> {
    const update = validatePreferenceUpdate(key, value);
    const normalizedValue = update.key === "autoStart" ? setAutoStart(app, update.value as boolean) : update.value;
    this.#preferences = { ...this.#preferences, [update.key]: normalizedValue };
    await this.#preferenceStore.save(this.#preferences);
    connectorUpdater?.setAutomaticUpdates(this.#preferences.automaticUpdates);
    this.patchSnapshot({ autoStart: this.#preferences.autoStart, preferences: { ...this.#preferences } });
    if (update.key === "reconnectDelayMs" || (update.key === "autoReconnect" && normalizedValue === true)) void this.retry();
    return this.state;
  }

  async copyDiagnostics(): Promise<boolean> { clipboard.writeText(JSON.stringify(await this.diagnostics(), null, 2)); return true; }
  async openLogs(): Promise<void> { await mkdir(app.getPath("logs"), { recursive: true }); await shell.openPath(app.getPath("logs")); }
  resizeWindow(mode: WindowMode): void { const size = mode === "settings" ? SETTINGS_SIZE : COMPACT_SIZE; this.#window?.setMinimumSize(size.width, size.height); this.#window?.setSize(size.width, size.height, true); }
  setFullscreen(fullscreen: boolean): void { this.#window?.setFullScreen(Boolean(fullscreen)); }
  show(destination: RendererDestination = "home"): void { this.#window?.show(); this.#window?.focus(); this.#window?.webContents.send("connector:navigate", destination); }
  closeWindow(): void {
    if (!this.#preferences.minimizeToTray) { app.quit(); return; }
    this.#window?.hide();
    if (!this.#hasExplainedCloseToTray) {
      this.#hasExplainedCloseToTray = true;
      this.notify("Still running in the background", "NexusRBX Connector will stay available from the system tray.");
    }
  }

  setUpdateState(updateState: CompanionUpdateState): void { this.patchSnapshot({ updateState }); }
  sendNotification(title: string, body: string): void { this.notify(title, body); }
  async checkForUpdates(): Promise<CompanionSnapshot> { await connectorUpdater?.checkNow(); return this.state; }

  configureTray(): void {
    let icon = nativeImage.createFromPath(join(import.meta.dirname, "renderer", "logo.png")).resize({ width: 18, height: 18 });
    if (process.platform === "darwin") icon = icon.resize({ width: 18, height: 18 });
    this.#tray = new Tray(icon);
    if (process.platform === "darwin") this.#tray.setImage(icon);
    this.rebuildTray();
    this.#tray.on("double-click", () => this.show());
  }

  private config() {
    const base = loadConfig([], { ...process.env, NEXUSRBX_API_URL: API_URL });
    return { ...base, reconnectMinMs: this.#preferences.reconnectDelayMs, reconnectMaxMs: Math.max(this.#preferences.reconnectDelayMs, base.reconnectMaxMs) };
  }

  async workspaceSession() {
    if (!this.#backend) {
      const saved = await this.#store.load();
      if (!saved) throw new Error("Sign in using Connection settings first.");
      this.#backend = this.createBackend(this.config(), new ConsoleLogger(false, this.#logSink));
      this.#backend.restoreSession(saved);
    }
    return this.#backend.desktopSession();
  }

  async openWorkspace() {
    if (this.#workspaceOpening) return this.#workspaceOpening;
    this.#workspaceOpening = (async () => {
      const saved = await this.#store.load();
      if (!saved) throw new Error("Sign in using Connection settings first.");
      if (!this.#workspaceMode) {
        await this.stop(false);
        this.#workspaceMode = true;
        this.#preferences = { ...this.#preferences, workspaceEnabled: true };
        await this.#preferenceStore.save(this.#preferences);
        this.patchSnapshot({ state: "stopped", message: "Desktop workspace owns the local Studio connection. Cloud command polling is paused.", cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected" });
      }
      await workspaceHost.start(saved.userId);
      mainWindow?.setResizable(true); mainWindow?.setMinimumSize(800, 600); mainWindow?.setSize(1180, 800);
      return workspaceHost.call("snapshot");
    })().finally(() => { this.#workspaceOpening = null; });
    return this.#workspaceOpening;
  }

  private createBackend(config: ReturnType<typeof loadConfig>, logger: ConsoleLogger): NexusBackendClient {
    return new NexusBackendClient({
      apiUrl: config.apiUrl,
      connectorVersion: CONNECTOR_VERSION,
      requestTimeoutMs: config.requestTimeoutMs,
      logger,
      onSessionUpdated: (session) => this.#store.save(session),
      onSessionCleared: () => this.#store.clear(),
    });
  }

  private async startSession(session: StoredConnectorSession | ConnectorSession, existingBackend?: NexusBackendClient, existingLogger?: ConsoleLogger): Promise<void> {
    if (this.#attempts.active) return;
    const config = this.config();
    const logger = existingLogger ?? new ConsoleLogger(config.verbose, this.#logSink);
    const backend = existingBackend ?? this.createBackend(config, logger);
    if (!existingBackend) backend.restoreSession(session);
    this.#backend = backend;
    this.#discoveryComplete = false;
    const diagnostics = await this.diagnostics();
    this.#studioInstalled = diagnostics.studioInstalled;
    this.patchSnapshot({ state: this.#studioInstalled ? "connecting" : "studio_not_installed", message: this.#studioInstalled ? "Starting the local connector…" : "Roblox Studio MCP was not found.", cloudHealth: "connected", runtimeHealth: "connecting", mcpHealth: "disconnected", connectionStage: "runtime", degradedReason: null, experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, mcpServerVersion: null, lastCommand: null, connectionFailure: null });
    const mcp = new RobloxStudioMcpClient({
      resolveLaunch: () => { const latest = this.config(); return { command: latest.mcpCommand, args: latest.mcpArgs }; },
      command: config.mcpCommand,
      args: config.mcpArgs,
      connectorVersion: CONNECTOR_VERSION,
      requestTimeoutMs: config.requestTimeoutMs,
      toolTimeoutMs: config.mcpToolTimeoutMs,
      logger,
    });
    const attempt = this.#attempts.start(async ({ id, signal }) => {
      const connector = new NexusLocalConnector({
        config,
        connectorVersion: CONNECTOR_VERSION,
        backend,
        mcp,
        logger,
        clearTokenOnShutdown: false,
        shouldAutoReconnect: () => this.#preferences.autoReconnect,
        onLifecycleState: (state) => this.onConnectorState(id, state),
        onTelemetry: (telemetry) => this.onTelemetry(id, telemetry),
      });
      await connector.runClaimed(session, signal);
    });
    this.armStartupWatchdog(attempt.id);
    void attempt.completion
      .catch((error: unknown) => this.handleUnexpectedSessionEnd(attempt.id, attempt.signal, backend, logger, error))
      .catch((error: unknown) => logger.warn("Connector recovery failed.", { error: error instanceof Error ? error.message : "unknown" }));
  }

  private async handleUnexpectedSessionEnd(attemptId: number, signal: AbortSignal, backend: NexusBackendClient, logger: ConsoleLogger, error: unknown): Promise<void> {
    if (signal.aborted) return;
    const active = this.#attempts.active;
    if (active && active.id !== attemptId) return;
    this.clearStartupWatchdog();
    if (this.#backend === backend) this.#backend = null;
    backend.clearToken();

    if (isTerminalSessionError(error)) {
      await this.#store.clear();
      this.setSignInState("Your NexusRBX session expired or was revoked. Sign in again.");
      logger.warn("Stored connector sign-in was rejected and has been cleared.", { error: error instanceof Error ? error.message : "unknown" });
      return;
    }

    const willRetry = this.#preferences.autoReconnect;
    this.patchSnapshot({
      state: willRetry ? "degraded" : "connector_offline",
      degradedReason: willRetry ? "runtime_failure" : null,
      message: willRetry ? "The connector stopped unexpectedly. Reconnecting automatically…" : "The connector is offline.",
      cloudHealth: "disconnected",
      runtimeHealth: "disconnected",
      mcpHealth: "disconnected",
      connectionStage: null,
      experienceName: null,
      supportedToolCount: 0,
      supportedTools: [],
      lastActivityAt: null,
      lastHeartbeatAt: null,
      mcpServerVersion: null,
      lastCommand: null,
    });
    logger.warn("Desktop connector session ended.", { error: error instanceof Error ? error.message : "unknown" });
    if (willRetry) this.scheduleReconnect();
  }

  private onConnectorState(attemptId: number, state: ConnectorLifecycleState): void {
    if (!this.#attempts.isCurrent(attemptId)) return;
    if (state === "ready" || state === "degraded") {
      this.#discoveryComplete = true;
      this.reconcileCompletedConnection();
    } else if (state === "studio_mcp_unavailable") {
      this.#discoveryComplete = false;
      this.patchSnapshot({
        state: this.#studioInstalled ? "studio_mcp_unavailable" : "studio_not_installed",
        message: connectionFailureCopy({ ...this.#snapshot, state: this.#studioInstalled ? "studio_mcp_unavailable" : "studio_not_installed" }).message,
        runtimeHealth: "connected",
        mcpHealth: "warning",
        connectionStage: null,
      });
    }
    else if (state === "connecting") this.patchSnapshot({ state: "connecting", message: "Starting the local connector…", runtimeHealth: "connecting", connectionStage: "runtime" });
  }

  private onTelemetry(attemptId: number, telemetry: ConnectorTelemetry): void {
    if (!this.#attempts.isCurrent(attemptId)) return;
    const patch: Partial<CompanionSnapshot> = {};
    if (telemetry.connectionFailure !== undefined) patch.connectionFailure = telemetry.connectionFailure;
    if (telemetry.stage) patch.connectionStage = telemetry.stage === "ready" ? null : telemetry.stage;
    if (telemetry.cloudConnected !== undefined) patch.cloudHealth = telemetry.cloudConnected ? "connected" : "warning";
    if (telemetry.mcpConnected !== undefined) patch.mcpHealth = telemetry.mcpConnected ? "connected" : "warning";
    if (telemetry.stage === "runtime") patch.runtimeHealth = "connecting";
    if (telemetry.stage === "studio_detection" || telemetry.stage === "mcp" || telemetry.stage === "tool_discovery" || telemetry.stage === "ready") patch.runtimeHealth = "connected";
    if (telemetry.supportedTools) patch.supportedTools = telemetry.supportedTools.slice(0, 200);
    if (telemetry.supportedToolCount !== undefined) patch.supportedToolCount = Math.max(0, telemetry.supportedToolCount);
    if (telemetry.mcpServerVersion !== undefined) patch.mcpServerVersion = telemetry.mcpServerVersion.slice(0, 80) || null;
    if (telemetry.experienceName !== undefined) patch.experienceName = telemetry.experienceName.slice(0, 160) || null;
    if (telemetry.lastHeartbeatAt) patch.lastHeartbeatAt = telemetry.lastHeartbeatAt;
    if (telemetry.lastActivityAt) patch.lastActivityAt = telemetry.lastActivityAt;
    if (telemetry.lastCommand) patch.lastCommand = telemetry.lastCommand;
    if (telemetry.degradedReason) patch.degradedReason = telemetry.degradedReason;
    this.patchSnapshot(patch);
    if (telemetry.stage === "ready") this.#discoveryComplete = true;
    if (this.#discoveryComplete) this.reconcileCompletedConnection();
  }

  private reconcileCompletedConnection(): void {
    const patch = completedConnectionPatch(this.#snapshot);
    if (patch) this.patchSnapshot(patch);
  }

  private armStartupWatchdog(attemptId: number): void {
    this.clearStartupWatchdog();
    this.#startupWatchdog = setTimeout(() => { void this.recoverStalledStartup(attemptId); }, STARTUP_WATCHDOG_MS);
  }

  private clearStartupWatchdog(): void {
    if (this.#startupWatchdog) clearTimeout(this.#startupWatchdog);
    this.#startupWatchdog = null;
  }

  private clearReconnectTimer(): void {
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      void this.start().catch(() => undefined);
    }, this.#preferences.reconnectDelayMs);
  }

  private async recoverStalledStartup(attemptId: number): Promise<void> {
    if (!this.#attempts.isCurrent(attemptId) || this.#snapshot.state !== "connecting") return;
    this.patchSnapshot({
      state: "studio_mcp_unavailable",
      message: "Studio took too long to respond. Reconnecting automatically…",
      runtimeHealth: "connected",
      mcpHealth: "warning",
      connectionStage: null,
      degradedReason: "mcp_initialization_failed",
    });
    await this.stop(false);
    if (this.#preferences.autoReconnect) await this.start();
  }

  private makeSnapshot(state: CompanionState, message: string): CompanionSnapshot {
    return { state, message, updatedAt: Date.now(), autoStart: getAutoStart(app), updateState: "idle", preferences: { ...this.#preferences }, cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null, degradedReason: null, experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, connectorVersion: CONNECTOR_VERSION, mcpServerVersion: null, lastCommand: null, connectionFailure: null };
  }
  private setSignInState(message = "Sign in with your browser to connect NexusRBX."): void { this.patchSnapshot({ state: "awaiting_sign_in", message, cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null, degradedReason: null, experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, mcpServerVersion: null, lastCommand: null, connectionFailure: null }); }
  private patchSnapshot(patch: Partial<CompanionSnapshot>): void {
    const previous = this.#snapshot.state;
    // The renderer uses updatedAt to order pushed events and state reads. Keep
    // it monotonic even when several lifecycle updates happen in one tick.
    this.#snapshot = { ...this.#snapshot, ...patch, updatedAt: Math.max(Date.now(), this.#snapshot.updatedAt + 1) };
    if (previous !== this.#snapshot.state) new ConsoleLogger(false, this.#logSink).info(`${this.#snapshot.state}: ${this.#snapshot.message}`);
    if (this.#snapshot.state !== "connecting") this.clearStartupWatchdog();
    this.publish();
    if (previous !== this.#snapshot.state) this.notifyTransition(previous, this.#snapshot.state);
  }
  private publish(): void { this.#window?.webContents.send("connector:state", this.state); this.rebuildTray(); }
  private rebuildTray(): void {
    if (!this.#tray) return;
    const status = this.#snapshot.state === "ready" ? "Connected" : this.#snapshot.state === "connecting" ? "Connecting" : ["degraded", "studio_mcp_unavailable", "studio_not_installed"].includes(this.#snapshot.state) ? "Warning" : "Disconnected";
    this.#tray.setToolTip(`NexusRBX Connector — ${status}`);
    this.#tray.setContextMenu(Menu.buildFromTemplate([
      { label: "NexusRBX Connector", enabled: false }, { label: `${status}${this.#snapshot.experienceName ? ` · ${this.#snapshot.experienceName}` : ""}`, enabled: false }, { type: "separator" },
      { label: "Open Connector", click: () => this.show("home") }, { label: "Settings", click: () => this.show("settings") }, { label: "Diagnostics", click: () => this.show("diagnostics") },
      { label: "Reconnect", click: () => { void this.retry(); } }, { label: "Check for Updates", click: () => { void this.checkForUpdates(); } }, { type: "separator" }, { label: "Quit Connector", click: () => app.quit() },
    ]));
  }
  private notifyTransition(previous: CompanionState, next: CompanionState): void {
    if (this.#lastNotifiedState === next) return;
    this.#lastNotifiedState = next;
    if (next === "ready" && previous !== "awaiting_sign_in") this.notify("Connection restored", "NexusRBX Cloud and Roblox Studio MCP are ready.");
    else if (previous === "ready" && next !== "connecting") this.notify("Connection needs attention", this.#snapshot.message);
  }
  private notify(title: string, body: string): void { if (Notification.isSupported()) new Notification({ title, body, silent: true }).show(); }
}

function fileEncryptedStorage(filePath: string): EncryptedStorage {
  return { isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(), encryptString: (value) => safeStorage.encryptString(value), decryptString: (value) => safeStorage.decryptString(value), async read() { try { return await readFile(filePath); } catch { return null; } }, async write(value) { await writeFile(filePath, value, { mode: 0o600 }); await chmod(filePath, 0o600); }, async remove() { await rm(filePath, { force: true }); } };
}

let controller: DesktopController;
let workspaceHost: WorkspaceHost;
let connectorUpdater: ConnectorUpdater | null = null;
let isQuitting = false;
let mainWindow: BrowserWindow | null = null;
let smokeTimeout: ReturnType<typeof setTimeout> | null = null;

type InstalledSmokeReport = {
  ok: boolean;
  platform: NodeJS.Platform;
  architecture: string;
  version: string;
  checks: {
    main: boolean;
    preload: boolean;
    renderer: boolean;
    tray: boolean;
    secureStorage: boolean;
    contextIsolation: boolean;
    sandbox: boolean;
    nodeIntegrationDisabled: boolean;
    workspaceWorker?: boolean;
  };
  error?: string;
};

async function finishInstalledSmoke(report: InstalledSmokeReport): Promise<void> {
  if (smokeTimeout) clearTimeout(smokeTimeout);
  if (SMOKE_REPORT_PATH) {
    if (!isAbsolute(SMOKE_REPORT_PATH)) {
      report.ok = false;
      report.error = "NEXUS_CONNECTOR_SMOKE_REPORT must be an absolute path.";
    } else {
      await mkdir(dirname(SMOKE_REPORT_PATH), { recursive: true });
      await writeFile(SMOKE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    }
  }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  isQuitting = true;
  app.exit(report.ok ? 0 : 1);
}

function buildInstalledSmokeReport(): InstalledSmokeReport {
  const checks = {
    main: true,
    preload: Boolean(SECURE_WEB_PREFERENCES.preload),
    renderer: Boolean(mainWindow && !mainWindow.webContents.isLoading()),
    tray: controller.hasTray,
    secureStorage: safeStorage.isEncryptionAvailable(),
    contextIsolation: SECURE_WEB_PREFERENCES.contextIsolation === true,
    sandbox: SECURE_WEB_PREFERENCES.sandbox === true,
    nodeIntegrationDisabled: SECURE_WEB_PREFERENCES.nodeIntegration === false,
  };
  return { ok: Object.values(checks).every(Boolean), platform: process.platform, architecture: process.arch, version: app.getVersion(), checks };
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({ ...COMPACT_SIZE, minWidth: COMPACT_SIZE.width, minHeight: COMPACT_SIZE.height, show: !INSTALLED_SMOKE_MODE && !controller.preferences.startMinimized, frame: false, resizable: false, backgroundColor: "#09090d", autoHideMenuBar: true, webPreferences: SECURE_WEB_PREFERENCES });
  mainWindow = window;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  void window.loadFile(join(import.meta.dirname, "renderer", "index.html"));
  window.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    controller.closeWindow();
  });
  controller.attachWindow(window);
  window.on("closed", () => { if (mainWindow === window) mainWindow = null; });
  window.on("show", () => { if (workspaceHost?.accountId) void workspaceHost.call("visible", true); });
  window.on("hide", () => { if (workspaceHost?.accountId) void workspaceHost.call("visible", false); });
  return window;
}

function registerIpc(): void {
  const handle = (channel: string, listener: (...args: unknown[]) => unknown) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!mainWindow || event.sender.id !== mainWindow.webContents.id || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error("Untrusted renderer request.");
      return listener(...args);
    });
  };
  handle("connector:get-state", () => controller.state);
  handle("workspace:open", () => controller.openWorkspace());
  handle("workspace:snapshot", id => workspaceHost.call("snapshot", typeof id === "string" ? id : undefined));
  handle("workspace:create-conversation", id => workspaceHost.call("createConversation", id));
  handle("workspace:list", query => workspaceHost.call("list", query));
  handle("workspace:get-entity", id => workspaceHost.call("getEntity", id));
  handle("workspace:save-entity", input => workspaceHost.call("saveEntity", input));
  handle("workspace:edit-plan", (id, content) => workspaceHost.call("editPlan", id, content));
  handle("workspace:resolve-conflict", (id, choice) => workspaceHost.call("resolveConflict", id, choice));
  handle("workspace:studio-action", input => workspaceHost.call("studioAction", input));
  handle("workspace:request", input => workspaceHost.call("request", input));
  handle("workspace:open-external", async value => {
    if (typeof value !== 'string' || value.length > 4000) throw new Error('Invalid account link.');
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !['checkout.stripe.com','billing.stripe.com','nexusrbx.com','www.nexusrbx.com','authorize.roblox.com'].includes(url.hostname)) throw new Error('This account link is not allowed.');
    await shell.openExternal(url.href);
  });
  handle("workspace:submit", input => workspaceHost.call("submit", input));
  handle("workspace:cancel", () => workspaceHost.call("cancel"));
  handle("workspace:resume", id => workspaceHost.call("resume", id));
  handle("workspace:approve-tool", (id, allow) => workspaceHost.call("approveTool", id, allow));
  handle("workspace:studio", id => {
    if (id !== undefined && (typeof id !== "string" || id.length > 160)) throw new Error("Invalid Studio target.");
    return workspaceHost.call("studio", id);
  });
  handle("workspace:sync", () => workspaceHost.call("sync"));
  handle("workspace:approve-plan", id => workspaceHost.call("approvePlan", id));
  handle("workspace:export", async () => {
    const result = await dialog.showSaveDialog({ defaultPath: "NexusRBX-history.json", filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!result.canceled && result.filePath) await writeFile(result.filePath, JSON.stringify(await workspaceHost.call("export"), null, 2), { mode: 0o600 });
  });
  handle("workspace:attach-file", async id => {
    const result = await dialog.showOpenDialog({ properties: ["openFile"] });
    if (!result.canceled && result.filePaths[0]) {
      const info = await stat(result.filePaths[0]);
      if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new Error("Files must be at most 10 MiB.");
      const bytes = await readFile(result.filePaths[0]);
      if (bytes.length > 10 * 1024 * 1024) throw new Error("Files must be at most 10 MiB.");
      await workspaceHost.call("attachFile", id, basename(result.filePaths[0]), bytes);
    }
  });
  handle("workspace:save-file", async id => {
    const file = await workspaceHost.call("file", id);
    const result = await dialog.showSaveDialog({ defaultPath: basename(file.name) });
    if (!result.canceled && result.filePath) await writeFile(result.filePath, file.bytes, { mode: 0o600 });
  });
  handle('workspace:download-bytes', async (name, bytes) => {
    if (typeof name !== 'string' || !name || name.length > 240 || /[\x00-\x1f]/.test(name) || !(bytes instanceof Uint8Array) || bytes.byteLength > 10 * 1024 * 1024) throw new Error('Invalid export or export larger than 10 MiB.');
    const result = await dialog.showSaveDialog({ defaultPath: basename(name) });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, bytes, { mode: 0o600 });
    return true;
  });
  handle("connector:diagnostics", () => controller.diagnostics());
  handle("connector:sign-in", () => controller.signIn());
  handle("connector:retry", () => controller.retry());
  handle("connector:start", () => controller.start());
  handle("connector:stop", () => controller.stop());
  handle("connector:revoke-session", () => controller.revokeSession());
  handle("connector:open-help", () => controller.openHelp());
  handle("connector:open-downloads", () => controller.openDownloads());
  handle("connector:set-preference", (key, value) => controller.setPreference(key, value));
  handle("connector:get-tools", () => [...controller.state.supportedTools]);
  handle("connector:copy-diagnostics", () => controller.copyDiagnostics());
  handle("connector:open-logs", () => controller.openLogs());
  handle("connector:resize-window", (mode) => controller.resizeWindow(validateWindowMode(mode)));
  handle("connector:set-fullscreen", (value) => {
    if (typeof value !== "boolean") throw new TypeError("Invalid fullscreen state.");
    controller.setFullscreen(value);
  });
  handle("connector:minimize-window", () => mainWindow?.minimize());
  handle("connector:close-window", () => controller.closeWindow());
  handle("connector:check-updates", () => controller.checkForUpdates());
  handle("connector:install-update", async () => {
    if (workspaceHost.accountId && (await workspaceHost.call("snapshot")).activeRunId) throw new Error("Stop the active run before installing an update.");
    await workspaceHost.close(); connectorUpdater?.install();
  });
  ipcMain.on("connector:renderer-ready", (event) => {
    if (!INSTALLED_SMOKE_MODE || !mainWindow || event.sender.id !== mainWindow.webContents.id) return;
    const finish = () => void (async () => {
      const report = buildInstalledSmokeReport();
      // Smoke mode uses a separate user-data directory and no stored sign-in.
      // Exercise the packaged worker + SQLite without cloud or Studio calls.
      try {
        await workspaceHost.start("nexusrbx-ci-smoke");
        const id = await workspaceHost.call("createConversation");
        const snapshot = await workspaceHost.call("snapshot");
        report.checks.workspaceWorker = snapshot.accountId === "nexusrbx-ci-smoke" && snapshot.conversations.some((item: { id: string }) => item.id === id);
      } catch (error) { report.checks.workspaceWorker = false; report.error = error instanceof Error ? error.message : "Local worker failed."; }
      finally { await workspaceHost.close(); }
      report.ok = Object.values(report.checks).every(Boolean);
      await finishInstalledSmoke(report);
    })().catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : "Could not write installed smoke report."}\n`);
      isQuitting = true;
      app.exit(1);
    });
    // The renderer can finish its first frame while Electron is still loading
    // the remaining document resources. Wait for both readiness signals.
    if (mainWindow.webContents.isLoading()) mainWindow.webContents.once("did-stop-loading", finish);
    else finish();
  });
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on("second-instance", () => { if (controller) controller.show(); });
  app.on("before-quit", event => {
    connectorUpdater?.stop();
    if (!isQuitting && workspaceHost?.accountId) {
      event.preventDefault();
      void workspaceHost.close().finally(() => { isQuitting = true; app.quit(); });
    } else isQuitting = true;
  });
  app.on("activate", () => controller?.show());
  app.whenReady().then(async () => {
    const initializedController = new DesktopController();
    await initializedController.initialize();
    controller = initializedController;
    workspaceHost = new WorkspaceHost(join(app.getPath("userData"), "workspaces"), API_URL,
      () => controller.workspaceSession(), () => mainWindow?.webContents.send("workspace:changed"));
    powerMonitor.on("suspend", () => { if (workspaceHost.accountId) void workspaceHost.call("cancel"); });
    registerIpc(); createWindow(); controller.configureTray();
    if (INSTALLED_SMOKE_MODE) {
      smokeTimeout = setTimeout(() => void finishInstalledSmoke({
        ok: false,
        platform: process.platform,
        architecture: process.arch,
        version: app.getVersion(),
        checks: { main: true, preload: false, renderer: false, tray: controller.hasTray, secureStorage: safeStorage.isEncryptionAvailable(), contextIsolation: true, sandbox: true, nodeIntegrationDisabled: true },
        error: "Renderer readiness timed out.",
      }).catch(() => app.exit(1)), 20_000);
      return;
    }
    void controller.start();
    connectorUpdater = new ConnectorUpdater({
      client: autoUpdater,
      isPackaged: app.isPackaged,
      automaticUpdates: controller.preferences.automaticUpdates,
      requestedFeedUrl: process.env.NEXUSRBX_UPDATE_URL,
      setState: (state) => controller.setUpdateState(state),
      notify: (title, body) => controller.sendNotification(title, body),
      reportError: (message) => { void recordUpdaterError(message); },
    });
    connectorUpdater.start();
  });
}
