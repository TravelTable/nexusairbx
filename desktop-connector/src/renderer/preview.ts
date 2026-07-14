import type { CompanionDiagnostics, CompanionSnapshot, ConnectorDesktopApi, PreferenceKey, RendererDestination, WindowMode } from "../contracts";

const now = Date.now();
const defaults: CompanionSnapshot = {
  state: "awaiting_pairing", message: "Enter the code shown on the NexusRBX website.", updatedAt: now, autoStart: true, updateState: "idle",
  preferences: { autoStart: true, minimizeToTray: true, startMinimized: false, theme: "dark", autoReconnect: true, reconnectDelayMs: 2500, automaticUpdates: true },
  cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null, degradedReason: null, pairingError: null,
  experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, connectorVersion: "1.0.0", mcpServerVersion: null, lastCommand: null,
};

export function previewSnapshot(): CompanionSnapshot {
  const state = new URLSearchParams(location.search).get("state") ?? "pairing";
  if (state === "connecting") return { ...defaults, state: "connecting", message: "Connecting to Roblox Studio MCP…", cloudHealth: "connected", runtimeHealth: "connected", mcpHealth: "connecting", connectionStage: "mcp" };
  if (state === "connected") return { ...defaults, state: "ready", message: "Cloud and Roblox Studio MCP are connected.", cloudHealth: "connected", runtimeHealth: "connected", mcpHealth: "connected", experienceName: "Roblox Studio", supportedToolCount: 9, supportedTools: ["get_project_manifest", "search_scripts", "read_script", "write_script", "create_script", "get_selection", "get_studio_state", "run_command", "get_output"], lastActivityAt: now - 4_000, lastHeartbeatAt: now - 1_200, mcpServerVersion: "0.8.2", lastCommand: { name: "get_studio_state", status: "succeeded", at: now - 4_000 } };
  if (state === "unavailable") return { ...defaults, state: "studio_mcp_unavailable", message: "Connector is online, but Studio MCP cannot be reached.", cloudHealth: "connected", runtimeHealth: "connected", mcpHealth: "warning" };
  if (state === "degraded") return { ...defaults, state: "degraded", message: "Roblox Studio was closed.", cloudHealth: "connected", runtimeHealth: "connected", mcpHealth: "warning", degradedReason: "studio_closed", supportedToolCount: 9 };
  return defaults;
}

export function previewApi(): ConnectorDesktopApi {
  let snapshot = previewSnapshot();
  const listeners = new Set<(value: CompanionSnapshot) => void>();
  const navListeners = new Set<(value: RendererDestination) => void>();
  const publish = () => listeners.forEach((listener) => listener(snapshot));
  const diagnostics: CompanionDiagnostics = { studioInstalled: true, mcpCommandAvailable: true, mcpCommand: "/Applications/RobloxStudio.app/Contents/MacOS/RobloxStudio", backendUrl: "https://api.nexusrbx.com", platform: navigator.platform, architecture: "arm64", connectorVersion: snapshot.connectorVersion, mcpServerVersion: snapshot.mcpServerVersion, mcpHealth: snapshot.mcpHealth, backendHealth: snapshot.cloudHealth, lastHeartbeatAt: snapshot.lastHeartbeatAt, lastActivityAt: snapshot.lastActivityAt, lastCommand: snapshot.lastCommand, logLocation: "~/Library/Logs/NexusRBX Connector" };
  return {
    reportReady: () => undefined,
    getState: async () => snapshot, getDiagnostics: async () => ({ ...diagnostics, mcpHealth: snapshot.mcpHealth, backendHealth: snapshot.cloudHealth }),
    pair: async () => { snapshot = previewSnapshot(); snapshot = { ...snapshot, state: "connecting", cloudHealth: "connected", runtimeHealth: "connected", mcpHealth: "connecting", connectionStage: "mcp", message: "Connecting to Roblox Studio MCP…" }; publish(); return snapshot; },
    retry: async () => snapshot, start: async () => snapshot, stop: async () => snapshot,
    revokeSession: async () => { snapshot = { ...defaults }; publish(); return snapshot; },
    openPairing: async () => undefined, openHelp: async () => undefined,
    setPreference: async (key: PreferenceKey, value: unknown) => { snapshot = { ...snapshot, preferences: { ...snapshot.preferences, [key]: value } }; publish(); return snapshot; },
    getAvailableTools: async () => snapshot.supportedTools, copyDiagnostics: async () => true, openLogs: async () => undefined,
    resizeWindow: async (_mode: WindowMode) => undefined, minimizeWindow: async () => undefined, closeWindow: async () => undefined,
    checkForUpdates: async () => snapshot, installUpdate: async () => undefined,
    onState: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    onNavigate: (listener) => { navListeners.add(listener); return () => navListeners.delete(listener); },
  };
}
