import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { auth } from "../firebase";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import GlbPreview from "../components/model-files/GlbPreview";
import { getEntitlements } from "../lib/billing";
import {
  completeModelUpload,
  createModelDerivative,
  createModelUploadSession,
  createOptimizationPlan,
  deleteModelDerivative,
  deleteModelFile,
  getModelDerivativeComparison,
  getModelDerivativeDownloadUrl,
  getModelDerivativePreviewUrl,
  getModelDerivativeReport,
  getModelFile,
  getModelPreviewUrl,
  getModelReport,
  getModelValidationRules,
  getRobloxModelInsertion,
  getRobloxModelUpload,
  getRobloxModelUploadStatus,
  insertRobloxModelInStudio,
  listModelDerivatives,
  listModelFiles,
  prepareRobloxModelInsertion,
  prepareRobloxModelUpload,
  confirmRobloxModelUpload,
  recheckRobloxModelInsertionAccess,
  refreshRobloxModelUpload,
  uploadModelToSignedUrl,
} from "../lib/modelFilesApi";
import {
  beginRobloxOAuth,
  beginRobloxReauthorization,
  getRobloxOAuthStatus,
} from "../lib/robloxOAuthApi";

const STATUS_LABELS = {
  awaiting_upload: "Awaiting upload",
  uploaded: "Uploaded",
  queued: "Queued",
  validating: "Validating",
  valid: "Compatible",
  valid_with_warnings: "Compatible with warnings",
  invalid: "Incompatible",
  failed: "Validation failed",
  deleted: "Deleted",
  expired: "Expired",
};

const REPORT_STATUS_LABELS = {
  compatible: "Compatible",
  compatible_with_warnings: "Compatible with warnings",
  incompatible: "Incompatible",
  validation_failed: "Validation failed",
};

