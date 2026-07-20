import React, { useEffect, useState } from "react";
import { COMPOSER_PLACEHOLDER_HINTS } from "../../../lib/composerCommands";

/**
 * Faint rotating placeholder hints inside the prompt box (Cursor-style).
 * Hidden once the user has typed anything.
 */
export default function AnimatedPromptPlaceholder({
  visible = true,
  hints = COMPOSER_PLACEHOLDER_HINTS,
  intervalMs = 3200,
}) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const items = Array.isArray(hints) && hints.length ? hints : COMPOSER_PLACEHOLDER_HINTS;

  useEffect(() => {
    if (!visible || items.length < 2) return undefined;
    let fadeTimer = null;
    const tick = window.setInterval(() => {
      setFading(true);
      fadeTimer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % items.length);
        setFading(false);
      }, 220);
    }, intervalMs);
    return () => {
      window.clearInterval(tick);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [intervalMs, items, visible]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-start px-2 py-2.5"
      aria-hidden="true"
    >
      <span
        className={`text-[14px] leading-relaxed text-gray-500/70 transition-opacity duration-200 ease-out motion-reduce:transition-none md:text-[15px] ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {items[index % items.length]}
      </span>
    </div>
  );
}
