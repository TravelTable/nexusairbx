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
  selectStudioMcpTarget,
  testStudioMcp,
} from "../../lib/studioBridgeApi";
import {
  getStudioSessionId,
  MCP_CAPABILITY_LABELS,
} from "../../lib/studioConnection";
import StudioSetupVisual, {
  getStudioSetupVisual,
  STUDIO_SETUP_VISUALS,
} from "../onboarding/StudioSetupVisual";
import {
  computeAnchoredMenuPosition,
  getWorkspaceMenuHost,
  resolveAnchoredMenuPosition,
} from "../../lib/workspaceMenuPosition";

const MENU_WIDTH = 400;
const MENU_MAX_HEIGHT = 520;
const CURRENT_CONNECTOR_VERSION = "0.2.14";

/** @deprecated Prefer computeAnchoredMenuPosition — kept for existing Studio pair tests. */
export function computeStudioPairMenuPosition(buttonRect, options) {
  return computeAnchoredMenuPosition(buttonRect, {
    menuWidth: MENU_WIDTH,
    menuMaxHeight: MENU_MAX_HEIGHT,
    ...options,
  });
}

function formatRemaining(ms) {
  if (!ms || ms <= 0) return "expired";
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes <= 0
    ? `${seconds}s`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
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
    const parsed =
      typeof rawExpiresAt === "string"
        ? Date.parse(rawExpiresAt)
        : Number(rawExpiresAt);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed < 1e12 ? parsed * 1000 : parsed;
    }
  }
  const expiresInMs = Number(result?.expiresInMs || 0);
  if (Number.isFinite(expiresInMs) && expiresInMs > 0) return now + expiresInMs;
  const expiresInSeconds = Number(
    result?.expiresInSeconds || result?.expiresIn || 0,
  );
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

const ALREADY_DISCONNECTED_MCP_CODES = new Set([
  "STUDIO_SESSION_NOT_FOUND",
  "STUDIO_SESSION_MISSING",
  "STUDIO_SESSION_DISCONNECTED",
]);

export function isStudioMcpAlreadyDisconnected(error) {
  return (
    Number(error?.status || 0) === 404 ||
    Number(error?.status || 0) === 410 ||
    ALREADY_DISCONNECTED_MCP_CODES.has(String(error?.code || ""))
  );
}

function PairingCode({
  code,
  expiresAt,
  now,
  copied,
  onCopy,
  onRegenerate,
  busy,
}) {
  const remainingMs = expiresAt ? expiresAt - now : 0;
  const expiryKnown = expiresAt > 0;
  const expired = Boolean(code) && expiresAt > 0 && remainingMs <= 0;
  return (
    <>
      <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-2xl font-black tracking-[0.3em] text-[var(--ds-text)]">
            {code}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-lg bg-[var(--ds-fill-subtle)] p-2 text-[var(--ds-text-secondary)] transition-all hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
            title="Copy pairing code"
            aria-label="Copy pairing code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[var(--ds-accent)]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest">
          {expired ? (
            <span className=" text-[var(--ds-danger)] ">
              Code expired — generate a new one
            </span>
          ) : expiryKnown ? (
            <span className="text-[var(--ds-text-muted)]">
              Expires in {formatRemaining(remainingMs)}
            </span>
          ) : (
            <span className="text-[var(--ds-text-muted)]">
              One-time pairing code
            </span>
          )}
        </div>
      </div>
      {!expired && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--ds-text-muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ds-accent)]" />
          Waiting for the connection to claim this code…
        </div>
      )}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ds-fill-subtle)] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)] transition-all hover:bg-[var(--ds-fill-hover)] disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        New code
      </button>
    </>
  );
}

function HealthRow({ label, healthy, waitingLabel = "Not detected" }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--ds-fill-subtle)] px-2.5 py-2 text-[11px]">
      <span className="text-[var(--ds-text-secondary)]">{label}</span>
      <span
        className={`font-bold ${healthy ? "text-[var(--ds-accent)]" : " text-[var(--ds-warning)] "}`}
      >
        {healthy ? "Detected" : waitingLabel}
      </span>
    </div>
  );
}

export const STUDIO_SETUP_VISUAL_PREFERENCE_KEY =
  "nexus_studio_setup_visual_v1";

