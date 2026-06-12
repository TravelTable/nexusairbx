import React, { useMemo } from "react";
import { FolderOpen, Folder, FileQuestion } from "lucide-react";
import GeneratedFileCard from "./GeneratedFileCard";
import { ROBLOX_PLACEMENTS } from "./workspaceMeta";

// Left-panel file tree. Files are grouped by their Roblox service placement so a
// developer immediately sees where each script belongs in Studio.
export default function CodeFileTree({ artifact, activeFileId, onSelectFile }) {
  const groups = useMemo(() => {
    const files = artifact?.files || [];
    const byPlacement = new Map();
    for (const file of files) {
      const placement = file.placement || "ReplicatedStorage";
      if (!byPlacement.has(placement)) byPlacement.set(placement, []);
      byPlacement.get(placement).push(file);
    }
    // Stable ordering: known placements first, then any extras.
    const ordered = [];
    for (const placement of ROBLOX_PLACEMENTS) {
      if (byPlacement.has(placement)) {
        ordered.push([placement, byPlacement.get(placement)]);
        byPlacement.delete(placement);
      }
    }
    for (const [placement, list] of byPlacement.entries()) ordered.push([placement, list]);
    return ordered;
  }, [artifact]);

  if (!artifact || !artifact.files?.length) {
    return (
      <div className="px-4 py-8 text-center">
        <FileQuestion className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No files yet. Describe what you want to build and the agent will generate them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(([placement, files]) => (
        <div key={placement} className="space-y-1">
          <div className="flex items-center gap-2 px-1.5 py-1">
            {files.some((f) => f.id === activeFileId) ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#00f5d4]" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-gray-500" />
            )}
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{placement}</span>
            <span className="ml-auto text-[10px] text-gray-600">{files.length}</span>
          </div>
          <div className="space-y-0.5 pl-1">
            {files.map((file) => (
              <GeneratedFileCard
                key={file.id}
                file={file}
                active={file.id === activeFileId}
                onSelect={() => onSelectFile(file.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
