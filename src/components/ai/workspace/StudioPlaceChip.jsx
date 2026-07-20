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

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
            connected && label
              ? "border-[#00bbf9]/25 bg-[#00bbf9]/[0.08] text-[#9ae6ff]"
              : "border-amber-400/25 bg-amber-400/10 text-amber-100"
          }`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {!connected
              ? "Connect Studio to choose a place"
              : label
                ? `Editing: ${label}`
                : hasOptions
                  ? "Choose a Studio place"
                  : "No live Studio place"}
          </span>
        </span>
        {connected && hasOptions && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-ring"
          >
            {label ? "Change" : "Choose"}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

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
