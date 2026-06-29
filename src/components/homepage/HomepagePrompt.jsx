"use client";

import { useRef, useState } from "react";
import { track } from "@vercel/analytics";

import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { homepagePrompt } from "../../content/homepageLanding";
import { getExperimentAnalyticsProperties, getHomepageCtaCopy } from "../../lib/experiments";
import { submitHomepagePrompt, trackHomepagePromptStarted } from "../../lib/homepageActivation";

async function trackHomepageEvent(name, properties) {
  const payload = {
    ...getExperimentAnalyticsProperties(),
    ...properties,
  };

  try {
    track(name, payload);
  } catch (_) {
    // Product analytics below remains the durable fallback for app sessions.
  }

  try {
    const { trackProductEvent } = await import("../../lib/productAnalytics");
    await trackProductEvent(name, payload);
  } catch (_) {
    // Public static pages should still submit even if Firebase analytics is unavailable.
  }
}

export default function HomepagePrompt({
  surface = "homepage",
  source = surface,
  navigateToAi,
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const promptStartedRef = useRef(false);
  const methodRef = useRef("button");
  const ctaText = getHomepageCtaCopy() || homepagePrompt.submitLabel;

  const handleChange = (event) => {
    const next = event.target.value;
    setPrompt(next);
    trackHomepagePromptStarted({
      value: next,
      promptStartedRef,
      surface,
      trackEvent: trackHomepageEvent,
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") methodRef.current = "enter";
  };

  const navigate = (to, options) => {
    if (navigateToAi) {
      navigateToAi(to, options);
      return;
    }
    if (typeof window !== "undefined") window.location.assign(to);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitHomepagePrompt({
      inputValue: prompt,
      method: methodRef.current,
      surface,
      source,
      emptyError: homepagePrompt.errorEmpty,
      submittingRef,
      navigate,
      setError,
      setLoading: setSubmitting,
      clearInput: () => setPrompt(""),
      trackEvent: trackHomepageEvent,
    });
    methodRef.current = "button";
  };

  return (
    <form
      className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/25 backdrop-blur md:max-w-2xl"
      onSubmit={handleSubmit}
      data-generation-intent-form="homepage"
    >
      <Label htmlFor="homepage-prompt" className="sr-only">
        {homepagePrompt.label}
      </Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="homepage-prompt"
          name="prompt"
          value={prompt}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={homepagePrompt.placeholder}
          autoComplete="off"
          disabled={submitting}
          className="h-12 flex-1 border-white/10 bg-black/30 px-4 text-base text-white placeholder:text-zinc-500"
        />
        <Button
          type="submit"
          onClick={() => {
            methodRef.current = "button";
          }}
          disabled={!prompt.trim() || submitting}
          className="h-12 px-6 text-base font-bold sm:min-w-32"
        >
          {submitting ? homepagePrompt.loadingLabel : ctaText}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-rose-300" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-xs font-semibold text-zinc-500">
          Your prompt is saved locally as a generation intent before opening the AI workspace.
        </p>
      )}
    </form>
  );
}
