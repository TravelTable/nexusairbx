"use client";

import { ArrowRight, Download, Monitor, ShieldCheck } from "../../lib/icons";

export default function CompanionDownloadSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="companion-heading">
      <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#0c0f17] p-6 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex min-w-0 gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
            <Monitor size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">Desktop connector</p>
            <h2 id="companion-heading" className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Connect NexusRBX to Roblox Studio
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Run the secure local companion for Studio MCP, automatic reconnects, and clear connection health.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
              <ShieldCheck size={15} className="text-emerald-400" aria-hidden="true" />
              Signed installers for macOS and Windows
            </p>
          </div>
        </div>

        <a
          href="/downloads"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f17]"
        >
          <Download size={17} aria-hidden="true" />
          Download Connector
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
