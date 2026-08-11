import React from "react";
import { CheckCircle2, Loader2, MapPin } from "lib/icons";

function optionId(option) {
  return String(option?.id || option?.targetId || option?.studioTargetId || "").trim();
}

function optionLabel(option) {
  return option?.label || option?.displayName || option?.placeName || option?.name || "Untitled Studio project";
}

export default function StudioTargetPicker({
  selection,
  onSelect,
  selectingTargetId = null,
}) {
  const options = Array.isArray(selection?.options) ? selection.options : [];
  if (!options.length) return null;

  const selected = options.find((option) => optionId(option) === selectingTargetId) || null;

  return (
    <section
      className="rounded-xl border border-[color-mix(in_srgb,var(--ds-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_10%,transparent)] p-3"
      aria-label="Studio project selection"
    >
      <div className="flex items-start gap-2.5">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-info)]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--ds-text)]">
            {selection?.prompt || "Where should I make these changes?"}
          </h3>
          <p className="mt-1 text-xs text-[var(--ds-text-secondary)]">
            {selected ? `Continuing in ${optionLabel(selected)}…` : selection?.message || "Waiting for your choice"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = optionId(option);
          const isSelecting = id === selectingTargetId;
          const disabledReason = String(option?.disabledReason || "").trim();
          const isUnavailable = option?.disabled === true;
          const selectableOption = option.id ? option : { ...option, id };
          return (
            <button
              key={id || optionLabel(option)}
              type="button"
              onClick={() => onSelect?.(selectableOption)}
              disabled={!onSelect || !id || Boolean(selectingTargetId) || isUnavailable}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-left text-sm font-semibold text-[var(--ds-text)] transition-colors hover:border-[color-mix(in_srgb,var(--ds-info)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-info)_14%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate">{optionLabel(option)}</span>
                {disabledReason && (
                  <span className="mt-0.5 block text-[11px] font-medium text-[var(--ds-text-muted)]">
                    {disabledReason}
                  </span>
                )}
              </span>
              {isSelecting ? (
                <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin text-[var(--ds-info)]" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ds-text-muted)]" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
