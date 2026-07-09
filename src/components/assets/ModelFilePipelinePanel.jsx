import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  Loader2,
  RefreshCw,
  Square,
  Trash2,
  UploadCloud,
} from "lib/icons";
import {
  cancelDerivative,
  cancelModelFile,
  completeModelUpload,
  createDerivative,
  createModelUploadSession,
  createOptimizationPlan,
  deleteDerivative,
  deleteModelFile,
  getDerivativeComparison,
  getDerivativeDownloadUrl,
  getDerivativePreviewUrl,
  getModelDownloadUrl,
  getModelFile,
  getModelFileReport,
  getModelFileRules,
  getModelPreviewUrl,
  getRobloxModelUpload,
  listDerivatives,
  listModelFiles,
  prepareRobloxModelUpload,
  prepareUploadedModelInsertion,
  confirmRobloxModelUpload,
  insertUploadedModel,
  refreshRobloxModelUpload,
  recheckUploadedModelAccess,
  uploadModelFileToSignedUrl,
} from "../../lib/modelPipelineApi";
import { useBilling } from "../../context/BillingContext";
import { getRetryDelayMs, isRetryableApiError } from "../../lib/apiErrors";

const VALIDATED = new Set(["valid", "valid_with_warnings"]);
const FINAL = new Set(["valid", "valid_with_warnings", "invalid", "failed", "cancelled", "deleted", "expired"]);
const ACTIVE_MODEL = new Set(["awaiting_upload", "uploaded", "queued", "validating"]);
const ACTIVE_DERIVATIVE = new Set(["queued", "optimizing", "validating"]);
const MODEL_POLL_MS = 4000;
const MODEL_POLL_HIDDEN_MS = 30000;
const RETRYABLE_DATABASE_MESSAGE = "Database is temporarily busy. Retry in a moment.";

function getModelPollDelay({ retryAfterMs = 0, hidden = false } = {}) {
  const retryDelay = Number.isFinite(Number(retryAfterMs)) ? Number(retryAfterMs) : 0;
  const delay = Math.max(MODEL_POLL_MS, retryDelay);
  return hidden ? Math.max(delay, MODEL_POLL_HIDDEN_MS) : delay;
}

function hasActiveDerivative(items = []) {
  return items.some((item) => ACTIVE_DERIVATIVE.has(item.status));
}

