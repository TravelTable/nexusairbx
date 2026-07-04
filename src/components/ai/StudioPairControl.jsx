import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Radio, ChevronDown, Copy, Check, Loader2, RefreshCw, Link2, Unlink } from "lib/icons";
import { startStudioPairing, disconnectStudio } from "../../lib/studioBridgeApi";

const MENU_WIDTH = 320;
const VIEWPORT_GUTTER = 8;

function formatRemaining(ms) {
  if (!ms || ms <= 0) return "expired";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Compact Studio pairing control for the AI workspace top bar.
 * Shows live connection status and lets the user mint a pairing code
 * to enter into the Roblox Studio plugin, polling status until paired.
 */
export default function StudioPairControl({ connected = false, loading = false, refresh, notify, requireUser }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [pairCode, setPairCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER);
    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.min(Math.max(VIEWPORT_GUTTER, rect.left), maxLeft),
      maxHeight: Math.max(200, window.innerHeight - rect.bottom - 24),
    });
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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

  // Tick + poll status while a code is pending so the UI flips to "connected" automatically.
  useEffect(() => {
    if (!open || !pairCode || connected) return undefined;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => refresh?.(), 3000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [open, pairCode, connected, refresh]);

  // Once connected, drop the (now-consumed) code and let the user know.
  useEffect(() => {
    if (connected && pairCode) {
      setPairCode("");
      setExpiresAt(0);
      notify?.({ message: "Roblox Studio connected", type: "success" });
    }
  }, [connected, pairCode, notify]);

  const remainingMs = expiresAt ? expiresAt - now : 0;
  const codeExpired = Boolean(pairCode) && expiresAt > 0 && remainingMs <= 0;

  const handleGenerate = async () => {
    if (requireUser && !requireUser()) return;
    setBusy(true);
    try {
      const pair = await startStudioPairing();
      setPairCode(String(pair.code || "").toUpperCase());
      setExpiresAt(pair.expiresInMs ? Date.now() + pair.expiresInMs : 0);
      setNow(Date.now());
    } catch (err) {
      notify?.({ message: err?.message || "Failed to start Studio pairing", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectStudio();
      setPairCode("");
      setExpiresAt(0);
      notify?.({ message: "Roblox Studio disconnected", type: "success" });
      await refresh?.();
    } catch (err) {
      notify?.({ message: err?.message || "Failed to disconnect Studio", type: "error" });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopy = () => {
    if (!pairCode || !navigator.clipboard) return;
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed w-80 rounded-2xl border border-white/10 bg-[#0D0D0D]/95 backdrop-blur-2xl shadow-2xl z-[9999] p-4"
            style={{
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: Math.min(menuPosition?.maxHeight ?? window.innerHeight * 0.7, window.innerHeight * 0.7),
              visibility: menuPosition ? "visible" : "hidden",
            }}
            role="dialog"
            aria-label="Pair Roblox Studio"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex w-6 h-6 items-center justify-center rounded-lg ${
                    connected ? "bg-[#00f5d4]/15 text-[#00f5d4]" : "bg-white/5 text-gray-400"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Roblox Studio</div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${connected ? "text-[#00f5d4]" : "text-gray-500"}`}>
                    {loading ? "Checking…" : connected ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refresh?.()}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title="Refresh connection status"
                aria-label="Refresh connection status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {connected ? (
              <>
                <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-3 mb-3">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Your Studio plugin is paired. Use{" "}
                    <span className="text-[#00f5d4] font-semibold">Push Studio</span> on a generation, or enable Live
                    Studio in the chat composer to let the agent act in Studio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                  Disconnect Studio
                </button>
              </>
            ) : !pairCode ? (
              <>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Generate a one-time code, then open the <span className="text-white font-semibold">NexusRBX</span>{" "}
                  plugin in Roblox Studio and enter it to link this account.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-xs font-black uppercase tracking-widest hover:bg-[#00f5d4]/20 transition-all disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Generate pairing code
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-2xl font-black tracking-[0.35em] text-white">{pairCode}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-2 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all shrink-0"
                      title="Copy code"
                      aria-label="Copy code"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#00f5d4]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest">
                    {codeExpired ? (
                      <span className="text-rose-400">Code expired — generate a new one</span>
                    ) : (
                      <span className="text-gray-500">
                        Expires in {formatRemaining(remainingMs)}
                      </span>
                    )}
                  </div>
                </div>

                <ol className="space-y-1.5 text-[11px] text-gray-400 leading-relaxed mb-3 list-decimal list-inside">
                  <li>Open Roblox Studio with the NexusRBX plugin installed.</li>
                  <li>Enter this code in the plugin and click <span className="text-white font-semibold">Pair Studio</span>.</li>
                  <li>If Studio prompts, allow HTTP access to <span className="text-white font-semibold">api.nexusrbx.com</span>.</li>
                  <li>Enable <span className="text-white font-semibold">Game Settings → Security → Allow HTTP Requests</span>.</li>
                </ol>

                {!codeExpired && (
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f5d4]" />
                    Waiting for Studio to connect…
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  New code
                </button>
              </>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updateMenuPosition();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
          connected
            ? "bg-[#00f5d4]/10 border-[#00f5d4]/30 text-[#00f5d4] hover:bg-[#00f5d4]/20"
            : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
        }`}
        title={connected ? "Roblox Studio is paired" : "Pair the Roblox Studio plugin"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
        ) : (
          <Radio className={`w-3.5 h-3.5 shrink-0 ${connected ? "" : "text-gray-400"}`} />
        )}
        <span className="truncate">{connected ? "Studio" : "Pair Studio"}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {menu}
    </div>
  );
}
