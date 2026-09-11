import React from "react";
import { Loader, RotateCcw } from "lib/icons";
import { getLifecyclePresentationFromText } from "../../lib/productLifecycle";

export default function GenerationStatusBar({ currentStage }) {
  if (!currentStage) return null;
  const presentation = getLifecyclePresentationFromText(currentStage);
  const StatusIcon = presentation.state === "reconnecting" || presentation.state === "recovering"
    ? RotateCcw
    : Loader;

  return (
    <div
      className="mb-4 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3 animate-fade-in-up"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-2.5">
        <StatusIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-accent)] motion-safe:animate-spin" aria-hidden="true" />
        <div className="min-w-0">
          <span className="block font-display text-sm font-semibold text-[var(--ds-text)]">{presentation.label}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ds-text-muted)]">{presentation.body}</span>
        </div>
      </div>
    </div>
  );
}
