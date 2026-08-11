import React from "react";
import { FileCode, Clock, Search, ChevronRight, Layout } from "lib/icons";
import { toLocalTime } from "../../lib/aiUtils";

export default function LibraryView({ scripts, onOpenScript }) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
            <FileCode className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-[var(--ds-text)] tracking-tight uppercase">Saved Scripts</h2>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-muted)]" />
          <input 
            type="text" 
            placeholder="Search saved scripts..."
            className="w-full bg-[var(--ds-surface-2)] border border-[var(--ds-border-subtle)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent)] transition-all"
          />
        </div>
      </div>

      {scripts.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 bg-[var(--ds-fill-subtle)] border border-dashed border-[var(--ds-border-subtle)] rounded-3xl">
          <FileCode className="w-12 h-12 text-[var(--ds-text-muted)] mb-4" />
          <h3 className="text-lg font-bold text-[var(--ds-text)] mb-2">No scripts saved yet</h3>
          <p className="text-[var(--ds-text-muted)] max-w-xs">Save code snippets from your chats to see them here in your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((script) => (
            <button
              key={script.id}
              onClick={() => onOpenScript(script)}
              className="group flex items-start gap-4 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] p-5 text-left transition-[border-color,background-color] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)]"
            >
              <div className={`p-3 rounded-xl ${script.type === 'ui' ? 'bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]' : 'bg-[color-mix(in_srgb,var(--ds-plan)_12%,transparent)] text-[var(--ds-plan)]'}`}>
                {script.type === 'ui' ? <Layout className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[var(--ds-text)] mb-1 truncate group-hover:text-[var(--ds-accent)] transition-colors">{script.title}</div>
                <div className="flex items-center gap-3 text-xs text-[var(--ds-text-muted)]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {toLocalTime(script.updatedAt)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--ds-surface-2)] text-[10px] uppercase tracking-wider">
                    {script.type || 'script'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--ds-text-muted)] group-hover:text-[var(--ds-text)] transition-colors self-center" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
