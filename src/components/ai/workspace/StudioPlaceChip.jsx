import React, { useState } from "react";
import { MapPin, ChevronDown } from "lib/icons";
import StudioTargetPicker from "./StudioTargetPicker";

export default function StudioPlaceChip({
  preference = null,
  options = [],
  connected = false,
  studioEnabled = false,
  onChangePlace,
  onSelectPlace,
  selectingTargetId = null,
  pickerOpen: controlledOpen = null,
  onPickerOpenChange = null,
  className = "",
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen == null ? internalOpen : controlledOpen;
  const setOpen = (next) => {
    if (onPickerOpenChange) onPickerOpenChange(next);
    else setInternalOpen(next);
  };

  if (!studioEnabled) return null;

  const label = preference?.label || null;
  const hasOptions = Array.isArray(options) && options.length > 0;
  const canOpen = connected && hasOptions;
  const displayLabel = !connected
    ? "Connect Studio to choose a place"
    : label
      ? label
      : hasOptions
        ? "Choose a Studio place"
        : "No live Studio place";

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!canOpen) return;
          setOpen(!open);
        }}
        disabled={!canOpen}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-ring ${
          connected && label
            ? "border-[#00bbf9]/25 bg-[#00bbf9]/[0.08] text-[#9ae6ff] hover:bg-[#00bbf9]/15"
            : "border-amber-400/25 bg-amber-400/10 text-amber-100"
        } ${canOpen ? "cursor-pointer" : "cursor-default opacity-90"}`}
        aria-expanded={canOpen ? open : undefined}
        aria-haspopup={canOpen ? "listbox" : undefined}
        title={displayLabel}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{displayLabel}</span>
        {canOpen && (
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && hasOptions && (
        <StudioTargetPicker
          selection={{
            prompt: label ? "Switch Studio place" : "Which Studio place should this chat use?",
            message: label
              ? "Pick another open place. In-progress agent runs will continue there after you confirm."
              : "Pick the open place before the agent starts.",
            options,
          }}
          selectingTargetId={selectingTargetId}
          onSelect={async (option) => {
            await (onSelectPlace || onChangePlace)?.(option);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
