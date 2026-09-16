import React, { useMemo } from "react";
import { AgentFlow } from "../../../components/ai/agent-flow/react/AgentFlow.jsx";
import {
  UI_AGENT_FLOW_OPTIONS,
  buildUiAgentFlowMessage,
  uiAgentFlowStatus,
} from "../../../lib/uiAgentFlowMessage";

export default function UiLoadingChain({ busy = "", task = null }) {
  const message = useMemo(() => buildUiAgentFlowMessage({ busy, task }), [busy, task]);
  const status = useMemo(() => uiAgentFlowStatus({ busy, task }), [busy, task]);
  const durations = useMemo(() => Object.fromEntries((task?.uiBuild?.activity || []).flatMap((a, index) => a.finishedAt ? [[a.action === 'understanding_request' ? `part:${index}` : a.id, a.finishedAt - a.startedAt]] : [])), [task]);
  if (!message.parts.length) return null;

  return (
    <div className="uc-loading-chain" data-testid="ui-loading-chain">
      <AgentFlow durations={durations} message={message} status={status} options={UI_AGENT_FLOW_OPTIONS} />
    </div>
  );
}
