import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, ImageIcon, Library, RefreshCw, RotateCcw, Sparkles } from "../lib/icons";
import { Button } from "../components/ui";
import AssetLifecycleBadge from "../components/assets/AssetLifecycleBadge";
import AssetLifecycleTimeline from "../components/assets/AssetLifecycleTimeline";
import CanonicalAssetPreview from "../components/assets/CanonicalAssetPreview";
import AssetStyleSummary from "../components/assets/AssetStyleSummary";
import { AssetErrorState, AssetGridSkeleton } from "../components/assets/AssetCollectionState";
import {
  archiveAsset,
  attachAssetToProject,
  canAssetPlatformAction,
  formatAssetPlatformError,
  getAsset,
  getAssetPlatformCapabilities,
  getAssetPlatformContext,
  getAssetPack,
  getRobloxUploadStatus,
  implementAssetInStudio,
  listStyleProfiles,
  normalizeAsset,
  publishAssetToRoblox,
  validateAsset,
  verifyAssetInStudio,
} from "../lib/assetPlatformApi";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import "../components/assets/assetPlatform.css";

const POLL_STATES = new Set([
  "upload_pending",
  "publishing",
  "uploading",
  "submitted",
  "roblox_processing",
  "under_moderation",
  "moderation_pending",
]);
const POLL_MODERATION_STATES = new Set(["pending", "moderation_pending"]);
const STUDIO_ASSET_TARGETS = Object.freeze({
  ImageLabel: ["Image"],
  ImageButton: ["Image"],
  Decal: ["Texture"],
  Texture: ["Texture"],
  MeshPart: ["MeshId", "TextureID"],
  SpecialMesh: ["MeshId", "TextureId"],
  Sound: ["SoundId"],
  Animation: ["AnimationId"],
});

function displayValue(value, fallback = "Not assigned") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function referenceLabel(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "Unknown reference";
  return String(value.name || value.displayName || value.path || value.fileId || value.assetId || value.id || value.type || "Stored reference");
}

