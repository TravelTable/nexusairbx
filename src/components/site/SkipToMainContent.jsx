import React from "react";

export default function SkipToMainContent({ targetId = "main-content" }) {
  return (
    <a
      href={`#${targetId}`}
      className="nx-skip-link"
    >
      Skip to main content
    </a>
  );
}
