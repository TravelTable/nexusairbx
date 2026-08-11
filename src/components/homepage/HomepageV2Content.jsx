"use client";

import { useEffect } from "react";

import { trackProductEvent } from "../../lib/productAnalytics";
import HomepageFeatures from "./HomepageFeatures";
import HomepageWorkflow from "./HomepageWorkflow";
import HomepageIntentEvidence from "./HomepageIntentEvidence";
import HomepageFooter from "./HomepageFooter";
import HomepagePrompt from "./HomepagePrompt";
import RobloxTrustStrip from "./RobloxTrustStrip";
import CompanionDownloadSection from "./CompanionDownloadSection";

export default function HomepageV2Content({
  surface = "homepage",
  navigate,
  user,
  authReady,
}) {
  useEffect(() => {
    void trackProductEvent(
      "landing_page_view",
      { landing_page: "/", landing_page_category: "homepage" },
      { dedupeKey: "homepage" },
    );
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--ds-bg-canvas)] pt-16 text-[var(--ds-text)]">

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 overflow-visible px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-14">
          <div className="flex min-w-0 flex-col items-center lg:items-start">
          <div className="relative mb-6 flex items-center justify-center rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-1)] p-3 shadow-lg shadow-black/10">
            <img
              src="/logo.png"
              alt="NexusRBX logo"
              width={64}
              height={64}
              className="h-16 w-16 rounded-xl object-contain"
            />
          </div>

          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)]">
            NexusRBX
          </p>

          <h1 className="mb-3 text-center text-[clamp(2.35rem,5vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--ds-text)] lg:text-left">
            AI Roblox Script Generator for Studio
          </h1>

          <p className="mb-8 max-w-2xl text-center text-lg leading-8 text-[var(--ds-text-secondary)] lg:text-left">
            Generate a focused Luau script from one prompt, or use the Studio agent to plan
            coordinated changes across multiple files and Roblox services.
          </p>

          <HomepagePrompt
            surface={surface}
            source={surface}
            navigateToAi={navigate}
            className="w-full max-w-2xl"
          />

          <RobloxTrustStrip user={user} authReady={authReady} />

          <a
            href="/downloads"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] px-4 py-2 text-sm font-semibold text-[var(--ds-text-secondary)] transition-[background-color,border-color,color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] motion-reduce:transform-none"
          >
            Get the desktop connector
            <span aria-hidden="true">→</span>
          </a>
          </div>

          <div className="relative w-full">
            <picture className="block">
              <source media="(max-width: 767px)" srcSet="/assets/nexus-product-mock-960.webp" type="image/webp" />
              <img
                src="/assets/nexus-product-mock-1344.webp"
                alt=""
                aria-hidden="true"
                width="1344"
                height="752"
                className="block h-auto w-full object-contain"
                loading="eager"
                fetchpriority="high"
                decoding="async"
              />
            </picture>
          </div>
        </section>

        <CompanionDownloadSection />
        <HomepageFeatures />
        <HomepageWorkflow />
        <HomepageIntentEvidence />
      </main>
      <HomepageFooter />
    </div>
  );
}