function statusText(value) {
  return String(value || "unknown").replace(/_/g, " ");
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function firstModel(files) {
  return (files || []).find((file) => file.status !== "deleted") || null;
}

export default function ModelFilePipelinePanel({ notify }) {
  const { authReady, user } = useBilling();
  const [rules, setRules] = useState(null);
  const [active, setActive] = useState(null);
  const [report, setReport] = useState(null);
  const [derivatives, setDerivatives] = useState([]);
  const [plan, setPlan] = useState(null);
  const [profile, setProfile] = useState("roblox_balanced");
  const [aggressiveConfirmed, setAggressiveConfirmed] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [uploadPrep, setUploadPrep] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [moderationAcknowledged, setModerationAcknowledged] = useState(false);
  const [insertionReview, setInsertionReview] = useState(null);
  const [insertionReceipt, setInsertionReceipt] = useState(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [retryableError, setRetryableError] = useState(null);
  const [progress, setProgress] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const pollModelFileIdRef = useRef(null);
  const pollRetryAfterMsRef = useRef(0);
  const pollCancelledRef = useRef(false);
  const derivativesRef = useRef([]);
  const retryTimerRef = useRef(null);

  const canOptimize = active?.id && VALIDATED.has(active.status);
  const canPrepareRobloxUpload = active?.id && VALIDATED.has(active.status);
  const currentUpload = uploadStatus?.upload || uploadStatus;
  const progressPercent = progress?.total ? Math.round((progress.loaded / progress.total) * 100) : null;
  const sizeLimit = rules?.limits?.maxBytes || 25 * 1024 * 1024;

  const activeLabel = useMemo(() => {
    if (!active) return "Private GLB upload, validation, optimization";
    return `${active.originalFilename || active.safeFilename || active.id} · ${statusText(active.status)}${active.validationStage ? ` · ${statusText(active.validationStage)}` : ""}`;
  }, [active]);

  useEffect(() => {
    derivativesRef.current = derivatives;
  }, [derivatives]);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const clearActivePoll = () => {
    pollCancelledRef.current = true;
    pollModelFileIdRef.current = null;
    pollRetryAfterMsRef.current = 0;
    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleRetryableDatabaseError = (err, retryFn) => {
    const delayMs = getRetryDelayMs(err, 30000);
    clearActivePoll();
    clearRetryTimer();
    setRetryableError({ retryAfterMs: delayMs });
    setError(RETRYABLE_DATABASE_MESSAGE);
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      setRetryableError(null);
      setError((current) => (current === RETRYABLE_DATABASE_MESSAGE ? "" : current));
      retryFn?.();
    }, delayMs);
  };

  const setPipelineError = (err, fallbackMessage, retryFn) => {
    if (isRetryableApiError(err)) {
      handleRetryableDatabaseError(err, retryFn);
      return;
    }
    setRetryableError(null);
    setError(err?.message || fallbackMessage);
  };

  const refresh = async ({ resumePolling = true } = {}) => {
    try {
      const data = await listModelFiles();
      const list = data.items || data.modelFiles || data.files || data.results || [];
      const next = active?.id ? list.find((file) => file.id === active.id) : firstModel(list);
      clearRetryTimer();
      setRetryableError(null);
      setError((current) => (current === RETRYABLE_DATABASE_MESSAGE ? "" : current));
      setActive(next || null);
      let nextDerivatives = [];
      if (next?.id) {
        if (FINAL.has(next.status)) {
          getModelFileReport(next.id).then((payload) => setReport(payload.report)).catch(() => setReport(null));
        }
        try {
          const payload = await listDerivatives(next.id);
          nextDerivatives = payload.items || payload.derivatives || payload.results || [];
          setDerivatives(nextDerivatives);
        } catch (_) {
          setDerivatives([]);
        }
        if (
          resumePolling
          && (ACTIVE_MODEL.has(next.status) || hasActiveDerivative(nextDerivatives))
        ) {
          startPolling(next.id);
        }
      } else {
        setReport(null);
        setDerivatives([]);
      }
    } catch (err) {
      if (err?.message === "Not signed in") return;
      if (err?.status === 404) {
        setError("Model pipeline API is not available on this backend yet.");
      } else {
        setPipelineError(err, "Could not load model files", () => refresh().catch(() => {}));
      }
    }
  };

  useEffect(() => {
    if (!authReady) return undefined;
    if (!user) {
      setError("Not signed in");
      return () => {
        clearActivePoll();
        clearRetryTimer();
      };
    }
    setError("");
    getModelFileRules().then((payload) => setRules(payload)).catch(() => {});
    refresh().catch(() => {});
    return () => {
      clearActivePoll();
      clearRetryTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.uid]);

  const scheduleModelPoll = (modelFileId) => {
    if (pollCancelledRef.current || pollModelFileIdRef.current !== modelFileId) return;
    const hidden = typeof document !== "undefined" ? document.hidden : false;
    const delay = getModelPollDelay({ retryAfterMs: pollRetryAfterMsRef.current, hidden });
    pollRef.current = window.setTimeout(() => {
      void runModelPollTick(modelFileId);
    }, delay);
  };

  const runModelPollTick = async (modelFileId) => {
    if (pollCancelledRef.current || pollModelFileIdRef.current !== modelFileId) return;
    try {
      const data = await getModelFile(modelFileId);
      pollRetryAfterMsRef.current = 0;
      clearRetryTimer();
      setRetryableError(null);
      setError((current) => (current === RETRYABLE_DATABASE_MESSAGE ? "" : current));

      const modelFile = data.modelFile;
      setActive(modelFile);
      if (modelFile?.id) {
        try {
          const payload = await listDerivatives(modelFile.id);
          const items = payload.items || payload.derivatives || payload.results || [];
          setDerivatives(items);
          derivativesRef.current = items;
        } catch (_) {
          // Keep polling even if derivative list is temporarily unavailable.
        }
      }
      if (FINAL.has(modelFile?.status) && !hasActiveDerivative(derivativesRef.current)) {
        clearActivePoll();
        await refresh({ resumePolling: false });
        return;
      }
    } catch (err) {
      if (isRetryableApiError(err)) {
        pollRetryAfterMsRef.current = getRetryDelayMs(err, 30000);
        handleRetryableDatabaseError(err, () => startPolling(modelFileId));
        return;
      }
      setError(err?.message || "Could not refresh model status");
    }
    scheduleModelPoll(modelFileId);
  };

  const startPolling = (modelFileId) => {
    clearActivePoll();
    pollCancelledRef.current = false;
    pollModelFileIdRef.current = modelFileId;
    pollRetryAfterMsRef.current = 0;
    scheduleModelPoll(modelFileId);
  };

  const retryModelPipeline = () => {
    clearRetryTimer();
    setRetryableError(null);
    setError((current) => (current === RETRYABLE_DATABASE_MESSAGE ? "" : current));
    refresh().catch(() => {});
    if (active?.id && !FINAL.has(active.status)) {
      startPolling(active.id);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setError("Choose a .glb file.");
      return;
    }
    if (file.size > sizeLimit) {
      setError(`File is larger than ${formatBytes(sizeLimit)}.`);
      return;
    }
    setError("");
    setBusy("upload");
    setProgress({ loaded: 0, total: file.size });
    try {
      const session = await createModelUploadSession(file);
      await uploadModelFileToSignedUrl(file, session.upload, setProgress);
      setBusy("complete");
      const completed = await completeModelUpload(session.modelFileId);
      notify?.({ type: "success", message: "GLB uploaded. Validation queued." });
      setActive({ ...(session.modelFile || {}), id: session.modelFileId, status: completed.status, originalFilename: file.name });
      setReport(null);
      setPlan(null);
      setComparison(null);
      startPolling(session.modelFileId);
      await refresh();
    } catch (err) {
      setPipelineError(err, "GLB upload failed", () => refresh().catch(() => {}));
    } finally {
      setBusy("");
      setProgress(null);
    }
  };

  const createPlan = async () => {
    if (!active?.id) return;
    setBusy("plan");
    setError("");
    try {
      const next = await createOptimizationPlan(active.id, profile);
      setPlan(next);
      setAggressiveConfirmed(false);
    } catch (err) {
      setPipelineError(err, "Could not create optimization plan", createPlan);
    } finally {
      setBusy("");
    }
  };

  const queueDerivative = async () => {
    if (!active?.id || !plan?.planId) return;
    setBusy("derivative");
    setError("");
    try {
      const derivative = await createDerivative(active.id, plan.planId, aggressiveConfirmed);
      notify?.({ type: "success", message: "Derivative queued." });
      setDerivatives((current) => [derivative, ...current]);
      startPolling(active.id);
      await refresh();
    } catch (err) {
      setPipelineError(err, "Could not queue derivative", queueDerivative);
    } finally {
      setBusy("");
    }
  };

  const openSourceUrl = async (kind) => {
    if (!active?.id) return;
    setBusy(kind);
    try {
      const payload = kind === "download" ? await getModelDownloadUrl(active.id) : await getModelPreviewUrl(active.id);
      const url = payload.download?.url || payload.preview?.url || "";
      setLink(url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err?.message || "Signed URL unavailable");
    } finally {
      setBusy("");
    }
  };

  const showDerivativeComparison = async (derivativeId) => {
    if (!active?.id || !derivativeId) return;
    setBusy(`comparison:${derivativeId}`);
    try {
      const payload = await getDerivativeComparison(active.id, derivativeId);
      setComparison(payload.comparison);
    } catch (err) {
      setError(err?.message || "Comparison unavailable");
    } finally {
      setBusy("");
    }
  };

  const openDerivativeUrl = async (derivativeId, kind) => {
    if (!active?.id || !derivativeId) return;
    setBusy(`${kind}:${derivativeId}`);
    try {
      const payload = kind === "derivative_download"
        ? await getDerivativeDownloadUrl(active.id, derivativeId)
        : await getDerivativePreviewUrl(active.id, derivativeId);
      const url = payload.download?.url || payload.preview?.url || "";
      setLink(url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err?.message || "Derivative URL unavailable");
    } finally {
      setBusy("");
    }
  };

  const cancelActive = async () => {
    if (!active?.id) return;
    setBusy("cancel");
    try {
      await cancelModelFile(active.id);
      await refresh();
    } catch (err) {
      setError(err?.message || "Cancel failed");
    } finally {
      setBusy("");
    }
  };

  const removeModel = async () => {
    if (!active?.id) return;
    setBusy("delete");
    try {
      await deleteModelFile(active.id);
      setActive(null);
      setReport(null);
      setDerivatives([]);
      setPlan(null);
      setComparison(null);
    } catch (err) {
      setError(err?.message || "Delete failed");
    } finally {
      setBusy("");
    }
  };

  const removeDerivative = async (derivativeId) => {
    if (!active?.id || !derivativeId) return;
    await deleteDerivative(active.id, derivativeId).then(refresh).catch((err) => setError(err?.message || "Delete derivative failed"));
  };

  const stopDerivative = async (derivativeId) => {
    if (!active?.id || !derivativeId) return;
    await cancelDerivative(active.id, derivativeId).then(refresh).catch((err) => setError(err?.message || "Cancel derivative failed"));
  };

  const prepareRobloxUpload = async (derivativeId = null) => {
    if (!active?.id) return;
    setBusy("roblox_prepare");
    setError("");
    setUploadPrep(null);
    setUploadStatus(null);
    setInsertionReview(null);
    setInsertionReceipt(null);
    try {
      const prepared = await prepareRobloxModelUpload({
        modelFileId: active.id,
        derivativeId,
        displayName: uploadName || active.originalFilename || active.safeFilename || "NexusRBX Model",
        description: uploadDescription,
        creator: { type: "User" },
      });
      setUploadPrep(prepared);
      setUploadName(prepared.uploadName || prepared.review?.displayName || uploadName);
      setUploadDescription(prepared.uploadDescription || prepared.review?.description || uploadDescription);
      setRightsConfirmed(false);
      setModerationAcknowledged(false);
    } catch (err) {
      setError(err?.message || "Could not prepare Roblox upload");
    } finally {
      setBusy("");
    }
  };

  const confirmRobloxUpload = async () => {
    if (!uploadPrep?.uploadId || !rightsConfirmed || !moderationAcknowledged) return;
    setBusy("roblox_confirm");
    setError("");
    try {
      const queued = await confirmRobloxModelUpload(uploadPrep.uploadId);
      setUploadStatus(queued);
      notify?.({ type: "success", message: "Roblox model upload queued." });
    } catch (err) {
      setError(err?.message || "Could not confirm Roblox upload");
    } finally {
      setBusy("");
    }
  };

  const refreshRobloxUpload = async () => {
    const uploadId = uploadPrep?.uploadId || currentUpload?.id || currentUpload?.uploadId;
    if (!uploadId) return;
    setBusy("roblox_refresh");
    setError("");
    try {
      const refreshed = await refreshRobloxModelUpload(uploadId).catch(() => getRobloxModelUpload(uploadId));
      setUploadStatus(refreshed.upload || refreshed);
    } catch (err) {
      setError(err?.message || "Could not refresh Roblox upload");
    } finally {
      setBusy("");
    }
  };

  const prepareInsertion = async () => {
    const uploadId = currentUpload?.id || currentUpload?.uploadId || uploadPrep?.uploadId;
    if (!uploadId) return;
    setBusy("insertion_prepare");
    setError("");
    try {
      await recheckUploadedModelAccess(uploadId).catch(() => null);
      const review = await prepareUploadedModelInsertion(uploadId, {
        requestedName: currentUpload?.displayName || uploadPrep?.uploadName || uploadName,
        targetParentPath: "Workspace/NexusImports",
        placement: { mode: "camera_focus", position: null },
        anchoredPolicy: "preserve",
        collisionPolicy: "preserve",
      });
      setInsertionReview(review);
    } catch (err) {
      setError(err?.message || "Could not prepare Studio insertion");
    } finally {
      setBusy("");
    }
  };

  const confirmInsertion = async () => {
    const uploadId = currentUpload?.id || currentUpload?.uploadId || uploadPrep?.uploadId;
    if (!uploadId || !insertionReview?.preparedInsertionId) return;
    setBusy("insertion_confirm");
    setError("");
    try {
      const receipt = await insertUploadedModel(uploadId, insertionReview.preparedInsertionId);
      setInsertionReceipt(receipt);
      notify?.({ type: "success", message: "Studio insertion queued." });
    } catch (err) {
      setError(err?.message || "Could not queue Studio insertion");
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
            <div className="font-black">GLB model files</div>
            <div className="truncate text-white/45">{activeLabel}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 hover:bg-white/5">
            {busy === "upload" || busy === "complete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Upload GLB
          </button>
          <button type="button" onClick={() => refresh().catch(() => {})} className="rounded-md border border-white/10 p-1.5 text-white/60 hover:bg-white/5" aria-label="Refresh model files">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-white/45">Limit: {formatBytes(sizeLimit)}</div>
      {progress && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded bg-white/10">
            <div className="h-full bg-cyan-300" style={{ width: `${progressPercent || 0}%` }} />
          </div>
          <div className="mt-1 text-white/45">{busy === "complete" ? "Verifying upload" : `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`}</div>
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-md border border-rose-300/25 bg-rose-300/10 p-2 text-rose-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            {retryableError && (
              <button
                type="button"
                onClick={retryModelPipeline}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-rose-100/25 px-2 py-1 text-xs font-bold text-rose-50 hover:bg-rose-100/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => openSourceUrl("preview")} disabled={!VALIDATED.has(active.status) || busy === "preview"} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button type="button" onClick={() => openSourceUrl("download")} disabled={!VALIDATED.has(active.status) || busy === "download"} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button type="button" onClick={cancelActive} disabled={!ACTIVE_MODEL.has(active.status) || busy === "cancel"} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">
            <Square className="h-3.5 w-3.5" /> Cancel
          </button>
          <button type="button" onClick={removeModel} disabled={busy === "delete"} className="rounded-md border border-white/10 p-1.5 text-white/50 hover:bg-white/5" aria-label="Delete model file">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {report && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
          <div className="flex items-center gap-1 font-black text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" />Validation report</div>
          <div className="mt-1 text-white/60">
            Status: {statusText(report.status)} · Errors: {report.summary?.errors ?? 0} · Warnings: {report.summary?.warnings ?? 0} · Triangles: {report.metrics?.triangles ?? report.summary?.triangles ?? 0}
          </div>
          <div className="mt-1 truncate text-white/45">Rules: {report.rulesVersion} · SHA-256: {report.sourceSha256 || report.sha256 || "pending"}</div>
          {report.issues?.length > 0 && (
            <div className="mt-2 grid gap-1">
              {report.issues.slice(0, 4).map((issue, index) => (
                <div key={`${issue.code}-${index}`} className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-white/65">
                  <span className="font-bold text-white/80">{issue.code}</span> · {issue.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canPrepareRobloxUpload && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
          <div className="font-black text-white">Roblox upload</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value.slice(0, 50))}
              placeholder={active.originalFilename || "Model name"}
              className="rounded-md border border-white/10 bg-black px-2 py-1 text-white"
            />
            <input
              value={uploadDescription}
              onChange={(event) => setUploadDescription(event.target.value.slice(0, 1000))}
              placeholder="Description"
              className="rounded-md border border-white/10 bg-black px-2 py-1 text-white"
            />
            <button type="button" onClick={() => prepareRobloxUpload(null)} disabled={busy === "roblox_prepare"} className="rounded-md border border-cyan-300/30 px-2 py-1 font-bold text-cyan-100 disabled:opacity-40">
              Prepare original
            </button>
          </div>
          {derivatives.some((item) => String(item.status).startsWith("completed")) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {derivatives.filter((item) => String(item.status).startsWith("completed")).slice(0, 4).map((item) => (
                <button
                  key={`upload-${item.id || item.derivativeId}`}
                  type="button"
                  onClick={() => prepareRobloxUpload(item.id || item.derivativeId)}
                  className="rounded border border-white/10 px-2 py-1 text-white/65 hover:bg-white/5"
                >
                  Prepare derivative {String(item.id || item.derivativeId).slice(0, 8)}
                </button>
              ))}
            </div>
          )}
          {uploadPrep && (
            <div className="mt-3 rounded border border-white/10 bg-white/[0.03] p-2 text-white/65">
              <div className="font-bold text-white">Review {uploadPrep.uploadName}</div>
              <div className="mt-1">Source: {uploadPrep.sourceType} · {formatBytes(uploadPrep.sourceBytes)} · SHA-256 {uploadPrep.trustedSourceSha256}</div>
              <div>Creator: {uploadPrep.creator?.type} {uploadPrep.creator?.id} · File: {uploadPrep.expectedFilename} · {uploadPrep.expectedMimeType}</div>
              <label className="mt-2 flex items-start gap-2">
                <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
                <span>{uploadPrep.rightsConfirmationText || "I confirm I have rights to upload this model."}</span>
              </label>
              <label className="mt-1 flex items-start gap-2">
                <input type="checkbox" checked={moderationAcknowledged} onChange={(event) => setModerationAcknowledged(event.target.checked)} />
                <span>{uploadPrep.moderationWarning || "Roblox moderation/access can remain pending after upload."}</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={confirmRobloxUpload} disabled={!rightsConfirmed || !moderationAcknowledged || busy === "roblox_confirm"} className="rounded-md border border-cyan-300/30 px-2 py-1 font-bold text-cyan-100 disabled:opacity-40">
                  Confirm upload
                </button>
                <button type="button" onClick={refreshRobloxUpload} disabled={busy === "roblox_refresh"} className="rounded-md border border-white/10 px-2 py-1 text-white/65 disabled:opacity-40">
                  Refresh
                </button>
              </div>
            </div>
          )}
          {currentUpload && (
            <div className="mt-2 rounded border border-white/10 bg-white/[0.03] p-2 text-white/65">
              <div>Status: {statusText(currentUpload.state || currentUpload.status)} · Moderation/access: {statusText(currentUpload.moderationState)}</div>
              {currentUpload.robloxAssetId && <div>Trusted asset ID: {currentUpload.robloxAssetId}</div>}
              {(currentUpload.state === "submission_unknown" || currentUpload.status === "submission_unknown") && (
                <div className="mt-1 text-amber-100">The create request may have reached Roblox. Automatic retry is disabled; use Refresh to reconcile.</div>
              )}
              <button type="button" onClick={prepareInsertion} disabled={!currentUpload.robloxAssetId || busy === "insertion_prepare"} className="mt-2 rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">
                Prepare Studio insertion
              </button>
            </div>
          )}
          {insertionReview && (
            <div className="mt-2 rounded border border-white/10 bg-white/[0.03] p-2 text-white/65">
              <div>Studio: {insertionReview.experience?.name || insertionReview.experience?.placeId || "paired session"} · Creator: {insertionReview.experience?.creator?.type} {insertionReview.experience?.creator?.id}</div>
              <div>Destination: {insertionReview.insertion?.targetParentPath} · Placement: {statusText(insertionReview.insertion?.placement?.mode)}</div>
              <button type="button" onClick={confirmInsertion} disabled={busy === "insertion_confirm"} className="mt-2 rounded-md border border-cyan-300/30 px-2 py-1 font-bold text-cyan-100 disabled:opacity-40">
                Confirm insertion
              </button>
            </div>
          )}
          {insertionReceipt && (
            <div className="mt-2 rounded border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-50">
              Insertion {statusText(insertionReceipt.status)} · {insertionReceipt.commandId || insertionReceipt.insertionId}
            </div>
          )}
        </div>
      )}

      {canOptimize && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={profile} onChange={(event) => setProfile(event.target.value)} className="rounded-md border border-white/10 bg-black px-2 py-1 text-white">
              <option value="conservative">Conservative</option>
              <option value="roblox_balanced">Roblox balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <button type="button" onClick={createPlan} disabled={busy === "plan"} className="rounded-md border border-white/10 px-2 py-1 font-bold text-white/70 disabled:opacity-40">
              Review plan
            </button>
            <button type="button" onClick={queueDerivative} disabled={!plan || (plan.confirmationRequired && !aggressiveConfirmed) || busy === "derivative"} className="rounded-md border border-cyan-300/30 px-2 py-1 font-bold text-cyan-100 disabled:opacity-40">
              Queue derivative
            </button>
          </div>
          {plan && (
            <div className="mt-2 text-white/60">
              <div>Plan: {plan.planId} · Lossy: {(plan.lossyOperations || []).join(", ") || "none"}</div>
              <div>Tools: {Object.entries(plan.toolVersions || {}).map(([key, value]) => `${key} ${value}`).join(" · ") || "nexusrbx optimizer"}</div>
              {plan.confirmationRequired && (
                <label className="mt-2 flex items-center gap-2 text-white/70">
                  <input type="checkbox" checked={aggressiveConfirmed} onChange={(event) => setAggressiveConfirmed(event.target.checked)} />
                  Confirm aggressive lossy optimization
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {derivatives.length > 0 && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
          <div className="font-black">Derivatives</div>
          <div className="mt-2 grid gap-2">
            {derivatives.slice(0, 5).map((item) => (
              <div key={item.id || item.derivativeId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                <div className="min-w-0">
                  <div className="truncate font-bold">{item.id || item.derivativeId}</div>
                  <div className="text-white/45">{statusText(item.status)}{item.stage ? ` · ${statusText(item.stage)}` : ""}</div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => showDerivativeComparison(item.id || item.derivativeId)} disabled={!String(item.status).startsWith("completed")} className="rounded border border-white/10 px-2 py-1 text-white/60 disabled:opacity-40">Compare</button>
                  <button type="button" onClick={() => openDerivativeUrl(item.id || item.derivativeId, "derivative_preview")} disabled={!String(item.status).startsWith("completed")} className="rounded border border-white/10 p-1.5 text-white/60 disabled:opacity-40" aria-label="Preview derivative"><Eye className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => openDerivativeUrl(item.id || item.derivativeId, "derivative_download")} disabled={!String(item.status).startsWith("completed")} className="rounded border border-white/10 p-1.5 text-white/60 disabled:opacity-40" aria-label="Download derivative"><Download className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => stopDerivative(item.id || item.derivativeId)} disabled={!ACTIVE_DERIVATIVE.has(item.status)} className="rounded border border-white/10 p-1.5 text-white/60 disabled:opacity-40" aria-label="Cancel derivative"><Square className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => removeDerivative(item.id || item.derivativeId)} className="rounded border border-white/10 p-1.5 text-white/50" aria-label="Delete derivative"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comparison && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2 text-white/60">
          <div className="font-black text-white">Before / after</div>
          <div className="mt-1">Bytes: {formatBytes(comparison.sourceBytes)} to {formatBytes(comparison.derivativeBytes)} · {comparison.byteReductionPercent}% smaller</div>
          <div>Triangles: {comparison.source?.triangles ?? 0} to {comparison.derivative?.triangles ?? 0}</div>
          <div>Textures: {comparison.source?.textures ?? 0} to {comparison.derivative?.textures ?? 0}</div>
          {(comparison.warnings || []).length > 0 && <div className="mt-1 text-amber-100">Warnings: {(comparison.warnings || []).map((warning) => warning.code || warning.message || warning).join(", ")}</div>}
        </div>
      )}

      {link && <a href={link} target="_blank" rel="noreferrer" className="mt-2 block truncate text-cyan-200">{link}</a>}
    </section>
  );
}
