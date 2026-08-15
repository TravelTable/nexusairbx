import React from "react";

import "./NexusLoader.css";

function resolvePixelSize(className, size) {
  const explicitSize = Number(size);
  if (Number.isFinite(explicitSize) && explicitSize > 0) return explicitSize;

  const match = String(className || "").match(/(?:^|\s)(?:h|w)-(\d+(?:\.\d+)?)/);
  if (match) return Number.parseFloat(match[1]) * 4;
  return 20;
}

/**
 * Flat Nexus loading mark used behind the Lucide-compatible Loader exports.
 * The progress arc moves while the central N stays readable, and CSS provides
 * a still frame for people who request reduced motion.
 */
export default function NexusLoader({ className = "", size, style, ...props }) {
  const pixelSize = resolvePixelSize(className, size);
  const isHidden = props["aria-hidden"] === true || props["aria-hidden"] === "true";
  const accessibilityProps = isHidden
    ? {}
    : {
        role: "status",
        "aria-label": props["aria-label"] || "Loading",
      };

  return (
    <span
      className={`nexus-loader ${className}`.trim()}
      style={{
        display: "inline-flex",
        width: pixelSize,
        height: pixelSize,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
      {...accessibilityProps}
      {...props}
    >
      <svg
        className="nexus-loader__mark"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="nexus-loader__track"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="nexus-loader__progress"
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          className="nexus-loader__letter"
          d="M8 16V8l8 8V8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
