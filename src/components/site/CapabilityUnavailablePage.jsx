import React from "react";
import { Link } from "react-router-dom";

import { ArrowRight, FileCode2, Grid, Radio } from "lib/icons";
import NoIndexMeta from "../seo/NoIndexMeta";
import {
  editorialDisplayClass,
  editorialGutterClass,
  editorialPrimaryButtonClass,
  editorialSecondaryButtonClass,
} from "./editorialUi";
import styles from "./CapabilityUnavailablePage.module.css";

export default function CapabilityUnavailablePage({
  title,
  description,
  eyebrow = "Asset tools",
  pageTitle = `${title} | NexusRBX`,
}) {
  return (
    <main
      className={`min-h-[calc(100vh-var(--nx-header-height))] bg-[var(--ds-bg-canvas)] py-12 text-[var(--ds-text)] lg:py-16 ${editorialGutterClass}`}
    >
      <NoIndexMeta title={pageTitle} />
      <section
        className={`${styles.surface} mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center`}
      >
        <div
          className={styles.signalMap}
          role="img"
          aria-label="Asset capability paused; AI workspace and icon market remain available"
        >
          <span>
            <Radio aria-hidden="true" />
            <small>Request</small>
          </span>
          <i aria-hidden="true" />
          <span className={styles.paused}>
            <Grid aria-hidden="true" />
            <small>Assets</small>
          </span>
          <i aria-hidden="true" />
          <span>
            <FileCode2 aria-hidden="true" />
            <small>Workspace</small>
          </span>
        </div>
        <p className="mt-5 text-xs font-semibold tracking-[0.08em] text-[var(--ds-accent)]">
          {eyebrow}
        </p>
        <h1 className={`${editorialDisplayClass} mt-3 text-4xl sm:text-5xl`}>
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--ds-text-secondary)] sm:text-lg">
          {description}
        </p>
        <p className={styles.recoveryNote}>
          <i
            className="nx-build-signal"
            data-state="warning"
            aria-hidden="true"
          />
          Your route is safe. Continue elsewhere and return when this capability
          is enabled.
        </p>
        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link to="/ai" className={`${editorialPrimaryButtonClass} gap-2`}>
            Open AI workspace{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
