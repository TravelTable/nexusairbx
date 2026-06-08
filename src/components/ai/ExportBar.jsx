import React, { useState } from "react";
import JSZip from "jszip";
import { Copy, Check, Download, ShieldCheck, Loader, Package, Bookmark, RefreshCw, Boxes, Terminal } from "lucide-react";
import { verifyRobloxReadiness } from "../../lib/workflowApi";
import { buildRojoZip, buildStudioLoader } from "../../lib/rojoExport";

/**
 * Unified export surface for a finalized artifact (the Review stage).
 * Consolidates Copy / Download .lua / Download bundle / Verify / Save / Refine
 * into one bar, used in both the preview drawer and the chat bubble.
 */
export default function ExportBar({
  lua,
  systemsLua = "",
  funcScripts = [],
  files = [], // Phase 4 multi-file output: [{ name, path, kind, content }]
  title,
  kind = "ui", // "ui" | "script" | "project"
  onSaveLibrary,
  onRefine,
  notify,
}) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bundling, setBundling] = useState(false);
  const [rojoBuilding, setRojoBuilding] = useState(false);
  const [loaderCopied, setLoaderCopied] = useState(false);

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

  // Rojo export + Studio loader share the same normalized inputs. For UI artifacts
  // `code` is the UI ModuleScript; for script/project artifacts it's gameplay logic.
  const rojoInput =
    kind === "ui"
      ? { title, uiModuleLua: code, systemsLua, files }
      : { title, systemsLua: code || systemsLua, files };

  const handleRojoExport = async () => {
    if (disabled || rojoBuilding) return;
    setRojoBuilding(true);
    try {
      const blob = await buildRojoZip(rojoInput);
      downloadBlob(blob, `${safeName}_rojo.zip`);
      notify?.({ message: "Rojo project exported", type: "success" });
    } catch (err) {
      notify?.({ message: "Failed to build Rojo project", type: "error" });
    } finally {
      setRojoBuilding(false);
    }
  };

  const handleCopyLoader = async () => {
    if (disabled) return;
    try {
      const snippet = buildStudioLoader(rojoInput);
      await navigator.clipboard.writeText(snippet);
      setLoaderCopied(true);
      setTimeout(() => setLoaderCopied(false), 2000);
      notify?.({ message: "Studio loader copied — paste into the Studio command bar", type: "success" });
    } catch (err) {
      notify?.({ message: "Failed to copy Studio loader", type: "error" });
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

      <button
        type="button"
        onClick={handleRojoExport}
        disabled={disabled || rojoBuilding}
        title="Download a Rojo project (default.project.json + src/ tree)"
        className={`${btn} bg-[#9b5de5]/10 text-[#9b5de5] hover:bg-[#9b5de5]/20`}
      >
        {rojoBuilding ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-3.5 h-3.5" />}
        Rojo Project
      </button>

      <button
        type="button"
        onClick={handleCopyLoader}
        disabled={disabled}
        title="Copy a Luau snippet to paste into the Studio command bar"
        className={`${btn} bg-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/20`}
      >
        {loaderCopied ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
        Studio Loader
      </button>

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
    </div>
  );
}
