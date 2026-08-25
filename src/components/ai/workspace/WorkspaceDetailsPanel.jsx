import React from "react";
import { ClipboardList, Layout } from "lib/icons";

import ProjectArchitecturePanel from "../ProjectArchitecturePanel";
import { Segmented } from "../../ui";
import BuildDetailsPanel from "./BuildDetailsPanel";

const DETAIL_VIEWS = [
  { id: "build", label: "Build", icon: ClipboardList },
  { id: "architecture", label: "Structure", icon: Layout },
];

export default function WorkspaceDetailsPanel({
  view,
  onViewChange,
  projectContext,
  artifact,
  agentRun,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
  restoringRun,
  notify,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--ds-border-subtle)] px-3 py-2">
        <Segmented
          fullWidth
          size="sm"
          options={DETAIL_VIEWS}
          value={view}
          onChange={onViewChange}
        />
      </div>
      <div className="min-h-0 flex-1">
        {view === "architecture" ? (
          <ProjectArchitecturePanel context={projectContext} embedded />
        ) : (
          <BuildDetailsPanel
            artifact={artifact}
            agentRun={agentRun}
            onApproveStep={onApproveStep}
            onRestoreRun={onRestoreRun}
            approvingStepId={approvingStepId}
            restoringRun={restoringRun}
            notify={notify}
          />
        )}
      </div>
    </div>
  );
}
