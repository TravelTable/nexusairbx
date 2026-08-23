import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/aiTheme.css";
import AgentWorkspaceLayout from "./ai/AgentWorkspaceLayout";
import { useAiWorkspaceController } from "./ai/useAiWorkspaceController";

function AiPage() {
  const controller = useAiWorkspaceController();
  const location = useLocation();
  const navigate = useNavigate();
  return <AgentWorkspaceLayout controller={controller} locationSearch={location.search} navigateTo={navigate} />;
}

export default AiPage;
