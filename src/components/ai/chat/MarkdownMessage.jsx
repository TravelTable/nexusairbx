import React from "react";
import { MessageResponse } from "../../ai-elements/message";
import { cn } from "../../../lib/utils";

export default function MarkdownMessage({ text, className = "", isAnimating = false }) {
  if (!text) return null;

  return (
    <div className={cn("markdown-message", className)} data-testid="markdown-body">
      <MessageResponse isAnimating={isAnimating}>{text}</MessageResponse>
    </div>
  );
}
