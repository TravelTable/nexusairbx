import React from "react";
import { FileCode, Hash } from "lib/icons";
import { COMPOSER_COMMANDS, filterComposerCommands } from "../../../lib/composerCommands";

export default function ComposerCommandMenu({
  query = "",
  commands = COMPOSER_COMMANDS,
  activeIndex = 0,
  onSelect,
  onHoverIndex,
}) {
  const filtered = filterComposerCommands(query, commands);
  if (!filtered.length) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-30 mb-1.5 overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] shadow-2xl"
      role="listbox"
      aria-label="Composer commands"
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--ds-border-subtle)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]">
        <Hash className="h-3 w-3" />
        References &amp; commands
      </div>
      <ul className="max-h-56 overflow-y-auto py-1 scrollbar-subtle">
        {filtered.map((command, index) => {
          const active = index === activeIndex;
          return (
            <li key={command.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => onHoverIndex?.(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect?.(command);
                }}
                className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                  active ? "bg-[var(--ds-fill-hover)]" : "hover:bg-[var(--ds-fill-subtle)]"
                }`}
              >
                <span className="mt-0.5 inline-flex min-w-0 items-center gap-1.5 font-mono text-[12px] font-semibold text-[var(--ds-info)]">
                  {command.kind === "file" ? <FileCode className="h-3 w-3 shrink-0" /> : null}
                  <span className="truncate">{command.label}</span>
                </span>
                <span className="min-w-0 flex-1 text-[11px] leading-snug text-[var(--ds-text-secondary)]">
                  {command.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