function readStudioSetupVisualPreference() {
  try {
    const stored = localStorage.getItem(STUDIO_SETUP_VISUAL_PREFERENCE_KEY);
    return STUDIO_SETUP_VISUALS.some((visual) => visual.id === stored)
      ? stored
      : STUDIO_SETUP_VISUALS[0].id;
  } catch {
    return STUDIO_SETUP_VISUALS[0].id;
  }
}

function writeStudioSetupVisualPreference(visualId) {
  try {
    localStorage.setItem(STUDIO_SETUP_VISUAL_PREFERENCE_KEY, visualId);
  } catch {
    // The selector still works for the current open dialog when storage is blocked.
  }
}

function StudioPluginSetupReference({ suggestedVisualId }) {
  const [selectedVisualId, setSelectedVisualId] = useState(
    () => suggestedVisualId || readStudioSetupVisualPreference(),
  );
  const previousSuggestedVisualIdRef = useRef(suggestedVisualId);
  const selectedVisual = getStudioSetupVisual(selectedVisualId);

  useEffect(() => {
    const previousSuggestedVisualId = previousSuggestedVisualIdRef.current;
    previousSuggestedVisualIdRef.current = suggestedVisualId;
    if (suggestedVisualId) {
      setSelectedVisualId(suggestedVisualId);
    } else if (previousSuggestedVisualId) {
      setSelectedVisualId(readStudioSetupVisualPreference());
    }
  }, [suggestedVisualId]);

  const selectVisual = useCallback((visualId) => {
    const nextVisual = getStudioSetupVisual(visualId);
    setSelectedVisualId(nextVisual.id);
    writeStudioSetupVisualPreference(nextVisual.id);
  }, []);

  return (
    <section
      className="border-y border-[var(--ds-border-subtle)] py-3"
      aria-labelledby="studio-plugin-setup-heading"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3
          id="studio-plugin-setup-heading"
          className="text-xs font-bold text-[var(--ds-text)]"
        >
          Plugin setup reference
        </h3>
        <a
          href="/docs/installation"
          className="inline-flex min-h-11 items-center gap-1 text-[10px] font-bold text-[var(--ds-text-secondary)] underline decoration-[var(--ds-border-strong)] underline-offset-4 hover:text-[var(--ds-text)]"
        >
          Full install guide <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <label
        htmlFor="studio-plugin-setup-step"
        className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]"
      >
        Setup step
      </label>
      <select
        id="studio-plugin-setup-step"
        value={selectedVisual.id}
        onChange={(event) => selectVisual(event.target.value)}
        aria-describedby="studio-plugin-setup-instruction"
        className="min-h-11 w-full rounded border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] px-3 text-xs font-bold text-[var(--ds-text)] outline-none focus-visible:border-[var(--ds-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
      >
        {STUDIO_SETUP_VISUALS.map((visual, index) => (
          <option key={visual.id} value={visual.id}>
            {index + 1}. {visual.title}
          </option>
        ))}
      </select>
      <p
        id="studio-plugin-setup-instruction"
        className="my-3 text-[11px] leading-relaxed text-[var(--ds-text-secondary)]"
      >
        {selectedVisual.instruction}
      </p>
      <StudioSetupVisual visualId={selectedVisual.id} />
    </section>
  );
}

