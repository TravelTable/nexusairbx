import React, { useState } from "react";
import JSZip from "jszip";
import { Copy, Check, Download, ShieldCheck, Loader, Package, Bookmark, RefreshCw, Boxes, Terminal, Link2, Send, Radio } from "lib/icons";
import { verifyRobloxReadiness } from "../../lib/workflowApi";
import { buildRojoZip, buildStudioLoader } from "../../lib/rojoExport";
import { buildStudioPayload } from "../../lib/studioPayload";
import { getStudioCommand, getStudioStatus, pushToStudio, startStudioPairing } from "../../lib/studioBridgeApi";

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
  boardState = null,
  title,
  kind = "ui", // "ui" | "script" | "project"
  artifactId = null,
  onSaveLibrary,
  onRefine,
  notify,
}) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bundling, setBundling] = useState(false);
  const [rojoBuilding, setRojoBuilding] = useState(false);
  const [loaderCopied, setLoaderCopied] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [studioConnected, setStudioConnected] = useState(false);
  const [lastCommandId, setLastCommandId] = useState("");
  const [applyMode, setApplyMode] = useState(() => {
    if (typeof window === "undefined") return "manual_review";
    return window.localStorage.getItem("nexusStudioApplyMode") || "manual_review";
  });

  const code = lua || "";
  const disabled = !code.trim();
  const safeName = (title || "generated").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "generated";
  const ext = kind === "script" ? "server.lua" : "lua";
  const hasBundle = kind === "project" || !!systemsLua || (funcScripts && funcScripts.length > 0);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nexusStudioApplyMode", applyMode);
    }
  }, [applyMode]);

  React.useEffect(() => {
    let cancelled = false;
    getStudioStatus()
      .then((status) => {
        if (cancelled) return;
        setStudioConnected((status.sessions || []).some((s) => s.status === "connected"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handlePairStudio = async () => {
    if (studioBusy) return;
    setStudioBusy(true);
    try {
      const pair = await startStudioPairing();
      setPairCode(pair.code || "");
      notify?.({ message: `Studio pairing code: ${pair.code}`, type: "info" });
    } catch (err) {
      notify?.({ message: err?.message || "Failed to start Studio pairing", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  };

  const pollCommand = async (commandId) => {
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const command = await getStudioCommand(commandId);
      if (command.status === "succeeded") {
        notify?.({ message: "Studio push applied", type: "success" });
        return;
      }
      if (command.status === "failed") {
        notify?.({ message: command.error || "Studio push failed", type: "error" });
        return;
      }
    }
  };

  const handlePushStudio = async () => {
    if (disabled || studioBusy) return;
    setStudioBusy(true);
    try {
      const payload = buildStudioPayload({
        title,
        kind,
        lua: code,
        uiModuleLua: kind === "ui" ? code : "",
        systemsLua,
        files,
        boardState,
        artifactId,
      });
      const result = await pushToStudio({ payload, applyMode });
      setLastCommandId(result.commandId || "");
      setStudioConnected(true);
      const warningText = result.warnings?.length ? ` (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})` : "";
      notify?.({ message: `Queued Studio push${warningText}`, type: result.warnings?.length ? "info" : "success" });
      if (result.commandId) pollCommand(result.commandId).catch(() => {});
    } catch (err) {
      notify?.({ message: err?.message || "Failed to push to Studio", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  };

  const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-xl border border-white/5 bg-black/20">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Export</span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${
          studioConnected
            ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]"
            : "border-white/10 bg-white/5 text-gray-500"
        }`}
        title={lastCommandId ? `Last Studio command: ${lastCommandId}` : "Studio connection status"}
      >
        <Radio className="w-3 h-3" />
        {studioConnected ? "Studio" : "Offline"}
      </span>

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

      <select
        value={applyMode}
        onChange={(e) => setApplyMode(e.target.value)}
        className="h-[30px] rounded-lg border border-white/10 bg-black/30 px-2 text-[10px] font-black uppercase tracking-widest text-gray-300 outline-none"
        title="Studio apply mode"
      >
        <option value="manual_review">Manual</option>
        <option value="auto_after_approval">Auto</option>
        <option value="unrestricted_dev">Dev</option>
      </select>

      <button
        type="button"
        onClick={handlePairStudio}
        disabled={studioBusy}
        title={pairCode ? `Pairing code: ${pairCode}` : "Create a pairing code for the Roblox Studio plugin"}
        className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}
      >
        {studioBusy && !lastCommandId ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
        {pairCode || "Pair Studio"}
      </button>

      <button
        type="button"
        onClick={handlePushStudio}
        disabled={disabled || studioBusy}
        title="Queue this artifact for the paired Roblox Studio plugin"
        className={`${btn} bg-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/20`}
      >
        {studioBusy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Push Studio
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
