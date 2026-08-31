import React from "react";
import { MessageResponse } from "../../ai-elements/message";
import { cn } from "../../../lib/utils";
import FileReferenceTag from "./FileReferenceTag";

export default function MarkdownMessage({ text, className = "", isAnimating = false, onOpenFile = null }) {
  if (!text) return null;

  const components = {
    "nexus-file": (props) => <FileReferenceTag {...props} onOpenFile={onOpenFile} />,
  };

  return (
    <div className={cn("markdown-message", className)} data-testid="markdown-body">
      <MessageResponse
        isAnimating={isAnimating}
        components={components}
        allowedTags={{ "nexus-file": ["path", "action", "kind"] }}
        literalTagContent={["nexus-file"]}
      >
        {text}
      </MessageResponse>
    </div>
  );
}