/** Optionally connects the NexusRBX Studio plugin or a local MCP transport. */
export default function StudioPairControl({
  connection = null,
  connected = false,
  loading = false,
  refresh,
  notify,
  requireUser,
  open: controlledOpen = null,
  onOpenChange = null,
  returnFocusRef = null,
}) {
  const pluginConnected = connection
    ? Boolean(connection.pluginConnected)
    : connected;
  const mcpConnected = Boolean(connection?.mcpConnected);
  const connectorDetected = Boolean(connection?.connectorDetected);
  const degraded = Boolean(connection?.degraded);
  const connectionState =
    connection?.connectionState || (connected ? "plugin" : "export_only");
  const pluginSession = connection?.pluginSession || null;
  const mcpSession = connection?.mcpSession || null;
  const latestMcpSession = connection?.latestMcpSession || mcpSession;
  const capabilities = connection?.capabilities || {
    supported: [],
    unavailable: [],
  };
  const compatibility =
    connection?.compatibility || pluginSession?.compatibility || {};
  const pluginUpdateRequired =
    pluginConnected && compatibility.status === "update_required";
  const pluginRepairing =
    pluginConnected && compatibility.status === "repairing";
  const pluginDegraded = pluginConnected && compatibility.status === "degraded";
  const degradedFeature =
    compatibility.missingCapabilities?.[0] ||
    compatibility.missingCommands?.[0] ||
    "a Studio feature";
  const pluginMissingCreateInstance =
    pluginDegraded &&
    (compatibility.missingCommands?.includes("create_instance") ||
      compatibility.missingCapabilities?.includes("instanceMutation"));
  const transportSelection = connection?.transportSelection || {};

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen == null ? internalOpen : Boolean(controlledOpen);
  const [activeMethod, setActiveMethod] = useState("plugin");
  const [menuPosition, setMenuPosition] = useState(null);
  const [pairing, setPairing] = useState({ plugin: null, mcp: null });
  const [now, setNow] = useState(() => Date.now());
  const [busyMethod, setBusyMethod] = useState("");
  const [disconnectingMethod, setDisconnectingMethod] = useState("");
  const [testing, setTesting] = useState(false);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [copiedMethod, setCopiedMethod] = useState("");

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const copyResetTimerRef = useRef(null);
  const ownTriggerOpenRequestedRef = useRef(false);
  const dialogReturnFocusRef = useRef(null);
  const activePair = pairing[activeMethod];
  const overallConnected = pluginConnected || mcpConnected;

  const requestOpenChange = useCallback(
    (nextOpen) => {
      const resolvedOpen = Boolean(nextOpen);
      if (controlledOpen == null) setInternalOpen(resolvedOpen);
      onOpenChange?.(resolvedOpen);
    },
    [controlledOpen, onOpenChange],
  );

  const updateMenuPosition = useCallback(() => {
    setMenuPosition(
      resolveAnchoredMenuPosition(buttonRef.current, {
        menuWidth: MENU_WIDTH,
        menuMaxHeight: MENU_MAX_HEIGHT,
      }),
    );
  }, []);

  const handleMethodTabKeyDown = useCallback((event) => {
    const nextMethod = {
      ArrowRight: "mcp",
      ArrowDown: "mcp",
      End: "mcp",
      ArrowLeft: "plugin",
      ArrowUp: "plugin",
      Home: "plugin",
    }[event.key];
    if (!nextMethod) return;
    event.preventDefault();
    setActiveMethod(nextMethod);
    menuRef.current
      ?.querySelector(`[data-studio-connection-method="${nextMethod}"]`)
      ?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      )
        return;
      requestOpenChange(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, requestOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    dialogReturnFocusRef.current = ownTriggerOpenRequestedRef.current
      ? buttonRef.current
      : returnFocusRef?.current || buttonRef.current;
    ownTriggerOpenRequestedRef.current = false;
    menuRef.current
      ?.querySelector('[role="tab"][aria-selected="true"]')
      ?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestOpenChange(false);
      const focusTarget = dialogReturnFocusRef.current;
      if (
        focusTarget &&
        typeof focusTarget.focus === "function" &&
        (focusTarget.isConnected === undefined || focusTarget.isConnected)
      ) {
        focusTarget.focus();
      } else {
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, requestOpenChange, returnFocusRef]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current)
        window.clearTimeout(copyResetTimerRef.current);
    },
    [],
  );

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
    notify?.({
      message: "Connected via NexusRBX Studio Plugin",
      type: "success",
    });
    // Mirror disconnect: force a fresh status snapshot once pairing completes.
    Promise.resolve(refresh?.({ force: true })).catch(() => {});
  }, [pluginConnected, pairing.plugin, notify, refresh]);

  useEffect(() => {
    if (!mcpConnected || !pairing.mcp) return;
    setPairing((current) => ({ ...current, mcp: null }));
    notify?.({ message: "Connected via Roblox Studio MCP", type: "success" });
    Promise.resolve(refresh?.({ force: true })).catch(() => {});
  }, [mcpConnected, pairing.mcp, notify, refresh]);

  const generateCode = async (method) => {
    if (requireUser && !requireUser()) return;
    setBusyMethod(method);
    try {
      const result =
        method === "mcp"
          ? await startStudioMcpPairing()
          : await startStudioPairing();
      setPairing((current) => ({
        ...current,
        [method]: {
          code: String(result.code || "").toUpperCase(),
          expiresAt: resolvePairingExpiry(result),
        },
      }));
      const desktopPairingLink = getDesktopConnectorPairingLink(
        result.code,
        typeof window === "undefined" ? "" : window.location.search,
      );
      if (desktopPairingLink) window.location.assign(desktopPairingLink);
      setNow(Date.now());
    } catch (error) {
      notify?.({
        message: error?.message || "Failed to start Studio pairing",
        type: "error",
      });
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
      if (copyResetTimerRef.current)
        window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = window.setTimeout(() => {
        copyResetTimerRef.current = null;
        setCopiedMethod("");
      }, 1500);
    } catch (error) {
      notify?.({
        message: error?.message || "Could not copy the pairing code",
        type: "error",
      });
    }
  };

  const disconnect = async (method) => {
    setDisconnectingMethod(method);
    let disconnectError = null;
    try {
      const sessionId =
        method === "mcp"
          ? getStudioSessionId(latestMcpSession)
          : getStudioSessionId(pluginSession);
      if (method === "mcp") await disconnectStudioMcp({ sessionId });
      else await disconnectStudio({ sessionId });
    } catch (error) {
      if (method !== "mcp" || !isStudioMcpAlreadyDisconnected(error))
        disconnectError = error;
    }

    if (!disconnectError) {
      setPairing((current) => ({ ...current, [method]: null }));
      notify?.({
        message:
          method === "mcp"
            ? "Roblox Studio MCP disconnected"
            : "Studio plugin disconnected",
        type: "success",
      });
    } else {
      notify?.({
        message: disconnectError?.message || "Failed to disconnect Studio",
        type: "error",
      });
    }

    try {
      await refresh?.();
    } catch (_) {
      // The disconnect result is authoritative. The next status poll will retry
      // without turning a successful disconnect into a misleading UI error.
    } finally {
      setDisconnectingMethod("");
    }
  };

  const testMcpConnection = async () => {
    setTesting(true);
    try {
      const result = await testStudioMcp({
        sessionId: getStudioSessionId(latestMcpSession),
      });
      const ok = result?.ok !== false && result?.connected !== false;
      notify?.({
        message: ok
          ? "Roblox Studio MCP connection test passed"
          : "Roblox Studio MCP connection test failed",
        type: ok ? "success" : "error",
      });
      await refresh?.();
    } catch (error) {
      notify?.({
        message: error?.message || "Roblox Studio MCP connection test failed",
        type: "error",
      });
    } finally {
      setTesting(false);
    }
  };

  const selectMcpTarget = async (studioId) => {
    setSelectingTarget(true);
    try {
      await selectStudioMcpTarget({
        sessionId: getStudioSessionId(latestMcpSession),
        studioId,
      });
      notify?.({ message: "Roblox Studio window selected", type: "success" });
      await refresh?.();
    } catch (error) {
      notify?.({
        message: error?.message || "Failed to select the Roblox Studio window",
        type: "error",
      });
    } finally {
      setSelectingTarget(false);
    }
  };

  const statusCopy = pluginUpdateRequired
    ? "Studio plugin update required"
    : pluginRepairing
      ? "Restoring Studio connection"
      : pluginDegraded
        ? `Studio feature unavailable: ${degradedFeature}`
        : {
            both: "Plugin and MCP connected",
            plugin: "Connected via NexusRBX Studio Plugin",
            mcp: "Connected via Roblox Studio MCP",
            degraded: "Connector connected, Roblox Studio MCP not detected",
            export_only: "Browser chat available — Studio not connected",
            disconnected: "Browser chat available — Studio not connected",
          }[connectionState] || "Connection degraded";

  const transportLabel = (selection) => {
    if (!selection) return "Unavailable";
    return selection.connectionType === "mcp_local" ? "MCP" : "Plugin";
  };

  const mcpPlace =
    latestMcpSession?.studio?.placeName ||
    latestMcpSession?.studio?.placeId ||
    "Not reported";
  const connectorVersion =
    latestMcpSession?.connector?.connectorVersion ||
    latestMcpSession?.studio?.connectorVersion ||
    CURRENT_CONNECTOR_VERSION;
  const mcpServerVersion =
    latestMcpSession?.studio?.mcpServerVersion || "Not reported";
  const studioTargets = Array.isArray(latestMcpSession?.studio?.targets)
    ? latestMcpSession.studio.targets
    : [];
  const activeStudioId = latestMcpSession?.studio?.activeStudioId || "";
  const requestedStudioId = latestMcpSession?.desiredStudioId || activeStudioId;
  const capabilityDetails = latestMcpSession?.capabilityDetails || {};
  const supportedCapabilities = capabilities.supported || [];
  const unavailableCapabilities = capabilities.unavailable || [];

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            id="studio-connection-dialog"
            ref={menuRef}
            className="z-[9999] overflow-y-auto rounded border border-[var(--ds-border-strong)] bg-[var(--ds-surface-overlay)] p-4 scrollbar-subtle"
            style={{
              position: menuPosition?.strategy || "fixed",
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              width: menuPosition?.width ?? MENU_WIDTH,
              maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT,
              visibility: menuPosition ? "visible" : "hidden",
            }}
            role="dialog"
            aria-label="Connect Roblox Studio"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    overallConnected
                      ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]"
                      : degraded
                        ? " bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] "
                        : "bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]"
                  }`}
                >
                  {degraded && !overallConnected ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Radio className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-tight text-[var(--ds-text)]">
                    Connect Roblox Studio
                  </div>
                  <div
                    className={`mt-0.5 truncate text-[10px] font-black uppercase tracking-wider ${
                      overallConnected
                        ? "text-[var(--ds-accent)]"
                        : degraded
                          ? " text-[var(--ds-warning)] "
                          : "text-[var(--ds-text-muted)]"
                    }`}
                  >
                    {loading ? "Checking…" : statusCopy}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refresh?.()}
                className="rounded-lg bg-[var(--ds-fill-subtle)] p-2 text-[var(--ds-text-secondary)] transition-all hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                title="Retry connection check"
                aria-label="Retry connection check"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <p className="mb-3 text-[11px] leading-relaxed text-[var(--ds-text-secondary)]">
              Browser chat stays available without Studio. Connect only when
              NexusRBX needs to inspect, change, or verify the open place.
            </p>

            <div
              className="mb-4 grid border-y border-[var(--ds-border-subtle)] sm:grid-cols-2"
              role="tablist"
              aria-label="Studio connection method"
            >
              <button
                id="studio-connection-plugin-tab"
                type="button"
                role="tab"
                aria-label="Recommended: Studio plugin"
                aria-selected={activeMethod === "plugin"}
                aria-controls="studio-connection-plugin-panel"
                tabIndex={activeMethod === "plugin" ? 0 : -1}
                onClick={() => setActiveMethod("plugin")}
                onKeyDown={handleMethodTabKeyDown}
                data-studio-connection-method="plugin"
                className={`min-h-11 border-l-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-focus-ring)] ${activeMethod === "plugin" ? "border-l-[var(--ds-accent)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text)]" : "border-l-transparent text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text-secondary)]"}`}
              >
                <span className="block text-xs font-bold">
                  Recommended: Studio plugin
                </span>
                <span
                  className="mt-1 block text-[10px] font-normal leading-snug text-[var(--ds-text-muted)]"
                  aria-hidden="true"
                >
                  Project context, guarded apply, and recovery
                </span>
              </button>
              <button
                id="studio-connection-mcp-tab"
                type="button"
                role="tab"
                aria-label="Advanced: Connector / Roblox Studio MCP"
                aria-selected={activeMethod === "mcp"}
                aria-controls="studio-connection-mcp-panel"
                tabIndex={activeMethod === "mcp" ? 0 : -1}
                onClick={() => setActiveMethod("mcp")}
                onKeyDown={handleMethodTabKeyDown}
                data-studio-connection-method="mcp"
                className={`min-h-11 border-l-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-focus-ring)] ${activeMethod === "mcp" ? "border-l-[var(--ds-accent)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text)]" : "border-l-transparent text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text-secondary)]"}`}
              >
                <span className="block text-xs font-bold">
                  Advanced: Connector / Roblox Studio MCP
                </span>
                <span
                  className="mt-1 block text-[10px] font-normal leading-snug text-[var(--ds-text-muted)]"
                  aria-hidden="true"
                >
                  Optional local MCP transport
                </span>
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 border-y border-[var(--ds-border-subtle)] py-2.5 text-[10px]">
              <div>
                <span className="text-[var(--ds-text-muted)]">
                  Chat inspection
                </span>
                <strong className="ml-1.5 text-[var(--ds-text)]">
                  {transportLabel(transportSelection.chatInspection)}
                </strong>
              </div>
              <div>
                <span className="text-[var(--ds-text-muted)]">
                  Full manifest
                </span>
                <strong className="ml-1.5 text-[var(--ds-text)]">
                  {transportLabel(transportSelection.manifestCollection)}
                </strong>
              </div>
            </div>

            {activeMethod === "plugin" ? (
              <div
                id="studio-connection-plugin-panel"
                className="space-y-3"
                role="tabpanel"
                aria-labelledby="studio-connection-plugin-tab"
              >
                <div className="border-l-2 border-l-[var(--ds-accent)] pl-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[var(--ds-text)]">
                    <Radio className="h-4 w-4 text-[var(--ds-accent)]" />{" "}
                    NexusRBX Studio Plugin
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--ds-text-secondary)]">
                    Best for most users. It connects directly to your open
                    project and supports project context, script editing, model
                    workflows, validation, and safe recovery.
                  </p>
                </div>
                <StudioPluginSetupReference
                  suggestedVisualId={
                    pluginConnected
                      ? "connected-state"
                      : pairing.plugin?.code
                        ? "enter-pair-code"
                        : null
                  }
                />
                {pluginConnected ? (
                  <>
                    {pluginUpdateRequired ? (
                      <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] p-3 text-xs leading-relaxed text-[var(--ds-warning)] ">
                        <div className="mb-1 flex items-center gap-2 font-bold text-[var(--ds-warning)] ">
                          <AlertTriangle className="h-4 w-4" /> Studio plugin
                          update required
                        </div>
                        This plugin release is no longer supported. Reinstall
                        the current generated NexusRBXStudioBridge.plugin.lua
                        artifact, then reconnect.
                      </div>
                    ) : pluginRepairing ? (
                      <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-info)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-info)_12%,transparent)] p-3 text-xs leading-relaxed text-[var(--ds-info)] ">
                        <div className="mb-1 flex items-center gap-2 font-bold text-[var(--ds-info)] ">
                          <Loader2 className="h-4 w-4 animate-spin" /> Restoring
                          Studio connection
                        </div>
                        The plugin is repairing its saved session automatically.
                        Keep Studio open; no reinstall, restart, disconnect, or
                        re-pair is needed.
                      </div>
                    ) : pluginMissingCreateInstance ? (
                      <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] p-3 text-xs leading-relaxed text-[var(--ds-warning)] ">
                        <div className="mb-1 flex items-center gap-2 font-bold text-[var(--ds-warning)] ">
                          <AlertTriangle className="h-4 w-4" /> Update Studio
                          plugin to use Create Instance
                        </div>
                        This connected Studio plugin is missing Create Instance.
                        Install the current NexusRBXStudioBridge.plugin.lua
                        artifact, then restart Studio or reopen the plugin and
                        refresh this connection. Your other supported Studio
                        features remain available.
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href="/docs/installation"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--ds-warning)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]"
                          >
                            View install steps{" "}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => refresh?.()}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--ds-warning)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-warning)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Refresh connection
                          </button>
                        </div>
                      </div>
                    ) : pluginDegraded ? (
                      <div className="rounded-xl border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] p-3 text-xs leading-relaxed text-[var(--ds-warning)] ">
                        <div className="mb-1 flex items-center gap-2 font-bold text-[var(--ds-warning)] ">
                          <AlertTriangle className="h-4 w-4" /> Feature
                          unavailable
                        </div>
                        The connected plugin does not advertise{" "}
                        {degradedFeature}. Other supported Studio features
                        remain available.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] p-3 text-xs text-[var(--ds-text-secondary)]">
                        <span className="font-semibold text-[var(--ds-accent)]">
                          Plugin connected.
                        </span>{" "}
                        Push a generation to Studio, or enable Live Studio in
                        the composer.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => disconnect("plugin")}
                      disabled={disconnectingMethod === "plugin"}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-[10px] font-bold text-[var(--ds-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-danger)_20%,transparent)] disabled:opacity-50"
                    >
                      {disconnectingMethod === "plugin" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
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
                    <p className="text-xs leading-relaxed text-[var(--ds-text-secondary)]">
                      Generate a one-time code, then enter it in the installed
                      NexusRBX plugin inside Roblox Studio.
                    </p>
                    <button
                      type="button"
                      onClick={() => generateCode("plugin")}
                      disabled={busyMethod === "plugin"}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[var(--ds-accent)] transition-all hover:bg-[var(--ds-accent-soft)] disabled:opacity-50"
                    >
                      {busyMethod === "plugin" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Connect with plugin
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                id="studio-connection-mcp-panel"
                className="space-y-3"
                role="tabpanel"
                aria-labelledby="studio-connection-mcp-tab"
              >
                <div className="border-l-2 border-l-[var(--ds-border-strong)] pl-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[var(--ds-text)]">
                    <Terminal className="h-4 w-4 text-[var(--ds-accent)]" />{" "}
                    Connector / Roblox Studio MCP
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--ds-text-secondary)]">
                    Connect through the optional NexusRBX Local Connector for
                    advanced local AI workflows. The connector runs on your
                    computer and is separate from the Studio plugin.
                  </p>
                </div>

                {(latestMcpSession || connectorDetected) && (
                  <div className="space-y-1.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2.5">
                    <HealthRow
                      label="Local connector"
                      healthy={connectorDetected}
                    />
                    <HealthRow
                      label="Roblox Studio MCP server"
                      healthy={mcpConnected}
                    />
                    {studioTargets.length > 1 && (
                      <label className="block rounded-lg bg-[var(--ds-fill-subtle)] px-2.5 py-2 text-[11px] text-[var(--ds-text-secondary)]">
                        <span className="mb-1 block">Studio window</span>
                        <select
                          value={requestedStudioId}
                          onChange={(event) =>
                            selectMcpTarget(event.target.value)
                          }
                          disabled={selectingTarget}
                          className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] px-2 py-1.5 text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent)] disabled:opacity-50"
                          aria-label="Roblox Studio window"
                        >
                          <option value="" disabled>
                            Choose a Studio window
                          </option>
                          {studioTargets.map((target) => (
                            <option
                              key={target.studioId}
                              value={target.studioId}
                            >
                              {target.placeName ||
                                target.label ||
                                target.placeId ||
                                target.studioId}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {connectorDetected && !mcpConnected && (
                      <div className="flex gap-2 rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] p-2.5 text-[11px] leading-relaxed text-[var(--ds-warning)] ">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Connector connected, Roblox Studio MCP not detected.
                        Open Studio and enable its MCP server.
                      </div>
                    )}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-1 pt-1 text-[10px]">
                      <dt className="text-[var(--ds-text-muted)]">Place</dt>
                      <dd className="truncate text-right text-[var(--ds-text-secondary)]">
                        {mcpPlace}
                      </dd>
                      <dt className="text-[var(--ds-text-muted)]">Last seen</dt>
                      <dd className="text-right text-[var(--ds-text-secondary)]">
                        {formatLastSeen(latestMcpSession?.lastSeenAt)}
                      </dd>
                      <dt className="text-[var(--ds-text-muted)]">Connector</dt>
                      <dd className="truncate text-right text-[var(--ds-text-secondary)]">
                        {connectorVersion}
                      </dd>
                      <dt className="text-[var(--ds-text-muted)]">
                        MCP server
                      </dt>
                      <dd className="truncate text-right text-[var(--ds-text-secondary)]">
                        {mcpServerVersion}
                      </dd>
                    </dl>
                  </div>
                )}

                {(supportedCapabilities.length > 0 ||
                  unavailableCapabilities.length > 0) && (
                  <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2.5">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">
                      <Server className="h-3.5 w-3.5" /> Discovered capabilities
                    </div>
                    <div className="space-y-1">
                      {[
                        ...supportedCapabilities,
                        ...unavailableCapabilities,
                      ].map((capability) => {
                        const available =
                          supportedCapabilities.includes(capability);
                        const detail = capabilityDetails[capability] || {};
                        return (
                          <div
                            key={capability}
                            className="flex items-center justify-between gap-3 text-[10px]"
                            title={
                              available
                                ? "Verified in this connector session"
                                : detail.reasonCode ||
                                  "Required MCP tools unavailable"
                            }
                          >
                            <span className="text-[var(--ds-text-secondary)]">
                              {MCP_CAPABILITY_LABELS[capability] || capability}
                            </span>
                            <span
                              className={
                                available
                                  ? "font-bold text-[var(--ds-accent)]"
                                  : "font-bold text-[var(--ds-text-muted)]"
                              }
                            >
                              {available ? "Supported" : "Unavailable"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!mcpConnected && !pairing.mcp?.code && (
                  <ol className="list-inside list-decimal space-y-1 text-[11px] leading-relaxed text-[var(--ds-text-secondary)]">
                    <li>
                      Open the experience you want to edit in Roblox Studio.
                    </li>
                    <li>Enable Roblox Studio MCP.</li>
                    <li>Run the NexusRBX Local Connector on this computer.</li>
                    <li>Enter the pairing code generated here.</li>
                    <li>Return here and test the connection.</li>
                  </ol>
                )}

                {!mcpConnected &&
                  (pairing.mcp?.code ? (
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
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--ds-accent)] transition-colors hover:bg-[var(--ds-fill-hover)] disabled:opacity-50"
                    >
                      {busyMethod === "mcp" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Connect with MCP
                    </button>
                  ))}

                {(latestMcpSession || mcpConnected) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={testMcpConnection}
                      disabled={testing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ds-fill-subtle)] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)] transition-all hover:bg-[var(--ds-fill-hover)] disabled:opacity-50"
                    >
                      {testing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Test connection
                    </button>
                    <button
                      type="button"
                      onClick={() => disconnect("mcp")}
                      disabled={disconnectingMethod === "mcp"}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-[10px] font-bold text-[var(--ds-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-danger)_20%,transparent)] disabled:opacity-50"
                    >
                      {disconnectingMethod === "mcp" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      Disconnect MCP
                    </button>
                  </div>
                )}

                <a
                  href="/downloads"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text-secondary)]"
                >
                  Download Connector {CURRENT_CONNECTOR_VERSION}{" "}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>,
          getWorkspaceMenuHost() || document.body,
        )
      : null;

  const buttonLabel = pluginUpdateRequired
    ? "Studio · Update"
    : pluginRepairing
      ? "Studio · Restoring"
      : pluginDegraded
        ? "Studio · Limited"
        : connectionState === "both"
          ? "Studio · Both"
          : connectionState === "mcp"
            ? "Studio · MCP"
            : overallConnected
              ? "Studio"
              : degraded
                ? "Studio · Check"
                : "Connect Roblox Studio";

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const nextOpen = !open;
          ownTriggerOpenRequestedRef.current = nextOpen;
          updateMenuPosition();
          requestOpenChange(nextOpen);
        }}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all xl:min-h-0 ${
          pluginUpdateRequired
            ? "border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] text-[var(--ds-warning)] hover:bg-[color-mix(in_srgb,var(--ds-warning)_20%,transparent)]"
            : pluginRepairing
              ? "border-[color-mix(in_srgb,var(--ds-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_12%,transparent)] text-[var(--ds-info)] hover:bg-[color-mix(in_srgb,var(--ds-info)_20%,transparent)]"
              : pluginDegraded
                ? "border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] text-[var(--ds-warning)] hover:bg-[color-mix(in_srgb,var(--ds-warning)_20%,transparent)]"
                : overallConnected
                  ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] hover:bg-[var(--ds-accent-soft)]"
                  : degraded
                    ? "border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] text-[var(--ds-warning)] hover:bg-[color-mix(in_srgb,var(--ds-warning)_20%,transparent)]"
                    : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
        }`}
        title={statusCopy}
        aria-label={buttonLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="studio-connection-dialog"
      >
        {loading || pluginRepairing ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : pluginUpdateRequired ||
          pluginDegraded ||
          (degraded && !overallConnected) ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Radio
            className={`h-3.5 w-3.5 shrink-0 ${overallConnected ? "" : "text-[var(--ds-text-secondary)]"}`}
          />
        )}
        <span className="truncate">{buttonLabel}</span>
        <i
          className="nx-build-signal"
          data-state={
            overallConnected
              ? "ready"
              : degraded || pluginUpdateRequired
                ? "warning"
                : "idle"
          }
          data-active={loading || pluginRepairing ? "true" : undefined}
          aria-hidden="true"
        />
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {menu}
    </div>
  );
}