function generatorUrl(mode, assetId) {
  const params = new URLSearchParams({ mode, assetId });
  return `/tools/icon-generator?${params.toString()}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function receiptTimestamp(receipt) {
  const value = receipt?.verifiedAt || receipt?.updatedAt || receipt?.queuedAt || receipt?.createdAt || 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return Date.parse(value) || 0;
}

function latestImplementationReceipt(asset) {
  return [...asArray(asset?.studioImplementationReceipts)]
    .sort((left, right) => receiptTimestamp(right) - receiptTimestamp(left))[0] || null;
}

function implementationRecordId(record = {}) {
  return String(record.commandId || record.implementationId || "").trim();
}

function implementationTarget(record = {}) {
  return String(
    record?.target?.path
      || record.instancePath
      || record.filePath
      || record.targetName
      || ""
  ).trim();
}

function implementationProperty(record = {}) {
  return String(record?.target?.property || record.property || "").trim();
}

function implementationReference(record = {}) {
  return String(record.assetReference || record.reference || "").trim();
}

function implementationHistory(asset, liveReceipt) {
  const entries = new Map();
  const receipts = [
    ...asArray(asset?.studioImplementationReceipts),
    ...(liveReceipt ? [liveReceipt] : []),
  ];

  receipts.forEach((receipt, index) => {
    if (!receipt || typeof receipt !== "object") return;
    const recordId = implementationRecordId(receipt);
    const targetPath = implementationTarget(receipt);
    const property = implementationProperty(receipt);
    const reference = implementationReference(receipt);
    const key = `receipt:${recordId || `${targetPath}:${property}:${index}`}`;
    entries.set(key, {
      key,
      recordId,
      targetPath,
      property,
      reference,
      status: String(receipt.status || receipt.state || (receipt.verified ? "verified" : "implemented")),
      verified: receipt.verified === true,
      timestamp: receiptTimestamp(receipt),
    });
  });

  asArray(asset?.studioImplementationLocations).forEach((location, index) => {
    if (!location || typeof location !== "object") return;
    const targetPath = implementationTarget(location);
    const property = implementationProperty(location);
    const reference = implementationReference(location);
    const locationId = String(location.usageId || "").trim();
    const key = `location:${locationId || `${targetPath}:${property}:${index}`}`;
    entries.set(key, {
      key,
      recordId: "",
      targetPath,
      property,
      reference,
      status: location.verified ? "verified" : "implemented",
      verified: location.verified === true,
      timestamp: receiptTimestamp(location),
    });
  });

  return [...entries.values()].sort((left, right) => right.timestamp - left.timestamp);
}

function formatReceiptTime(timestamp) {
  if (!timestamp) return "Time not recorded";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch (_error) {
    return "Time not recorded";
  }
}

function projectRecordId(project) {
  return String(project?.projectId || project?.id || "");
}

function toolOutput(response) {
  const result = response?.output || response?.result || response || {};
  const data = result?.data && typeof result.data === "object" ? result.data : {};
  return { ...result, ...data };
}

function assetFromToolResponse(response) {
  const output = toolOutput(response);
  const candidate = response?.asset
    || output?.asset
    || ((output?.assetId || output?.nexusAssetId) ? output : null);
  return candidate ? normalizeAsset(candidate) : null;
}

export default function AssetDetailPage() {
  const { assetId = "" } = useParams();
  const navigate = useNavigate();
  const { user, authReady } = useBilling();
  const { settings } = useSettings();
  const [asset, setAsset] = useState(null);
  const [pack, setPack] = useState(null);
  const [styleProfile, setStyleProfile] = useState(null);
  const [context, setContext] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [attachProjectId, setAttachProjectId] = useState("");
  const [studioTarget, setStudioTarget] = useState("");
  const [studioClassName, setStudioClassName] = useState("ImageLabel");
  const [studioProperty, setStudioProperty] = useState("Image");
  const [implementationReceipt, setImplementationReceipt] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (authReady && !user) navigate("/signin", { replace: true, state: { from: `/assets/${assetId}` } });
  }, [authReady, user, navigate, assetId]);

  const loadAsset = useCallback(async () => {
    if (!user || !assetId) return;
    setLoading(true);
    setError("");
    setImplementationReceipt(null);
    try {
      const response = await getAsset(assetId);
      const nextAsset = response.asset;
      setAsset(nextAsset);
      setImplementationReceipt(latestImplementationReceipt(nextAsset));

      const [packResult, stylesResult, contextResult] = await Promise.allSettled([
        nextAsset.packId ? getAssetPack(nextAsset.packId) : Promise.resolve(null),
        nextAsset.sourceProjectId ? listStyleProfiles({ projectId: nextAsset.sourceProjectId }) : Promise.resolve({ styleProfiles: [] }),
        getAssetPlatformContext({ projectId: nextAsset.sourceProjectId }),
      ]);
      if (packResult.status === "fulfilled" && packResult.value?.pack) setPack(packResult.value.pack);
      else setPack(null);
      if (stylesResult.status === "fulfilled") {
        setStyleProfile(stylesResult.value.styleProfiles.find((profile) => profile.styleProfileId === nextAsset.styleProfileId) || null);
      } else {
        setStyleProfile(null);
      }
      setContext(contextResult.status === "fulfilled" ? (contextResult.value?.context || contextResult.value || {}) : {});
    } catch (loadError) {
      setAsset(null);
      setError(formatAssetPlatformError(loadError, "Asset details could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [user, assetId]);

  useEffect(() => {
    if (user) loadAsset();
  }, [user, loadAsset]);

  const lifecycle = String(asset?.lifecycle || "draft").toLowerCase();
  const moderationState = String(asset?.moderation?.state || "").toLowerCase();
  const canPoll = POLL_STATES.has(lifecycle) || POLL_MODERATION_STATES.has(moderationState);
  const capabilities = useMemo(() => getAssetPlatformCapabilities(context), [context]);
  const projects = useMemo(() => {
    const available = asArray(context.projects || context.availableProjects);
    return available.length ? available : (context.project ? [context.project] : []);
  }, [context]);
  const relatedFiles = useMemo(() => Array.isArray(asset?.relatedFileRefs) ? asset.relatedFileRefs : [], [asset]);
  const relatedUi = useMemo(() => Array.isArray(asset?.relatedUiElements) ? asset.relatedUiElements : [], [asset]);
  const canGenerate = canAssetPlatformAction(capabilities, "generate_asset")
    || canAssetPlatformAction(capabilities, "generate_asset_pack")
    || canAssetPlatformAction(capabilities, "generate_asset_variation");
  const canGenerateVariation = canAssetPlatformAction(capabilities, "generate_asset_variation");
  const canValidate = canAssetPlatformAction(capabilities, "validate_asset");
  const canPublish = canAssetPlatformAction(capabilities, "publish_asset_to_roblox");
  const canRefreshStatus = canAssetPlatformAction(capabilities, "get_roblox_upload_status");
  const canAttach = canAssetPlatformAction(capabilities, "attach_asset_to_project");
  const canImplement = canAssetPlatformAction(capabilities, "implement_asset_in_studio");
  const canVerify = canAssetPlatformAction(capabilities, "verify_asset_in_studio");
  const canArchive = canAssetPlatformAction(capabilities, "archive_asset");
  const hasMutationAction = canGenerate || canValidate || canPublish || canAttach || canImplement || canArchive;
  const studioHistory = useMemo(
    () => implementationHistory(asset, implementationReceipt),
    [asset, implementationReceipt]
  );
  const verificationReceipt = useMemo(() => {
    if (implementationRecordId(implementationReceipt || {})) return implementationReceipt;
    return latestImplementationReceipt(asset);
  }, [asset, implementationReceipt]);
  const verificationId = implementationRecordId(verificationReceipt || {});
  const studioProperties = useMemo(
    () => STUDIO_ASSET_TARGETS[studioClassName] || [],
    [studioClassName]
  );

  useEffect(() => {
    if (!studioProperties.includes(studioProperty)) {
      setStudioProperty(studioProperties[0] || "");
    }
  }, [studioProperties, studioProperty]);

  useEffect(() => {
    const ids = projects.map(projectRecordId).filter(Boolean);
    setAttachProjectId((current) => {
      if (current && ids.includes(current)) return current;
      if (asset?.sourceProjectId && ids.includes(asset.sourceProjectId)) return asset.sourceProjectId;
      return ids[0] || asset?.sourceProjectId || "";
    });
  }, [asset?.sourceProjectId, projects]);

  const copyIdentifier = async (value, label) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setError("Clipboard access is unavailable. Select the identifier and copy it manually.");
      return;
    }
    try {
      await navigator.clipboard.writeText(String(value));
      setError("");
      setNotice(`${label} copied.`);
    } catch (_copyError) {
      setError("Clipboard access was denied. Select the identifier and copy it manually.");
    }
  };

  const runAssetAction = async ({
    actionName,
    busyKey = actionName,
    request,
    successMessage,
    failureMessage,
    requiresUploadConsent = false,
    refreshRecord = true,
    onSuccess,
  }) => {
    if (!asset?.assetId) return;
    if (!canAssetPlatformAction(capabilities, actionName)) {
      setError("This asset action is not available for the current project and connection.");
      return;
    }
    if (requiresUploadConsent && !settings.robloxAssetUploadsEnabled) {
      setError("Auto Upload Assets is off. Enable it in Roblox settings before publishing. The Nexus asset remains saved.");
      return;
    }
    setBusyAction(busyKey);
    setError("");
    setNotice("");
    try {
      const response = await request();
      const nextAsset = assetFromToolResponse(response);
      let updatedAsset = nextAsset?.assetId ? nextAsset : null;
      if (refreshRecord) {
        const refreshed = await getAsset(asset.assetId);
        updatedAsset = refreshed.asset || updatedAsset;
      }
      if (updatedAsset?.assetId) {
        setAsset(updatedAsset);
        const storedReceipt = latestImplementationReceipt(updatedAsset);
        if (storedReceipt) setImplementationReceipt(storedReceipt);
      }
      onSuccess?.(toolOutput(response), response);
      setNotice(successMessage);
    } catch (actionError) {
      setError(formatAssetPlatformError(actionError, failureMessage));
    } finally {
      setBusyAction("");
    }
  };

  if (!authReady || !user || loading) {
    return (
      <main className="asset-platform-page">
        <div className="asset-platform-shell">
          <header className="asset-platform-header"><div><p className="asset-eyebrow"><ImageIcon /> Nexus asset platform</p><h1>Asset details</h1><p>Loading the canonical record and its Roblox relationship.</p></div></header>
          <AssetGridSkeleton count={4} label="Loading asset details" />
        </div>
      </main>
    );
  }

  if (!asset) {
    return (
      <main className="asset-platform-page">
        <div className="asset-platform-shell">
          <header className="asset-platform-header">
            <div><p className="asset-eyebrow"><ImageIcon /> Nexus asset platform</p><h1>Asset details</h1><p>This record is unavailable or outside your project access.</p></div>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate("/assets")}>Asset library</Button>
          </header>
          <AssetErrorState message={error} onRetry={loadAsset} />
        </div>
      </main>
    );
  }

  return (
    <main className="asset-platform-page">
      <div className="asset-platform-shell">
        <header className="asset-platform-header">
          <div>
            <p className="asset-eyebrow"><ImageIcon aria-hidden="true" /> Canonical asset record</p>
            <h1>{asset.name}</h1>
            <p>Nexus owns this stable record. Its Roblox relationship is tracked separately and may remain pending during upload or moderation.</p>
          </div>
          <div className="asset-platform-header__actions">
            <Button variant="ghost" icon={Library} onClick={() => navigate("/assets")}>Asset library</Button>
            {canGenerate ? <Button icon={Sparkles} onClick={() => navigate("/tools/icon-generator")}>Generate assets</Button> : null}
          </div>
        </header>

        {!hasMutationAction ? <div className="asset-inline-notice" role="status">This canonical record is available in read-only mode. Actions appear only when the server advertises the matching project capability.</div> : null}
        {error ? <div className="asset-inline-notice asset-inline-notice--error" role="alert">{error}</div> : null}
        {notice ? <div className="asset-inline-notice asset-inline-notice--success" role="status">{notice}</div> : null}

        <div className="asset-detail-layout" style={{ marginTop: error || notice ? 14 : 0 }}>
          <aside className="asset-detail-preview">
            <div className="asset-detail-preview__canvas">
              <CanonicalAssetPreview asset={asset} />
            </div>
            <div className="asset-detail-preview__meta">
              <div>
                <p className="asset-card__kind">{asset.kind}</p>
                <h1>{asset.name}</h1>
              </div>
              <div className="asset-detail-preview__badges">
                <AssetLifecycleBadge status={asset.lifecycle} />
                {moderationState && moderationState !== lifecycle ? <AssetLifecycleBadge status={moderationState} /> : null}
                <AssetLifecycleBadge status={asset.usage?.state} />
              </div>
              <div className="asset-detail-actions">
                {canPublish && (!asset.robloxAssetId || lifecycle === "upload_failed") ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={lifecycle === "upload_failed" ? RotateCcw : Sparkles}
                    disabled={Boolean(busyAction)}
                    onClick={() => runAssetAction({
                      actionName: "publish_asset_to_roblox",
                      busyKey: "publish",
                      request: () => publishAssetToRoblox(asset.assetId),
                      successMessage: "Roblox publishing started. NexusRBX will keep tracking the operation.",
                      failureMessage: "The asset could not be published to Roblox.",
                      requiresUploadConsent: true,
                    })}
                  >
                    {busyAction === "publish" ? "Publishing…" : lifecycle === "upload_failed" ? "Retry upload" : "Publish to Roblox"}
                  </Button>
                ) : null}
                {canRefreshStatus && (canPoll || asset.robloxOperationId) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RefreshCw}
                    disabled={Boolean(busyAction)}
                    onClick={() => runAssetAction({
                      actionName: "get_roblox_upload_status",
                      busyKey: "status",
                      request: () => getRobloxUploadStatus(asset.assetId, asset.robloxOperationId ? { operationId: asset.robloxOperationId } : {}),
                      successMessage: "Roblox processing status refreshed.",
                      failureMessage: "Roblox processing status could not be refreshed.",
                    })}
                  >
                    {busyAction === "status" ? "Checking…" : "Refresh status"}
                  </Button>
                ) : null}
                {!canRefreshStatus && canPoll ? <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadAsset}>Refresh record</Button> : null}
                {canGenerateVariation ? <Button size="sm" variant="subtle" icon={Sparkles} onClick={() => navigate(generatorUrl("similar", asset.assetId))}>Create similar</Button> : null}
                {canGenerateVariation ? <Button size="sm" variant="subtle" icon={RotateCcw} onClick={() => navigate(generatorUrl("replacement", asset.assetId))}>Create replacement</Button> : null}
              </div>
            </div>
          </aside>

          <section className="asset-detail-panel asset-detail-sections">
            <article className="asset-detail-section">
              <h2>Identity and lifecycle</h2>
              <AssetLifecycleTimeline status={asset.lifecycle} />
              <dl className="asset-detail-grid">
                <div><dt>Nexus asset ID</dt><dd className="asset-id-value">{displayValue(asset.assetId)} {asset.assetId ? <button type="button" className="asset-copy-button" aria-label="Copy Nexus asset ID" onClick={() => copyIdentifier(asset.assetId, "Nexus asset ID")}><Copy aria-hidden="true" /></button> : null}</dd></div>
                <div><dt>Roblox asset ID</dt><dd className="asset-id-value">{displayValue(asset.robloxAssetId, "Pending assignment")} {asset.robloxAssetId ? <button type="button" className="asset-copy-button" aria-label="Copy Roblox asset ID" onClick={() => copyIdentifier(asset.robloxAssetId, "Roblox asset ID")}><Copy aria-hidden="true" /></button> : null}</dd></div>
                <div><dt>Roblox operation</dt><dd>{displayValue(asset.robloxOperationId, "Not started")}</dd></div>
                <div><dt>Generation</dt><dd>{displayValue(asset.generationStatus, asset.lifecycle)}</dd></div>
                <div><dt>Roblox upload</dt><dd>{displayValue(asset.uploadStatus, "Not started")}</dd></div>
                <div><dt>Moderation</dt><dd>{displayValue(asset.moderation?.state, "Not submitted")}</dd></div>
                <div><dt>Usage</dt><dd>{displayValue(asset.usage?.state, "Unused")}</dd></div>
                <div><dt>Created</dt><dd>{displayValue(asset.createdAt)}</dd></div>
                <div><dt>Last updated</dt><dd>{displayValue(asset.updatedAt)}</dd></div>
                <div><dt>Last used</dt><dd>{displayValue(asset.lastUsedAt, "Not used yet")}</dd></div>
              </dl>
            </article>

            <article className="asset-detail-section">
              <h2>Generation brief</h2>
              <p>{asset.prompt || "No generation brief was stored for this record."}</p>
            </article>

            <AssetStyleSummary profile={styleProfile} />

            {(canValidate || (canPublish && !asset.robloxAssetId) || canRefreshStatus || canArchive) ? (
              <article className="asset-detail-section">
                <h2>Asset actions</h2>
                <p>Each action is authorized server-side against this exact asset and the active Roblox connection.</p>
                <div className="asset-detail-action-buttons">
                  {canValidate ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(busyAction)}
                      onClick={() => runAssetAction({
                        actionName: "validate_asset",
                        busyKey: "validate",
                        request: () => validateAsset(asset.assetId),
                        successMessage: "Asset validation completed.",
                        failureMessage: "The asset could not be validated.",
                      })}
                    >
                      {busyAction === "validate" ? "Validating…" : "Validate asset"}
                    </Button>
                  ) : null}
                  {canPublish && !asset.robloxAssetId ? (
                    <Button
                      size="sm"
                      disabled={Boolean(busyAction)}
                      onClick={() => runAssetAction({
                        actionName: "publish_asset_to_roblox",
                        busyKey: "publish",
                        request: () => publishAssetToRoblox(asset.assetId),
                        successMessage: "Roblox publishing started. NexusRBX will keep tracking the operation.",
                        failureMessage: "The asset could not be published to Roblox.",
                        requiresUploadConsent: true,
                      })}
                    >
                      {busyAction === "publish" ? "Publishing…" : "Publish to Roblox"}
                    </Button>
                  ) : null}
                  {canRefreshStatus ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={RefreshCw}
                      disabled={Boolean(busyAction)}
                      onClick={() => runAssetAction({
                        actionName: "get_roblox_upload_status",
                        busyKey: "status",
                        request: () => getRobloxUploadStatus(asset.assetId, asset.robloxOperationId ? { operationId: asset.robloxOperationId } : {}),
                        successMessage: "Roblox processing status refreshed.",
                        failureMessage: "Roblox processing status could not be refreshed.",
                      })}
                    >
                      {busyAction === "status" ? "Checking…" : "Check Roblox status"}
                    </Button>
                  ) : null}
                  {canArchive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(busyAction)}
                      onClick={() => {
                        if (typeof window !== "undefined" && !window.confirm(`Archive ${asset.name}? Its Roblox asset will not be deleted.`)) return;
                        runAssetAction({
                          actionName: "archive_asset",
                          busyKey: "archive",
                          request: () => archiveAsset(asset.assetId),
                          successMessage: "Asset archived.",
                          failureMessage: "The asset could not be archived.",
                          refreshRecord: false,
                          onSuccess: () => navigate("/assets"),
                        });
                      }}
                    >
                      {busyAction === "archive" ? "Archiving…" : "Archive asset"}
                    </Button>
                  ) : null}
                </div>
              </article>
            ) : null}

            {canAttach ? (
              <article className="asset-detail-section">
                <h2>Project attachment</h2>
                <p>Make this canonical asset available to another authorized NexusRBX project without duplicating the Roblox upload.</p>
                <div className="asset-detail-action-row">
                  <label>
                    <span>Project</span>
                    <select className="nexus-input" value={attachProjectId} onChange={(event) => setAttachProjectId(event.target.value)}>
                      {!projects.length ? <option value={attachProjectId || ""}>{attachProjectId || "No authorized projects available"}</option> : null}
                      {projects.map((project) => <option key={projectRecordId(project)} value={projectRecordId(project)}>{project.name || project.title || projectRecordId(project)}</option>)}
                    </select>
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(busyAction) || !attachProjectId}
                    onClick={() => runAssetAction({
                      actionName: "attach_asset_to_project",
                      busyKey: "attach",
                      request: () => attachAssetToProject(asset.assetId, attachProjectId),
                      successMessage: "Asset attached to the selected project.",
                      failureMessage: "The asset could not be attached to that project.",
                    })}
                  >
                    {busyAction === "attach" ? "Attaching…" : "Attach asset"}
                  </Button>
                </div>
              </article>
            ) : null}

            {(canImplement || canVerify || studioHistory.length > 0) ? (
              <article className="asset-detail-section">
                <h2>Studio implementation</h2>
                {asset.robloxAssetId ? (
                  <p className="asset-studio-reference">Roblox reference: <code>{`rbxassetid://${asset.robloxAssetId}`}</code></p>
                ) : (
                  <div className="asset-inline-notice" role="status">This asset is waiting for a verified Roblox asset ID before it can be implemented in Studio.</div>
                )}
                {canImplement ? (
                  <div className="asset-detail-action-grid">
                    <label>
                      <span>Target instance path</span>
                      <input className="nexus-input" value={studioTarget} onChange={(event) => setStudioTarget(event.target.value)} placeholder="StarterGui.Shop.Frame.Icon" />
                    </label>
                    <label>
                      <span>Instance class</span>
                      <select className="nexus-input" value={studioClassName} onChange={(event) => setStudioClassName(event.target.value)}>
                        {Object.keys(STUDIO_ASSET_TARGETS).map((className) => <option key={className} value={className}>{className}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Property</span>
                      <select className="nexus-input" value={studioProperty} onChange={(event) => setStudioProperty(event.target.value)}>
                        {studioProperties.map((property) => <option key={property} value={property}>{property}</option>)}
                      </select>
                    </label>
                  </div>
                ) : null}
                <div className="asset-detail-action-buttons">
                  {canImplement ? (
                    <Button
                      size="sm"
                      disabled={Boolean(busyAction) || !asset.robloxAssetId || !studioTarget.trim()}
                      onClick={() => runAssetAction({
                        actionName: "implement_asset_in_studio",
                        busyKey: "implement",
                        request: () => implementAssetInStudio(asset.assetId, {
                          targets: [{
                            path: studioTarget.trim(),
                            className: studioClassName,
                            property: studioProperty,
                          }],
                        }),
                        successMessage: "The exact Roblox asset reference was queued for Studio. Verify it after Studio applies the command.",
                        failureMessage: "The asset could not be implemented in Studio.",
                        onSuccess: (output) => setImplementationReceipt(output.receipt || output.receipts?.[0] || output),
                      })}
                    >
                      {busyAction === "implement" ? "Implementing…" : "Implement in Studio"}
                    </Button>
                  ) : null}
                  {canVerify ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(busyAction) || !verificationId}
                      onClick={() => runAssetAction({
                        actionName: "verify_asset_in_studio",
                        busyKey: "verify",
                        request: () => verifyAssetInStudio(asset.assetId, verificationReceipt?.commandId
                          ? { commandId: verificationId }
                          : { implementationId: verificationId }),
                        successMessage: "Studio verified the implemented asset reference.",
                        failureMessage: "Studio could not verify this asset implementation.",
                        onSuccess: (output) => setImplementationReceipt(output.receipt || output.receipts?.[0] || output),
                      })}
                    >
                      {busyAction === "verify" ? "Verifying…" : "Verify in Studio"}
                    </Button>
                  ) : null}
                </div>
                {canVerify && !verificationId ? <p className="asset-detail-help">No stored Studio command receipt is available yet. Implement the asset before requesting verification.</p> : null}
                {implementationReceipt ? (
                  <dl className="asset-studio-receipt" aria-label="Studio verification receipt">
                    <div><dt>Status</dt><dd>{displayValue(implementationReceipt.status || implementationReceipt.state, "Completed")}</dd></div>
                    <div><dt>Command</dt><dd>{displayValue(implementationReceipt.commandId || implementationReceipt.implementationId)}</dd></div>
                    <div><dt>Changed instances</dt><dd>{asArray(implementationReceipt.changedInstances || implementationReceipt.instances || implementationReceipt.implementationLocations).map(referenceLabel).join(", ") || studioTarget}</dd></div>
                  </dl>
                ) : null}
                {studioHistory.length ? (
                  <section className="asset-studio-history" aria-labelledby="asset-studio-history-heading">
                    <h3 id="asset-studio-history-heading">Implementation history</h3>
                    <ul>
                      {studioHistory.map((entry) => (
                        <li key={entry.key}>
                          <div>
                            <strong>{entry.targetPath || "Studio command"}</strong>
                            <span>{[entry.property, entry.reference].filter(Boolean).join(" · ") || "Target details unavailable"}</span>
                          </div>
                          <div className="asset-studio-history__status">
                            <span>{entry.verified ? "Verified" : displayValue(entry.status, "Implemented")}</span>
                            <time dateTime={entry.timestamp ? new Date(entry.timestamp).toISOString() : undefined}>{formatReceiptTime(entry.timestamp)}</time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </article>
            ) : null}

            <article className="asset-detail-section">
              <h2>Ownership and visibility</h2>
              <dl className="asset-detail-grid">
                <div><dt>Source project</dt><dd>{displayValue(asset.sourceProjectId)}</dd></div>
                <div><dt>Universe</dt><dd>{displayValue(asset.universeId)}</dd></div>
                <div><dt>Roblox creator</dt><dd>{asset.creator?.id ? `${asset.creator.name || asset.creator.type || "Creator"} (${asset.creator.id})` : "Not selected"}</dd></div>
                <div><dt>Pack</dt><dd>{pack ? `${pack.name} (${pack.packId})` : displayValue(asset.packId)}</dd></div>
                <div><dt>Style profile</dt><dd>{styleProfile ? `${styleProfile.name} (${styleProfile.styleProfileId})` : displayValue(asset.styleProfileId)}</dd></div>
                <div><dt>Visibility</dt><dd>{displayValue(asset.visibility, "Project only")}</dd></div>
              </dl>
            </article>

            <details className="asset-detail-section asset-detail-disclosure">
              <summary>File, generation, and recovery details</summary>
              <dl className="asset-detail-grid">
                <div><dt>Format</dt><dd>{displayValue(asset.fileFormat || asset.mimeType)}</dd></div>
                <div><dt>Dimensions</dt><dd>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Not recorded"}</dd></div>
                <div><dt>Transparency</dt><dd>{displayValue(asset.hasTransparency, "Not recorded")}</dd></div>
                <div><dt>File size</dt><dd>{asset.fileSize ? `${Math.ceil(asset.fileSize / 1024)} KB` : "Not recorded"}</dd></div>
                <div><dt>Generation model</dt><dd>{displayValue(asset.generationModel || asset.generationProvider)}</dd></div>
                <div><dt>Conversation</dt><dd>{displayValue(asset.conversationId)}</dd></div>
                <div><dt>Failure code</dt><dd>{displayValue(asset.failure?.code, "No failure")}</dd></div>
                <div><dt>Recovery</dt><dd>{displayValue(asset.failure?.recovery || asset.failure?.message, "No recovery action required")}</dd></div>
              </dl>
            </details>

            <article className="asset-detail-section">
              <h2>Project relationships</h2>
              <dl className="asset-detail-grid" style={{ marginBottom: 12 }}>
                <div><dt>Supersedes</dt><dd>{asset.supersedesAssetId ? <button type="button" className="asset-link-button" onClick={() => navigate(`/assets/${encodeURIComponent(asset.supersedesAssetId)}`)}>{asset.supersedesAssetId}</button> : "No earlier asset"}</dd></div>
                <div><dt>Replaced by</dt><dd>{asset.replacedByAssetId ? <button type="button" className="asset-link-button" onClick={() => navigate(`/assets/${encodeURIComponent(asset.replacedByAssetId)}`)}>{asset.replacedByAssetId}</button> : "No replacement"}</dd></div>
              </dl>
              <h2>Related files</h2>
              {relatedFiles.length ? <ul className="asset-detail-list">{relatedFiles.map((value, index) => <li key={`${referenceLabel(value)}-${index}`}>{referenceLabel(value)}</li>)}</ul> : <p>No project files are linked to this asset.</p>}
              <h2 style={{ marginTop: 16 }}>Related UI elements</h2>
              {relatedUi.length ? <ul className="asset-detail-list">{relatedUi.map((value, index) => <li key={`${referenceLabel(value)}-${index}`}>{referenceLabel(value)}</li>)}</ul> : <p>No UI elements are linked to this asset.</p>}
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
