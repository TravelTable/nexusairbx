import React, { useEffect, useState } from "react";
import { Copy, Check, Download, FileDown, Boxes, Terminal, Send, ShieldCheck, Loader, Radio, Files } from "lib/icons";
import { buildRojoZip, buildStudioLoader, buildPlacementZip, safeProjectName } from "../../../lib/rojoExport";
import { getStudioStatus, getStudioCommand, applyArtifactToStudio } from "../../../lib/studioBridgeApi";
import { buildBaseArtifactSnapshot } from "../../../lib/artifactState";
import { verifyRobloxReadiness } from "../../../lib/workflowApi";
import { trackProductEvent } from "../../../lib/productAnalytics";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rojoInputFromArtifact(artifact) {
  return {
    title: artifact.title,
    files: (artifact.files || []).map((f) => ({
      name: f.name,
      path: f.path,
      placement: f.placement,
      kind: f.kind,
      content: f.content,
    })),
  };
}

// Unified export surface for a multi-file artifact (code-first; no boardState).
export default function ExportActions({ artifact, activeFile, notify }) {
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [bundling, setBundling] = useState(false);
  const [rojoBuilding, setRojoBuilding] = useState(false);
  const [loaderCopied, setLoaderCopied] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [studioConnected, setStudioConnected] = useState(false);

  useEffect(() => {
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

  if (!artifact) return null;
  const files = artifact.files || [];
  const safeName = safeProjectName(artifact.title);

  const handleCopyFile = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content || "");
    void trackProductEvent("code_copied", {
      output_type: activeFile.kind || "file",
      file_count: 1,
    }, { dedupeKey: `copy_file:${artifact.artifactId || ""}:${activeFile.name || ""}` });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = async () => {
    const text = files
      .map((f) => `-- ===== ${f.placement}/${f.name} (${f.kind}) =====\n${f.content}`)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    void trackProductEvent("code_copied", {
      output_type: "project",
      file_count: files.length,
    }, { dedupeKey: `copy_all:${artifact.artifactId || ""}:${files.length}` });
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const ext = activeFile.kind === "docs" ? "md" : activeFile.kind === "config" ? "json" : activeFile.kind === "server" ? "server.lua" : activeFile.kind === "client" ? "client.lua" : "lua";
    downloadBlob(new Blob([activeFile.content || ""], { type: "text/plain;charset=utf-8" }), `${activeFile.name}.${ext}`);
    void trackProductEvent("artifact_downloaded", {
      output_type: activeFile.kind || "file",
      file_count: 1,
      download_type: "single_file",
    }, { dedupeKey: `download_file:${artifact.artifactId || ""}:${activeFile.name || ""}` });
  };

  const handleDownloadZip = async () => {
    if (bundling) return;
    setBundling(true);
    try {
      const blob = await buildPlacementZip(artifact);
      downloadBlob(blob, `${safeName}.zip`);
      void trackProductEvent("artifact_downloaded", {
        output_type: "project",
        file_count: files.length,
        download_type: "placement_zip",
      }, { dedupeKey: `download_zip:${artifact.artifactId || ""}:${files.length}` });
      notify?.({ message: "Project exported (folders match Studio placement)", type: "success" });
    } catch (err) {
      notify?.({ message: "Failed to build project zip", type: "error" });
    } finally {
      setBundling(false);
    }
  };

  const handleRojoExport = async () => {
    if (rojoBuilding) return;
    setRojoBuilding(true);
    try {
      const blob = await buildRojoZip(rojoInputFromArtifact(artifact));
      downloadBlob(blob, `${safeName}_rojo.zip`);
      void trackProductEvent("artifact_downloaded", {
        output_type: "rojo_project",
        file_count: files.length,
        download_type: "rojo_zip",
      }, { dedupeKey: `download_rojo:${artifact.artifactId || ""}:${files.length}` });
      notify?.({ message: "Rojo project exported", type: "success" });
    } catch (err) {
      notify?.({ message: "Failed to build Rojo project", type: "error" });
    } finally {
      setRojoBuilding(false);
    }
  };

  const handleCopyLoader = async () => {
    try {
      const snippet = buildStudioLoader(rojoInputFromArtifact(artifact));
      await navigator.clipboard.writeText(snippet);
      void trackProductEvent("code_copied", {
        output_type: "studio_loader",
        file_count: files.length,
      }, { dedupeKey: `copy_loader:${artifact.artifactId || ""}:${files.length}` });
      setLoaderCopied(true);
      setTimeout(() => setLoaderCopied(false), 2000);
      notify?.({ message: "Studio loader copied — paste into the Studio command bar", type: "success" });
    } catch (err) {
      notify?.({ message: "Failed to copy Studio loader", type: "error" });
    }
  };

  const pollCommand = async (commandId) => {
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const command = await getStudioCommand(commandId);
      if (command.status === "succeeded") return notify?.({ message: "Studio push applied", type: "success" });
      if (command.status === "failed") return notify?.({ message: command.error || "Studio push failed", type: "error" });
    }
  };

  const handlePushStudio = async () => {
    if (studioBusy) return;
    setStudioBusy(true);
    try {
      const result = await applyArtifactToStudio({
        artifact: buildBaseArtifactSnapshot(artifact),
      });
      setStudioConnected(true);
      notify?.({ message: "Queued Studio push", type: "success" });
      if (result.commandId) pollCommand(result.commandId).catch(() => {});
    } catch (err) {
      notify?.({ message: err?.message || "Failed to push to Studio", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  };

  const handleVerify = async () => {
    if (verifying || !activeFile) return;
    setVerifying(true);
    try {
      const report = await verifyRobloxReadiness({ lua: activeFile.content || "", manifest: { kind: activeFile.kind } });
      const issues = report?.issues || report?.errors || [];
      if (report?.ok || issues.length === 0) {
        notify?.({ message: "Roblox readiness check passed", type: "success" });
      } else {
        notify?.({ message: `Readiness: ${issues.slice(0, 3).map((i) => i.message || i).join(" | ")}`, type: "info" });
      }
    } catch (err) {
      notify?.({ message: "Verification failed", type: "error" });
    } finally {
      setVerifying(false);
    }
  };

  const btn = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-4 py-2.5 border-t border-white/5 bg-black/30">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-0.5">Export</span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${
          studioConnected ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]" : "border-white/10 bg-white/5 text-gray-500"
        }`}
      >
        <Radio className="w-3 h-3" />
        {studioConnected ? "Studio" : "Offline"}
      </span>

      <button type="button" onClick={handleCopyFile} disabled={!activeFile} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        {copied ? <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> : <Copy className="w-3.5 h-3.5" />} File
      </button>
      <button type="button" onClick={handleCopyAll} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        {copiedAll ? <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> : <Files className="w-3.5 h-3.5" />} All
      </button>
      <button type="button" onClick={handleDownloadFile} disabled={!activeFile} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        <FileDown className="w-3.5 h-3.5" /> .lua
      </button>
      <button type="button" onClick={handleDownloadZip} disabled={bundling} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        {bundling ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Zip
      </button>
      <button type="button" onClick={handleRojoExport} disabled={rojoBuilding} className={`${btn} bg-[#9b5de5]/10 text-[#9b5de5] hover:bg-[#9b5de5]/20`}>
        {rojoBuilding ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-3.5 h-3.5" />} Rojo
      </button>
      <button type="button" onClick={handleCopyLoader} className={`${btn} bg-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/20`}>
        {loaderCopied ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />} Loader
      </button>
      <button type="button" onClick={handleVerify} disabled={verifying || !activeFile} className={`${btn} bg-white/5 text-gray-300 hover:bg-white/10`}>
        {verifying ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Verify
      </button>

      {/* Primary end-of-run action: send the finished project to Studio. */}
      <div className="ml-auto flex items-center">
        <button
          type="button"
          onClick={handlePushStudio}
          disabled={studioBusy || !studioConnected}
          title={studioConnected ? "Apply this project in Roblox Studio" : "Pair Roblox Studio to enable push"}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed ${
            studioConnected
              ? "bg-[#00f5d4] text-black hover:bg-[#00f5d4]/90 shadow-lg shadow-[#00f5d4]/20"
              : "bg-white/5 text-gray-500 border border-white/10"
          }`}
        >
          {studioBusy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {studioConnected ? "Push to Studio" : "Studio offline"}
        </button>
      </div>
    </div>
  );
}
