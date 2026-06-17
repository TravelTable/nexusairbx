import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CloudUpload, Copy, ImageIcon, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { auth } from "../../../firebase";
import {
  approveProjectAssets,
  getUiProjectState,
  listUiProjectAssets,
  refreshProjectAssetUploads,
  uploadProjectAssetsToRoblox,
} from "../../../lib/uiBuilderApi";

function statusTone(asset) {
  const uploadStatus = asset?.latestUpload?.uploadStatus || asset?.uploadStatus || "not_requested";
  if (uploadStatus === "succeeded") return "text-[#00f5d4] border-[#00f5d4]/20 bg-[#00f5d4]/10";
  if (uploadStatus === "failed") return "text-red-300 border-red-400/20 bg-red-500/10";
  if (uploadStatus === "uploading" || uploadStatus === "operation_pending") return "text-[#00bbf9] border-[#00bbf9]/20 bg-[#00bbf9]/10";
  if (asset?.approved) return "text-amber-200 border-amber-300/20 bg-amber-300/10";
  return "text-gray-400 border-white/10 bg-white/5";
}

function assetLabel(asset) {
  return asset?.subject?.replace(/_/g, " ") || asset?.logicalAssetId?.replace(/_/g, " ") || asset?.asset_id || "Asset";
}

export default function RobloxAssetTray({
  projectId,
  robloxConnected = false,
  uploadAvailable = false,
  selectedCreator = null,
  notify,
}) {
  const [assets, setAssets] = useState([]);
  const [projectRevision, setProjectRevision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const readyAssets = useMemo(() => assets.filter((asset) => asset.generationStatus !== "failed"), [assets]);
  const unapproved = useMemo(() => readyAssets.filter((asset) => !asset.approved), [readyAssets]);
  const approvedPendingUpload = useMemo(
    () => readyAssets.filter((asset) => asset.approved && !asset.latestUpload?.contentUri),
    [readyAssets]
  );
  const pendingUploads = useMemo(
    () => readyAssets.filter((asset) => ["operation_pending", "uploading", "unknown"].includes(asset.latestUpload?.uploadStatus)),
    [readyAssets]
  );

  const load = useCallback(async () => {
    if (!projectId || !auth.currentUser) return;
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const [assetData, stateData] = await Promise.all([
        listUiProjectAssets({ token, projectId }),
        getUiProjectState({ token, projectId }).catch(() => null),
      ]);
      setAssets(Array.isArray(assetData?.assets) ? assetData.assets : []);
      setProjectRevision(stateData?.state?.revision || null);
    } catch (err) {
      setError(err?.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = useCallback(async (kind, fn) => {
    if (!projectId || !auth.currentUser) return;
    setBusy(kind);
    setError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const result = await fn(token);
      if (Array.isArray(result?.assets)) setAssets(result.assets);
      await load();
      notify?.({ type: "success", message: "Asset library updated" });
    } catch (err) {
      const message = err?.message || "Asset action failed";
      setError(message);
      notify?.({ type: "error", message });
    } finally {
      setBusy("");
    }
  }, [load, notify, projectId]);

  const approveAll = () => runAction("approve", (token) => approveProjectAssets({
    token,
    projectId,
    expectedProjectRevision: projectRevision,
    assets: unapproved.map((asset) => ({
      assetId: asset.logicalAssetId || asset.asset_id,
      generationId: asset.generationId,
    })),
  }));

  const uploadApproved = () => runAction("upload", (token) => uploadProjectAssetsToRoblox({
    token,
    projectId,
    expectedProjectRevision: projectRevision,
    assetIds: approvedPendingUpload.map((asset) => asset.logicalAssetId || asset.asset_id),
    requestId: `asset-upload-${Date.now()}`,
  }));

  const refreshUploads = () => runAction("refresh", (token) => refreshProjectAssetUploads({
    token,
    projectId,
    assetIds: pendingUploads.map((asset) => asset.logicalAssetId || asset.asset_id),
  }));

  if (!projectId || (!loading && assets.length === 0)) return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-white/10 bg-black/35 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <ImageIcon className="w-4 h-4 text-[#00bbf9]" />
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-widest text-white">Project Assets</div>
            <div className="text-[10px] text-gray-500 truncate">
              {selectedCreator ? `${selectedCreator.type} ${selectedCreator.id}` : "No Roblox creator selected"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={load}
            disabled={loading || Boolean(busy)}
            className="p-1.5 rounded-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40"
            title="Refresh asset library"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={approveAll}
            disabled={!unapproved.length || Boolean(busy)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-40"
            title="Approve generated assets"
          >
            {busy === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve
          </button>
          <button
            type="button"
            onClick={uploadApproved}
            disabled={!robloxConnected || !uploadAvailable || !approvedPendingUpload.length || Boolean(busy)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#00bbf9]/25 bg-[#00bbf9]/10 text-[10px] font-bold text-[#00bbf9] hover:bg-[#00bbf9]/20 disabled:opacity-40"
            title="Upload approved assets to Roblox"
          >
            {busy === "upload" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
            Upload
          </button>
          <button
            type="button"
            onClick={refreshUploads}
            disabled={!pendingUploads.length || Boolean(busy)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-40"
            title="Refresh pending Roblox operations"
          >
            {busy === "refresh" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Poll
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 text-[11px] text-red-200 bg-red-500/10 border-b border-red-400/15 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
        {assets.map((asset) => {
          const uri = asset.latestUpload?.contentUri || asset.robloxImageId || "";
          const uploadStatus = asset.latestUpload?.uploadStatus || (asset.approved ? "approved" : "local");
          return (
            <div key={`${asset.logicalAssetId || asset.asset_id}:${asset.generationId || ""}`} className="w-40 shrink-0 rounded-md border border-white/10 bg-white/[0.03] p-2">
              <div className="h-20 rounded-md bg-black/35 border border-white/10 overflow-hidden flex items-center justify-center">
                {asset.storageUrl ? (
                  <img src={asset.storageUrl} alt={assetLabel(asset)} className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="mt-2 min-w-0">
                <div className="text-[11px] font-bold text-white truncate capitalize">{assetLabel(asset)}</div>
                <div className="text-[9px] text-gray-500 truncate">{asset.assetKind || asset.asset_type || "asset"}</div>
              </div>
              <div className={`mt-2 inline-flex max-w-full px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${statusTone(asset)}`}>
                <span className="truncate">{uploadStatus}</span>
              </div>
              {uri && uri.startsWith("rbxassetid://") && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(uri)}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white"
                  title={uri}
                >
                  <Copy className="w-3 h-3" />
                  Copy URI
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