const STAGE_LABELS = {
  queued: "Queued",
  claiming: "Claiming",
  validating_container: "Validating container",
  parsing: "Parsing",
  analyzing_geometry: "Analyzing geometry",
  analyzing_materials: "Analyzing materials",
  analyzing_textures: "Analyzing textures",
  building_report: "Building report",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const OPTIMIZATION_STAGE_LABELS = {
  queued: "Queued",
  preparing: "Preparing",
  loading_source: "Loading source",
  verifying_source: "Verifying source",
  parsing: "Parsing",
  cleaning_geometry: "Cleaning geometry",
  processing_textures: "Processing textures",
  simplifying_meshes: "Simplifying meshes",
  writing_derivative: "Writing derivative",
  validating_derivative: "Validating derivative",
  building_comparison: "Building comparison",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const DERIVATIVE_STATUS_LABELS = {
  queued: "Queued",
  optimizing: "Optimizing",
  validating: "Validating",
  completed: "Completed",
  completed_with_warnings: "Completed with warnings",
  failed: "Failed",
  cancelled: "Cancelled",
  deleted: "Deleted",
  expired: "Expired",
};

const ROBLOX_UPLOAD_STATUS_LABELS = {
  preparing: "Review",
  queued: "Queued",
  verifying_source: "Verifying source",
  submitting: "Submitting to Roblox",
  operation_pending: "Waiting on Roblox",
  operation_processing: "Processing on Roblox",
  succeeded_pending_moderation: "Uploaded, moderation pending",
  moderation_approved: "Approved",
  moderation_rejected: "Rejected",
  submission_unknown: "Submission unknown",
  failed: "Failed",
  cancelled: "Cancelled",
};

const PROFILE_LABELS = {
  lossless_cleanup: "Lossless cleanup",
  roblox_balanced: "Roblox balanced",
  roblox_aggressive: "Roblox aggressive",
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = typeof value === "string" ? new Date(value) : new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function shortHash(hash) {
  return hash ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : "Pending";
}

function formatPercent(value) {
  const n = Number(value || 0);
  return `${n.toFixed(1)}%`;
}

function creatorLabel(creator) {
  if (!creator) return "Not selected";
  const prefix = creator.type === "group" ? "Group" : "User";
  return `${creator.name || prefix} (${prefix} ${creator.id || "unknown"})`;
}

function creatorDashboardUrl(assetId) {
  const id = String(assetId || "").replace(/[^0-9]/g, "");
  return id ? `https://create.roblox.com/dashboard/creations/store/${id}/configure` : null;
}

function statusTone(status) {
  if (status === "valid" || status === "compatible" || status === "completed") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "valid_with_warnings" || status === "compatible_with_warnings" || status === "completed_with_warnings") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (status === "invalid" || status === "failed" || status === "incompatible" || status === "validation_failed") return "border-red-400/30 bg-red-500/10 text-red-100";
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function IssueIcon({ severity }) {
  if (severity === "error") return <XCircle className="h-4 w-4 text-red-300" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  return <CheckCircle2 className="h-4 w-4 text-sky-300" />;
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-1 truncate text-lg font-black text-white">{value}</div>
    </div>
  );
}

function ExpandableSection({ title, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-white/10 py-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-black text-white">{title}</span>
        <span className="inline-flex items-center gap-2 text-xs text-gray-400">
          {count}
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

export default function ModelValidationPage() {
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [rules, setRules] = useState(null);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [preview, setPreview] = useState(null);
  const [expandedMesh, setExpandedMesh] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState("roblox_balanced");
  const [planState, setPlanState] = useState({ loading: false, planId: null, plan: null, summary: null });
  const [derivatives, setDerivatives] = useState([]);
  const [selectedDerivative, setSelectedDerivative] = useState(null);
  const [derivativeReport, setDerivativeReport] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [derivativePreview, setDerivativePreview] = useState(null);
  const [previewMode, setPreviewMode] = useState("source");
  const [derivativeBusy, setDerivativeBusy] = useState(false);
  const [robloxStatus, setRobloxStatus] = useState(null);
  const [robloxUpload, setRobloxUpload] = useState(null);
  const [robloxUploadBusy, setRobloxUploadBusy] = useState(false);
  const [robloxUploadMode, setRobloxUploadMode] = useState("source_model");
  const [robloxUploadForm, setRobloxUploadForm] = useState({ displayName: "", description: "" });
  const [robloxConfirmations, setRobloxConfirmations] = useState({
    rightsConfirmed: false,
    moderationConfirmed: false,
    creatorConfirmed: false,
  });
  const [studioInsertion, setStudioInsertion] = useState({
    targetParentPath: "Workspace/NexusImports",
    requestedName: "",
    placementMode: "camera_focus",
    anchoringMode: "anchor_all",
    collisionMode: "visual_default",
    review: null,
    record: null,
    status: "idle",
    busy: false,
    error: "",
  });

  const maxBytes = rules?.limits?.maxBytes || 25 * 1024 * 1024;
  const retentionDays = rules?.limits?.retentionDays || 7;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/signin");
    });
    return () => unsubscribe();
  }, [navigate]);

  const refreshList = useCallback(async () => {
    const data = await listModelFiles();
    setItems(data.items || []);
  }, []);

  const refreshDerivatives = useCallback(async (modelFileId) => {
    if (!modelFileId) return [];
    const data = await listModelDerivatives(modelFileId);
    const nextItems = data.items || [];
    setDerivatives(nextItems);
    return nextItems;
  }, []);

  const fetchTokens = useCallback(async () => {
    setTokenLoading(true);
    try {
      setTokenInfo(await getEntitlements());
    } catch (_) {
      setTokenInfo(null);
    } finally {
      setTokenLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTokens();
    getRobloxOAuthStatus().then(setRobloxStatus).catch(() => setRobloxStatus(null));
    getModelValidationRules().then(setRules).catch((err) => setError(err.message));
    refreshList().catch((err) => setError(err.message));
  }, [user, fetchTokens, refreshList]);

  useEffect(() => {
    if (!selected?.id) return undefined;
    let cancelled = false;

    async function loadSelected() {
      try {
        const [{ modelFile }, reportData] = await Promise.all([
          getModelFile(selected.id),
          getModelReport(selected.id).catch(() => null),
        ]);
        if (cancelled) return;
        setSelected(modelFile);
        setReport(reportData?.report || null);
        const derivativeItems = await refreshDerivatives(selected.id).catch(() => []);
        if (!cancelled && selectedDerivative?.id) {
          const latest = derivativeItems.find((item) => item.id === selectedDerivative.id);
          if (latest) setSelectedDerivative(latest);
        }
        if (reportData?.report && !reportData.report.issues?.some((issue) => issue.code === "EXTERNAL_RESOURCE_NOT_ALLOWED")) {
          const previewData = await getModelPreviewUrl(selected.id).catch(() => null);
          if (!cancelled) setPreview(previewData?.preview || null);
        } else {
          setPreview(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadSelected();
    const interval = window.setInterval(loadSelected, 2500);
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [selected?.id, selected?.status, selectedDerivative?.id, refreshDerivatives]);

  const validateClientFile = (file) => {
    if (!file) return "No file selected.";
    if (!file.name.toLowerCase().endsWith(".glb")) {
      return "Phase 5 currently accepts self-contained .glb files. FBX, OBJ, and conversion support will be added later.";
    }
    if (file.size > maxBytes) return `The selected file is larger than ${formatBytes(maxBytes)}.`;
    return "";
  };

  const uploadFile = async (file) => {
    const clientError = validateClientFile(file);
    if (clientError) {
      setError(clientError);
      return;
    }

    setError("");
    setMessage("");
    setUploadProgress(0);
    abortRef.current = new AbortController();

    try {
      setUploadState("creating_upload");
      const session = await createModelUploadSession({
        filename: file.name,
        sizeBytes: file.size,
        contentType: file.type || "model/gltf-binary",
      });
      setUploadState("uploading");
      await uploadModelToSignedUrl({
        url: session.upload.url,
        file,
        headers: session.upload.headers,
        signal: abortRef.current.signal,
        onProgress: setUploadProgress,
      });
      setUploadState("verifying");
      const completed = await completeModelUpload(session.modelFileId);
      setUploadState(completed.status === "queued" ? "queued" : "completed");
      setMessage(completed.reused ? "Existing validation report reused." : "Validation job queued.");
      await refreshList();
      const fresh = await getModelFile(session.modelFileId);
      setSelected(fresh.modelFile);
    } catch (err) {
      setUploadState("idle");
      setError(err.message || "Upload failed.");
    } finally {
      abortRef.current = null;
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const deleteSelected = async (modelFile) => {
    if (!modelFile?.id) return;
    const ok = window.confirm(`Delete ${modelFile.originalFilename || "this model"}?`);
    if (!ok) return;
    await deleteModelFile(modelFile.id);
    setItems((prev) => prev.filter((item) => item.id !== modelFile.id));
    if (selected?.id === modelFile.id) {
      setSelected(null);
      setReport(null);
      setPreview(null);
      resetOptimizationState();
      resetRobloxUploadState();
      setDerivatives([]);
    }
  };

  const resetOptimizationState = () => {
    setPlanState({ loading: false, planId: null, plan: null, summary: null });
    setSelectedDerivative(null);
    setDerivativeReport(null);
    setComparison(null);
    setDerivativePreview(null);
    setPreviewMode("source");
  };

  const resetRobloxUploadState = () => {
    setRobloxUpload(null);
    setRobloxUploadBusy(false);
    setRobloxUploadMode("source_model");
    setRobloxUploadForm({ displayName: "", description: "" });
    setRobloxConfirmations({
      rightsConfirmed: false,
      moderationConfirmed: false,
      creatorConfirmed: false,
    });
    setStudioInsertion((prev) => ({
      ...prev,
      requestedName: "",
      review: null,
      record: null,
      status: "idle",
      busy: false,
      error: "",
    }));
  };

  const generateOptimizationPlan = async () => {
    if (!selected?.id) return;
    setError("");
    setMessage("");
    setPlanState((prev) => ({ ...prev, loading: true }));
    try {
      const result = await createOptimizationPlan(selected.id, { profile, options: {} });
      setPlanState({ loading: false, planId: result.planId, plan: result.plan, summary: result.summary });
    } catch (err) {
      setPlanState((prev) => ({ ...prev, loading: false }));
      setError(err.message || "Could not create optimization plan.");
    }
  };

  const approveOptimizationPlan = async () => {
    if (!selected?.id || !planState.planId) return;
    const aggressive = planState.plan?.profile === "roblox_aggressive";
    if (aggressive) {
      const ok = window.confirm("Aggressive optimization can remove more detail. The original file will remain unchanged. Continue?");
      if (!ok) return;
    }
    setDerivativeBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await createModelDerivative(selected.id, {
        planId: planState.planId,
        aggressiveConfirmed: aggressive,
      });
      setMessage(result.reused ? "Existing optimized copy reused." : "Optimization job queued.");
      const nextItems = await refreshDerivatives(selected.id);
      const next = nextItems.find((item) => item.id === result.derivativeId);
      if (next) setSelectedDerivative(next);
    } catch (err) {
      setError(err.message || "Could not queue optimization.");
    } finally {
      setDerivativeBusy(false);
    }
  };

  const openDerivative = async (derivative) => {
    if (!selected?.id || !derivative?.id) return;
    setSelectedDerivative(derivative);
    setDerivativeReport(null);
    setComparison(derivative.comparison || null);
    setDerivativePreview(null);
    setPreviewMode("optimized");
    if (!["completed", "completed_with_warnings"].includes(derivative.status)) return;
    try {
      const [reportData, comparisonData, previewData] = await Promise.all([
        getModelDerivativeReport(selected.id, derivative.id).catch(() => null),
        getModelDerivativeComparison(selected.id, derivative.id).catch(() => null),
        getModelDerivativePreviewUrl(selected.id, derivative.id).catch(() => null),
      ]);
      setDerivativeReport(reportData?.report || null);
      setComparison(comparisonData?.comparison || derivative.comparison || null);
      setDerivativePreview(previewData?.preview || null);
    } catch (err) {
      setError(err.message || "Could not load derivative.");
    }
  };

  const downloadDerivative = async (derivative) => {
    if (!selected?.id || !derivative?.id) return;
    try {
      const data = await getModelDerivativeDownloadUrl(selected.id, derivative.id);
      if (data.download?.url) window.location.assign(data.download.url);
    } catch (err) {
      setError(err.message || "Could not create download URL.");
    }
  };

  const deleteDerivative = async (derivative) => {
    if (!selected?.id || !derivative?.id) return;
    const ok = window.confirm("Delete this optimized copy? The original source GLB will not be changed.");
    if (!ok) return;
    await deleteModelDerivative(selected.id, derivative.id);
    setDerivatives((prev) => prev.filter((item) => item.id !== derivative.id));
    if (selectedDerivative?.id === derivative.id) {
      setSelectedDerivative(null);
      setDerivativeReport(null);
      setComparison(null);
      setDerivativePreview(null);
      setPreviewMode("source");
    }
  };

  const activeIssues = useMemo(() => report?.issues || [], [report]);
  const summary = report?.summary || selected?.summary || {};
  const canOptimize = Boolean(report && ["valid", "valid_with_warnings", "invalid"].includes(selected?.status));
  const visiblePreview = previewMode === "optimized" && derivativePreview?.url ? derivativePreview : preview;
  const selectedDerivativeReady = selectedDerivative && ["completed", "completed_with_warnings"].includes(selectedDerivative.status);
  const robloxMaxUploadBytes = 20 * 1024 * 1024;
  const robloxUploadCapabilityGranted = Boolean(
    robloxStatus?.capabilities?.granted?.some((capability) => capability.id === "roblox_upload_asset")
  );
  const sourceUploadEligible = Boolean(
    selected?.id &&
    report &&
    ["valid", "valid_with_warnings"].includes(selected.status) &&
    ["compatible", "compatible_with_warnings"].includes(report.status) &&
    Number(summary.fileSizeBytes || selected.verifiedSizeBytes || 0) <= robloxMaxUploadBytes
  );
  const derivativeUploadEligible = Boolean(
    selected?.id &&
    selectedDerivativeReady &&
    derivativeReport &&
    ["compatible", "compatible_with_warnings"].includes(derivativeReport.status) &&
    Number(selectedDerivative?.sizeBytes || derivativeReport.summary?.fileSizeBytes || 0) <= robloxMaxUploadBytes
  );
  const selectedUploadEligible = robloxUploadMode === "optimized_derivative" ? derivativeUploadEligible : sourceUploadEligible;
  const canConfirmRobloxUpload = Boolean(
    robloxUpload?.uploadId &&
    robloxUpload?.review?.policyVersion &&
    robloxConfirmations.rightsConfirmed &&
    robloxConfirmations.moderationConfirmed &&
    robloxConfirmations.creatorConfirmed &&
    !robloxUploadBusy &&
    robloxUpload.status === "preparing"
  );
  const robloxAssetId = robloxUpload?.receipt?.roblox?.assetId || robloxUpload?.robloxAssetId;
  const robloxAssetType = robloxUpload?.receipt?.roblox?.assetType || robloxUpload?.robloxAssetType || "Model";
  const robloxModerationState = robloxUpload?.receipt?.roblox?.moderationState || robloxUpload?.moderationState;
  const canPrepareStudioInsertion = Boolean(
    robloxUpload?.uploadId &&
    robloxAssetId &&
    (robloxAssetType === "Model" || robloxAssetType === "ASSET_TYPE_MODEL") &&
    (robloxUpload.status === "moderation_approved" || robloxModerationState === "approved")
  );

  useEffect(() => {
    if (!robloxUpload?.uploadId) return undefined;
    const activeStatuses = ["queued", "submitting", "operation_pending", "operation_processing"];
    if (!activeStatuses.includes(robloxUpload.status)) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getRobloxModelUploadStatus(robloxUpload.uploadId);
        if (cancelled) return;
        setRobloxUpload((prev) => ({
          ...(prev || {}),
          ...status,
          uploadId: status.uploadId || prev?.uploadId,
          review: prev?.review,
          source: prev?.source,
          creator: prev?.creator,
        }));
        if (status.status && !activeStatuses.includes(status.status)) {
          const full = await getRobloxModelUpload(robloxUpload.uploadId).catch(() => null);
          if (!cancelled && full?.upload) setRobloxUpload({ uploadId: full.upload.id, ...full.upload });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not refresh Roblox upload status.");
      }
    };
    poll();
    const interval = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [robloxUpload?.uploadId, robloxUpload?.status]);

  const startRobloxConnection = async () => {
    await beginRobloxOAuth({ bundles: ["core"], returnPath: "/tools/model-validation" });
  };

  const startRobloxReauth = async () => {
    await beginRobloxReauthorization({ bundles: ["core"], returnPath: "/tools/model-validation" });
  };

  const prepareRobloxUpload = async (sourceType) => {
    if (!selected?.id) return;
    setRobloxUploadBusy(true);
    setError("");
    setMessage("");
    setRobloxUploadMode(sourceType);
    setRobloxConfirmations({
      rightsConfirmed: false,
      moderationConfirmed: false,
      creatorConfirmed: false,
    });
    try {
      const payload = {
        sourceType,
        modelFileId: selected.id,
        ...(sourceType === "optimized_derivative" ? { derivativeId: selectedDerivative?.id } : {}),
        creator: { type: "user" },
        displayName: robloxUploadForm.displayName || selected.originalFilename?.replace(/\.glb$/i, "") || "NexusRBX Model",
        description: robloxUploadForm.description || "",
      };
      const prepared = await prepareRobloxModelUpload(payload);
      setRobloxUpload(prepared);
      setRobloxUploadForm({
        displayName: prepared.review?.displayName || payload.displayName,
        description: prepared.review?.description || "",
      });
    } catch (err) {
      if (err.code === "ROBLOX_CONNECTION_REQUIRED" || err.status === 401) {
        setRobloxUpload({ status: "needs_roblox_connection", error: err.message });
      } else if (err.code === "ROBLOX_REAUTHORIZATION_REQUIRED") {
        setRobloxUpload({ status: "needs_reauthorization", error: err.message, missingScopes: err.missingScopes || ["asset:write"] });
      } else {
        setError(err.message || "Could not prepare Roblox upload.");
      }
    } finally {
      setRobloxUploadBusy(false);
    }
  };

  const confirmPreparedRobloxUpload = async () => {
    if (!robloxUpload?.uploadId) return;
    setRobloxUploadBusy(true);
    setError("");
    setMessage("");
    try {
      const queued = await confirmRobloxModelUpload(robloxUpload.uploadId, {
        ...robloxConfirmations,
        policyVersion: robloxUpload.review?.policyVersion,
      });
      setRobloxUpload((prev) => ({ ...(prev || {}), ...queued }));
      setMessage("Roblox upload job queued.");
    } catch (err) {
      setError(err.message || "Could not queue Roblox upload.");
    } finally {
      setRobloxUploadBusy(false);
    }
  };

  const refreshRobloxReceipt = async () => {
    if (!robloxUpload?.uploadId) return;
    setRobloxUploadBusy(true);
    try {
      const refreshed = await refreshRobloxModelUpload(robloxUpload.uploadId);
      const upload = refreshed.upload || refreshed;
      setRobloxUpload(upload?.id ? { uploadId: upload.id, ...upload } : upload);
    } catch (err) {
      setError(err.message || "Could not refresh moderation status.");
    } finally {
      setRobloxUploadBusy(false);
    }
  };

  const copyRobloxAssetId = async () => {
    const assetId = robloxUpload?.receipt?.roblox?.assetId || robloxUpload?.robloxAssetId;
    if (!assetId) return;
    await navigator.clipboard?.writeText(String(assetId)).catch(() => {});
    setMessage("Roblox asset ID copied.");
  };

  const prepareStudioInsertion = async () => {
    if (!robloxUpload?.uploadId) return;
    setStudioInsertion((prev) => ({ ...prev, busy: true, error: "", status: "checking_eligibility" }));
    setError("");
    setMessage("");
    try {
      const payload = {
        targetParentPath: studioInsertion.targetParentPath || "Workspace/NexusImports",
        requestedName: studioInsertion.requestedName || robloxUpload.displayName || robloxUpload.review?.displayName || "Roblox Model",
        placement: { mode: studioInsertion.placementMode || "camera_focus" },
        anchoringMode: studioInsertion.anchoringMode || "anchor_all",
        collisionMode: studioInsertion.collisionMode || "visual_default",
      };
      const review = await prepareRobloxModelInsertion(robloxUpload.uploadId, payload);
      setStudioInsertion((prev) => ({
        ...prev,
        review,
        record: null,
        requestedName: review.insertion?.requestedName || payload.requestedName,
        status: "ready",
        busy: false,
        error: "",
      }));
    } catch (err) {
      const codeState = {
        STUDIO_SESSION_MISSING: "studio_disconnected",
        ASSET_CREATOR_MISMATCH: "creator_mismatch",
        ASSET_MODERATION_PENDING: "moderation_pending",
        EXPERIENCE_CREATOR_UNKNOWN: "studio_disconnected",
      }[err.code] || "failed";
      setStudioInsertion((prev) => ({ ...prev, busy: false, status: codeState, error: err.message || "Could not prepare Studio insertion." }));
    }
  };

  const queueStudioInsertion = async () => {
    if (!robloxUpload?.uploadId) return;
    setStudioInsertion((prev) => ({ ...prev, busy: true, error: "", status: "queueing" }));
    try {
      const queued = await insertRobloxModelInStudio(robloxUpload.uploadId, {
        targetParentPath: studioInsertion.review?.insertion?.targetParentPath || studioInsertion.targetParentPath,
        requestedName: studioInsertion.review?.insertion?.requestedName || studioInsertion.requestedName,
        placement: studioInsertion.review?.insertion?.placement || { mode: studioInsertion.placementMode },
        anchoringMode: studioInsertion.review?.insertion?.anchoringMode || studioInsertion.anchoringMode,
        collisionMode: studioInsertion.review?.insertion?.collisionMode || studioInsertion.collisionMode,
      });
      setStudioInsertion((prev) => ({ ...prev, record: queued, status: queued.status || "queued", busy: false, error: "" }));
      setMessage("Studio insertion queued.");
    } catch (err) {
      setStudioInsertion((prev) => ({ ...prev, busy: false, status: "failed", error: err.message || "Could not queue Studio insertion." }));
    }
  };

  const recheckInsertionAccess = async () => {
    if (!robloxUpload?.uploadId) return;
    setStudioInsertion((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await recheckRobloxModelInsertionAccess(robloxUpload.uploadId);
      await refreshRobloxReceipt();
      setMessage("Roblox asset access refreshed.");
    } catch (err) {
      setStudioInsertion((prev) => ({ ...prev, error: err.message || "Could not recheck Roblox asset access." }));
    } finally {
      setStudioInsertion((prev) => ({ ...prev, busy: false }));
    }
  };

  useEffect(() => {
    const insertionId = studioInsertion.record?.insertionId;
    if (!insertionId) return undefined;
    if (["succeeded", "failed", "cancelled"].includes(studioInsertion.status)) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getRobloxModelInsertion(insertionId);
        if (cancelled) return;
        const insertion = data.insertion || data;
        setStudioInsertion((prev) => ({
          ...prev,
          record: insertion,
          status: insertion.status || prev.status,
        }));
      } catch (err) {
        if (!cancelled) {
          setStudioInsertion((prev) => ({ ...prev, error: err.message || "Could not load Studio insertion status." }));
        }
      }
    };
    poll();
    const interval = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [studioInsertion.record?.insertionId, studioInsertion.status]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <NexusRBXHeader
        navigate={navigate}
        user={user}
        handleLogin={() => navigate("/signin")}
        tokenInfo={tokenInfo}
        tokenLoading={tokenLoading}
      />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#00f5d4]">
              <Lock className="h-3.5 w-3.5" />
              Private GLB Validation
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Model compatibility reports</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Phase 5 currently accepts self-contained .glb files. FBX, OBJ, and conversion support will be added later.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-300">
            <div>{formatBytes(maxBytes)} upload limit</div>
            <div>{retentionDays}-day retention</div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
            <Lock className="mb-3 h-5 w-5 text-[#00f5d4]" />
            Files are uploaded to private Cloud Storage and are not published publicly.
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
            <FileCode2 className="mb-3 h-5 w-5 text-[#00f5d4]" />
            Validation checks Roblox-oriented geometry, material, texture, bounds, and structure rules.
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
            <Box className="mb-3 h-5 w-5 text-[#00f5d4]" />
            Roblox upload is review-gated. Studio insertion, public publishing, paid generation, conversion, and automatic sharing are not included.
          </div>
        </div>

        {(error || message) && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`block cursor-pointer rounded-lg border border-dashed p-6 transition ${
                dragging ? "border-[#00f5d4] bg-[#00f5d4]/10" : "border-white/15 bg-black/30 hover:border-white/30"
              }`}
            >
              <input
                type="file"
                accept=".glb,model/gltf-binary"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file);
                  event.target.value = "";
                }}
              />
              <div className="flex flex-col items-center text-center">
                <UploadCloud className="h-10 w-10 text-[#00f5d4]" />
                <div className="mt-4 text-lg font-black">Select a GLB file</div>
                <div className="mt-2 text-sm leading-6 text-gray-400">
                  Self-contained binary GLB only. Browser checks are advisory; the backend verifies the stored file.
                </div>
              </div>
            </label>

            {uploadState !== "idle" && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-white">{STAGE_LABELS[uploadState] || uploadState.replace(/_/g, " ")}</span>
                  {uploadState === "uploading" && <span className="text-gray-400">{uploadProgress}%</span>}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[#00f5d4] transition-all"
                    style={{ width: uploadState === "uploading" ? `${uploadProgress}%` : uploadState === "queued" ? "100%" : "35%" }}
                  />
                </div>
                {abortRef.current && uploadState === "uploading" && (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="mt-3 text-xs font-bold text-red-300 hover:text-red-200"
                  >
                    Cancel upload
                  </button>
                )}
              </div>
            )}

            <section className="rounded-lg border border-white/10 bg-black/30">
              <div className="border-b border-white/10 p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">Your uploads</h2>
              </div>
              <div className="max-h-[620px] overflow-y-auto p-2 scrollbar-thin">
                {items.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No model files yet.</div>
                ) : (
                  items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelected(item);
                        setReport(null);
                        setPreview(null);
                        resetOptimizationState();
                        resetRobloxUploadState();
                        setDerivatives([]);
                      }}
                      className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                        selected?.id === item.id ? "border-[#00f5d4]/40 bg-[#00f5d4]/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{item.originalFilename || "model.glb"}</div>
                          <div className="mt-1 text-xs text-gray-500">{formatDate(item.createdAtMs)}</div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${statusTone(item.status)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <span>{formatBytes(item.verifiedSizeBytes || item.declaredSizeBytes)}</span>
                        <span>{item.summary?.triangles ? `${item.summary.triangles.toLocaleString()} tris` : "Triangles pending"}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-lg border border-white/10 bg-black/30">
            {!selected ? (
              <div className="flex min-h-[620px] items-center justify-center p-8 text-center">
                <div>
                  <Box className="mx-auto h-12 w-12 text-gray-600" />
                  <div className="mt-4 text-lg font-black text-white">Select or upload a model</div>
                  <p className="mt-2 max-w-md text-sm text-gray-500">Reports appear here after upload verification and background validation.</p>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-black text-white">{selected.originalFilename || "model.glb"}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(selected.status)}`}>
                        {STATUS_LABELS[selected.status] || selected.status}
                      </span>
                      {selected.validationStage && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300">
                          {STAGE_LABELS[selected.validationStage] || selected.validationStage}
                        </span>
                      )}
                      {selected.rulesVersion && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300">
                          {selected.rulesVersion}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSelected(selected)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 transition hover:border-red-400/35"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>

                {["queued", "validating", "uploaded"].includes(selected.status) && (
                  <div className="mb-5 flex items-center gap-3 rounded-lg border border-sky-400/25 bg-sky-500/10 p-4 text-sm text-sky-100">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {STAGE_LABELS[selected.validationStage] || "Validation job queued"}
                  </div>
                )}

                {report && (
                  <>
                    <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                          <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusTone(report.status)}`}>
                            {REPORT_STATUS_LABELS[report.status] || report.status}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-gray-400">
                            Likely compatible with the checked Roblox-oriented rules. This does not guarantee Roblox moderation approval,
                            cloud upload success, Studio visual parity, collision behavior, or avatar compatibility.
                          </p>
                        </div>
                        <div className="text-sm text-gray-400">
                          <div>Validated {formatDate(report.validatedAt)}</div>
                          <div>SHA-256 {shortHash(report.sha256)}</div>
                        </div>
                      </div>
                    </div>

                    {visiblePreview?.url ? (
                      <div className="mb-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-black/30 p-1">
                            <button
                              type="button"
                              onClick={() => setPreviewMode("source")}
                              className={`rounded-md px-3 py-1.5 text-xs font-black ${previewMode === "source" ? "bg-[#00f5d4] text-black" : "text-gray-300 hover:text-white"}`}
                            >
                              Source
                            </button>
                            <button
                              type="button"
                              disabled={!derivativePreview?.url}
                              onClick={() => setPreviewMode("optimized")}
                              className={`rounded-md px-3 py-1.5 text-xs font-black disabled:cursor-not-allowed disabled:text-gray-600 ${previewMode === "optimized" ? "bg-[#00f5d4] text-black" : "text-gray-300 hover:text-white"}`}
                            >
                              Optimized
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">Same viewer, lighting, grid, and camera controls for comparable framing.</div>
                        </div>
                        <GlbPreview previewUrl={visiblePreview.url} modelFileId={`${selected.id}-${previewMode}-${selectedDerivative?.id || "source"}`} />
                      </div>
                    ) : (
                      <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                        Preview becomes available after validation completes without external resource references.
                      </div>
                    )}

                    <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">Roblox upload</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                            Upload creates a Roblox Model package asset in the selected creator inventory. It does not insert the model into Studio, publish it to Creator Store, make it public, or grant permissions.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => prepareRobloxUpload("source_model")}
                            disabled={robloxUploadBusy || !sourceUploadEligible}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00f5d4]/30 bg-[#00f5d4] px-4 py-2 text-sm font-black text-black transition hover:bg-[#7fffee] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {robloxUploadBusy && robloxUploadMode === "source_model" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            Upload source
                          </button>
                          <button
                            type="button"
                            onClick={() => prepareRobloxUpload("optimized_derivative")}
                            disabled={robloxUploadBusy || !derivativeUploadEligible}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm font-black text-gray-100 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {robloxUploadBusy && robloxUploadMode === "optimized_derivative" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            Upload optimized
                          </button>
                        </div>
                      </div>

                      {!robloxUpload?.uploadId && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Display name</span>
                            <input
                              type="text"
                              maxLength={50}
                              placeholder={selected.originalFilename?.replace(/\.glb$/i, "") || "NexusRBX Model"}
                              value={robloxUploadForm.displayName}
                              onChange={(event) => setRobloxUploadForm((prev) => ({ ...prev, displayName: event.target.value }))}
                              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#00f5d4]/50"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Description</span>
                            <textarea
                              maxLength={1000}
                              value={robloxUploadForm.description}
                              onChange={(event) => setRobloxUploadForm((prev) => ({ ...prev, description: event.target.value }))}
                              className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#00f5d4]/50"
                            />
                          </label>
                        </div>
                      )}

                      {!robloxStatus?.connected && (
                        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                          <div className="font-bold">Roblox connection required</div>
                          <button
                            type="button"
                            onClick={startRobloxConnection}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300 px-3 py-2 text-xs font-black text-black"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Connect Roblox
                          </button>
                        </div>
                      )}

                      {robloxStatus?.connected && !robloxUploadCapabilityGranted && (
                        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                          <div className="font-bold">Uploading models requires Roblox asset write permission.</div>
                          <button
                            type="button"
                            onClick={startRobloxReauth}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300 px-3 py-2 text-xs font-black text-black"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Reauthorize
                          </button>
                        </div>
                      )}

                      {robloxUpload?.status === "needs_roblox_connection" && (
                        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                          <div>{robloxUpload.error || "Connect Roblox before uploading models."}</div>
                          <button type="button" onClick={startRobloxConnection} className="mt-3 rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-black">
                            Connect Roblox
                          </button>
                        </div>
                      )}

                      {robloxUpload?.status === "needs_reauthorization" && (
                        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                          <div>{robloxUpload.error || "Uploading models requires Roblox asset write permission."}</div>
                          <button type="button" onClick={startRobloxReauth} className="mt-3 rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-black">
                            Reauthorize Roblox
                          </button>
                        </div>
                      )}

                      {robloxUpload?.uploadId && (
                        <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-black/25 p-4">
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusTone(robloxUpload.status)}`}>
                                {ROBLOX_UPLOAD_STATUS_LABELS[robloxUpload.status] || robloxUpload.status}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">Upload ID {robloxUpload.uploadId}</div>
                            </div>
                            {["queued", "submitting", "operation_pending", "operation_processing"].includes(robloxUpload.status) && (
                              <div className="inline-flex items-center gap-2 text-sm text-sky-200">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {ROBLOX_UPLOAD_STATUS_LABELS[robloxUpload.status]}
                              </div>
                            )}
                          </div>

                          {robloxUpload.status === "preparing" && (
                            <>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <Metric label="Source" value={robloxUpload.source?.type === "optimized_derivative" ? "Optimized" : "Source"} />
                                <Metric label="File size" value={formatBytes(robloxUpload.source?.sizeBytes)} />
                                <Metric label="Triangles" value={(robloxUpload.source?.totalTriangles ?? 0).toLocaleString()} />
                                <Metric label="Largest mesh" value={(robloxUpload.source?.largestMeshTriangles ?? 0).toLocaleString()} />
                                <Metric label="Validation" value={REPORT_STATUS_LABELS[robloxUpload.source?.validationStatus] || robloxUpload.source?.validationStatus || "Unknown"} />
                                <Metric label="SHA-256" value={robloxUpload.source?.shaSummary || shortHash(robloxUpload.source?.sha256)} />
                                <Metric label="Creator" value={creatorLabel(robloxUpload.creator)} />
                                <Metric label="Rules" value={robloxUpload.source?.validationRulesVersion || "Current"} />
                              </div>

                              {!!robloxUpload.source?.warnings?.length && (
                                <div className="space-y-2">
                                  {robloxUpload.source.warnings.slice(0, 5).map((warning, index) => (
                                    <div key={`${warning.code || "warning"}-${index}`} className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                                      {warning.message || warning.code || "Validation warning"}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="block">
                                  <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Display name</span>
                                  <input
                                    type="text"
                                    maxLength={50}
                                    readOnly
                                    value={robloxUploadForm.displayName}
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Description</span>
                                  <textarea
                                    maxLength={1000}
                                    readOnly
                                    value={robloxUploadForm.description}
                                    className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                  />
                                </label>
                              </div>

                              <div className="space-y-2 text-sm text-gray-300">
                                {[
                                  ["rightsConfirmed", "I have the rights to upload this model and its textures."],
                                  ["moderationConfirmed", "I understand Roblox moderation applies."],
                                  ["creatorConfirmed", `I confirm the selected Roblox creator destination: ${creatorLabel(robloxUpload.creator)}.`],
                                ].map(([key, label]) => (
                                  <label key={key} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                                    <input
                                      type="checkbox"
                                      checked={robloxConfirmations[key]}
                                      onChange={(event) => setRobloxConfirmations((prev) => ({ ...prev, [key]: event.target.checked }))}
                                      className="mt-1"
                                    />
                                    <span>{label}</span>
                                  </label>
                                ))}
                              </div>

                              <div className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-3 text-sm leading-6 text-sky-100">
                                Roblox may moderate the model and embedded visual content. Upload success does not guarantee approval, usability in experiences, or public availability.
                              </div>

                              <button
                                type="button"
                                onClick={confirmPreparedRobloxUpload}
                                disabled={!canConfirmRobloxUpload}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00f5d4]/30 bg-[#00f5d4] px-4 py-2 text-sm font-black text-black transition hover:bg-[#7fffee] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {robloxUploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                Upload to Roblox
                              </button>
                            </>
                          )}

                          {robloxUpload.status === "submission_unknown" && (
                            <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
                              NexusRBX could not determine whether Roblox accepted the upload. To avoid creating a duplicate asset, the upload has not been retried automatically.
                            </div>
                          )}

                          {robloxUpload.error?.message && (
                            <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
                              {robloxUpload.error.message}
                            </div>
                          )}

                          {(robloxUpload.receipt || robloxUpload.robloxAssetId) && (
                            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4">
                              <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                <div>
                                  <div className="text-sm font-black text-emerald-100">Roblox upload receipt</div>
                                  <div className="mt-1 text-xs text-emerald-200/70">
                                    Moderation: {robloxUpload.receipt?.roblox?.moderationState || robloxUpload.moderationState || "unknown"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={copyRobloxAssetId}
                                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-black/20 px-3 py-2 text-xs font-black text-emerald-100"
                                  >
                                    <Copy className="h-4 w-4" />
                                    Copy asset ID
                                  </button>
                                  {creatorDashboardUrl(robloxUpload.receipt?.roblox?.assetId || robloxUpload.robloxAssetId) && (
                                    <a
                                      href={creatorDashboardUrl(robloxUpload.receipt?.roblox?.assetId || robloxUpload.robloxAssetId)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-black/20 px-3 py-2 text-xs font-black text-emerald-100"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Open dashboard
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={refreshRobloxReceipt}
                                    disabled={robloxUploadBusy}
                                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-black/20 px-3 py-2 text-xs font-black text-emerald-100 disabled:opacity-50"
                                  >
                                    {robloxUploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Refresh
                                  </button>
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <Metric label="Asset ID" value={robloxUpload.receipt?.roblox?.assetId || robloxUpload.robloxAssetId} />
                                <Metric label="Revision" value={robloxUpload.receipt?.roblox?.revisionId || robloxUpload.robloxRevisionId || "Unknown"} />
                                <Metric label="Asset type" value={robloxUpload.receipt?.roblox?.assetType || robloxUpload.robloxAssetType || "Model"} />
                                <Metric label="Creator" value={creatorLabel(robloxUpload.creator || robloxUpload.receipt?.creator)} />
                                <Metric label="Source" value={robloxUpload.receipt?.source?.type === "optimized_derivative" ? "Optimized" : "Source"} />
                                <Metric label="Source SHA" value={shortHash(robloxUpload.receipt?.source?.sha256 || robloxUpload.sourceSha256)} />
                                <Metric label="Uploaded" value={formatDate(robloxUpload.completedAtMs || robloxUpload.receipt?.completedAt)} />
                                <Metric label="Status" value={ROBLOX_UPLOAD_STATUS_LABELS[robloxUpload.status] || robloxUpload.status} />
                              </div>

                              <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
                                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                  <div>
                                    <div className="flex items-center gap-2 text-sm font-black text-white">
                                      <Box className="h-4 w-4 text-[#00f5d4]" />
                                      Insert into Studio
                                    </div>
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/80">
                                      NexusRBX will load the Roblox asset into an unparented quarantine, remove executable and networking objects, validate the structure, and then place the approved model into your experience.
                                    </p>
                                  </div>
                                  <div className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${canPrepareStudioInsertion ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100" : "border-amber-300/25 bg-amber-500/10 text-amber-100"}`}>
                                    {canPrepareStudioInsertion ? "Ready for review" : robloxModerationState === "pending" ? "Moderation pending" : "Unavailable"}
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                  <label className="block xl:col-span-2">
                                    <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Destination</span>
                                    <select
                                      value={studioInsertion.targetParentPath}
                                      onChange={(event) => setStudioInsertion((prev) => ({ ...prev, targetParentPath: event.target.value, review: null, status: "idle" }))}
                                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                    >
                                      <option value="Workspace/NexusImports">Workspace/NexusImports</option>
                                      <option value="ReplicatedStorage/NexusImports">ReplicatedStorage/NexusImports</option>
                                      <option value="ServerStorage/NexusImports">ServerStorage/NexusImports</option>
                                    </select>
                                  </label>
                                  <label className="block">
                                    <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Placement</span>
                                    <select
                                      value={studioInsertion.placementMode}
                                      onChange={(event) => setStudioInsertion((prev) => ({ ...prev, placementMode: event.target.value, review: null, status: "idle" }))}
                                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                    >
                                      <option value="camera_focus">Camera focus</option>
                                      <option value="origin">Origin</option>
                                      <option value="selection_relative">Selection relative</option>
                                    </select>
                                  </label>
                                  <label className="block">
                                    <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Anchoring</span>
                                    <select
                                      value={studioInsertion.anchoringMode}
                                      onChange={(event) => setStudioInsertion((prev) => ({ ...prev, anchoringMode: event.target.value, review: null, status: "idle" }))}
                                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                    >
                                      <option value="anchor_all">Anchor all</option>
                                      <option value="preserve">Preserve</option>
                                    </select>
                                  </label>
                                  <label className="block">
                                    <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Collision</span>
                                    <select
                                      value={studioInsertion.collisionMode}
                                      onChange={(event) => setStudioInsertion((prev) => ({ ...prev, collisionMode: event.target.value, review: null, status: "idle" }))}
                                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                    >
                                      <option value="visual_default">Visual default</option>
                                      <option value="preserve">Preserve</option>
                                      <option value="disable">Disable</option>
                                    </select>
                                  </label>
                                </div>

                                <label className="mt-3 block">
                                  <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Inserted name</span>
                                  <input
                                    type="text"
                                    maxLength={100}
                                    value={studioInsertion.requestedName || robloxUpload.displayName || robloxUploadForm.displayName || ""}
                                    onChange={(event) => setStudioInsertion((prev) => ({ ...prev, requestedName: event.target.value, review: null, status: "idle" }))}
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                  />
                                </label>

                                {studioInsertion.anchoringMode === "preserve" && (
                                  <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                                    Preserve keeps Roblox-returned anchoring and may introduce active physics when the model is inserted.
                                  </div>
                                )}

                                {studioInsertion.review && (
                                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <Metric label="Experience" value={studioInsertion.review.experience?.name || studioInsertion.review.experience?.placeId || "Paired Studio"} />
                                    <Metric label="Experience creator" value={creatorLabel(studioInsertion.review.experience?.creator)} />
                                    <Metric label="Asset creator" value={creatorLabel(studioInsertion.review.asset?.creator)} />
                                    <Metric label="Source triangles" value={(studioInsertion.review.validation?.totalTriangles ?? 0).toLocaleString()} />
                                  </div>
                                )}

                                {studioInsertion.record?.result?.ok && (
                                  <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <div className="text-sm font-black text-emerald-100">{studioInsertion.record.result.insertedName || "Inserted model"}</div>
                                        <div className="mt-1 text-xs text-emerald-200/75">{studioInsertion.record.result.insertedRootPath}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => navigator.clipboard?.writeText(studioInsertion.record.result.insertedRootPath || "")}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-black/20 px-3 py-2 text-xs font-black text-emerald-100"
                                      >
                                        <Copy className="h-4 w-4" />
                                        Copy Studio path
                                      </button>
                                    </div>
                                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                                      <Metric label="MeshParts" value={studioInsertion.record.result.scan?.meshParts ?? 0} />
                                      <Metric label="Scripts removed" value={studioInsertion.record.result.scan?.scriptsRemoved ?? 0} />
                                      <Metric label="Remotes removed" value={studioInsertion.record.result.scan?.remotesRemoved ?? 0} />
                                      <Metric label="Parts anchored" value={studioInsertion.record.result.changes?.partsAnchored ?? 0} />
                                    </div>
                                  </div>
                                )}

                                {studioInsertion.error && (
                                  <div className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
                                    {studioInsertion.error}
                                  </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={prepareStudioInsertion}
                                    disabled={!canPrepareStudioInsertion || studioInsertion.busy}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {studioInsertion.busy && studioInsertion.status === "checking_eligibility" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                                    Review destination
                                  </button>
                                  <button
                                    type="button"
                                    onClick={queueStudioInsertion}
                                    disabled={!studioInsertion.review || studioInsertion.busy || ["queued", "waiting_for_studio", "loading_asset", "scanning", "sanitizing", "validating_structure", "placing"].includes(studioInsertion.status)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00f5d4]/30 bg-[#00f5d4] px-4 py-2 text-sm font-black text-black transition hover:bg-[#7fffee] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {studioInsertion.busy || ["queued", "waiting_for_studio", "loading_asset", "scanning", "sanitizing", "validating_structure", "placing"].includes(studioInsertion.status) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    Insert safely
                                  </button>
                                  {!canPrepareStudioInsertion && robloxAssetId && (
                                    <button
                                      type="button"
                                      onClick={recheckInsertionAccess}
                                      disabled={studioInsertion.busy}
                                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-50"
                                    >
                                      <RefreshCw className={`h-4 w-4 ${studioInsertion.busy ? "animate-spin" : ""}`} />
                                      Recheck access
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!selectedUploadEligible && (
                        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-500">
                          Upload is available only for compatible validated sources or completed compatible optimized derivatives under 20 MiB.
                        </div>
                      )}
                    </section>

                    {canOptimize && (
                      <section className="mb-5 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/[0.04] p-4">
                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#00f5d4]">
                              <Sparkles className="h-4 w-4" />
                              Optimize private copy
                            </div>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                              The original GLB remains immutable. Simplification may reduce visual detail, and the optimized copy is validated again before preview or download.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={generateOptimizationPlan}
                            disabled={planState.loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00f5d4]/30 bg-[#00f5d4] px-4 py-2 text-sm font-black text-black transition hover:bg-[#7fffee] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {planState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Generate plan
                          </button>
                        </div>

                        <div className="mt-4 grid gap-2 md:grid-cols-3">
                          {Object.entries(PROFILE_LABELS).map(([value, label]) => (
                            <button
                              type="button"
                              key={value}
                              onClick={() => {
                                setProfile(value);
                                setPlanState({ loading: false, planId: null, plan: null, summary: null });
                              }}
                              className={`rounded-lg border px-3 py-3 text-left transition ${
                                profile === value ? "border-[#00f5d4]/50 bg-[#00f5d4]/10" : "border-white/10 bg-black/25 hover:border-white/25"
                              }`}
                            >
                              <div className="text-sm font-black text-white">{label}</div>
                              <div className="mt-1 text-xs leading-5 text-gray-400">
                                {value === "lossless_cleanup" && "Cleanup and repack without texture resizing or lossy simplification."}
                                {value === "roblox_balanced" && "Default profile for oversized textures and high-triangle meshes."}
                                {value === "roblox_aggressive" && "Stronger targets and an extra confirmation before queueing."}
                              </div>
                            </button>
                          ))}
                        </div>

                        {planState.plan && (
                          <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                              <div>
                                <div className="text-sm font-black text-white">{PROFILE_LABELS[planState.plan.profile] || planState.plan.profile}</div>
                                <div className="mt-1 text-xs text-gray-500">Plan ID {planState.planId}</div>
                              </div>
                              <button
                                type="button"
                                onClick={approveOptimizationPlan}
                                disabled={derivativeBusy}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {derivativeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Create optimized copy
                              </button>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <Metric label="Meshes targeted" value={planState.summary?.meshesTargeted ?? 0} />
                              <Metric label="Textures targeted" value={planState.summary?.texturesTargeted ?? 0} />
                              <Metric label="Triangle target" value={(planState.summary?.estimatedTriangleTarget ?? 0).toLocaleString()} />
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Planned mesh targets</div>
                                <div className="mt-2 space-y-1 text-sm text-gray-300">
                                  {(planState.summary?.plannedMeshTargets || []).slice(0, 5).map((mesh) => (
                                    <div key={mesh.index} className="flex justify-between gap-3">
                                      <span className="truncate">{mesh.name}</span>
                                      <span>{(mesh.currentTriangles || 0).toLocaleString()} → {(mesh.targetTriangles || 0).toLocaleString()}</span>
                                    </div>
                                  ))}
                                  {!(planState.summary?.plannedMeshTargets || []).length && <div>No mesh simplification planned.</div>}
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Planned texture resizing</div>
                                <div className="mt-2 space-y-1 text-sm text-gray-300">
                                  {(planState.summary?.plannedTextureResizes || []).slice(0, 5).map((texture) => (
                                    <div key={texture.index} className="flex justify-between gap-3">
                                      <span className="truncate">{texture.name}</span>
                                      <span>{texture.width} x {texture.height} → max {texture.maximumDimension}</span>
                                    </div>
                                  ))}
                                  {!(planState.summary?.plannedTextureResizes || []).length && <div>No texture resizing planned.</div>}
                                </div>
                              </div>
                            </div>
                            {!!planState.summary?.warnings?.length && (
                              <div className="mt-4 space-y-2">
                                {planState.summary.warnings.map((warning, index) => (
                                  <div key={`${warning}-${index}`} className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                                    {warning}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Metric label="File size" value={formatBytes(summary.fileSizeBytes)} />
                      <Metric label="Scenes" value={summary.scenes ?? 0} />
                      <Metric label="Nodes" value={summary.nodes ?? 0} />
                      <Metric label="Meshes" value={summary.meshes ?? 0} />
                      <Metric label="Triangles" value={(summary.triangles ?? 0).toLocaleString()} />
                      <Metric label="Largest mesh" value={(summary.largestMeshTriangles ?? 0).toLocaleString()} />
                      <Metric label="Vertices" value={(summary.vertices ?? 0).toLocaleString()} />
                      <Metric label="Materials" value={summary.materials ?? 0} />
                      <Metric label="Textures" value={summary.textures ?? 0} />
                      <Metric label="Rig" value={summary.skins ? "Present" : "None"} />
                      <Metric label="Animations" value={summary.animations ? "Present" : "None"} />
                      <Metric
                        label="Dimensions"
                        value={report.bounds?.size ? `${report.bounds.size.x.toFixed(2)} x ${report.bounds.size.y.toFixed(2)} x ${report.bounds.size.z.toFixed(2)}` : "None"}
                      />
                    </div>

                    <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">Optimized copies</h3>
                          <p className="mt-2 text-sm text-gray-500">Private derivatives expire separately and never overwrite the source GLB.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => refreshDerivatives(selected.id).catch((err) => setError(err.message))}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-gray-200 transition hover:border-white/25"
                        >
                          Refresh
                        </button>
                      </div>
                      {derivatives.length === 0 ? (
                        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-gray-500">
                          No optimized copies yet.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {derivatives.map((derivative) => (
                            <div
                              key={derivative.id}
                              className={`rounded-lg border p-3 transition ${
                                selectedDerivative?.id === derivative.id ? "border-[#00f5d4]/40 bg-[#00f5d4]/10" : "border-white/10 bg-black/25"
                              }`}
                            >
                              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                <button
                                  type="button"
                                  onClick={() => openDerivative(derivative)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black text-white">{PROFILE_LABELS[derivative.profile] || derivative.profile}</span>
                                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusTone(derivative.status)}`}>
                                      {DERIVATIVE_STATUS_LABELS[derivative.status] || derivative.status}
                                    </span>
                                    {derivative.stage && (
                                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-400">
                                        {OPTIMIZATION_STAGE_LABELS[derivative.stage] || derivative.stage}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                    <span>{formatDate(derivative.createdAtMs)}</span>
                                    <span>{derivative.sizeBytes ? formatBytes(derivative.sizeBytes) : "Size pending"}</span>
                                    <span>{shortHash(derivative.sha256)}</span>
                                  </div>
                                  {derivative.lastError?.message && (
                                    <div className="mt-2 text-sm text-red-200">{derivative.lastError.message}</div>
                                  )}
                                </button>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={!["completed", "completed_with_warnings"].includes(derivative.status)}
                                    onClick={() => downloadDerivative(derivative)}
                                    title="Download optimized GLB"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-200 transition hover:border-white/25 disabled:cursor-not-allowed disabled:text-gray-600"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteDerivative(derivative)}
                                    title="Delete optimized copy"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-200 transition hover:border-red-400/35"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedDerivativeReady && comparison && (
                        <div className="mt-5 border-t border-white/10 pt-4">
                          <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                              <h4 className="text-sm font-black text-white">Source vs optimized</h4>
                              <div className="mt-1 text-xs text-gray-500">Reduced numbers do not guarantee identical visual quality or Roblox acceptance.</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewMode("source")}
                                className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs font-black text-gray-200"
                              >
                                Preview source
                              </button>
                              <button
                                type="button"
                                onClick={() => openDerivative(selectedDerivative)}
                                className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs font-black text-gray-200"
                              >
                                Preview optimized
                              </button>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Metric label="Size change" value={formatPercent(comparison.changes?.sizeReductionPercent)} />
                            <Metric label="Triangle change" value={formatPercent(comparison.changes?.triangleReductionPercent)} />
                            <Metric label="Texture change" value={formatPercent(comparison.changes?.textureReductionPercent)} />
                            <Metric label="Meshes simplified" value={comparison.changes?.meshesSimplified ?? 0} />
                            <Metric label="Source size" value={formatBytes(comparison.source?.sizeBytes)} />
                            <Metric label="Optimized size" value={formatBytes(comparison.derivative?.sizeBytes)} />
                            <Metric label="Source tris" value={(comparison.source?.triangles ?? 0).toLocaleString()} />
                            <Metric label="Optimized tris" value={(comparison.derivative?.triangles ?? 0).toLocaleString()} />
                            <Metric label="Source textures" value={comparison.source?.textures ?? 0} />
                            <Metric label="Optimized textures" value={comparison.derivative?.textures ?? 0} />
                            <Metric label="Source compatibility" value={REPORT_STATUS_LABELS[comparison.compatibility?.source] || comparison.compatibility?.source || "Unknown"} />
                            <Metric label="Optimized compatibility" value={REPORT_STATUS_LABELS[comparison.compatibility?.derivative] || comparison.compatibility?.derivative || "Unknown"} />
                          </div>
                          {!!comparison.warnings?.length && (
                            <div className="mt-4 space-y-2">
                              {comparison.warnings.map((warning, index) => (
                                <div key={`${warning.code || "warning"}-${index}`} className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                                  {warning.message || warning}
                                </div>
                              ))}
                            </div>
                          )}
                          {derivativeReport?.issues?.length > 0 && (
                            <ExpandableSection title="Optimized validation report" count={derivativeReport.issues.length}>
                              <div className="space-y-2">
                                {derivativeReport.issues.map((issue, index) => (
                                  <div key={`${issue.code}-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-gray-300">
                                    <div className="font-bold text-white">{issue.code}</div>
                                    <div className="mt-1">{issue.message}</div>
                                  </div>
                                ))}
                              </div>
                            </ExpandableSection>
                          )}
                        </div>
                      )}
                    </section>

                    <section className="mb-2">
                      <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-gray-400">Issues and recommendations</h3>
                      {activeIssues.length === 0 ? (
                        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                          No errors or warnings were reported.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeIssues.map((issue, index) => (
                            <div key={`${issue.code}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                              <div className="flex items-start gap-3">
                                <IssueIcon severity={issue.severity} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-white">{issue.code}</span>
                                    <span className="text-xs uppercase tracking-[0.16em] text-gray-500">{issue.severity}</span>
                                    <span className="truncate text-xs text-gray-500">{issue.path}</span>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-300">{issue.message}</p>
                                  {issue.recommendation && <p className="mt-1 text-sm text-gray-500">{issue.recommendation}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <ExpandableSection title="Mesh details" count={report.meshes?.length || 0}>
                      <div className="space-y-2">
                        {(report.meshes || []).map((mesh, index) => (
                          <div key={`${mesh.name}-${index}`} className="rounded-lg border border-white/10 bg-black/25">
                            <button
                              type="button"
                              onClick={() => setExpandedMesh(expandedMesh === index ? null : index)}
                              className="flex w-full items-center justify-between gap-3 p-3 text-left"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-white">{mesh.name}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {(mesh.triangles || 0).toLocaleString()} triangles, {(mesh.vertices || 0).toLocaleString()} vertices
                                </div>
                              </div>
                              {expandedMesh === index ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            {expandedMesh === index && (
                              <div className="border-t border-white/10 p-3 text-sm text-gray-400">
                                <div>Primitives: {mesh.primitiveCount || 0}</div>
                                <div>Status: {REPORT_STATUS_LABELS[mesh.status] || mesh.status}</div>
                                <div>Issues: {mesh.issues?.length || 0}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>

                    <ExpandableSection title="Material details" count={report.materials?.length || 0}>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(report.materials || []).map((material) => (
                          <div key={material.index} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-gray-400">
                            <div className="font-bold text-white">{material.name}</div>
                            <div>Alpha: {material.alphaMode}</div>
                            <div>Textures: {[material.hasBaseColorTexture && "base", material.hasNormalTexture && "normal", material.hasEmissiveTexture && "emissive"].filter(Boolean).join(", ") || "none"}</div>
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>

                    <ExpandableSection title="Texture details" count={report.textures?.length || 0}>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(report.textures || []).map((texture) => (
                          <div key={texture.index} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-gray-400">
                            <div className="font-bold text-white">{texture.name}</div>
                            <div>{texture.mimeType || "unknown"} · {formatBytes(texture.byteSize)}</div>
                            <div>{texture.width && texture.height ? `${texture.width} x ${texture.height}` : "Dimensions unavailable"}</div>
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>

                    <ExpandableSection title="Structural features" count="checked">
                      <div className="grid gap-2 md:grid-cols-2">
                        {Object.entries(report.features || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm">
                            <span className="text-gray-400">{key}</span>
                            <span className={value ? "text-[#00f5d4]" : "text-gray-600"}>{value ? "Yes" : "No"}</span>
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <NexusRBXFooter />
    </div>
  );
}
