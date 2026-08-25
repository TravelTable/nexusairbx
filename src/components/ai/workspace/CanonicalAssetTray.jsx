import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CloudUpload, Copy, ImageIcon, Loader2, RefreshCw, ShieldAlert } from "lib/icons";
import AssetLifecycleBadge from "../../assets/AssetLifecycleBadge";
import CanonicalAssetPreview from "../../assets/CanonicalAssetPreview";
import {
  ASSET_PLATFORM_READS_ENABLED,
  formatAssetPlatformError,
  getRobloxUploadStatus,
  listAssets,
  publishAssetToRoblox,
} from "../../../lib/assetPlatformApi";

const ACTIVE_UPLOAD_STATES = new Set([
  "upload_pending",
  "publishing",
  "uploading",
  "submitted",
  "operation_pending",
  "roblox_processing",
  "under_moderation",
  "moderation_pending",
]);

const RETRYABLE_UPLOAD_STATES = new Set([
  "approved",
  "ready_to_publish",
  "upload_failed",
  "failed",
]);

function normalizedState(asset) {
  return String(asset?.lifecycle || asset?.uploadStatus || "draft").trim().toLowerCase();
}

function assetLabel(asset) {
  return asset?.name || asset?.displayName || asset?.assetId || "Asset";
}

function creatorTarget(selectedCreator) {
  const rawType = String(selectedCreator?.type || selectedCreator?.creatorType || "").trim().toLowerCase();
  const id = String(selectedCreator?.id || selectedCreator?.creatorId || "").trim();
  const type = rawType === "user" ? "User" : rawType === "group" ? "Group" : "";
  return type && /^[1-9]\d*$/.test(id) ? { type, id } : null;
}

function creatorLabel(selectedCreator) {
  const target = creatorTarget(selectedCreator);
  if (!target) return "Roblox destination resolves from the selected project";
  return `${target.type} ${target.id}`;
}

