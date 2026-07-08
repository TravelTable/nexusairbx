import React from "react";
import FEATURE_FLAGS from "../../../lib/featureFlags";
import { useSettings } from "../../../context/SettingsContext";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../../ai-elements/reasoning";

function cleanThinkingText(value = "") {
  return String(value || "").replace(/<\/?thinking>/gi, "").trim();
}

/**
 * Adapter around AI Elements Reasoning for live streamState.rawReasoning
 * and finalized message.thought. Real stream data only — no mock tokens.
 */
export default function ReasoningPanel({
  text = "",
  isStreaming = false,
  requireRawReasoningFlag = false,
  requireShowThinking = false,
  className,
}) {
  const { settings } = useSettings();
  const clean = cleanThinkingText(text);

  if (!clean) return null;
  if (requireRawReasoningFlag && !FEATURE_FLAGS.rawReasoning) return null;
  if (requireShowThinking && settings.showThinking === false) return null;

  return (
    <Reasoning className={className || "w-full mb-0"} isStreaming={isStreaming}>
      <ReasoningTrigger
        getThinkingMessage={(streaming, duration) => {
          if (streaming) return <p>Thinking...</p>;
          if (duration === undefined) return <p>Thought process</p>;
          return <p>Thought for {duration} seconds</p>;
        }}
      />
      <ReasoningContent>{clean}</ReasoningContent>
    </Reasoning>
  );
}
