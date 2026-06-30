import React, { useId } from "react";
import PegtopShape from "./PegtopShape";
import "./PegtopLoader.css";

function resolvePixelSize(className, size) {
  if (typeof size === "number") return size;
  const match = String(className || "").match(/(?:^|\s)(?:h|w)-(\d+(?:\.\d+)?)/);
  if (match) return parseFloat(match[1]) * 4;
  return 20;
}

/**
 * Peg-top loading animation (Uiverse.io by andrew-manzyk, MIT).
 * Drop-in replacement for Lucide Loader / Loader2 icons.
 */
export default function PegtopLoader({ className = "", size, style, ...props }) {
  const uid = useId().replace(/:/g, "");
  const pixelSize = resolvePixelSize(className, size);
  const scale = Math.max(0.12, Math.min(0.35, pixelSize / 90));

  return (
    <span
      role="status"
      aria-label="Loading"
      className={className}
      style={{
        display: "inline-flex",
        width: pixelSize,
        height: pixelSize,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        ...style,
      }}
      {...props}
    >
      <div
        className="pegtop-loader"
        style={{ "--pegtop-scale": scale }}
      >
        <PegtopShape id="pegtopone" gradientPrefix={`${uid}-one`} />
        <PegtopShape id="pegtoptwo" gradientPrefix={`${uid}-two`} />
        <PegtopShape id="pegtopthree" gradientPrefix={`${uid}-three`} />
      </div>
    </span>
  );
}
