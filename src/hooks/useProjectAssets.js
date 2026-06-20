import { useCallback, useEffect, useState } from "react";
import {
  attachProjectAssets,
  getGeneratedAssetUploadStatus,
  getProjectAssetUploadSettings,
  listProjectAssets,
  removeProjectAsset,
  setProjectAssetUploadSettings,
} from "../lib/robloxAssetLibraryApi";

export function useProjectAssets(projectId, { enabled = true, notify } = {}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSettings, setUploadSettings] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ status: "idle", records: [] });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !projectId) {
      setAssets([]);
      setUploadSettings(null);
      setUploadStatus({ status: "idle", records: [] });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [assetData, settingsData, statusData] = await Promise.all([
        listProjectAssets(projectId),
        getProjectAssetUploadSettings(projectId),
        getGeneratedAssetUploadStatus(projectId),
      ]);
      setAssets(Array.isArray(assetData.assets) ? assetData.assets : []);
      setUploadSettings(settingsData || null);
      setUploadStatus(statusData || { status: "idle", records: [] });
    } catch (err) {
      setError(err);
      notify?.({ type: "error", message: err?.message || "Failed to load project assets" });
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !projectId) return undefined;
    const timer = window.setInterval(() => {
      getGeneratedAssetUploadStatus(projectId)
        .then((statusData) => setUploadStatus(statusData || { status: "idle", records: [] }))
        .catch(() => {});
    }, 12000);
    return () => window.clearInterval(timer);
  }, [enabled, projectId]);

  const attachAssets = useCallback(async (nextAssets) => {
    if (!projectId) throw new Error("Open a project before selecting assets.");
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
  }, [projectId, notify]);

  const removeAsset = useCallback(async (assetId) => {
    if (!projectId) return;
    const previous = assets;
    setAssets((current) => current.filter((asset) => String(asset.assetId) !== String(assetId)));
    try {
      const data = await removeProjectAsset(projectId, assetId);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch (err) {
      setAssets(previous);
      notify?.({ type: "error", message: err?.message || "Failed to remove asset" });
    }
  }, [assets, projectId, notify]);

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
    refresh,
    attachAssets,
    removeAsset,
    setAutoUploadEnabled,
  };
}

export default useProjectAssets;
