import { useCallback, useEffect, useState } from "react";
import {
  attachProjectAssets,
  getGeneratedAssetUploadStatus,
  listProjectAssets,
  removeProjectAsset,
  setProjectAssetUploadSettings,
} from "../lib/robloxAssetLibraryApi";

const EMPTY_UPLOAD_STATUS = { status: "idle", records: [] };
const ACTIVE_UPLOAD_STATUSES = new Set(["queued", "validating", "uploading", "processing"]);

function isAccessBlockedError(err) {
  return err?.status === 401 || err?.status === 403;
}

function messageWithRequestId(err, fallback) {
  const message = err?.message || fallback;
  return err?.requestId ? `${message} (Request ID: ${err.requestId})` : message;
}

function readDraftAssets(uid) {
  if (!uid) return [];
  try {
    const value = JSON.parse(sessionStorage.getItem(`nexusrbx:draft-assets:${uid}`) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function useProjectAssets(projectId, { enabled = true, notify, ownerUid } = {}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessBlockedError, setAccessBlockedError] = useState(null);
  const [uploadSettings, setUploadSettings] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(EMPTY_UPLOAD_STATUS);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !projectId) {
      setAssets(enabled ? readDraftAssets(ownerUid) : []);
      setUploadSettings(null);
      setUploadStatus(EMPTY_UPLOAD_STATUS);
      setAccessBlockedError(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const assetData = await listProjectAssets(projectId);
      setAssets(Array.isArray(assetData.assets) ? assetData.assets : []);
      setUploadSettings(assetData.uploadSettings || null);
      setUploadStatus(assetData.uploadStatus || EMPTY_UPLOAD_STATUS);
      setAccessBlockedError(null);
    } catch (err) {
      setError(err);
      if (isAccessBlockedError(err)) setAccessBlockedError(err);
      notify?.({ type: "error", message: messageWithRequestId(err, "Failed to load project assets") });
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, notify, ownerUid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (
      !enabled ||
      !projectId ||
      accessBlockedError ||
      !ACTIVE_UPLOAD_STATUSES.has(String(uploadStatus?.status || "").toLowerCase())
    ) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      getGeneratedAssetUploadStatus(projectId)
        .then((statusData) => setUploadStatus(statusData || EMPTY_UPLOAD_STATUS))
        .catch(() => {
          // Upload processing metadata is optional. Stop this polling cycle
          // without hiding an otherwise accessible project asset library.
          setUploadStatus(EMPTY_UPLOAD_STATUS);
        });
    }, 12000);
    return () => window.clearInterval(timer);
  }, [accessBlockedError, enabled, projectId, uploadStatus?.status]);

  const attachAssets = useCallback(async (nextAssets) => {
    if (!projectId) {
      setAssets(nextAssets);
      try { sessionStorage.setItem(`nexusrbx:draft-assets:${ownerUid}`, JSON.stringify(nextAssets)); } catch { /* Optional recovery. */ }
      return { assets: nextAssets };
    }
    setSaving(true);
    try {
      const data = await attachProjectAssets(projectId, nextAssets);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
      notify?.({ type: "success", message: "Assets attached to project" });
      return data;
    } catch (err) {
      notify?.({ type: "error", message: err?.message || "Failed to attach assets" });
      throw err;
    } finally {
      setSaving(false);
    }
  }, [projectId, notify, ownerUid]);

  const attachDraftAssets = useCallback(async (chatId) => {
    const draft = readDraftAssets(ownerUid);
    const pending = draft.length ? draft : !projectId ? assets : [];
    if (!pending.length) return;
    // The assets endpoint uses the chat namespace, not the organizational project ID.
    const data = await attachProjectAssets(chatId, pending);
    try { sessionStorage.removeItem(`nexusrbx:draft-assets:${ownerUid}`); } catch { /* Optional recovery. */ }
    setAssets(Array.isArray(data.assets) ? data.assets : pending);
  }, [assets, ownerUid, projectId]);

  const removeAsset = useCallback(async (assetId) => {
    if (!projectId) {
      return attachAssets(assets.filter((asset) => String(asset.assetId) !== String(assetId)));
    }
    const previous = assets;
    setAssets((current) => current.filter((asset) => String(asset.assetId) !== String(assetId)));
    try {
      const data = await removeProjectAsset(projectId, assetId);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
      return data;
    } catch (err) {
      setAssets(previous);
      notify?.({ type: "error", message: err?.message || "Failed to remove asset" });
      throw err;
    }
  }, [assets, projectId, notify, attachAssets]);

  const setAutoUploadEnabled = useCallback(async (enabledValue) => {
    if (!projectId) throw new Error("Open a project before enabling generated asset uploads.");
    setSaving(true);
    try {
      const data = await setProjectAssetUploadSettings(projectId, Boolean(enabledValue));
      setUploadSettings(data || null);
      notify?.({
        type: "success",
        message: data?.enabled ? "Generated asset uploads enabled" : "Generated asset uploads disabled",
      });
      return data;
    } catch (err) {
      notify?.({ type: "error", message: err?.message || "Could not update generated asset uploads" });
      throw err;
    } finally {
      setSaving(false);
    }
  }, [projectId, notify]);

  return {
    assets,
    loading,
    saving,
    error,
    uploadSettings,
    uploadStatus,
    accessBlockedError,
    refresh,
    attachAssets,
    attachDraftAssets,
    removeAsset,
    setAutoUploadEnabled,
  };
}

export default useProjectAssets;
