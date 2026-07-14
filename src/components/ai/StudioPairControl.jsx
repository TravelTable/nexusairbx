import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Radio,
  RefreshCw,
  Server,
  Terminal,
  Unlink,
} from "lib/icons";
import {
  disconnectStudio,
  disconnectStudioMcp,
  startStudioMcpPairing,
  startStudioPairing,
  testStudioMcp,
} from "../../lib/studioBridgeApi";
import {
  getStudioSessionId,
  MCP_CAPABILITY_LABELS,
} from "../../lib/studioConnection";

const MENU_WIDTH = 460;
const VIEWPORT_GUTTER = 8;

function formatRemaining(ms) {
  if (!ms || ms <= 0) return "expired";
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes <= 0 ? `${seconds}s` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatLastSeen(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "Not reported";
  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 10000) return "Just now";
  if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
  return new Date(timestamp).toLocaleString();
}

export function resolvePairingExpiry(result, now = Date.now()) {
  const rawExpiresAt = result?.expiresAt;
  if (rawExpiresAt) {
    const parsed = typeof rawExpiresAt === "string" ? Date.parse(rawExpiresAt) : Number(rawExpiresAt);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed < 1e12 ? parsed * 1000 : parsed;
    }
  }
  const expiresInMs = Number(result?.expiresInMs || 0);
  if (Number.isFinite(expiresInMs) && expiresInMs > 0) return now + expiresInMs;
  const expiresInSeconds = Number(result?.expiresInSeconds || result?.expiresIn || 0);
  if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    return now + expiresInSeconds * 1000;
  }
  return 0;
}

export function getDesktopConnectorPairingLink(code, search = "") {
  const params = new URLSearchParams(search);
  if (!code || params.get("connector") !== "desktop") return null;
  return `nexusrbx://connector/pair?code=${encodeURIComponent(code)}`;
}

function PairingCode({ code, expiresAt, now, copied, onCopy, onRegenerate, busy }) {
  const remainingMs = expiresAt ? expiresAt - now : 0;
  const expiryKnown = expiresAt > 0;
  const expired = Boolean(code) && expiresAt > 0 && remainingMs <= 0;
  return (
    <>
      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-2xl font-black tracking-[0.3em] text-white">{code}</span>
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-lg bg-white/5 p-2 text-gray-300 transition-all hover:bg-white/10 hover:text-white"
            title="Copy pairing code"
            aria-label="Copy pairing code"
          >
            {copied ? <Check className="h-4 w-4 text-[#00f5d4]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest">
          {expired ? (
            <span className="text-rose-400">Code expired — generate a new one</span>
          ) : expiryKnown ? (
            <span className="text-gray-500">Expires in {formatRemaining(remainingMs)}</span>
          ) : (
            <span className="text-gray-500">One-time pairing code</span>
          )}
        </div>
      </div>
      {!expired && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00f5d4]" />
          Waiting for the connection to claim this code…
        </div>
      )}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 transition-all hover:bg-white/10 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        New code
      </button>
    </>
  );
}

function HealthRow({ label, healthy, waitingLabel = "Not detected" }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.03] px-2.5 py-2 text-[11px]">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold ${healthy ? "text-[#00f5d4]" : "text-amber-300"}`}>
        {healthy ? "Detected" : waitingLabel}
      </span>
    </div>
  );
}

