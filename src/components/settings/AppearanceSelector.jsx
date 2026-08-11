import React from "react";
import { cn } from "../../lib/utils";

export const APPEARANCE_OPTIONS = Object.freeze([
  { value: "system", label: "System", description: "Follow this device" },
  { value: "light", label: "Light", description: "Bright neutral surfaces" },
  { value: "dark", label: "Dark", description: "Deep neutral surfaces" },
]);

export default function AppearanceSelector({ value, onChange, disabled = false }) {
  const optionRefs = React.useRef([]);
  const selectedIndex = APPEARANCE_OPTIONS.findIndex((option) => option.value === value);

  const selectAndFocus = (index) => {
    if (disabled || index < 0 || index >= APPEARANCE_OPTIONS.length) return;
    onChange?.(APPEARANCE_OPTIONS[index].value);
    optionRefs.current[index]?.focus();
  };

  const handleKeyDown = (event, index) => {
    let nextIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % APPEARANCE_OPTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + APPEARANCE_OPTIONS.length) % APPEARANCE_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = APPEARANCE_OPTIONS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectAndFocus(nextIndex);
  };

  return (
    <div
      className="grid gap-2 rounded-xl border border-border bg-muted/25 p-2 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Color appearance"
    >
      {APPEARANCE_OPTIONS.map((option, index) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            tabIndex={disabled ? -1 : selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange?.(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "min-h-16 rounded-lg border px-4 py-3 text-left transition-[border-color,background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-accent/40 bg-accent/10 text-foreground shadow-sm"
                : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
            )}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
