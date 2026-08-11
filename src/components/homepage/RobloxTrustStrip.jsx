import { Code, Gamepad2, ShieldCheck } from "lib/icons";

import PluginCallout from "./PluginCallout";

export default function RobloxTrustStrip() {
  const pillClass =
    "inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-2 text-xs font-medium text-[var(--ds-text-secondary)]";

  return (
    <section className="relative mt-6 w-full max-w-3xl pb-10 lg:pb-11" aria-label="NexusRBX trust and Studio details">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className={pillClass}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Review before Studio writes
        </span>

        <span className={pillClass}>
          <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
          OAuth credentials stay server-side
        </span>

        <div className="relative inline-flex">
          <a
            href="https://create.roblox.com/store/asset/83865885181263/NexusRBX-Ai"
            target="_blank"
            rel="noopener noreferrer"
            className={pillClass + " transition-[background-color,border-color,color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] motion-reduce:transform-none"}
          >
            <Code className="h-3.5 w-3.5" aria-hidden="true" />
            Built for Roblox Studio
          </a>
          <PluginCallout className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
