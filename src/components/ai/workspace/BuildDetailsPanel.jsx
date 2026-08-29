import React from "react";
import { ClipboardList } from "lib/icons";
import AgentPlanPanel from "./AgentPlanPanel";
import SetupStepsPanel from "./SetupStepsPanel";
import TestingStepsPanel from "./TestingStepsPanel";
import ValidationReportPanel from "./ValidationReportPanel";
import NativeModelReviewPanel from "./NativeModelReviewPanel";

// Engineering-focused details for the active artifact: plan, setup, testing,
// security/validation. Used in the right column's "Details" view and as the
// mobile "Details" tab.
export default function BuildDetailsPanel({
  artifact,
  agentRun,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
  restoringRun = false,
  notify,
  includeValidation = true,
}) {
  const hasNativeModel = Boolean(artifact?.nativeModelSpec || artifact?.nativeModel?.spec || artifact?.nativeBuild?.spec);
  const hasContent =
    artifact &&
    (artifact.plan ||
      hasNativeModel ||
      artifact.setupSteps?.length ||
      artifact.testingSteps?.length ||
      artifact.securityNotes?.length ||
      artifact.warnings?.length ||
      artifact.qaReport);

  const hasSteps = (agentRun?.steps || []).length > 0;

  if (
    !hasContent &&
    !hasSteps &&
    ![
      "inspecting",
      "waiting_for_tool",
      "waiting_for_approval",
      "awaiting_studio_target",
      "generating",
      "validating",
      "ready_to_apply",
      "assets_pending",
      "applying",
      "applied",
      "succeeded",
      "conflict",
      "failed",
      "cancelled",
      "blocked",
      "iteration_limit",
      "timed_out",
      "push_skipped",
    ].includes(agentRun?.status)
  ) {
    return (
      <div className="workspace-stage-empty">
        <div className="workspace-stage-empty__content">
          <ClipboardList className="mb-2 h-5 w-5 text-[var(--ds-accent)]" />
          <span className="workspace-stage-empty__eyebrow">Waiting for a build</span>
          <h3>No report yet</h3>
          <p>Build decisions, setup steps, and verification evidence will appear after the agent produces an artifact.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-subtle">
      <AgentPlanPanel
        agentRun={agentRun}
        planText={artifact?.plan}
        onApproveStep={onApproveStep}
        onRestoreRun={onRestoreRun}
        approvingStepId={approvingStepId}
        restoring={restoringRun}
      />
      <NativeModelReviewPanel artifact={artifact} notify={notify} />
      <SetupStepsPanel steps={artifact?.setupSteps} />
      <TestingStepsPanel steps={artifact?.testingSteps} />
      {includeValidation ? <ValidationReportPanel artifact={artifact} /> : null}
    </div>
  );
}
