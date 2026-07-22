import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CloudUpload, Copy, ImageIcon, Loader2, RefreshCw, ShieldAlert } from "lib/icons";
import AssetLifecycleBadge from "../../assets/AssetLifecycleBadge";
import CanonicalAssetPreview from "../../assets/CanonicalAssetPreview";
import {
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
  if (!target) return "Project creator will be resolved securely";
  return `${target.type} ${target.id}`;
}

export default function RobloxAssetTray({
  projectId,
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
    if (!projectId) return;
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
      setError(formatAssetPlatformError(loadError, "Project assets could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setAssets([]);
    setCopiedAssetId("");
    load();
  }, [load]);

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

  if (!projectId || (!loading && !error && assets.length === 0)) return null;

  return (
    <section
      className="mx-3 mb-2 rounded-lg border border-white/10 bg-black/35 backdrop-blur-xl overflow-hidden"
      aria-labelledby="project-assets-heading"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <ImageIcon className="w-4 h-4 text-[#00bbf9]" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="project-assets-heading" className="text-[11px] font-black uppercase tracking-widest text-white">Project Assets</h2>
            <div className="text-[10px] text-gray-500 truncate">{creatorLabel(selectedCreator)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={load}
            disabled={loading || Boolean(busy)}
            className="p-1.5 rounded-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40"
            title="Refresh asset library"
            aria-label="Refresh asset library"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={publishAssets}
            disabled={!writesAuthorized || !retryableUploads.length || Boolean(busy)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#00bbf9]/25 bg-[#00bbf9]/10 text-[10px] font-bold text-[#00bbf9] hover:bg-[#00bbf9]/20 disabled:opacity-40"
            title="Retry eligible Roblox uploads"
          >
            {busy === "publish" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
            Retry Upload
          </button>
          <button
            type="button"
            onClick={pollUploads}
            disabled={!pendingUploads.length || Boolean(busy)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-40"
            title="Refresh pending Roblox operations"
          >
            {busy === "poll" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Poll
          </button>
        </div>
      </div>

      {!assetUploadsEnabled && retryableUploads.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-amber-100 bg-amber-400/10 border-b border-amber-300/15">
          Auto Upload Assets is off. Assets stay in NexusRBX until you enable it.
        </div>
      )}
      {assetUploadsEnabled && !robloxConnected && retryableUploads.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-amber-100 bg-amber-400/10 border-b border-amber-300/15">
          Reconnect Roblox to restore asset publishing.
        </div>
      )}
      {error && (
        <div className="px-3 py-2 text-[11px] text-red-200 bg-red-500/10 border-b border-red-400/15 flex items-center gap-2" role="alert">
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading && assets.length === 0 && (
        <div className="px-3 py-4 text-center text-[11px] text-gray-400" role="status">
          Loading project assets…
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
        {assets.map((asset) => {
          const lifecycle = normalizedState(asset);
          const robloxAssetId = String(asset.robloxAssetId || "").trim();
          const assetReference = /^[1-9]\d*$/.test(robloxAssetId) ? `rbxassetid://${robloxAssetId}` : "";
          const uploadError = asset?.failure?.message || asset?.failure?.summary || "";
          return (
            <article key={asset.assetId} className="w-40 shrink-0 rounded-md border border-white/10 bg-white/[0.03] p-2">
              <CanonicalAssetPreview
                asset={asset}
                alt={`${assetLabel(asset)} preview`}
                className="h-20 rounded-md bg-black/35 border border-white/10 overflow-hidden"
                imageClassName="w-full h-full object-contain"
              />
              <div className="mt-2 min-w-0">
                <div className="text-[11px] font-bold text-white truncate">{assetLabel(asset)}</div>
                <div className="text-[9px] text-gray-500 truncate">{asset.kind || "asset"}</div>
              </div>
              <AssetLifecycleBadge status={lifecycle} className="mt-2" />
              {uploadError && <div className="mt-2 text-[9px] leading-snug text-red-200">{uploadError}</div>}
              {assetReference && (
                <button
                  type="button"
                  onClick={() => copyAssetReference(asset.assetId, assetReference)}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white"
                  title={assetReference}
                  aria-label={copiedAssetId === asset.assetId
                    ? `${assetLabel(asset)} Roblox asset URI copied`
                    : `Copy ${assetLabel(asset)} Roblox asset URI`}
                >
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  {copiedAssetId === asset.assetId ? "Copied" : "Copy URI"}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {copiedAssetId ? `${assetLabel(assets.find((asset) => asset.assetId === copiedAssetId))} Roblox asset URI copied.` : ""}
      </span>
    </section>
  );
}
