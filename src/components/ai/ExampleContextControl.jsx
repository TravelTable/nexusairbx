import React, { useMemo } from "react";
import { FileCode2, Loader, SlidersHorizontal } from "lib/icons";

import { cx } from "../ui";

export default function ExampleContextControl({
  examples = [],
  status = "idle",
  error = "",
  available = false,
  useExamples = false,
  selectedExampleIds = [],
  onUseExamplesChange,
  onSelectedExampleIdsChange,
  className = "",
}) {
  const normalizedExamples = Array.isArray(examples) ? examples : [];
  const selected = useMemo(() => new Set(Array.isArray(selectedExampleIds) ? selectedExampleIds : []), [selectedExampleIds]);
  const selectedCount = selected.size;
  const canSelect = useExamples && normalizedExamples.length > 0;

  const handleToggleExample = (id) => {
    if (!id) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedExampleIdsChange?.(Array.from(next));
  };

  return (
    <section className={cx("border-b border-white/10 bg-[#050810] px-4 py-3", className)} aria-label="Roblox example context">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white">
          <input
            type="checkbox"
            checked={Boolean(useExamples)}
            onChange={(event) => onUseExamplesChange?.(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black text-[#00f5d4] focus:ring-[#00f5d4]"
          />
          <FileCode2 className="h-4 w-4 text-[#00f5d4]" aria-hidden="true" />
          Use examples
        </label>

        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 text-[11px] font-medium text-gray-300">
          {status === "loading" ? <Loader className="h-3 w-3 animate-spin text-[#00f5d4]" aria-hidden="true" /> : <SlidersHorizontal className="h-3 w-3 text-gray-400" aria-hidden="true" />}
          {useExamples
            ? selectedCount > 0
              ? `${selectedCount} selected`
              : "Auto-select relevant"
            : "Disabled"}
        </span>

        {!available && status === "ready" && (
          <span className="text-xs text-gray-500">No converted examples found.</span>
        )}
        {error && status === "error" && (
          <span className="text-xs text-amber-300">{error}</span>
        )}
      </div>

      {canSelect && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {normalizedExamples.map((example) => {
            const id = example?.id || "";
            const systems = Array.isArray(example?.detectedSystems) ? example.detectedSystems.slice(0, 3).join(", ") : "";
            return (
              <label
                key={id || example?.name}
                className={cx(
                  "flex min-h-[72px] cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors",
                  selected.has(id)
                    ? "border-[#00f5d4]/45 bg-[#00f5d4]/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-gray-300 hover:border-white/20 hover:bg-white/[0.04]"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => handleToggleExample(id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black text-[#00f5d4] focus:ring-[#00f5d4]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{example?.name || id}</span>
                  <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-gray-400">
                    {systems || `${example?.counts?.scripts || 0} scripts, ${example?.counts?.ui || 0} UI nodes`}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
