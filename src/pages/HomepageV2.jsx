import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { canonicalUrl } from "../lib/seo";
import { trackProductEvent } from "../lib/productAnalytics";
import { submitHomepagePrompt, trackHomepagePromptStarted } from "../lib/homepageActivation";

import HomepageFeatures from "../components/homepage/HomepageFeatures";
import HomepageWorkflow from "../components/homepage/HomepageWorkflow";
import HomepageTestimonial from "../components/homepage/HomepageTestimonial";
import HomepageFooter from "../components/homepage/HomepageFooter";
import RobloxTrustStrip from "../components/homepage/RobloxTrustStrip";
import HomepageHeader from "../components/homepage/HomepageHeader";

export default function HomepageV2() {
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submittingRef = useRef(false);
  const promptStartedRef = useRef(false);

  useEffect(() => {
    void trackProductEvent(
      "landing_page_view",
      { landing_page: "/", landing_page_category: "homepage" },
      { dedupeKey: "homepage" },
    );
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim() || submitting) return;

    submitHomepagePrompt({
      inputValue: prompt,
      method: "button",
      submittingRef,
      navigate,
      setError,
      setLoading: setSubmitting,
      clearInput: () => setPrompt(""),
    });
  }

  return (
    <>
      <Helmet>
        <title>NexusRBX — AI Roblox Studio Code Agent</title>
        <meta
          name="description"
          content="Describe what you want to build. NexusRBX generates production-ready Luau code for Roblox Studio — powered by AI."
        />
        <link rel="canonical" href={canonicalUrl("/")} />
        <meta property="og:title" content="NexusRBX — AI Roblox Studio Code Agent" />
        <meta
          property="og:description"
          content="Describe what you want to build. NexusRBX generates production-ready Luau code for Roblox Studio — powered by AI."
        />
        <meta property="og:url" content={canonicalUrl("/")} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ── Background effects ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#00f5d4]/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#9b5de5]/10 blur-[120px] animate-pulse" />
      </div>

      <HomepageHeader />

      {/* ── Hero ── */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 pt-20 pb-16">
        {/* Logo + glow */}
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

        {/* Wordmark */}
        <h1 className="mb-4 bg-gradient-to-r from-[#00f5d4] to-[#9b5de5] bg-clip-text text-4xl font-black tracking-tight text-transparent">
          NexusRBX
        </h1>

        {/* Headline */}
        <p className="mb-3 text-center font-black tracking-tight text-white text-[clamp(2rem,5vw,3.5rem)] leading-[1.1]">
          Your Intelligent Roblox Studio Code Agent
        </p>

        {/* Sub-headline */}
        <p className="mb-8 max-w-2xl text-center text-lg text-zinc-400">
          Describe what you want to build. NexusRBX generates production-ready Luau code.
        </p>

        {/* ── Prompt bar ── */}
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                trackHomepagePromptStarted({ value: e.target.value, promptStartedRef });
              }}
              placeholder="Make a round timer script with intermission and victory rewards..."
              className="h-12 flex-1 border-0 bg-transparent px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !prompt.trim()}
              className="h-12 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] px-6 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Generate
            </button>
          </form>

          {error && (
            <p className="mt-2 px-4 text-sm text-rose-300">{error}</p>
          )}

          <p className="mt-3 text-xs font-semibold text-zinc-500">
            Your prompt is saved locally as a generation intent before opening the AI workspace.
          </p>
        </div>

        {/* Trust strip */}
        <RobloxTrustStrip />
      </section>

      {/* ── Below the fold ── */}
      <HomepageFeatures />
      <HomepageWorkflow />
      <HomepageTestimonial />
      <HomepageFooter />
    </>
  );
}
