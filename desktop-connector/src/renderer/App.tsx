import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Activity, AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, CircleHelp, Cloud,
  Copy, ExternalLink, FolderOpen, Info, Link2, Link2Off, LoaderCircle, Menu, Minus, MoreHorizontal,
  Power, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Terminal, Wrench, X,
} from "lucide-react";
import type { CompanionDiagnostics, CompanionPreferences, CompanionSnapshot, ConnectionStage, DegradedReason, PreferenceKey, RendererDestination, ServiceHealth } from "../contracts";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "./components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Input } from "./components/ui/input";
import { ScrollArea } from "./components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { Switch } from "./components/ui/switch";
import { Tooltip, TooltipProvider } from "./components/ui/tooltip";
import { PairingCodeInput } from "./components/PairingCodeInput";
import { cn } from "./lib/utils";
import { getMainView, relativeTime } from "./lib/view-state";

const previewPreferences: CompanionPreferences = { autoStart: true, minimizeToTray: true, startMinimized: false, theme: "dark", autoReconnect: true, reconnectDelayMs: 2_000, automaticUpdates: true };
const previewSnapshot: CompanionSnapshot = {
  state: "awaiting_pairing", message: "Enter the six-character code shown on NexusRBX.", updatedAt: Date.now(), autoStart: true, updateState: "idle", preferences: previewPreferences,
  cloudHealth: "disconnected", runtimeHealth: "disconnected", mcpHealth: "disconnected", connectionStage: null, degradedReason: null, pairingError: null,
  experienceName: null, supportedToolCount: 0, supportedTools: [], lastActivityAt: null, lastHeartbeatAt: null, connectorVersion: "0.1.0", mcpServerVersion: null, lastCommand: null,
};

const previewDiagnostics: CompanionDiagnostics = { studioInstalled: false, mcpCommandAvailable: false, mcpCommand: "Not detected", backendUrl: "https://api.nexusrbx.com", platform: navigator.platform || "Desktop", architecture: "—", connectorVersion: "0.1.0", mcpServerVersion: null, mcpHealth: "disconnected", backendHealth: "disconnected", lastHeartbeatAt: null, lastActivityAt: null, lastCommand: null, logLocation: "Available in the installed app" };

