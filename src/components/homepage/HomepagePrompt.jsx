"use client";

import { useRef, useState } from "react";
import { track } from "@vercel/analytics";

import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { homepagePrompt } from "../../content/homepageLanding";
import { getExperimentAnalyticsProperties, getHomepageCtaCopy } from "../../lib/experiments";
import { submitHomepagePrompt, trackHomepagePromptStarted } from "../../lib/homepageActivation";
import { cn } from "../../lib/utils";

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
  className,
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
      className={cn("mt-7 rounded-2xl border border-[var(--ds-border-strong)] bg-[var(--ds-surface-overlay)] p-3 shadow-xl shadow-black/10 backdrop-blur md:max-w-2xl", className)}
      onSubmit={handleSubmit}
      data-generation-intent-form="homepage"
      aria-busy={submitting}
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
          aria-invalid={Boolean(error)}
          aria-describedby="homepage-prompt-message"
          className="h-12 flex-none rounded-lg border-[var(--ds-border-strong)] bg-[var(--ds-surface-2)] px-4 text-base text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus-visible:ring-[var(--ds-accent)] sm:flex-1"
        />
        <Button
          type="submit"
          onClick={() => {
            methodRef.current = "button";
          }}
          disabled={!prompt.trim() || submitting}
          className="h-12 rounded-lg bg-[var(--ds-accent)] px-6 text-base font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)] sm:min-w-32"
        >
          {submitting ? homepagePrompt.loadingLabel : ctaText}
        </Button>
      </div>
      {error ? (
        <p id="homepage-prompt-message" className="mt-3 text-sm font-medium text-[var(--ds-danger)]" role="alert">
          {error}
        </p>
      ) : (
        <p id="homepage-prompt-message" className="mt-3 text-xs text-[var(--ds-text-muted)]">
          Your prompt is saved locally as a generation intent before opening the AI workspace.
        </p>
      )}
    </form>
  );
}
