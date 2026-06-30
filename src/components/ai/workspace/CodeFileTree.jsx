import React, { useMemo } from "react";
import { FolderOpen, Folder, FileQuestion, AlertTriangle } from "lib/icons";
import GeneratedFileCard from "./GeneratedFileCard";
import QaScoreBadge from "../QaScoreBadge";
import { ROBLOX_PLACEMENTS } from "./workspaceMeta";

// Compact quality summary for the whole artifact (QA score + lint warning).
function WorkspaceQaSummary({ artifact }) {
  const qa = artifact?.qaReport || null;
  const lintWarning = artifact?.lintWarning || null;
  const issueCount = Array.isArray(qa?.issues) ? qa.issues.length : 0;
  const hasScore = qa && Number.isFinite(Number(qa.score));
  if (!hasScore && !lintWarning) return null;

  return (
    <div className="px-1.5 pb-2 space-y-1.5">
      {hasScore && <QaScoreBadge score={qa.score} issueCount={issueCount} />}
      {lintWarning && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-[10px] text-yellow-300/90 leading-snug">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="truncate">{lintWarning}</span>
        </div>
      )}
    </div>
  );
}

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
      <WorkspaceQaSummary artifact={artifact} />
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
