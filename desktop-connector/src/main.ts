import { app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, Notification, safeStorage, shell, Tray } from "electron";
import electronUpdater from "electron-updater";
import { appendFile, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import {
  CONNECTOR_VERSION, ConsoleLogger, loadConfig, NexusBackendClient, NexusLocalConnector, RobloxStudioMcpClient,
  type ConnectorLifecycleState, type ConnectorTelemetry, type PairClaimResponse,
} from "nexusrbx-local-connector";
import type { CompanionPreferences, CompanionSnapshot, CompanionState, CompanionUpdateState, PairingError, RendererDestination, WindowMode } from "./contracts.js";
import { collectDiagnostics } from "./diagnostics.js";
import { parsePairingDeepLink } from "./pairing.js";
import { DEFAULT_PREFERENCES, getAutoStart, PreferenceStore, setAutoStart, validatePreferenceUpdate } from "./preferences.js";
import { EncryptedTokenStore, type EncryptedStorage, type StoredConnectorSession } from "./token-store.js";
import { ConnectorUpdater } from "./updater.js";
import { ConnectionAttemptCoordinator } from "./connection-attempt.js";
import { completedConnectionPatch } from "./connection-state.js";

// electron-updater is published as CommonJS. Reading autoUpdater from its default
// namespace keeps the packaged ESM main process compatible with Node's CJS bridge.
const { autoUpdater } = electronUpdater;

const PAIRING_PAGE = "https://nexusrbx.com/ai?studio=mcp&connector=desktop";
const HELP_PAGE = "https://nexusrbx.com/docs/studio-mcp";
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

export function normalizePairingCode(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("Pairing code must be text.");
  const code = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new TypeError("Pairing code must contain six letters or numbers.");
  return code;
}

export function validateWindowMode(value: unknown): WindowMode {
  if (value !== "compact" && value !== "settings") throw new TypeError("Invalid window mode.");
  return value;
}

class DesktopController {
  #window: BrowserWindow | null = null;
  #attempts = new ConnectionAttemptCoordinator();
  #startupWatchdog: ReturnType<typeof setTimeout> | null = null;
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

  constructor() {
    const userData = app.getPath("userData");
    this.#store = new EncryptedTokenStore(fileEncryptedStorage(join(userData, "connector-session.bin")));
    this.#preferenceStore = new PreferenceStore(join(userData, "preferences.json"));
    this.#snapshot = this.makeSnapshot("awaiting_pairing", "Enter the six-character code shown on NexusRBX.");
  }

  async initialize(): Promise<void> {
    this.#preferences = await this.#preferenceStore.load();
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
    if (this.#attempts.active) return this.state;
    const saved = await this.#store.load();
    if (!saved) { this.setPairingState(); return this.state; }
    await this.startSession(saved);
    return this.state;
  }

  async pair(input: unknown): Promise<CompanionSnapshot> {
    const code = normalizePairingCode(input);
    if (this.#attempts.active) await this.stop(false);
    const config = this.config();
    const logger = new ConsoleLogger(config.verbose);
    const backend = new NexusBackendClient({ apiUrl: config.apiUrl, connectorVersion: CONNECTOR_VERSION, requestTimeoutMs: config.requestTimeoutMs, logger });
    this.patchSnapshot({ state: "connecting", message: "Claiming your secure NexusRBX pairing…", pairingError: null, connectionStage: "cloud", cloudHealth: "connecting", runtimeHealth: "disconnected", mcpHealth: "disconnected" });
    try {
      const claim = await backend.claimPairing(code);
      await this.#store.save(claim);
      await this.startSession(claim, backend, logger);
    } catch (error) {
      this.setPairingState(pairingErrorFrom(error));
    }
    return this.state;
  }

  async retry(): Promise<CompanionSnapshot> { await this.stop(false); return this.start(); }

  async stop(publish = true): Promise<CompanionSnapshot> {
    this.clearStartupWatchdog();
    await this.#attempts.stop();
    this.#backend = null;
    if (publish) this.patchSnapshot({ state: "stopped", message: "Connector paused. Your encrypted pairing is retained.", cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null });
    return this.state;
  }

  async revokeSession(): Promise<CompanionSnapshot> {
    if (!this.#backend) {
      const saved = await this.#store.load();
      if (saved) { const config = this.config(); const logger = new ConsoleLogger(config.verbose); this.#backend = new NexusBackendClient({ apiUrl: config.apiUrl, connectorVersion: CONNECTOR_VERSION, requestTimeoutMs: config.requestTimeoutMs, logger }); this.#backend.restoreToken(saved.token); }
    }
    if (this.#backend) await this.#backend.revokeCurrentSession(AbortSignal.timeout(10_000));
    await this.stop(false);
    await this.#store.clear();
    this.setPairingState();
    return this.state;
  }

  async openPairing(): Promise<void> { await shell.openExternal(PAIRING_PAGE); }
  async openHelp(): Promise<void> { await shell.openExternal(HELP_PAGE); }

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

  private async startSession(session: StoredConnectorSession | PairClaimResponse, existingBackend?: NexusBackendClient, existingLogger?: ConsoleLogger): Promise<void> {
    if (this.#attempts.active) return;
    const config = this.config();
    const logger = existingLogger ?? new ConsoleLogger(config.verbose);
    const backend = existingBackend ?? new NexusBackendClient({ apiUrl: config.apiUrl, connectorVersion: CONNECTOR_VERSION, requestTimeoutMs: config.requestTimeoutMs, logger });
    if (!existingBackend) backend.restoreToken(session.token);
    this.#backend = backend;
    this.#discoveryComplete = false;
    const diagnostics = await this.diagnostics();
    this.#studioInstalled = diagnostics.studioInstalled;
    this.patchSnapshot({ state: this.#studioInstalled ? "connecting" : "studio_not_installed", message: this.#studioInstalled ? "Starting the local connector…" : "Roblox Studio MCP was not found.", cloudHealth: "connected", runtimeHealth: "connecting", mcpHealth: "disconnected", connectionStage: "runtime", degradedReason: null, pairingError: null, experienceName: null, supportedToolCount: 0, supportedTools: [] });
    const mcp = new RobloxStudioMcpClient({ command: config.mcpCommand, args: config.mcpArgs, connectorVersion: CONNECTOR_VERSION, requestTimeoutMs: config.requestTimeoutMs, logger });
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
    void attempt.completion.catch((error: unknown) => {
      if (attempt.signal.aborted) return;
      if (this.#preferences.autoReconnect) {
        this.patchSnapshot({ state: "degraded", degradedReason: "runtime_failure", message: "The connector stopped unexpectedly.", runtimeHealth: "warning", connectionStage: null });
      } else this.patchSnapshot({ state: "connector_offline", message: "The connector is offline.", cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null });
      logger.warn("Desktop connector session ended.", { error: error instanceof Error ? error.message : "unknown" });
    });
  }

  private onConnectorState(attemptId: number, state: ConnectorLifecycleState): void {
    if (!this.#attempts.isCurrent(attemptId)) return;
    if (state === "ready" || state === "degraded") {
      this.#discoveryComplete = true;
      this.reconcileCompletedConnection();
    } else if (state === "studio_mcp_unavailable") this.patchSnapshot({ state: this.#studioInstalled ? "studio_mcp_unavailable" : "studio_not_installed", message: "Connector is online, but Studio MCP cannot be reached.", runtimeHealth: "connected", mcpHealth: "warning", connectionStage: null });
    else if (state === "connecting") this.patchSnapshot({ state: "connecting", message: "Starting the local connector…", runtimeHealth: "connecting", connectionStage: "runtime" });
  }

  private onTelemetry(attemptId: number, telemetry: ConnectorTelemetry): void {
    if (!this.#attempts.isCurrent(attemptId)) return;
    const patch: Partial<CompanionSnapshot> = {};
    if (telemetry.stage) patch.connectionStage = telemetry.stage === "ready" ? null : telemetry.stage;
    if (telemetry.cloudConnected !== undefined) patch.cloudHealth = telemetry.cloudConnected ? "connected" : "warning";
    if (telemetry.mcpConnected !== undefined) patch.mcpHealth = telemetry.mcpConnected ? "connected" : "warning";
    if (telemetry.stage === "runtime") patch.runtimeHealth = "connecting";
    if (telemetry.stage === "studio_detection" || telemetry.stage === "mcp" || telemetry.stage === "tool_discovery" || telemetry.stage === "ready") patch.runtimeHealth = "connected";
    if (telemetry.supportedTools) patch.supportedTools = telemetry.supportedTools.slice(0, 200);
    if (telemetry.supportedToolCount !== undefined) patch.supportedToolCount = Math.max(0, telemetry.supportedToolCount);
    if (telemetry.mcpServerVersion) patch.mcpServerVersion = telemetry.mcpServerVersion.slice(0, 80);
    if (telemetry.experienceName) patch.experienceName = telemetry.experienceName.slice(0, 160);
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
    return { state, message, updatedAt: Date.now(), autoStart: getAutoStart(app), updateState: "idle", preferences: { ...this.#preferences }, cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null, degradedReason: null, pairingError: null, experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, connectorVersion: CONNECTOR_VERSION, mcpServerVersion: null, lastCommand: null };
  }
  private setPairingState(pairingError: PairingError = null): void { this.patchSnapshot({ state: "awaiting_pairing", message: pairingError ? "The pairing code could not be used." : "Enter the six-character code shown on NexusRBX.", cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null, degradedReason: null, pairingError, experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, mcpServerVersion: null, lastCommand: null }); }
  private patchSnapshot(patch: Partial<CompanionSnapshot>): void {
    const previous = this.#snapshot.state;
    // The renderer uses updatedAt to order pushed events and state reads. Keep
    // it monotonic even when several lifecycle updates happen in one tick.
    this.#snapshot = { ...this.#snapshot, ...patch, updatedAt: Math.max(Date.now(), this.#snapshot.updatedAt + 1) };
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
    if (next === "ready" && previous !== "awaiting_pairing") this.notify("Connection restored", "NexusRBX Cloud and Roblox Studio MCP are ready.");
    else if (previous === "ready" && next !== "connecting") this.notify("Connection needs attention", this.#snapshot.message);
  }
  private notify(title: string, body: string): void { if (Notification.isSupported()) new Notification({ title, body, silent: true }).show(); }
}

function pairingErrorFrom(error: unknown): PairingError {
  const text = error instanceof Error ? `${error.name} ${error.message} ${JSON.stringify((error as Error & { details?: unknown }).details ?? "")}`.toUpperCase() : "";
  if (text.includes("EXPIRED")) return "expired";
  if (text.includes("USED") || text.includes("CLAIMED")) return "already_used";
  return "invalid";
}

function fileEncryptedStorage(filePath: string): EncryptedStorage {
  return { isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(), encryptString: (value) => safeStorage.encryptString(value), decryptString: (value) => safeStorage.decryptString(value), async read() { try { return await readFile(filePath); } catch { return null; } }, async write(value) { await writeFile(filePath, value, { mode: 0o600 }); await chmod(filePath, 0o600); }, async remove() { await rm(filePath, { force: true }); } };
}

let controller: DesktopController;
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
  return window;
}

function registerIpc(): void {
  const handle = (channel: string, listener: (...args: unknown[]) => unknown) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!mainWindow || event.sender.id !== mainWindow.webContents.id) throw new Error("Untrusted renderer request.");
      return listener(...args);
    });
  };
  handle("connector:get-state", () => controller.state);
  handle("connector:diagnostics", () => controller.diagnostics());
  handle("connector:pair", (code) => controller.pair(code));
  handle("connector:retry", () => controller.retry());
  handle("connector:start", () => controller.start());
  handle("connector:stop", () => controller.stop());
  handle("connector:revoke-session", () => controller.revokeSession());
  handle("connector:open-pairing", () => controller.openPairing());
  handle("connector:open-help", () => controller.openHelp());
  handle("connector:set-preference", (key, value) => controller.setPreference(key, value));
  handle("connector:get-tools", () => [...controller.state.supportedTools]);
  handle("connector:copy-diagnostics", () => controller.copyDiagnostics());
  handle("connector:open-logs", () => controller.openLogs());
  handle("connector:resize-window", (mode) => controller.resizeWindow(validateWindowMode(mode)));
  handle("connector:minimize-window", () => mainWindow?.minimize());
  handle("connector:close-window", () => controller.closeWindow());
  handle("connector:check-updates", () => controller.checkForUpdates());
  handle("connector:install-update", () => connectorUpdater?.install());
  ipcMain.on("connector:renderer-ready", (event) => {
    if (!INSTALLED_SMOKE_MODE || !mainWindow || event.sender.id !== mainWindow.webContents.id) return;
    void finishInstalledSmoke(buildInstalledSmokeReport()).catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : "Could not write installed smoke report."}\n`);
      isQuitting = true;
      app.exit(1);
    });
  });
}

function receiveDeepLink(url: string): void { const code = parsePairingDeepLink(url); if (code) void controller.pair(code); }
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on("second-instance", (_event, argv) => { const url = argv.find((value) => value.startsWith("nexusrbx://")); if (url) receiveDeepLink(url); if (controller) controller.show(); });
  app.on("open-url", (event, url) => { event.preventDefault(); receiveDeepLink(url); });
  app.on("before-quit", () => { isQuitting = true; connectorUpdater?.stop(); });
  app.on("activate", () => controller?.show());
  app.whenReady().then(async () => {
    if (!INSTALLED_SMOKE_MODE) app.setAsDefaultProtocolClient("nexusrbx");
    controller = new DesktopController(); await controller.initialize(); registerIpc(); createWindow(); controller.configureTray();
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
    const launchLink = process.argv.find((value) => value.startsWith("nexusrbx://")); if (launchLink) receiveDeepLink(launchLink); else void controller.start();
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
