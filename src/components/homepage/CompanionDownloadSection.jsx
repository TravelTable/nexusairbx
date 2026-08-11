"use client";

import { ArrowRight, Download, Monitor, ShieldCheck } from "../../lib/icons";

export default function CompanionDownloadSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="companion-heading">
      <div className="flex flex-col gap-6 rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-1)] p-6 shadow-lg shadow-black/5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex min-w-0 gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
            <Monitor size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">Desktop connector</p>
            <h2 id="companion-heading" className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--ds-text)] sm:text-2xl">
              Connect NexusRBX to Roblox Studio
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ds-text-secondary)]">
              Run the secure local companion for Studio MCP, automatic reconnects, and clear connection health.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--ds-text-muted)]">
              <ShieldCheck size={15} className="text-[var(--ds-success)]" aria-hidden="true" />
              macOS is signed and notarized; Windows is currently unsigned
            </p>
          </div>
        </div>

        <a
          href="/downloads"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--ds-accent)] px-5 text-sm font-semibold text-[var(--ds-accent-foreground)] transition-[background-color,transform] hover:bg-[var(--ds-accent-hover)] active:scale-[0.98] active:bg-[var(--ds-accent-pressed)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-1)] motion-reduce:transform-none"
        >
          <Download size={17} aria-hidden="true" />
          Download Connector
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
