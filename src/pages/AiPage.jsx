import React from "react";
import "../styles/aiTheme.css";
import AiWorkspaceLayout from "./ai/AiWorkspaceLayout";
import { useAiWorkspaceController } from "./ai/useAiWorkspaceController";

function AiPage() {
  const controller = useAiWorkspaceController();
  return <AiWorkspaceLayout controller={controller} />;
}

export default AiPage;
