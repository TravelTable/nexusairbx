export type CompanionState = "awaiting_pairing" | "connecting" | "studio_not_installed" | "studio_mcp_unavailable" | "connector_offline" | "ready" | "degraded" | "stopped" | "error";
export type ServiceHealth = "disconnected" | "connecting" | "connected" | "warning";
export type ConnectionStage = "cloud" | "runtime" | "studio_detection" | "mcp" | "tool_discovery" | null;
export type DegradedReason = "studio_closed" | "mcp_initialization_failed" | "zero_supported_tools" | "heartbeat_stale" | "multiple_studio_windows" | "target_place_unavailable" | "runtime_failure" | "cloud_loss" | null;
export type PairingError = "invalid" | "already_used" | "expired" | null;
export type CompanionUpdateState = "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";
export type ThemePreference = "dark" | "light" | "system";

export interface CompanionPreferences {
  autoStart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  theme: ThemePreference;
  autoReconnect: boolean;
  reconnectDelayMs: number;
  automaticUpdates: boolean;
}

export interface LastCommandSummary { name: string; status: "succeeded" | "failed"; at: number; }

export interface CompanionSnapshot {
  state: CompanionState;
  message: string;
  updatedAt: number;
  autoStart: boolean;
  updateState: CompanionUpdateState;
  preferences: CompanionPreferences;
  cloudHealth: ServiceHealth;
  runtimeHealth: ServiceHealth;
  mcpHealth: ServiceHealth;
  connectionStage: ConnectionStage;
  degradedReason: DegradedReason;
  pairingError: PairingError;
  experienceName: string | null;
  supportedToolCount: number;
  supportedTools: string[];
  lastActivityAt: number | null;
  lastHeartbeatAt: number | null;
  connectorVersion: string;
  mcpServerVersion: string | null;
  lastCommand: LastCommandSummary | null;
}

export interface CompanionDiagnostics {
  studioInstalled: boolean;
  mcpCommandAvailable: boolean;
  mcpCommand: string;
  backendUrl: string;
  platform: string;
  architecture: string;
  connectorVersion: string;
  mcpServerVersion: string | null;
  mcpHealth: ServiceHealth;
  backendHealth: ServiceHealth;
  lastHeartbeatAt: number | null;
  lastActivityAt: number | null;
  lastCommand: LastCommandSummary | null;
  logLocation: string;
}

export type PreferenceKey = keyof CompanionPreferences;
export type WindowMode = "compact" | "settings";
export type RendererDestination = "home" | "settings" | "diagnostics";

export interface ConnectorDesktopApi {
  reportReady(): void;
  getState(): Promise<CompanionSnapshot>;
  getDiagnostics(): Promise<CompanionDiagnostics>;
  pair(code: string): Promise<CompanionSnapshot>;
  retry(): Promise<CompanionSnapshot>;
  start(): Promise<CompanionSnapshot>;
  stop(): Promise<CompanionSnapshot>;
  revokeSession(): Promise<CompanionSnapshot>;
  openPairing(): Promise<void>;
  openHelp(): Promise<void>;
  setPreference(key: PreferenceKey, value: unknown): Promise<CompanionSnapshot>;
  getAvailableTools(): Promise<string[]>;
  copyDiagnostics(): Promise<boolean>;
  openLogs(): Promise<void>;
  resizeWindow(mode: WindowMode): Promise<void>;
  minimizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  checkForUpdates(): Promise<CompanionSnapshot>;
  installUpdate(): Promise<void>;
  onState(listener: (snapshot: CompanionSnapshot) => void): () => void;
  onNavigate(listener: (destination: RendererDestination) => void): () => void;
}
