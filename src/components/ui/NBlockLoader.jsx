import React, { useEffect, useRef } from "react";

import "./NBlockLoader.css";

const SIZE = 190;
const POINTS = [
  [15, 145], [15, 112.5], [15, 80], [15, 47.5], [15, 15],
  [47.5, 47.5], [80, 80], [112.5, 112.5], [145, 145], [145, 112.5],
  [145, 80], [145, 47.5], [145, 15],
];
const RETURN_PATH = [[160, 15], [160, 80], [160, 145], [80, 160], [0, 145]];

function pointOnSegment([startX, startY], [endX, endY], progress) {
  return [startX + (endX - startX) * progress, startY + (endY - startY) * progress];
}

function positionFor(index, offset) {
  const total = POINTS.length;
  const progress = ((index + offset) % total + total) % total;
  const base = Math.floor(progress);
  const fraction = progress - base;

  if (base === total - 1) {
    const stages = [POINTS[total - 1], ...RETURN_PATH, POINTS[0]];
    const segmentProgress = fraction * (stages.length - 1);
    const segment = Math.min(stages.length - 2, Math.floor(segmentProgress));
    const transition = segmentProgress - segment;
    const eased = transition < 0.72 ? 0 : (transition - 0.72) / 0.28;
    return pointOnSegment(stages[segment], stages[segment + 1], eased);
  }

  const eased = fraction < 0.7 ? 0 : (fraction - 0.7) / 0.3;
  return pointOnSegment(POINTS[base], POINTS[base + 1], eased);
}

export default function NBlockLoader({
  size = SIZE,
  className = "",
  "aria-label": ariaLabel = "Nexus is building",
  "aria-hidden": ariaHidden = false,
}) {
  const blockRefs = useRef([]);
  const pixelSize = Number.isFinite(Number(size)) ? Number(size) : SIZE;

  useEffect(() => {
    const blocks = blockRefs.current;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let frameId;
    let previous = performance.now();
    let offset = 0;

    const paint = (nextOffset) => {
      blocks.forEach((block, index) => {
        if (!block) return;
        const [x, y] = positionFor(index, nextOffset);
        block.setAttribute("x", x);
        block.setAttribute("y", y);
      });
    };

    paint(0);
    if (reducedMotion || typeof window.requestAnimationFrame !== "function") return undefined;

    const draw = (now) => {
      if (!Number.isFinite(now)) return;
      offset += Math.max(0, Math.min(now - previous, 100)) / 1050;
      previous = now;
      paint(offset);
      frameId = window.requestAnimationFrame(draw);
    };
    frameId = window.requestAnimationFrame(draw);
    return () => {
      if (frameId != null && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <span
      className={`n-block-loader ${className}`.trim()}
      style={{ width: pixelSize, height: pixelSize }}
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaHidden ? undefined : ariaLabel}
      aria-hidden={ariaHidden || undefined}
    >
      <svg
        className="n-block-loader__canvas"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        aria-hidden="true"
      >
        {POINTS.map(([x, y], index) => (
          <rect
            key={index}
            ref={(element) => { blockRefs.current[index] = element; }}
            className="n-block-loader__block"
            x={x}
            y={y}
            width="30"
            height="30"
            rx="10"
          />
        ))}
      </svg>
    </span>
  );
}
