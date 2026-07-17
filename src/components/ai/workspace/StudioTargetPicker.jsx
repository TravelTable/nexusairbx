import React from "react";
import { CheckCircle2, Loader2, MapPin } from "lib/icons";

export default function StudioTargetPicker({
  selection,
  onSelect,
  selectingTargetId = null,
}) {
  const options = Array.isArray(selection?.options) ? selection.options : [];
  if (!options.length) return null;

  const selected = options.find((option) => option.id === selectingTargetId) || null;

  return (
    <section
      className="rounded-xl border border-[#00bbf9]/20 bg-[#00bbf9]/[0.06] p-3"
      aria-label="Studio project selection"
    >
      <div className="flex items-start gap-2.5">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7ddcff]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">
            {selection?.prompt || "Where should I make these changes?"}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {selected ? `Continuing in ${selected.label}…` : "Waiting for your choice"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelecting = option.id === selectingTargetId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect?.(option)}
              disabled={!onSelect || Boolean(selectingTargetId)}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm font-semibold text-gray-100 transition-colors hover:border-[#00bbf9]/35 hover:bg-[#00bbf9]/10 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="truncate">{option.label || "Untitled Studio project"}</span>
              {isSelecting ? (
                <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin text-[#7ddcff]" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-600" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
