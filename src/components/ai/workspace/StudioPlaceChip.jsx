import React, { useState } from "react";
import { MapPin, ChevronDown } from "lib/icons";
import { normalizeRobloxPlaceId } from "lib/robloxPlaceId";
import StudioTargetPicker from "./StudioTargetPicker";

export default function StudioPlaceChip({
  preference = null,
  options = [],
  connected = false,
  studioEnabled = false,
  onChangePlace,
  onSelectPlace,
  onRequestConnect,
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
  const pickerOptions = hasOptions ? options : [];
  const canOpen = connected && hasOptions;
  const canRequestConnect =
    !connected && typeof onRequestConnect === "function";
  const canInteract = canOpen || canRequestConnect;
  const selectedTargetId = String(
    preference?.targetId || preference?.studioTargetId || "",
  ).trim();
  const selectedPlaceId = normalizeRobloxPlaceId(preference?.placeId);
  const selectedTargetIsLive = Boolean(
    preference &&
    options.some((option) => {
      const optionTargetId = String(
        option?.id || option?.targetId || option?.studioTargetId || "",
      ).trim();
      if (selectedTargetId) return optionTargetId === selectedTargetId;
      return (
        selectedPlaceId &&
        normalizeRobloxPlaceId(option?.placeId) === selectedPlaceId
      );
    }),
  );
  const displayLabel = !connected
    ? label
      ? `${label} disconnected · reconnect to continue`
      : "Studio disconnected"
    : label && !selectedTargetIsLive
      ? `${label} is not live · choose again`
      : label
        ? label
        : hasOptions
          ? "Choose a Studio place"
          : "No live Studio place";

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={(event) => {
          if (canRequestConnect) {
            onRequestConnect(event.currentTarget);
            return;
          }
          if (!canOpen) return;
          setOpen(!open);
        }}
        disabled={!canInteract}
        className={`studio-place-chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus-ring xl:min-h-0 ${
          connected && label && selectedTargetIsLive
            ? "border-[color-mix(in_srgb,var(--ds-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_10%,transparent)] text-[var(--ds-info)] hover:bg-[color-mix(in_srgb,var(--ds-info)_14%,transparent)]"
            : "border-[var(--nx-rule)] bg-[var(--nx-muted-surface)] text-[var(--nx-text-secondary)] hover:bg-[var(--nx-raised-surface)]"
        } ${canInteract ? "cursor-pointer" : "cursor-default opacity-90"}`}
        aria-expanded={canOpen ? open : undefined}
        aria-haspopup={canRequestConnect ? "dialog" : canOpen ? "listbox" : undefined}
        aria-controls={
          canRequestConnect ? "studio-connection-dialog" : undefined
        }
        aria-label={
          canRequestConnect
            ? "Studio disconnected. Open connection options"
            : displayLabel
        }
        title={
          canRequestConnect ? "Open Studio connection options" : displayLabel
        }
      >
        {!connected ? (
          <span className="studio-place-chip__signal" aria-hidden="true" />
        ) : null}
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{displayLabel}</span>
        {canRequestConnect && (
          <span className="font-bold underline decoration-current/40 underline-offset-2">
            Connect
          </span>
        )}
        {canOpen && (
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && hasOptions && (
        <StudioTargetPicker
          selection={{
            prompt: label
              ? "Switch Studio place"
              : "Which Studio place should this chat use?",
            message: label
              ? "Pick another open place. In-progress agent runs will continue there after you confirm."
              : "Pick the open place before the agent starts.",
            options: pickerOptions,
          }}
          selectingTargetId={selectingTargetId}
          onSelect={async (option) => {
            const selected = await (onSelectPlace || onChangePlace)?.(option);
            // Async selection owns its success contract. Keeping the picker
            // open on an omitted/false result gives validation errors a stable
            // recovery surface instead of dismissing the user's choices.
            if (
              selected === true ||
              (selected && typeof selected === "object")
            ) {
              setOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
