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
      "generating",
      "validating",
      "ready_to_apply",
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
      <div className="px-4 py-10 text-center">
        <ClipboardList className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-xs text-gray-500">
          Setup, testing, and security notes appear here after the agent builds something.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto scrollbar-hide">
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
      <ValidationReportPanel artifact={artifact} />
    </div>
  );
}
