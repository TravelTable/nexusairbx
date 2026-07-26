import React, { useState } from "react";
import { Boxes, FileArchive, Search } from "lib/icons";

import CreatorStoreSearch from "../../assets/CreatorStoreSearch";
import ModelFilePipelinePanel from "../../assets/ModelFilePipelinePanel";
import { Segmented } from "../../ui";
import RobloxAssetTray from "./RobloxAssetTray";
import RobloxDecalUploadDropdown from "./RobloxDecalUploadDropdown";

const ASSET_VIEWS = [
  { id: "project", label: "Project", icon: Boxes },
  { id: "store", label: "Store", icon: Search },
  { id: "glb", label: "GLB", icon: FileArchive },
];

export default function WorkspaceAssetsPanel({
  user,
  planKey,
  devOverride,
  roblox,
  projectId,
  onAttached,
  onAuthRequired,
  notify,
}) {
  const [view, setView] = useState("project");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
        <Segmented
          fullWidth
          size="sm"
          options={ASSET_VIEWS}
          value={view}
          onChange={setView}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3 scrollbar-subtle">
        {view === "project" ? (
          <>
            <section className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-200">
                    Project assets
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    Upload decals and manage assets attached to this project.
                  </p>
                </div>
                <RobloxDecalUploadDropdown
                  user={user}
                  planKey={planKey}
                  devOverride={devOverride}
                  roblox={roblox}
                  projectId={projectId}
                  onAttached={onAttached}
                  onAuthRequired={onAuthRequired}
                  notify={notify}
                />
              </div>
            </section>
            <RobloxAssetTray
              projectId={projectId}
              robloxConnected={roblox?.connected}
              uploadAvailable={roblox?.uploadAvailable}
              assetUploadsEnabled={roblox?.assetUploadsEnabled}
              selectedCreator={roblox?.selectedCreator}
              notify={notify}
            />
            {!projectId ? (
              <div className="px-6 py-10 text-center">
                <Boxes className="mx-auto h-8 w-8 text-gray-700" aria-hidden="true" />
                <p className="mt-2 text-xs text-gray-500">
                  Select or create a project to collect its assets here.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {view === "store" ? (
          <CreatorStoreSearch notify={notify} className="mx-3" />
        ) : null}

        {view === "glb" ? (
          <div className="-mt-3">
            <ModelFilePipelinePanel notify={notify} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