export default function CanonicalAssetTray({
  projectId,
  enabled = ASSET_PLATFORM_READS_ENABLED,
  robloxConnected = false,
  uploadAvailable = false,
  assetUploadsEnabled = false,
  selectedCreator = null,
  notify,
}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copiedAssetId, setCopiedAssetId] = useState("");

  const writesAuthorized = Boolean(assetUploadsEnabled && uploadAvailable && robloxConnected);
  const retryableUploads = useMemo(() => assets.filter((asset) => {
    if (asset.robloxAssetId || asset?.failure?.retryable === false) return false;
    return RETRYABLE_UPLOAD_STATES.has(normalizedState(asset))
      || RETRYABLE_UPLOAD_STATES.has(String(asset.uploadStatus || "").toLowerCase());
  }), [assets]);
  const pendingUploads = useMemo(() => assets.filter((asset) => (
    ACTIVE_UPLOAD_STATES.has(normalizedState(asset))
      || ACTIVE_UPLOAD_STATES.has(String(asset.uploadStatus || "").toLowerCase())
  )), [assets]);

  const load = useCallback(async () => {
    if (!enabled || !projectId) return;
    setLoading(true);
    setError("");
    try {
      const result = await listAssets({
        scope: "project",
        projectId,
        sort: "updated_desc",
        limit: 8,
      });
      setAssets(Array.isArray(result?.assets) ? result.assets : []);
    } catch (loadError) {
      setError(formatAssetPlatformError(loadError, "Generated Nexus assets could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    setAssets([]);
    setCopiedAssetId("");
    if (enabled && projectId) load();
  }, [enabled, load, projectId]);

  const copyAssetReference = useCallback(async (assetId, assetReference) => {
    if (!assetReference || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setError("Clipboard access is unavailable. Select the Roblox asset reference and copy it manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(assetReference);
      setError("");
      setCopiedAssetId(assetId);
    } catch {
      setError("Clipboard access was denied. Select the Roblox asset reference and copy it manually.");
    }
  }, []);

  const runBatch = useCallback(async (kind, items, action) => {
    if (!projectId || !items.length) return;
    setBusy(kind);
    setError("");
    try {
      const results = await Promise.allSettled(items.map(action));
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length) {
        const firstFailure = failures[0].reason;
        const baseMessage = formatAssetPlatformError(firstFailure, "The asset action could not be completed.");
        throw Object.assign(new Error(baseMessage), {
          summary: failures.length > 1 ? `${baseMessage} ${failures.length} assets need attention.` : baseMessage,
        });
      }
      notify?.({ type: "success", message: kind === "publish" ? "Roblox publishing started" : "Roblox status updated" });
    } catch (actionError) {
      const message = actionError?.summary || formatAssetPlatformError(actionError, "The asset action could not be completed.");
      setError(message);
      notify?.({ type: "error", message });
    } finally {
      await load();
      setBusy("");
    }
  }, [load, notify, projectId]);

  const publishAssets = useCallback(() => {
    if (!writesAuthorized) return;
    const target = creatorTarget(selectedCreator);
    return runBatch("publish", retryableUploads, (asset) => publishAssetToRoblox(asset.assetId, {
      projectId,
      ...(asset.universeId ? { universeId: asset.universeId } : {}),
      ...(target ? { creatorTarget: target } : {}),
    }));
  }, [projectId, retryableUploads, runBatch, selectedCreator, writesAuthorized]);

  const pollUploads = useCallback(() => runBatch("poll", pendingUploads, (asset) => getRobloxUploadStatus(
    asset.assetId,
    {
      projectId,
      ...(asset.robloxOperationId ? { operationId: asset.robloxOperationId } : {}),
    }
  )), [pendingUploads, projectId, runBatch]);

  if (!enabled || !projectId) return null;

  return (
    <section
      className="mx-3 mb-3 overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)]"
      aria-labelledby="canonical-project-assets-heading"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ds-border-subtle)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[var(--ds-text-muted)]" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="canonical-project-assets-heading" className="text-[11px] font-black uppercase tracking-widest text-[var(--ds-text)]">
              Generated Nexus assets
            </h2>
            <div className="truncate text-[10px] text-[var(--ds-text-muted)]">{creatorLabel(selectedCreator)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || Boolean(busy)}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md border border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            title="Refresh generated assets"
            aria-label="Refresh generated assets"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={publishAssets}
            disabled={!writesAuthorized || !retryableUploads.length || Boolean(busy)}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-md border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2 py-1 text-[10px] font-bold text-[var(--ds-accent)] transition-colors hover:bg-[var(--ds-fill-hover)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            title="Retry eligible Roblox uploads"
          >
            {busy === "publish" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
            Retry upload
          </button>
          <button
            type="button"
            onClick={pollUploads}
            disabled={!pendingUploads.length || Boolean(busy)}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-md border border-[var(--ds-border-subtle)] px-2 py-1 text-[10px] font-bold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            title="Refresh pending Roblox operations"
          >
            {busy === "poll" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Poll
          </button>
        </div>
      </div>

      {!assetUploadsEnabled && retryableUploads.length > 0 ? (
        <div className="border-b border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--ds-warning)]">
          Auto Upload Assets is off. Generated assets stay in NexusRBX until you enable it.
        </div>
      ) : null}
      {assetUploadsEnabled && !robloxConnected && retryableUploads.length > 0 ? (
        <div className="border-b border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--ds-warning)]">
          Reconnect Roblox to restore asset publishing.
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--ds-danger)]" role="alert">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
        </div>
      ) : null}

      {loading && assets.length === 0 ? (
        <div className="px-3 py-6 text-center text-[11px] text-[var(--ds-text-secondary)]" role="status">
          Loading generated assets…
        </div>
      ) : null}
      {!loading && !error && assets.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-semibold text-[var(--ds-text-secondary)]">No generated Nexus assets in this project yet.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">Assets created by NexusRBX will appear here with publishing status.</p>
        </div>
      ) : null}

      {assets.length ? (
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {assets.map((asset) => {
            const lifecycle = normalizedState(asset);
            const robloxAssetId = String(asset.robloxAssetId || "").trim();
            const assetReference = /^[1-9]\d*$/.test(robloxAssetId) ? `rbxassetid://${robloxAssetId}` : "";
            const uploadError = asset?.failure?.message || asset?.failure?.summary || "";
            return (
              <article key={asset.assetId} className="min-w-0 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2">
                <CanonicalAssetPreview
                  asset={asset}
                  alt={`${assetLabel(asset)} preview`}
                  className="h-24 overflow-hidden rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)]"
                  imageClassName="h-full w-full object-contain"
                />
                <div className="mt-2 min-w-0">
                  <div className="truncate text-[11px] font-bold text-[var(--ds-text)]" title={assetLabel(asset)}>{assetLabel(asset)}</div>
                  <div className="truncate text-[10px] text-[var(--ds-text-muted)]">{asset.kind || "asset"}</div>
                </div>
                <AssetLifecycleBadge status={lifecycle} className="mt-2" />
                {uploadError ? <div className="mt-2 text-[10px] leading-snug text-[var(--ds-danger)]">{uploadError}</div> : null}
                {assetReference ? (
                  <button
                    type="button"
                    onClick={() => copyAssetReference(asset.assetId, assetReference)}
                    className="mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2 py-1 text-[10px] font-bold text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text)] focus-ring"
                    title={assetReference}
                    aria-label={copiedAssetId === asset.assetId
                      ? `${assetLabel(asset)} Roblox asset URI copied`
                      : `Copy ${assetLabel(asset)} Roblox asset URI`}
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    {copiedAssetId === asset.assetId ? "Copied" : "Copy URI"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {copiedAssetId ? `${assetLabel(assets.find((asset) => asset.assetId === copiedAssetId))} Roblox asset URI copied.` : ""}
      </span>
    </section>
  );
}
