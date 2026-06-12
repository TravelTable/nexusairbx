import React from "react";
import { ClipboardList } from "lucide-react";
import AgentPlanPanel from "./AgentPlanPanel";
import SetupStepsPanel from "./SetupStepsPanel";
import TestingStepsPanel from "./TestingStepsPanel";
import ValidationReportPanel from "./ValidationReportPanel";

// Engineering-focused details for the active artifact: plan, setup, testing,
// security/validation. Used in the right column's "Details" view and as the
// mobile "Details" tab.
export default function BuildDetailsPanel({ artifact, agentRun }) {
  const hasContent =
    artifact &&
    (artifact.plan ||
      artifact.setupSteps?.length ||
      artifact.testingSteps?.length ||
      artifact.securityNotes?.length ||
      artifact.warnings?.length ||
      artifact.qaReport);

  if (!hasContent && agentRun?.status !== "thinking" && agentRun?.status !== "generating") {
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
      <AgentPlanPanel agentRun={agentRun} planText={artifact?.plan} />
      <SetupStepsPanel steps={artifact?.setupSteps} />
      <TestingStepsPanel steps={artifact?.testingSteps} />
      <ValidationReportPanel artifact={artifact} />
    </div>
  );
}
