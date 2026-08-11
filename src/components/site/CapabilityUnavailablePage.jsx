import React from "react";
import { Link } from "react-router-dom";

import { Grid, Sparkles } from "lib/icons";
import NoIndexMeta from "../seo/NoIndexMeta";

export default function CapabilityUnavailablePage({
  title,
  description,
  eyebrow = "Asset tools",
  pageTitle = `${title} | NexusRBX`,
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--ds-bg-canvas)] px-4 py-16 text-[var(--ds-text)] sm:px-6">
      <NoIndexMeta title={pageTitle} />
      <section className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] px-6 py-12 text-center shadow-[var(--ds-shadow-panel)] sm:px-10">
        <span className="mb-6 grid h-14 w-14 place-items-center rounded-[14px] border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-[var(--ds-accent)]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ds-text-secondary)]">{description}</p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            to="/ai"
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--ds-accent)] px-6 py-3 text-sm font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:scale-[0.985]"
          >
            Open AI workspace
          </Link>
          <Link
            to="/icons-market"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-6 py-3 text-sm font-semibold text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)] active:scale-[0.985]"
          >
            <Grid className="h-4 w-4" aria-hidden="true" /> Browse icon market
          </Link>
        </div>
      </section>
    </main>
  );
}
