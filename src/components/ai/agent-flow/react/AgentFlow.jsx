import { createElement, useEffect, useRef } from "react";
import { defineAgentFlow, fromUIMessage } from "../dist/agent-flow.js";

const EMPTY_OPTIONS = {};

/** Pass the actual assistant UIMessage returned by useChat; never a copied demo array. */
export function AgentFlow({
  message,
  status = "idle",
  error,
  options = EMPTY_OPTIONS,
  durations,
  mapDataPart,
  onApproval,
  className,
}) {
  const ref = useRef(null);
  useEffect(() => {
    defineAgentFlow();
    const element = ref.current;
    if (!element) return;
    element.options = options;
    element.onApproval = onApproval;
    element.run = fromUIMessage(message, { status, error, durations, mapDataPart });
  }, [message, status, error, options, durations, mapDataPart, onApproval]);
  return createElement("agent-flow", { ref, className });
}
