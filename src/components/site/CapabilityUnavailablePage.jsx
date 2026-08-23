import React from "react";
import { Link } from "react-router-dom";

import { Grid } from "lib/icons";
import NoIndexMeta from "../seo/NoIndexMeta";
import {
  editorialDisplayClass,
  editorialGutterClass,
  editorialPrimaryButtonClass,
  editorialSecondaryButtonClass,
} from "./editorialUi";

export default function CapabilityUnavailablePage({
  title,
  description,
  eyebrow = "Asset tools",
  pageTitle = `${title} | NexusRBX`,
}) {
  return (
    <main className={`min-h-[calc(100vh-4rem)] bg-[var(--ds-bg-canvas)] py-20 text-[var(--ds-text)] lg:py-28 ${editorialGutterClass}`}>
      <NoIndexMeta title={pageTitle} />
      <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
        <span className="mb-8 grid h-14 w-14 place-items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]">
          <Grid className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)]">{eyebrow}</p>
        <h1 className={`${editorialDisplayClass} mt-5 text-4xl sm:text-5xl`}>{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--ds-text-secondary)] sm:text-lg">{description}</p>
        <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            to="/ai"
            className={editorialPrimaryButtonClass}
          >
            Open AI workspace
          </Link>
          <Link
            to="/icons-market"
            className={`${editorialSecondaryButtonClass} gap-2`}
          >
            <Grid className="h-4 w-4" aria-hidden="true" /> Browse icon market
          </Link>
        </div>
      </section>
    </main>
  );
}
