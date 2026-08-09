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
    <div className="min-h-screen overflow-x-hidden bg-[#07090f] pt-16 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#00f5d4]/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#9b5de5]/10 blur-[120px] animate-pulse" />
      </div>

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <section className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-visible px-4 pt-20 pb-16">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full bg-[#00f5d4]/20 blur-2xl" />
            <img
              src="/logo.png"
              alt="NexusRBX logo"
              width={64}
              height={64}
              className="relative h-16 w-16 rounded-xl object-contain"
            />
          </div>

          <p className="mb-4 bg-gradient-to-r from-[#00f5d4] to-[#9b5de5] bg-clip-text text-lg font-black uppercase tracking-[0.18em] text-transparent">
            NexusRBX
          </p>

          <h1 className="mb-3 text-center text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.1] tracking-tight text-white">
            AI Roblox Script Generator for Studio
          </h1>

          <p className="mb-8 max-w-2xl text-center text-lg text-zinc-400">
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
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] hover:text-cyan-100"
          >
            Get the Studio companion
            <span aria-hidden="true">→</span>
          </a>
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
