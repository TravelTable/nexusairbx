import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, FileArchive, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import {
  completeModelUpload,
  confirmRobloxModelUpload,
  createDerivative,
  createModelUploadSession,
  createOptimizationPlan,
  deleteModelFile,
  getModelFile,
  getModelFileReport,
  getModelPreviewUrl,
  getRobloxModelUpload,
  insertUploadedModel,
  listDerivatives,
  listModelFiles,
  prepareRobloxModelUpload,
  prepareUploadedModelInsertion,
  refreshRobloxModelUpload,
  uploadModelFileToSignedUrl,
} from "../../lib/modelPipelineApi";

const VALIDATED = new Set(["compatible", "compatible_with_warnings", "valid", "valid_with_warnings"]);

function statusText(value) {
  return String(value || "unknown").replace(/_/g, " ");
}

function primaryModel(files) {
  return (files || []).find((file) => file.status !== "deleted") || null;
}

export default function ModelFilePipelinePanel({ robloxConnected = false, studioConnected = false, selectedCreator = null, notify }) {
  const [active, setActive] = useState(null);
  const [report, setReport] = useState(null);
  const [derivatives, setDerivatives] = useState([]);
  const [upload, setUpload] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const activeStatus = active?.status || "";
  const canOptimize = active?.id && VALIDATED.has(activeStatus);
  const canUploadToRoblox = canOptimize || activeStatus === "compatible_with_warnings";
  const uploadReadyForInsertion = upload?.upload?.robloxAssetId || upload?.robloxAssetId;
  const displayName = useMemo(() => {
    const base = active?.originalFilename || active?.safeFilename || "Nexus model";
    return base.replace(/\.glb$/i, "").slice(0, 50) || "Nexus model";
  }, [active]);

  const refresh = async () => {
    const data = await listModelFiles();
    const list = data.items || data.modelFiles || data.files || data.results || [];
    const next = active?.id ? list.find((file) => file.id === active.id) : primaryModel(list);
    if (next) {
      setActive(next);
      if (VALIDATED.has(next.status) || ["invalid", "incompatible", "validation_failed"].includes(next.status)) {
        getModelFileReport(next.id).then((data) => setReport(data.report)).catch(() => {});
        listDerivatives(next.id).then((data) => setDerivatives(data.derivatives || data.results || [])).catch(() => {});
      }
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = (modelFileId) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const data = await getModelFile(modelFileId);
        const modelFile = data.modelFile;
        setActive(modelFile);
        if (VALIDATED.has(modelFile?.status) || ["invalid", "incompatible", "validation_failed"].includes(modelFile?.status)) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
          await refresh();
        }
      } catch (_) {}
    }, 2500);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setBusy("upload");
    setProgress(0);
    try {
      const session = await createModelUploadSession(file);
      await uploadModelFileToSignedUrl(file, session.upload, setProgress);
      const completed = await completeModelUpload(session.modelFileId);
      notify?.({ type: "success", message: "GLB uploaded. Validation queued." });
      setActive({ id: session.modelFileId, status: completed.status, originalFilename: file.name });
      startPolling(session.modelFileId);
      await refresh();
    } catch (err) {
      setError(err?.message || "GLB upload failed");
    } finally {
      setBusy("");
      setProgress(null);
    }
  };

  const optimize = async () => {
    if (!active?.id) return;
    setBusy("optimize");
    setError("");
    try {
      const plan = await createOptimizationPlan(active.id, "roblox_balanced");
      const derivative = await createDerivative(active.id, plan.planId || plan.optimizationPlan?.id || plan.id);
      notify?.({ type: "success", message: "Optimization queued." });
      setDerivatives((current) => [derivative, ...current]);
      await refresh();
    } catch (err) {
      setError(err?.message || "Optimization failed");
    } finally {
      setBusy("");
    }
  };

  const preview = async () => {
    if (!active?.id) return;
    setBusy("preview");
    try {
      const data = await getModelPreviewUrl(active.id);
      setPreviewUrl(data.preview?.url || data.previewUrl || "");
    } catch (err) {
      setError(err?.message || "Preview unavailable");
    } finally {
      setBusy("");
    }
  };

  const uploadToRoblox = async () => {
    if (!active?.id || !robloxConnected) return;
    setBusy("roblox");
    setError("");
    try {
      const prepared = await prepareRobloxModelUpload({
        modelFileId: active.id,
        displayName,
        description: "Uploaded from NexusRBX after private GLB validation.",
        creator: selectedCreator || { type: "user" },
      });
      const confirmed = await confirmRobloxModelUpload(prepared.uploadId);
      setUpload({ ...prepared, ...confirmed });
      notify?.({ type: "success", message: "Roblox model upload queued." });
    } catch (err) {
      setError(err?.message || "Roblox upload failed");
    } finally {
      setBusy("");
    }
  };

  const refreshUpload = async () => {
    const uploadId = upload?.uploadId || upload?.upload?.id;
    if (!uploadId) return;
    setBusy("refresh_upload");
    try {
      const data = await refreshRobloxModelUpload(uploadId).catch(() => getRobloxModelUpload(uploadId));
      setUpload(data.upload || data);
    } catch (err) {
      setError(err?.message || "Upload refresh failed");
    } finally {
      setBusy("");
    }
  };

  const insertInStudio = async () => {
    const uploadId = upload?.uploadId || upload?.id || upload?.upload?.id;
    if (!uploadId || !studioConnected) return;
    setBusy("insert");
    setError("");
    try {
      await prepareUploadedModelInsertion(uploadId);
      const inserted = await insertUploadedModel(uploadId, displayName);
      notify?.({ type: "success", message: "Studio insertion queued." });
      setUpload((current) => ({ ...(current || {}), insertion: inserted }));
    } catch (err) {
      setError(err?.message || "Studio insertion failed");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!active?.id) return;
    setBusy("delete");
    try {
      await deleteModelFile(active.id);
      setActive(null);
      setReport(null);
      await refresh();
    } catch (err) {
      setError(err?.message || "Delete failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="border-t border-white/10 bg-[#080a12] px-3 py-3 text-xs text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileArchive className="h-4 w-4 text-cyan-300" />
          <div className="min-w-0">
            <div className="font-black">GLB model pipeline</div>
            <div className="truncate text-white/45">{active ? `${active.originalFilename || active.safeFilename || active.id} · ${statusText(active.status)}` : "Private upload, validation, optimization, Roblox upload, Studio insert"}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 hover:bg-white/5">
            {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Upload GLB
          </button>
          <button type="button" onClick={refresh} className="rounded-md border border-white/10 p-1.5 text-white/60 hover:bg-white/5" aria-label="Refresh model files">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {progress !== null && <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-cyan-300" style={{ width: `${progress}%` }} /></div>}
      {error && <div className="mt-2 rounded-md border border-rose-300/25 bg-rose-300/10 p-2 text-rose-100">{error}</div>}

      {active && (
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={preview} disabled={busy === "preview"} className="rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">Preview URL</button>
            <button type="button" onClick={optimize} disabled={!canOptimize || busy === "optimize"} className="rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">Optimize</button>
            <button type="button" onClick={uploadToRoblox} disabled={!canUploadToRoblox || !robloxConnected || busy === "roblox"} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">
              <CloudUpload className="h-3.5 w-3.5" />
              Upload to Roblox
            </button>
            <button type="button" onClick={refreshUpload} disabled={!upload?.uploadId && !upload?.id} className="rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">Refresh upload</button>
            <button type="button" onClick={insertInStudio} disabled={!uploadReadyForInsertion || !studioConnected || busy === "insert"} className="rounded-md border border-emerald-300/30 px-2 py-1 font-bold text-emerald-100 disabled:opacity-40">Insert in Studio</button>
          </div>
          <button type="button" onClick={remove} disabled={busy === "delete"} className="rounded-md border border-white/10 p-1.5 text-white/50 hover:bg-white/5" aria-label="Delete model file">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {(report || derivatives.length > 0 || upload || previewUrl) && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {report && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <div className="flex items-center gap-1 font-black text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" />Validation report</div>
              <div className="mt-1 text-white/60">Status: {statusText(report.status)} · Triangles: {report.summary?.triangles ?? 0} · Issues: {report.issues?.length ?? 0}</div>
            </div>
          )}
          {derivatives.length > 0 && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <div className="font-black">Derivatives</div>
              <div className="mt-1 text-white/60">{derivatives.slice(0, 3).map((item) => `${item.id || item.derivativeId}: ${statusText(item.status)}`).join(" · ")}</div>
            </div>
          )}
          {upload && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <div className="font-black">Roblox upload</div>
              <div className="mt-1 text-white/60">Status: {statusText(upload.status || upload.upload?.status)} · Asset: {upload.robloxAssetId || upload.upload?.robloxAssetId || "pending"}</div>
            </div>
          )}
          {previewUrl && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <div className="font-black">Preview</div>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-cyan-200">{previewUrl}</a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
