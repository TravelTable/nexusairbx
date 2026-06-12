import React from "react";
import "../styles/aiTheme.css";
import AgentWorkspaceLayout from "./ai/AgentWorkspaceLayout";
import { useAiWorkspaceController } from "./ai/useAiWorkspaceController";

function AiPage() {
  const controller = useAiWorkspaceController();
  return <AgentWorkspaceLayout controller={controller} />;
}

export default AiPage;
