import React from "react";
import { ClipboardList, Layout, ShieldCheck } from "lib/icons";

import ProjectArchitecturePanel from "../ProjectArchitecturePanel";
import { Segmented } from "../../ui";
import BuildDetailsPanel from "./BuildDetailsPanel";
import ValidationReportPanel from "./ValidationReportPanel";

const DETAIL_VIEWS = [
  { id: "summary", label: "Summary", icon: ClipboardList },
  { id: "architecture", label: "Structure", icon: Layout },
  { id: "validation", label: "Validation", icon: ShieldCheck },
];

function ValidationView({ artifact }) {
  const hasEvidence = Boolean(
    artifact && (
      artifact.securityNotes?.length ||
      artifact.warnings?.length ||
      Number.isFinite(Number(artifact.qaReport?.score))
    )
  );
  if (!hasEvidence) {
    return (
      <div className="workspace-stage-empty">
        <div className="workspace-stage-empty__content">
          <ShieldCheck className="mb-2 h-5 w-5 text-[var(--ds-accent)]" />
          <span className="workspace-stage-empty__eyebrow">Awaiting validation</span>
          <h3>No checks recorded yet</h3>
          <p>Quality scores, security notes, warnings, and test evidence will collect here after validation runs.</p>
        </div>
      </div>
    );
  }
  return <div className="h-full overflow-y-auto p-4 scrollbar-subtle"><ValidationReportPanel artifact={artifact} /></div>;
}

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
          ariaLabel="Report view"
        />
      </div>
      <div className="min-h-0 flex-1">
        {view === "architecture" ? (
          <ProjectArchitecturePanel context={projectContext} embedded />
        ) : view === "validation" ? (
          <ValidationView artifact={artifact} />
        ) : (
          <BuildDetailsPanel
            artifact={artifact}
            agentRun={agentRun}
            onApproveStep={onApproveStep}
            onRestoreRun={onRestoreRun}
            approvingStepId={approvingStepId}
            restoringRun={restoringRun}
            notify={notify}
            includeValidation={false}
          />
        )}
      </div>
    </div>
  );
}