export function App() {
  const [snapshot, setSnapshot] = useState(previewSnapshot);
  const [destination, setDestination] = useState<RendererDestination>("home");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [diagnostics, setDiagnostics] = useState<CompanionDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    try {
      const result = await (window.nexusConnector?.getDiagnostics() ?? Promise.resolve(previewDiagnostics));
      setDiagnostics(result);
    } catch {
      setDiagnostics(previewDiagnostics);
      setActionError("Diagnostics are temporarily unavailable. Try again in a moment.");
    }
  }, []);

  useEffect(() => {
    const api = window.nexusConnector;
    if (!api) return;
    void api.getState().then(setSnapshot).catch(() => setActionError("The connector state could not be loaded. Try again in a moment."));
    const removeState = api.onState(setSnapshot);
    const removeNavigation = api.onNavigate((next) => {
      setDestination(next === "home" ? "home" : "settings");
      if (next !== "home") setSettingsSection(next === "diagnostics" ? "diagnostics" : "general");
      void api.resizeWindow(next === "home" ? "compact" : "settings");
    });
    return () => { removeState(); removeNavigation(); };
  }, []);

  useEffect(() => {
    if (destination !== "home" && diagnostics === null) void loadDiagnostics();
  }, [destination, diagnostics, loadDiagnostics]);

  useEffect(() => {
    const theme = snapshot.preferences.theme;
    const root = document.documentElement;
    const apply = () => root.classList.toggle("light", theme === "light" || (theme === "system" && matchMedia("(prefers-color-scheme: light)").matches));
    apply();
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: light)"); media.addEventListener("change", apply); return () => media.removeEventListener("change", apply);
  }, [snapshot.preferences.theme]);

  const navigate = async (next: RendererDestination) => {
    setDestination(next === "home" ? "home" : "settings");
    if (next !== "home") setSettingsSection(next === "diagnostics" ? "diagnostics" : "general");
    await window.nexusConnector?.resizeWindow(next === "home" ? "compact" : "settings");
  };
  const run = async (operation: () => Promise<CompanionSnapshot | void>) => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await operation();
      if (result) setSnapshot(result);
    } catch {
      setActionError("That action could not be completed. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { if (destination !== "home" && settingsSection === "diagnostics") void loadDiagnostics(); }, [destination, settingsSection, loadDiagnostics]);

  return <TooltipProvider delayDuration={350}>
    <main className={cn("app-shell", destination !== "home" && "settings-size")}>
      <TitleBar destination={destination} navigate={navigate} />
      {actionError && <div className="action-error" role="alert"><AlertTriangle size={14} /><span>{actionError}</span><button type="button" aria-label="Dismiss error" onClick={() => setActionError(null)}><X size={13} /></button></div>}
      {destination === "home"
        ? <HomeView snapshot={snapshot} busy={busy} run={run} navigate={navigate} />
        : <SettingsView snapshot={snapshot} diagnostics={diagnostics} section={settingsSection} onSection={setSettingsSection} onRefreshDiagnostics={loadDiagnostics} run={run} navigate={navigate} />}
    </main>
  </TooltipProvider>;
}

function TitleBar({ destination, navigate }: { destination: RendererDestination; navigate: (next: RendererDestination) => void }) {
  return <header className="titlebar">
    <div className="flex min-w-0 items-center gap-2.5"><img src="./logo.png" alt="" className="h-5 w-5 object-contain" /><span className="truncate text-[11px] font-semibold tracking-wide">NEXUSRBX <span className="font-normal text-muted-foreground">CONNECTOR</span></span></div>
    <div className="no-drag flex items-center gap-0.5">
      {destination === "home" && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Connector menu"><MoreHorizontal size={15} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void navigate("settings")}><Settings size={14} /> Settings</DropdownMenuItem><DropdownMenuItem onSelect={() => void navigate("diagnostics")}><Activity size={14} /> Diagnostics</DropdownMenuItem><DropdownMenuItem onSelect={() => void window.nexusConnector?.checkForUpdates()}><RefreshCw size={14} /> Check for updates</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
      <Button variant="ghost" size="icon" aria-label="Minimize" onClick={() => void window.nexusConnector?.minimizeWindow()}><Minus size={15} /></Button>
      <Button variant="ghost" size="icon" aria-label="Close to tray" onClick={() => void window.nexusConnector?.closeWindow()}><X size={15} /></Button>
    </div>
  </header>;
}

function HomeView({ snapshot, busy, run, navigate }: { snapshot: CompanionSnapshot; busy: boolean; run: (operation: () => Promise<CompanionSnapshot | void>) => Promise<void>; navigate: (next: RendererDestination) => Promise<void> }) {
  const view = getMainView(snapshot);
  if (view === "pairing") return <PairingView snapshot={snapshot} busy={busy} pair={(code) => run(() => window.nexusConnector?.pair(code) ?? Promise.resolve(snapshot))} />;
  if (view === "connecting") return <ConnectingView snapshot={snapshot} />;
  if (view === "connected") return <ConnectedView snapshot={snapshot} busy={busy} disconnect={() => run(() => window.nexusConnector?.revokeSession() ?? Promise.resolve(previewSnapshot))} diagnostics={() => navigate("diagnostics")} />;
  if (view === "mcp_unavailable") return <McpUnavailableView snapshot={snapshot} busy={busy} retry={() => run(() => window.nexusConnector?.retry() ?? Promise.resolve(snapshot))} />;
  return <DegradedView snapshot={snapshot} busy={busy} retry={() => run(() => window.nexusConnector?.retry() ?? Promise.resolve(snapshot))} diagnostics={() => navigate("diagnostics")} />;
}

function PairingView({ snapshot, busy, pair }: { snapshot: CompanionSnapshot; busy: boolean; pair: (code: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const error = snapshot.pairingError && ({ invalid: "That code is not valid. Check it and try again.", already_used: "That code has already been used. Request a new one.", expired: "That code expired. Request a new one from NexusRBX." }[snapshot.pairingError]);
  return <section className="compact-content justify-between">
    <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
      <div className="logo-mark"><img src="./logo.png" alt="NexusRBX" /></div>
      <h1 className="mt-5 text-xl font-semibold">Connect to NexusRBX</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter the code shown on <button className="text-violet-400 hover:underline" onClick={() => void window.nexusConnector?.openPairing()}>nexusrbx.com</button></p>
      <form className="mt-7 w-full" onSubmit={(event) => { event.preventDefault(); if (code.length === 6) void pair(code); }}>
        <PairingCodeInput value={code} onChange={setCode} disabled={busy} invalid={Boolean(error)} />
        <div className="mt-2 min-h-5 text-left text-xs text-red-400" role="alert">{error}</div>
        <Button className="mt-2 w-full" disabled={busy || code.length !== 6}>{busy ? <><LoaderCircle size={16} className="animate-spin" /> Connecting…</> : <><Link2 size={16} /> Connect</>}</Button>
      </form>
      <Button variant="link" className="mt-2 h-8 text-xs" onClick={() => void window.nexusConnector?.openPairing()}>Pair in browser <ExternalLink size={12} /></Button>
    </div>
    <div className="mx-5 mb-5 flex items-start gap-3 rounded-lg border border-line bg-panel p-3 text-left"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-violet-400" /><div><p className="text-xs font-medium">Secure local connection</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">After pairing, open Roblox Studio and enable Studio MCP.</p></div></div>
  </section>;
}

const stages: Array<{ key: Exclude<ConnectionStage, null>; label: string }> = [
  { key: "cloud", label: "Connecting to NexusRBX Cloud" }, { key: "runtime", label: "Starting local connector" }, { key: "studio_detection", label: "Detecting Roblox Studio" }, { key: "mcp", label: "Connecting to Studio MCP" }, { key: "tool_discovery", label: "Discovering available tools" },
];
function ConnectingView({ snapshot }: { snapshot: CompanionSnapshot }) {
  const active = stages.findIndex((stage) => stage.key === snapshot.connectionStage);
  return <section className="compact-content items-center justify-center px-8 text-center"><div className="connection-ring"><img src="./logo.png" alt="" /></div><h1 className="mt-6 text-xl font-semibold">Connecting</h1><p className="mt-2 text-sm text-muted-foreground">Setting up a secure link to Studio.</p><Card className="mt-7 w-full p-2">{stages.map((stage, index) => <div key={stage.key} className="flex h-10 items-center gap-3 px-2 text-left text-xs"><StageIcon state={index < active ? "done" : index === active ? "active" : "pending"} /><span className={cn(index === active ? "text-foreground" : "text-muted-foreground")}>{stage.label}{index === active ? "…" : ""}</span></div>)}</Card></section>;
}
function StageIcon({ state }: { state: "done" | "active" | "pending" }) { if (state === "done") return <CheckCircle2 size={16} className="text-emerald-400" />; if (state === "active") return <LoaderCircle size={16} className="animate-spin text-violet-400" />; return <span className="ml-1 h-2 w-2 rounded-full bg-zinc-700" />; }

function ConnectedView({ snapshot, busy, disconnect, diagnostics }: { snapshot: CompanionSnapshot; busy: boolean; disconnect: () => Promise<void>; diagnostics: () => Promise<void> }) {
  const [, tick] = useState(0); useEffect(() => { const timer = setInterval(() => tick((value) => value + 1), 1_000); return () => clearInterval(timer); }, []);
  return <section className="compact-content justify-between px-5 pb-5"><div className="pt-6 text-center"><div className="connected-mark"><Check size={28} /></div><h1 className="mt-4 text-xl font-semibold">Connected</h1><p className="mt-1.5 text-sm text-muted-foreground">{snapshot.experienceName || "Roblox Studio"}</p></div><div className="mt-6 space-y-3"><Card className="divide-y divide-line"><ServiceStatusRow icon={<Cloud size={16} />} label="NexusRBX Cloud" health={snapshot.cloudHealth} /><ServiceStatusRow icon={<StudioMark />} label="Roblox Studio MCP" health={snapshot.mcpHealth} /></Card><Card className="grid grid-cols-2 divide-x divide-line p-4 text-center"><div><p className="text-lg font-semibold">{snapshot.supportedToolCount}</p><p className="mt-1 text-[11px] text-muted-foreground">Tools available</p></div><div><p className="text-sm font-medium">{relativeTime(snapshot.lastActivityAt)}</p><p className="mt-1 text-[11px] text-muted-foreground">Last activity</p></div></Card><div className="grid grid-cols-[1fr_auto] gap-2"><Button variant="destructive" disabled={busy} onClick={() => void disconnect()}><Link2Off size={15} /> Disconnect</Button><Tooltip label="Open diagnostics"><Button variant="secondary" size="icon" onClick={() => void diagnostics()}><Activity size={15} /></Button></Tooltip></div></div><Footer snapshot={snapshot} /></section>;
}

function McpUnavailableView({ snapshot, busy, retry }: { snapshot: CompanionSnapshot; busy: boolean; retry: () => Promise<void> }) {
  return <section className="compact-content justify-between px-5 pb-5"><div className="flex flex-1 flex-col items-center justify-center text-center"><WarningMark /><h1 className="mt-5 max-w-[280px] text-xl font-semibold">Roblox Studio MCP<br />Not Detected</h1><p className="mt-3 max-w-[320px] text-sm leading-relaxed text-muted-foreground">The connector is online, but Studio MCP cannot be reached on this machine.</p><Card className="mt-5 w-full p-3"><ServiceStatusRow icon={<Cloud size={15} />} label="NexusRBX Cloud" health={snapshot.cloudHealth} compact /><ServiceStatusRow icon={<Terminal size={15} />} label="Local connector" health={snapshot.runtimeHealth} compact /><Separator className="my-2" />{["Open Roblox Studio", "Open the experience you want to edit", "Enable Studio MCP"].map((label, index) => <div key={label} className="flex h-8 items-center gap-3 px-2 text-left text-xs"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">{index + 1}</span>{label}</div>)}<Button variant="link" className="mt-1 h-7 text-xs" onClick={() => void window.nexusConnector?.openHelp()}>Learn how <ExternalLink size={11} /></Button></Card></div><Button variant="secondary" className="w-full border-violet-500/60 text-violet-300" disabled={busy} onClick={() => void retry()}><RefreshCw size={15} className={cn(busy && "animate-spin")} /> Try Again</Button><Footer snapshot={snapshot} /></section>;
}

const degradedCopy: Record<Exclude<DegradedReason, null>, { title: string; message: string }> = {
  studio_closed: { title: "Roblox Studio closed", message: "Reopen Studio and the connector will try to restore the MCP session." },
  mcp_initialization_failed: { title: "Studio MCP could not start", message: "The MCP process returned an initialization error." },
  zero_supported_tools: { title: "No supported MCP tools found", message: "Studio MCP responded, but it did not advertise any supported NexusRBX tools." },
  heartbeat_stale: { title: "Connector heartbeat is stale", message: "The cloud has not heard from this connector recently." },
  multiple_studio_windows: { title: "Multiple Studio windows detected", message: "Close extra Studio windows and keep your target experience open." },
  target_place_unavailable: { title: "Target experience unavailable", message: "Open the experience you want NexusRBX to work with." },
  runtime_failure: { title: "Connector stopped unexpectedly", message: "The local runtime exited and needs to be restarted." },
  cloud_loss: { title: "NexusRBX Cloud disconnected", message: "Your local connector is running, but the cloud connection was lost." },
};
function DegradedView({ snapshot, busy, retry, diagnostics }: { snapshot: CompanionSnapshot; busy: boolean; retry: () => Promise<void>; diagnostics: () => Promise<void> }) {
  const copy = degradedCopy[snapshot.degradedReason || "runtime_failure"];
  return <section className="compact-content justify-between px-5 pb-5"><div className="flex flex-1 flex-col items-center justify-center text-center"><WarningMark /><p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">Connection degraded</p><h1 className="mt-2 text-xl font-semibold">{copy.title}</h1><p className="mt-3 max-w-[330px] text-sm leading-relaxed text-muted-foreground">{copy.message}</p><Card className="mt-6 w-full p-4 text-left"><div className="flex gap-3"><Info size={16} className="mt-0.5 shrink-0 text-violet-400" /><p className="text-xs leading-relaxed text-muted-foreground">You can continue using the NexusRBX Studio plugin while the desktop connection recovers.</p></div></Card></div><div className="grid grid-cols-2 gap-2"><Button disabled={busy} onClick={() => void retry()}><RefreshCw size={15} className={cn(busy && "animate-spin")} /> Retry</Button><Button variant="secondary" onClick={() => void diagnostics()}><Activity size={15} /> Diagnostics</Button></div><Footer snapshot={snapshot} /></section>;
}

function ServiceStatusRow({ icon, label, health, compact }: { icon: React.ReactNode; label: string; health: ServiceHealth; compact?: boolean }) { const names = { connected: "Connected", connecting: "Connecting", warning: "Unavailable", disconnected: "Disconnected" }; return <div className={cn("flex items-center gap-3 px-4", compact ? "h-9 px-2" : "h-11")}><span className="text-muted-foreground">{icon}</span><span className="min-w-0 flex-1 text-xs font-medium">{label}</span><span className={cn("flex items-center gap-1.5 text-[11px]", health === "connected" ? "text-emerald-400" : health === "connecting" ? "text-violet-400" : health === "warning" ? "text-amber-400" : "text-red-400")}><span className="h-1.5 w-1.5 rounded-full bg-current" />{names[health]}</span></div>; }
function StudioMark() { return <span className="block h-4 w-4 rotate-12 rounded-[3px] border-2 border-current"><span className="m-[3px] block h-1 w-1 rounded-[1px] bg-current" /></span>; }
function WarningMark() { return <div className="flex h-13 w-13 items-center justify-center rounded-full border border-amber-400/70 bg-amber-400/5 text-amber-400 shadow-warning"><AlertTriangle size={25} /></div>; }
function Footer({ snapshot }: { snapshot: CompanionSnapshot }) { return <footer className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground"><span>v{snapshot.connectorVersion}</span><span className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", snapshot.state === "ready" ? "bg-emerald-400" : "bg-amber-400")} />{snapshot.state === "ready" ? "All systems operational" : "Needs attention"}</span></footer>; }

type SettingsSection = "general" | "connection" | "mcp" | "updates" | "diagnostics" | "about";
const settingSections: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
  { id: "general", label: "General", icon: <Settings size={14} /> }, { id: "connection", label: "Connection", icon: <Link2 size={14} /> }, { id: "mcp", label: "MCP", icon: <Sparkles size={14} /> }, { id: "updates", label: "Updates", icon: <RefreshCw size={14} /> }, { id: "diagnostics", label: "Diagnostics", icon: <Activity size={14} /> }, { id: "about", label: "About", icon: <CircleHelp size={14} /> },
];
function SettingsView({ snapshot, diagnostics, section, onSection, onRefreshDiagnostics, run, navigate }: { snapshot: CompanionSnapshot; diagnostics: CompanionDiagnostics | null; section: SettingsSection; onSection: (section: SettingsSection) => void; onRefreshDiagnostics: () => Promise<void>; run: (operation: () => Promise<CompanionSnapshot | void>) => Promise<void>; navigate: (next: RendererDestination) => Promise<void> }) {
  const select = (next: SettingsSection) => { onSection(next); if (next === "diagnostics") void onRefreshDiagnostics(); };
  const update = (key: PreferenceKey, value: unknown) => run(() => window.nexusConnector?.setPreference(key, value) ?? Promise.resolve({ ...snapshot, preferences: { ...snapshot.preferences, [key]: value } }));
  return <div className="settings-layout"><aside className="settings-sidebar"><button className="mb-4 flex items-center gap-2 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => void navigate("home")}><ArrowLeft size={14} /> Back to connector</button><nav className="space-y-1">{settingSections.map((item) => <button key={item.id} className={cn("flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-xs transition", section === item.id ? "bg-violet-600/25 text-violet-200" : "text-muted-foreground hover:bg-muted hover:text-foreground")} onClick={() => select(item.id)}>{item.icon}{item.label}</button>)}</nav><span className="mt-auto px-3 text-[10px] text-muted-foreground">v{snapshot.connectorVersion}</span></aside><ScrollArea className="h-full"><section className="settings-panel"><SettingsSectionContent section={section} snapshot={snapshot} diagnostics={diagnostics} update={update} run={run} refreshDiagnostics={onRefreshDiagnostics} /></section></ScrollArea></div>;
}

function SettingsSectionContent({ section, snapshot, diagnostics, update, run, refreshDiagnostics }: { section: SettingsSection; snapshot: CompanionSnapshot; diagnostics: CompanionDiagnostics | null; update: (key: PreferenceKey, value: unknown) => Promise<void>; run: (operation: () => Promise<CompanionSnapshot | void>) => Promise<void>; refreshDiagnostics: () => Promise<void> }) {
  if (section === "general") return <SettingsGroup title="General" description="Control how the connector behaves on this computer."><SettingRow title="Launch on startup" detail="Start Connector when you sign in"><Switch checked={snapshot.preferences.autoStart} onCheckedChange={(value) => void update("autoStart", value)} /></SettingRow><SettingRow title="Minimize to system tray" detail="Closing the window keeps Connector running"><Switch checked={snapshot.preferences.minimizeToTray} onCheckedChange={(value) => void update("minimizeToTray", value)} /></SettingRow><SettingRow title="Start minimized" detail="Launch quietly in the background"><Switch checked={snapshot.preferences.startMinimized} onCheckedChange={(value) => void update("startMinimized", value)} /></SettingRow><SettingRow title="Theme"><Select value={snapshot.preferences.theme} onValueChange={(value) => void update("theme", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dark">Dark</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></SettingRow><SettingRow title="Language" detail="Additional languages are coming later"><span className="text-xs text-muted-foreground">English</span></SettingRow></SettingsGroup>;
  if (section === "connection") return <SettingsGroup title="Connection" description="NexusRBX Cloud session and reconnect behavior."><ReadOnlyRow label="Backend URL" value={diagnostics?.backendUrl || "https://api.nexusrbx.com"} /><SettingRow title="Reconnect automatically" detail="Restore a dropped connection without prompting"><Switch checked={snapshot.preferences.autoReconnect} onCheckedChange={(value) => void update("autoReconnect", value)} /></SettingRow><SettingRow title="Reconnect delay" detail="Wait before attempting recovery"><Select value={String(snapshot.preferences.reconnectDelayMs)} onValueChange={(value) => void update("reconnectDelayMs", Number(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1000, 2000, 5000, 10000].map((value) => <SelectItem key={value} value={String(value)}>{value / 1000} seconds</SelectItem>)}</SelectContent></Select></SettingRow><ReadOnlyRow label="Session status" value={snapshot.cloudHealth === "connected" ? "Authenticated and connected" : "Not connected"} /><Button variant="destructive" className="mt-3" onClick={() => void run(() => window.nexusConnector?.revokeSession() ?? Promise.resolve(previewSnapshot))}><Power size={14} /> Disconnect and revoke session</Button></SettingsGroup>;
  if (section === "mcp") return <SettingsGroup title="MCP" description="Detected Roblox Studio MCP connection and tools."><ReadOnlyRow label="Detected executable" value={diagnostics?.mcpCommand || "Checking…"} /><ReadOnlyRow label="MCP server version" value={snapshot.mcpServerVersion || "Not reported"} /><ReadOnlyRow label="Studio MCP health" value={healthLabel(snapshot.mcpHealth)} /><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => void run(() => window.nexusConnector?.retry() ?? Promise.resolve(snapshot))}><RefreshCw size={13} /> Rediscover tools</Button><ToolDialog snapshot={snapshot} /></div><Collapsible><CollapsibleTrigger className="mt-5 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ChevronDown size={13} /> Advanced</CollapsibleTrigger><CollapsibleContent className="mt-2 rounded-md border border-line bg-black/15 p-3 text-[11px] leading-relaxed text-muted-foreground">Executable overrides are intentionally unavailable in the customer UI. Trusted developer overrides remain available through the Connector CLI.</CollapsibleContent></Collapsible></SettingsGroup>;
  if (section === "updates") return <SettingsGroup title="Updates" description="Keep NexusRBX Connector secure and current."><SettingRow title="Automatic updates" detail="Download signed updates in the background"><Switch checked={snapshot.preferences.automaticUpdates} onCheckedChange={(value) => void update("automaticUpdates", value)} /></SettingRow><ReadOnlyRow label="Current version" value={snapshot.connectorVersion} /><ReadOnlyRow label="Update status" value={updateLabel(snapshot.updateState)} /><div className="mt-4 flex gap-2"><Button variant="secondary" size="sm" onClick={() => void run(() => window.nexusConnector?.checkForUpdates() ?? Promise.resolve(snapshot))}><RefreshCw size={13} /> Check now</Button>{snapshot.updateState === "downloaded" && <Button size="sm" onClick={() => void window.nexusConnector?.installUpdate()}>Restart to update</Button>}</div></SettingsGroup>;
  if (section === "diagnostics") return <SettingsGroup title="Diagnostics" description="Sanitized health details safe to share with support.">{diagnostics ? <><ReadOnlyRow label="Connector" value={`v${diagnostics.connectorVersion} · ${diagnostics.platform} ${diagnostics.architecture}`} /><ReadOnlyRow label="Backend health" value={healthLabel(diagnostics.backendHealth)} /><ReadOnlyRow label="Studio MCP health" value={healthLabel(diagnostics.mcpHealth)} /><ReadOnlyRow label="MCP protocol" value={diagnostics.mcpServerVersion || "Not reported"} /><ReadOnlyRow label="Last heartbeat" value={relativeTime(diagnostics.lastHeartbeatAt)} /><ReadOnlyRow label="Last command" value={diagnostics.lastCommand ? `${diagnostics.lastCommand.name} · ${diagnostics.lastCommand.status}` : "No command recorded"} /><ReadOnlyRow label="Logs" value={diagnostics.logLocation} /></> : <div className="flex items-center gap-2 py-5 text-xs text-muted-foreground"><LoaderCircle size={14} className="animate-spin" /> Gathering diagnostics…</div>}<div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => void window.nexusConnector?.copyDiagnostics()}><Copy size={13} /> Copy report</Button><Button variant="secondary" size="sm" onClick={() => void window.nexusConnector?.openLogs()}><FolderOpen size={13} /> Open logs</Button><Button variant="ghost" size="sm" onClick={() => void refreshDiagnostics()}><RefreshCw size={13} /> Refresh</Button></div></SettingsGroup>;
  return <SettingsGroup title="About" description="NexusRBX Connector securely links NexusRBX Cloud to Roblox Studio MCP."><div className="flex items-center gap-4 rounded-lg border border-line bg-panel p-4"><img src="./logo.png" className="h-12 w-12 object-contain" alt="NexusRBX" /><div><p className="text-sm font-semibold">NexusRBX Connector</p><p className="mt-1 text-xs text-muted-foreground">Version {snapshot.connectorVersion}</p></div></div><div className="mt-5 space-y-2 text-xs leading-relaxed text-muted-foreground"><p>Credentials are protected with your operating system's encrypted storage.</p><p>Pairing codes are short-lived and are never saved.</p><p>Roblox Studio is identified only as the connected MCP service. NexusRBX is not affiliated with or endorsed by Roblox.</p></div><Button variant="link" className="mt-3 px-0" onClick={() => void window.nexusConnector?.openHelp()}>Help and documentation <ExternalLink size={12} /></Button></SettingsGroup>;
}

function SettingsGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <><h1 className="text-lg font-semibold">{title}</h1><p className="mt-1 text-xs text-muted-foreground">{description}</p><div className="mt-5 divide-y divide-line">{children}</div></>; }
function SettingRow({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) { return <div className="flex min-h-14 items-center gap-5 py-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium">{title}</p>{detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}</div>{children}</div>; }
function ReadOnlyRow({ label, value }: { label: string; value: string }) { return <div className="flex min-h-13 items-center gap-6 py-3"><span className="min-w-32 text-xs text-muted-foreground">{label}</span><span className="min-w-0 flex-1 truncate text-right text-xs" title={value}>{value}</span></div>; }
function ToolDialog({ snapshot }: { snapshot: CompanionSnapshot }) { const [query, setQuery] = useState(""); const tools = useMemo(() => snapshot.supportedTools.filter((tool) => tool.toLowerCase().includes(query.toLowerCase())), [query, snapshot.supportedTools]); return <Dialog><DialogTrigger asChild><Button variant="secondary" size="sm"><Wrench size={13} /> Show available tools ({snapshot.supportedToolCount})</Button></DialogTrigger><DialogContent title="Available MCP tools"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" /></div><ScrollArea className="mt-3 h-64"><div className="space-y-1 pr-2">{tools.length ? tools.map((tool) => <div key={tool} className="rounded bg-panel px-3 py-2 font-mono text-xs">{tool}</div>) : <p className="py-8 text-center text-xs text-muted-foreground">No matching tools</p>}</div></ScrollArea></DialogContent></Dialog>; }
function healthLabel(health: ServiceHealth) { return ({ connected: "Connected", connecting: "Connecting", warning: "Needs attention", disconnected: "Disconnected" } as const)[health]; }
function updateLabel(state: CompanionSnapshot["updateState"]) { return ({ idle: "Up to date", checking: "Checking…", available: "Update available", downloaded: "Ready to install", error: "Could not check for updates" } as const)[state]; }
