import React, { useState } from "react";
import JSZip from "jszip";
import { Copy, Check, Download, Send, ShieldCheck, Loader, Package, Bookmark, RefreshCw } from "lucide-react";
import { verifyRobloxReadiness } from "../../lib/workflowApi";

/**
 * Unified export surface for a finalized artifact (the Review stage).
 * Consolidates Copy / Download .lua / Download bundle / Verify / Save / Push / Refine
 * into one bar, used in both the preview drawer and the chat bubble.
 */
export default function ExportBar({
  lua,
  systemsLua = "",
  funcScripts = [],
  boardState = null,
  title,
  projectId,
  kind = "ui", // "ui" | "script" | "project"
  onPushToStudio,
  onSaveLibrary,
  onRefine,
  notify,
}) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bundling, setBundling] = useState(false);

  const code = lua || "";
  const disabled = !code.trim();
  const safeName = (title || "generated").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "generated";
  const ext = kind === "script" ? "server.lua" : "lua";
  const hasBundle = kind === "project" || !!systemsLua || (funcScripts && funcScripts.length > 0);

  const handleCopy = () => {
    if (disabled) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (disabled) return;
    downloadBlob(new Blob([code], { type: "text/plain;charset=utf-8" }), `${safeName}.${ext}`);
  };

  const handleBundle = async () => {
    if (disabled || bundling) return;
    setBundling(true);
    try {
      const zip = new JSZip();
      zip.file(kind === "ui" ? "UI.module.lua" : `${safeName}.lua`, code);
      if (systemsLua) zip.file("Systems.server.lua", systemsLua);
      if (funcScripts && funcScripts.length > 0) {
        const folder = zip.folder("functionality");
        funcScripts.forEach((s, i) => folder.file(`${(s.name || `script_${i}`).replace(/[^a-z0-9]+/gi, "_")}.lua`, s.code || ""));
      }
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, `${safeName}_bundle.zip`);
    } catch (err) {
      notify?.({ message: "Failed to build bundle", type: "error" });
    } finally {
      setBundling(false);
    }
  };

  const handleVerify = async () => {
    if (disabled || verifying) return;
    setVerifying(true);
    try {
      const report = await verifyRobloxReadiness({ lua: code, manifest: { kind } });
      const issues = report?.issues || report?.errors || [];
      if (report?.ok || issues.length === 0) {
        notify?.({ message: "Roblox readiness check passed", type: "success" });
      } else {
        notify?.({
          message: `Readiness: ${issues.slice(0, 3).map((i) => i.message || i).join(" | ")}`,
          type: "info",
        });
      }
    } catch (err) {
      notify?.({ message: "Verification failed", type: "error" });
    } finally {
      setVerifying(false);
    }
  };

  const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-xl border border-white/5 bg-black/20">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Export</span>

      <button type="button" onClick={handleCopy} disabled={disabled} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        {copied ? <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> : <Copy className="w-3.5 h-3.5" />}
        Copy
      </button>

      <button type="button" onClick={handleDownload} disabled={disabled} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        <Download className="w-3.5 h-3.5" /> .lua
      </button>

      {hasBundle && (
        <button type="button" onClick={handleBundle} disabled={disabled || bundling} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
          {bundling ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
          Bundle
        </button>
      )}

      <button type="button" onClick={handleVerify} disabled={disabled || verifying} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        {verifying ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
        Verify
      </button>

      {onSaveLibrary && (
        <button type="button" onClick={() => onSaveLibrary({ name: title, code })} disabled={disabled} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
          <Bookmark className="w-3.5 h-3.5" /> Save
        </button>
      )}

      {onRefine && (
        <button type="button" onClick={onRefine} disabled={disabled} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
          <RefreshCw className="w-3.5 h-3.5" /> Refine
        </button>
      )}

      <button
        type="button"
        onClick={() => onPushToStudio?.(projectId, kind === "ui" ? "ui" : "script", { boardState, lua: code, code, title })}
        disabled={disabled}
        className={`${btn} bg-[#00f5d4] text-black hover:shadow-[0_0_16px_rgba(0,245,212,0.35)]`}
      >
        <Send className="w-3.5 h-3.5" /> Push to Studio
      </button>
    </div>
  );
}