/** Connects either the recommended NexusRBX Studio plugin or the optional local MCP transport. */
export default function StudioPairControl({
  connection = null,
  connected = false,
  loading = false,
  refresh,
  notify,
  requireUser,
}) {
  const pluginConnected = connection ? Boolean(connection.pluginConnected) : connected;
  const mcpConnected = Boolean(connection?.mcpConnected);
  const connectorDetected = Boolean(connection?.connectorDetected);
  const degraded = Boolean(connection?.degraded);
  const connectionState = connection?.connectionState || (connected ? "plugin" : "disconnected");
  const pluginSession = connection?.pluginSession || null;
  const mcpSession = connection?.mcpSession || null;
  const latestMcpSession = connection?.latestMcpSession || mcpSession;
  const capabilities = connection?.capabilities || { supported: [], unavailable: [] };

  const [open, setOpen] = useState(false);
  const [activeMethod, setActiveMethod] = useState("plugin");
  const [menuPosition, setMenuPosition] = useState(null);
  const [pairing, setPairing] = useState({ plugin: null, mcp: null });
  const [now, setNow] = useState(() => Date.now());
  const [busyMethod, setBusyMethod] = useState("");
  const [disconnectingMethod, setDisconnectingMethod] = useState("");
  const [testing, setTesting] = useState(false);
  const [copiedMethod, setCopiedMethod] = useState("");

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const copyResetTimerRef = useRef(null);
  const activePair = pairing[activeMethod];
  const overallConnected = pluginConnected || mcpConnected;

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER);
    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.min(Math.max(VIEWPORT_GUTTER, rect.left), maxLeft),
      maxHeight: Math.max(240, window.innerHeight - rect.bottom - 24),
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="tab"][aria-selected="true"]')?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => () => {
    if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open || !activePair?.code) return undefined;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [activePair?.code, open]);

  useEffect(() => {
    if (!pluginConnected || !pairing.plugin) return;
    setPairing((current) => ({ ...current, plugin: null }));
    notify?.({ message: "Connected via NexusRBX Studio Plugin", type: "success" });
  }, [pluginConnected, pairing.plugin, notify]);

  useEffect(() => {
    if (!mcpConnected || !pairing.mcp) return;
    setPairing((current) => ({ ...current, mcp: null }));
    notify?.({ message: "Connected via Roblox Studio MCP", type: "success" });
  }, [mcpConnected, pairing.mcp, notify]);

  const generateCode = async (method) => {
    if (requireUser && !requireUser()) return;
    setBusyMethod(method);
    try {
      const result = method === "mcp" ? await startStudioMcpPairing() : await startStudioPairing();
      setPairing((current) => ({
        ...current,
        [method]: {
          code: String(result.code || "").toUpperCase(),
          expiresAt: resolvePairingExpiry(result),
        },
      }));
      const desktopPairingLink = getDesktopConnectorPairingLink(
        result.code,
        typeof window === "undefined" ? "" : window.location.search
      );
      if (desktopPairingLink) window.location.assign(desktopPairingLink);
      setNow(Date.now());
    } catch (error) {
      notify?.({ message: error?.message || "Failed to start Studio pairing", type: "error" });
    } finally {
      setBusyMethod("");
    }
  };

  const copyCode = async (method) => {
    const code = pairing[method]?.code;
    if (!code || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedMethod(method);
      if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = window.setTimeout(() => {
        copyResetTimerRef.current = null;
        setCopiedMethod("");
      }, 1500);
    } catch (error) {
      notify?.({ message: error?.message || "Could not copy the pairing code", type: "error" });
    }
  };

  const disconnect = async (method) => {
    setDisconnectingMethod(method);
    try {
      const sessionId = method === "mcp"
        ? getStudioSessionId(latestMcpSession)
        : getStudioSessionId(pluginSession);
      if (method === "mcp") await disconnectStudioMcp({ sessionId });
      else await disconnectStudio({ sessionId });
      setPairing((current) => ({ ...current, [method]: null }));
      notify?.({
        message: method === "mcp" ? "Roblox Studio MCP disconnected" : "Studio plugin disconnected",
        type: "success",
      });
      await refresh?.();
    } catch (error) {
      notify?.({ message: error?.message || "Failed to disconnect Studio", type: "error" });
    } finally {
      setDisconnectingMethod("");
    }
  };

  const testMcpConnection = async () => {
    setTesting(true);
    try {
      const result = await testStudioMcp({ sessionId: getStudioSessionId(latestMcpSession) });
      const ok = result?.ok !== false && result?.connected !== false;
      notify?.({
        message: ok ? "Roblox Studio MCP connection test passed" : "Roblox Studio MCP connection test failed",
        type: ok ? "success" : "error",
      });
      await refresh?.();
    } catch (error) {
      notify?.({ message: error?.message || "Roblox Studio MCP connection test failed", type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const statusCopy = {
    both: "Plugin and MCP connected",
    plugin: "Connected via NexusRBX Studio Plugin",
    mcp: "Connected via Roblox Studio MCP",
    degraded: "Connector connected, Roblox Studio MCP not detected",
    disconnected: "Roblox Studio disconnected",
  }[connectionState] || "Connection degraded";

  const mcpPlace = latestMcpSession?.studio?.placeName || latestMcpSession?.studio?.placeId || "Not reported";
  const connectorVersion = latestMcpSession?.connector?.connectorVersion || latestMcpSession?.studio?.connectorVersion || "Not reported";
  const mcpServerVersion = latestMcpSession?.studio?.mcpServerVersion || "Not reported";
  const supportedCapabilities = capabilities.supported || [];
  const unavailableCapabilities = capabilities.unavailable || [];

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <div
          id="studio-connection-dialog"
          ref={menuRef}
          className="fixed z-[9999] w-[min(460px,calc(100vw-16px))] overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D0D]/95 p-4 shadow-2xl backdrop-blur-2xl"
          style={{
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            maxHeight: Math.min(menuPosition?.maxHeight ?? window.innerHeight * 0.75, window.innerHeight * 0.75),
            visibility: menuPosition ? "visible" : "hidden",
          }}
          role="dialog"
          aria-label="Connect Roblox Studio"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                overallConnected
                  ? "bg-[#00f5d4]/15 text-[#00f5d4]"
                  : degraded
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/5 text-gray-400"
              }`}>
                {degraded && !overallConnected ? <AlertTriangle className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight text-white">Connect Roblox Studio</div>
                <div className={`mt-0.5 truncate text-[10px] font-black uppercase tracking-wider ${
                  overallConnected ? "text-[#00f5d4]" : degraded ? "text-amber-300" : "text-gray-500"
                }`}>
                  {loading ? "Checking…" : statusCopy}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refresh?.()}
              className="rounded-lg bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
              title="Retry connection check"
              aria-label="Retry connection check"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1" role="tablist" aria-label="Studio connection method">
            <button
              type="button"
              role="tab"
              aria-selected={activeMethod === "plugin"}
              onClick={() => setActiveMethod("plugin")}
              className={`rounded-lg px-3 py-2 text-left transition-all ${activeMethod === "plugin" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#00f5d4]">Recommended</span>
              <span className="block text-xs font-bold">Studio Plugin</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMethod === "mcp"}
              onClick={() => setActiveMethod("mcp")}
              className={`rounded-lg px-3 py-2 text-left transition-all ${activeMethod === "mcp" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest text-violet-300">Advanced</span>
              <span className="block text-xs font-bold">Roblox Studio MCP</span>
            </button>
          </div>

          {activeMethod === "plugin" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#00f5d4]/15 bg-[#00f5d4]/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-white">
                  <Radio className="h-4 w-4 text-[#00f5d4]" /> NexusRBX Studio Plugin
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Best for most users. It connects directly to your open project and supports project context,
                  script editing, model workflows, validation, and safe recovery.
                </p>
              </div>
              {pluginConnected ? (
                <>
                  <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-3 text-xs text-gray-300">
                    <span className="font-semibold text-[#00f5d4]">Plugin connected.</span> Push a generation to Studio,
                    or enable Live Studio in the composer.
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect("plugin")}
                    disabled={disconnectingMethod === "plugin"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {disconnectingMethod === "plugin" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                    Disconnect plugin
                  </button>
                </>
              ) : pairing.plugin?.code ? (
                <PairingCode
                  code={pairing.plugin.code}
                  expiresAt={pairing.plugin.expiresAt}
                  now={now}
                  copied={copiedMethod === "plugin"}
                  onCopy={() => copyCode("plugin")}
                  onRegenerate={() => generateCode("plugin")}
                  busy={busyMethod === "plugin"}
                />
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-gray-400">
                    Generate a one-time code, then enter it in the installed NexusRBX plugin inside Roblox Studio.
                  </p>
                  <button
                    type="button"
                    onClick={() => generateCode("plugin")}
                    disabled={busyMethod === "plugin"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00f5d4]/30 bg-[#00f5d4]/10 px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#00f5d4] transition-all hover:bg-[#00f5d4]/20 disabled:opacity-50"
                  >
                    {busyMethod === "plugin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Connect with plugin
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-white">
                  <Terminal className="h-4 w-4 text-violet-300" /> Roblox Studio MCP
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Connect through the optional NexusRBX Local Connector for advanced local AI workflows. The
                  connector runs on your computer and is separate from the Studio plugin.
                </p>
              </div>

              {(latestMcpSession || connectorDetected) && (
                <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/30 p-2.5">
                  <HealthRow label="Local connector" healthy={connectorDetected} />
                  <HealthRow label="Roblox Studio MCP server" healthy={mcpConnected} />
                  {connectorDetected && !mcpConnected && (
                    <div className="flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5 text-[11px] leading-relaxed text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Connector connected, Roblox Studio MCP not detected. Open Studio and enable its MCP server.
                    </div>
                  )}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-1 pt-1 text-[10px]">
                    <dt className="text-gray-500">Place</dt><dd className="truncate text-right text-gray-300">{mcpPlace}</dd>
                    <dt className="text-gray-500">Last seen</dt><dd className="text-right text-gray-300">{formatLastSeen(latestMcpSession?.lastSeenAt)}</dd>
                    <dt className="text-gray-500">Connector</dt><dd className="truncate text-right text-gray-300">{connectorVersion}</dd>
                    <dt className="text-gray-500">MCP server</dt><dd className="truncate text-right text-gray-300">{mcpServerVersion}</dd>
                  </dl>
                </div>
              )}

              {(supportedCapabilities.length > 0 || unavailableCapabilities.length > 0) && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Server className="h-3.5 w-3.5" /> Discovered capabilities
                  </div>
                  <div className="space-y-1">
                    {[...supportedCapabilities, ...unavailableCapabilities].map((capability) => {
                      const available = supportedCapabilities.includes(capability);
                      return (
                        <div key={capability} className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="text-gray-400">{MCP_CAPABILITY_LABELS[capability] || capability}</span>
                          <span className={available ? "font-bold text-[#00f5d4]" : "font-bold text-gray-600"}>
                            {available ? "Supported" : "Unavailable"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!mcpConnected && !pairing.mcp?.code && (
                <ol className="list-inside list-decimal space-y-1 text-[11px] leading-relaxed text-gray-400">
                  <li>Open the experience you want to edit in Roblox Studio.</li>
                  <li>Enable Roblox Studio MCP.</li>
                  <li>Run the NexusRBX Local Connector on this computer.</li>
                  <li>Enter the pairing code generated here.</li>
                  <li>Return here and test the connection.</li>
                </ol>
              )}

              {!mcpConnected && (pairing.mcp?.code ? (
                <PairingCode
                  code={pairing.mcp.code}
                  expiresAt={pairing.mcp.expiresAt}
                  now={now}
                  copied={copiedMethod === "mcp"}
                  onCopy={() => copyCode("mcp")}
                  onRegenerate={() => generateCode("mcp")}
                  busy={busyMethod === "mcp"}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => generateCode("mcp")}
                  disabled={busyMethod === "mcp"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 py-2.5 text-xs font-black uppercase tracking-widest text-violet-200 transition-all hover:bg-violet-400/20 disabled:opacity-50"
                >
                  {busyMethod === "mcp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Connect with MCP
                </button>
              ))}

              {(latestMcpSession || mcpConnected) && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={testMcpConnection}
                    disabled={testing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 transition-all hover:bg-white/10 disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Test connection
                  </button>
                  <button
                    type="button"
                    onClick={() => disconnect("mcp")}
                    disabled={disconnectingMethod === "mcp"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {disconnectingMethod === "mcp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                    Disconnect MCP
                  </button>
                </div>
              )}

              <a
                href="/docs/studio-plugin"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 transition-colors hover:text-gray-300"
              >
                Local connector setup <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  const buttonLabel = connectionState === "both"
    ? "Studio · Both"
    : connectionState === "mcp"
      ? "Studio · MCP"
      : overallConnected
        ? "Studio"
        : degraded
          ? "Studio · Check"
          : "Pair Studio";

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updateMenuPosition();
          setOpen((current) => !current);
        }}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
          overallConnected
            ? "border-[#00f5d4]/30 bg-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/20"
            : degraded
              ? "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
        title={statusCopy}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="studio-connection-dialog"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : degraded && !overallConnected ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Radio className={`h-3.5 w-3.5 shrink-0 ${overallConnected ? "" : "text-gray-400"}`} />
        )}
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}
