import React from "react";
import { Hash } from "lib/icons";
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
      className="absolute bottom-full left-0 right-0 z-30 mb-1.5 overflow-hidden rounded-xl border border-white/10 bg-[#0D0D0D] shadow-2xl"
      role="listbox"
      aria-label="Composer commands"
    >
      <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <Hash className="h-3 w-3" />
        Commands
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
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
                  active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                }`}
              >
                <span className="mt-0.5 font-mono text-[12px] font-semibold text-[#7ddcff]">
                  {command.label}
                </span>
                <span className="min-w-0 flex-1 text-[11px] leading-snug text-gray-400">
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
