import RobloxCloudControls from "./RobloxCloudControls";
import React, { useCallback, useState } from "react";
import { Boxes, FileArchive, Search } from "lib/icons";

import CreatorStoreSearch from "../../assets/CreatorStoreSearch";
import ModelFilePipelinePanel from "../../assets/ModelFilePipelinePanel";
import { Segmented } from "../../ui";
import { ASSET_PLATFORM_READS_ENABLED } from "../../../lib/assetPlatformApi";
import CanonicalAssetTray from "./CanonicalAssetTray";
import RobloxAssetTray from "./RobloxAssetTray";
import RobloxDecalUploadDropdown from "./RobloxDecalUploadDropdown";

const ASSET_VIEWS = [
  { id: "project", label: "Project", icon: Boxes },
  { id: "store", label: "Browse", icon: Search },
  { id: "glb", label: "Import 3D", icon: FileArchive },
];

export default function WorkspaceAssetsPanel({
  onAssetUploadsEnabledChange,
  onOpenAssetLibrary,
  user,
  planKey,
  devOverride,
  roblox,
  attachmentProjectId,
  canonicalProjectId,
  attachedAssets = [],
  attachedAssetsLoading = false,
  attachedAssetsSaving = false,
  attachedAssetsError = null,
  onRefreshAttachedAssets,
  onAttachAssets,
  onRemoveAttachedAsset,
  onAuthRequired,
  notify,
  canonicalAssetsEnabled = ASSET_PLATFORM_READS_ENABLED,
}) {
  const [view, setView] = useState("project");
  const [visitedViews, setVisitedViews] = useState(() => new Set(["project"]));

  const changeView = useCallback((nextView) => {
    setVisitedViews((current) => {
      if (current.has(nextView)) return current;
      const next = new Set(current);
      next.add(nextView);
      return next;
    });
    setView(nextView);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section aria-label="Roblox publishing" className="shrink-0 border-b border-[var(--ds-border-subtle)] p-3">
        <h3 className="mb-2 text-xs font-semibold text-[var(--ds-text)]">Publishing destination</h3>
        <RobloxCloudControls {...roblox} selectedAssetCount={attachedAssets.length} onAssetUploadsEnabledChange={onAssetUploadsEnabledChange} onOpenAssetLibrary={onOpenAssetLibrary} />
      </section>
      <div className="shrink-0 border-b border-[var(--ds-border-subtle)] px-3 py-2">
        <Segmented
          fullWidth
          size="sm"
          options={ASSET_VIEWS}
          value={view}
          onChange={changeView}
          ariaLabel="Asset workspace view"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3 scrollbar-subtle">
        <div hidden={view !== "project"} aria-hidden={view !== "project"}>
          <section className="mx-3 mb-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--ds-text)]">
                  Project assets
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">
                  Upload decals, reuse Roblox assets in this chat, and track generated Nexus assets separately.
                </p>
              </div>
              <RobloxDecalUploadDropdown
                user={user}
                planKey={planKey}
                devOverride={devOverride}
                roblox={roblox}
                projectId={attachmentProjectId}
                onAttached={onRefreshAttachedAssets}
                onAuthRequired={onAuthRequired}
                notify={notify}
              />
            </div>
          </section>

          <RobloxAssetTray
            projectId={attachmentProjectId}
            assets={attachedAssets}
            loading={attachedAssetsLoading}
            saving={attachedAssetsSaving}
            error={attachedAssetsError}
            robloxConnected={roblox?.connected}
            onRefresh={onRefreshAttachedAssets}
            onRemove={onRemoveAttachedAsset}
            notify={notify}
          />

          <CanonicalAssetTray
            projectId={canonicalProjectId}
            enabled={canonicalAssetsEnabled}
            robloxConnected={roblox?.connected}
            uploadAvailable={roblox?.uploadAvailable}
            assetUploadsEnabled={roblox?.assetUploadsEnabled}
            selectedCreator={roblox?.selectedCreator}
            notify={notify}
          />
        </div>

        {visitedViews.has("store") ? (
          <div hidden={view !== "store"} aria-hidden={view !== "store"}>
            <CreatorStoreSearch
              notify={notify}
              className="mx-3"
              projectId={attachmentProjectId}
              onAttachAsset={onAttachAssets}
            />
          </div>
        ) : null}

        {visitedViews.has("glb") ? (
          <div hidden={view !== "glb"} aria-hidden={view !== "glb"} className="-mt-3">
            <ModelFilePipelinePanel notify={notify} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
