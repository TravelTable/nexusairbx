import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Library, RefreshCw, RotateCcw, Sparkles } from "../lib/icons";
import { Button } from "../components/ui";
import AssetLifecycleBadge from "../components/assets/AssetLifecycleBadge";
import AssetStyleSummary from "../components/assets/AssetStyleSummary";
import { AssetErrorState, AssetGridSkeleton } from "../components/assets/AssetCollectionState";
import {
  ASSET_PLATFORM_WRITES_ENABLED,
  formatAssetPlatformError,
  getAsset,
  getAssetPack,
  listStyleProfiles,
  normalizeAsset,
  pollAssetStatus,
  retryAssetUpload,
  updateAssetVisibility,
} from "../lib/assetPlatformApi";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import "../components/assets/assetPlatform.css";

const POLL_STATES = new Set(["uploading", "submitted", "moderation_pending"]);
const POLL_MODERATION_STATES = new Set(["pending", "moderation_pending"]);

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

export default function AssetDetailPage() {
  const { assetId = "" } = useParams();
  const navigate = useNavigate();
  const { user, authReady } = useBilling();
  const { settings } = useSettings();
  const [asset, setAsset] = useState(null);
  const [pack, setPack] = useState(null);
  const [styleProfile, setStyleProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [visibility, setVisibility] = useState("project");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (authReady && !user) navigate("/signin", { replace: true, state: { from: `/assets/${assetId}` } });
  }, [authReady, user, navigate, assetId]);

  const loadAsset = useCallback(async () => {
    if (!user || !assetId) return;
    setLoading(true);
    setError("");
    try {
      const response = await getAsset(assetId);
      const nextAsset = response.asset;
      setAsset(nextAsset);
      setVisibility(nextAsset.visibility || "project");

      const [packResult, stylesResult] = await Promise.allSettled([
        nextAsset.packId ? getAssetPack(nextAsset.packId) : Promise.resolve(null),
        nextAsset.sourceProjectId ? listStyleProfiles({ projectId: nextAsset.sourceProjectId }) : Promise.resolve({ styleProfiles: [] }),
      ]);
      if (packResult.status === "fulfilled" && packResult.value?.pack) setPack(packResult.value.pack);
      else setPack(null);
      if (stylesResult.status === "fulfilled") {
        setStyleProfile(stylesResult.value.styleProfiles.find((profile) => profile.styleProfileId === nextAsset.styleProfileId) || null);
      } else {
        setStyleProfile(null);
      }
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
  const relatedFiles = useMemo(() => Array.isArray(asset?.relatedFileRefs) ? asset.relatedFileRefs : [], [asset]);
  const relatedUi = useMemo(() => Array.isArray(asset?.relatedUiElements) ? asset.relatedUiElements : [], [asset]);

  const runAssetAction = async (action, request) => {
    if (!asset?.assetId) return;
    if (!ASSET_PLATFORM_WRITES_ENABLED) {
      setError("Asset mutations remain unavailable while the Prompt 2 catalog is in read-only rollout.");
      return;
    }
    if (action === "retry" && !settings.robloxAssetUploadsEnabled) {
      setError("Auto Upload Assets is off. Enable it in Roblox settings before retrying a Roblox write. The Nexus asset remains saved.");
      return;
    }
    setBusyAction(action);
    setError("");
    setNotice("");
    try {
      const response = await request(asset.assetId);
      const nextAsset = normalizeAsset(response?.asset || response);
      if (nextAsset.assetId) {
        setAsset(nextAsset);
        setVisibility(nextAsset.visibility || "project");
      }
      setNotice(action === "retry" ? "Roblox upload retry queued. This Nexus record remains available while it runs." : "Asset status refreshed.");
    } catch (actionError) {
      setError(formatAssetPlatformError(actionError, action === "retry" ? "Roblox upload could not be retried." : "Asset status could not be refreshed."));
    } finally {
      setBusyAction("");
    }
  };

  const saveVisibility = async () => {
    if (!asset?.assetId || visibility === asset.visibility) return;
    if (!ASSET_PLATFORM_WRITES_ENABLED) {
      setError("Visibility changes remain unavailable while the Prompt 2 catalog is in read-only rollout.");
      return;
    }
    setBusyAction("visibility");
    setError("");
    try {
      const response = await updateAssetVisibility(asset.assetId, visibility);
      const nextAsset = normalizeAsset(response?.asset || response);
      setAsset(nextAsset.assetId ? nextAsset : { ...asset, visibility });
      setNotice("Asset visibility updated.");
    } catch (saveError) {
      setVisibility(asset.visibility || "project");
      setError(formatAssetPlatformError(saveError, "Asset visibility could not be updated."));
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
            {ASSET_PLATFORM_WRITES_ENABLED ? <Button icon={Sparkles} onClick={() => navigate("/tools/icon-generator")}>Generate assets</Button> : null}
          </div>
        </header>

        {!ASSET_PLATFORM_WRITES_ENABLED ? <div className="asset-inline-notice" role="status">This canonical record is read-only. Generation, upload retries, polling writes, replacement, and visibility changes remain disabled.</div> : null}
        {error ? <div className="asset-inline-notice asset-inline-notice--error" role="alert">{error}</div> : null}
        {notice ? <div className="asset-inline-notice asset-inline-notice--success" role="status">{notice}</div> : null}

        <div className="asset-detail-layout" style={{ marginTop: error || notice ? 14 : 0 }}>
          <aside className="asset-detail-preview">
            <div className="asset-detail-preview__canvas">
              {asset.previewUrl ? <img src={asset.previewUrl} alt={`${asset.name} preview`} /> : <div className="asset-card__placeholder"><ImageIcon aria-hidden="true" /><span>Preview pending</span></div>}
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
                {ASSET_PLATFORM_WRITES_ENABLED && lifecycle === "upload_failed" ? <Button size="sm" variant="secondary" icon={RotateCcw} disabled={Boolean(busyAction)} onClick={() => runAssetAction("retry", retryAssetUpload)}>{busyAction === "retry" ? "Retrying…" : "Retry upload"}</Button> : null}
                {ASSET_PLATFORM_WRITES_ENABLED && canPoll ? <Button size="sm" variant="ghost" icon={RefreshCw} disabled={Boolean(busyAction)} onClick={() => runAssetAction("poll", pollAssetStatus)}>{busyAction === "poll" ? "Checking…" : "Refresh status"}</Button> : null}
                {!ASSET_PLATFORM_WRITES_ENABLED && canPoll ? <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadAsset}>Refresh record</Button> : null}
                {ASSET_PLATFORM_WRITES_ENABLED ? <Button size="sm" variant="subtle" icon={Sparkles} onClick={() => navigate(generatorUrl("similar", asset.assetId))}>Create similar</Button> : null}
                {ASSET_PLATFORM_WRITES_ENABLED ? <Button size="sm" variant="subtle" icon={RotateCcw} onClick={() => navigate(generatorUrl("replacement", asset.assetId))}>Create replacement</Button> : null}
              </div>
            </div>
          </aside>

          <section className="asset-detail-panel asset-detail-sections">
            <article className="asset-detail-section">
              <h2>Identity and lifecycle</h2>
              <dl className="asset-detail-grid">
                <div><dt>Nexus asset ID</dt><dd>{displayValue(asset.assetId)}</dd></div>
                <div><dt>Roblox asset ID</dt><dd>{displayValue(asset.robloxAssetId, "Pending assignment")}</dd></div>
                <div><dt>Generation</dt><dd>{displayValue(asset.generationStatus, asset.lifecycle)}</dd></div>
                <div><dt>Roblox upload</dt><dd>{displayValue(asset.uploadStatus, "Not started")}</dd></div>
                <div><dt>Moderation</dt><dd>{displayValue(asset.moderation?.state, "Not submitted")}</dd></div>
                <div><dt>Usage</dt><dd>{displayValue(asset.usage?.state, "Unused")}</dd></div>
                <div><dt>Created</dt><dd>{displayValue(asset.createdAt)}</dd></div>
                <div><dt>Last updated</dt><dd>{displayValue(asset.updatedAt)}</dd></div>
              </dl>
            </article>

            <article className="asset-detail-section">
              <h2>Generation brief</h2>
              <p>{asset.prompt || "No generation brief was stored for this record."}</p>
            </article>

            <AssetStyleSummary profile={styleProfile} />

            <article className="asset-detail-section">
              <h2>Ownership and visibility</h2>
              <dl className="asset-detail-grid">
                <div><dt>Source project</dt><dd>{displayValue(asset.sourceProjectId)}</dd></div>
                <div><dt>Universe</dt><dd>{displayValue(asset.universeId)}</dd></div>
                <div><dt>Pack</dt><dd>{pack ? `${pack.name} (${pack.packId})` : displayValue(asset.packId)}</dd></div>
                <div><dt>Style profile</dt><dd>{styleProfile ? `${styleProfile.name} (${styleProfile.styleProfileId})` : displayValue(asset.styleProfileId)}</dd></div>
              </dl>
              <div className="asset-visibility-control" style={{ marginTop: 12 }}>
                <label>Visibility
                  <select className="nexus-input" value={visibility} disabled={!ASSET_PLATFORM_WRITES_ENABLED} onChange={(event) => setVisibility(event.target.value)}>
                    <option value="project">This project only</option>
                    <option value="universe_shared">Projects in this Roblox universe</option>
                    <option value="user_global">My global library (all projects)</option>
                  </select>
                  <span className="asset-field-help">{ASSET_PLATFORM_WRITES_ENABLED ? "Global access is opt-in. The source project and generation provenance remain attached to the asset." : "Visibility changes remain unavailable during the read-only rollout."}</span>
                </label>
                {ASSET_PLATFORM_WRITES_ENABLED ? <Button size="sm" variant="ghost" disabled={busyAction === "visibility" || visibility === asset.visibility} onClick={saveVisibility}>{busyAction === "visibility" ? "Saving…" : "Save visibility"}</Button> : null}
              </div>
            </article>

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
