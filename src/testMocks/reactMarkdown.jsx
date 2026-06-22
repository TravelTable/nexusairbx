import React from "react";

export default function ReactMarkdown({ children }) {
  return <div data-testid="markdown-body">{children}</div>;
}
