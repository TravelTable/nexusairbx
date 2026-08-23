"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";

import { Button } from "../shadcn/button";
import { Label } from "../shadcn/label";
import { Textarea } from "../shadcn/textarea";
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
  promptId = "homepage-prompt",
  suggestedPrompt = "",
  suggestionVersion = 0,
  submitLabel,
  helperText = "Your idea is saved locally before the AI workspace opens.",
  showLabel = false,
  inputRef,
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const promptStartedRef = useRef(false);
  const methodRef = useRef("button");
  const ctaText = submitLabel || getHomepageCtaCopy() || homepagePrompt.submitLabel;
  const messageId = `${promptId}-message`;

  useEffect(() => {
    if (!suggestedPrompt) return;
    setPrompt(suggestedPrompt);
    setError("");
  }, [suggestedPrompt, suggestionVersion]);

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
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent?.isComposing) return;
    event.preventDefault();
    methodRef.current = "enter";
    event.currentTarget.form?.requestSubmit();
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
      className={cn("mt-7 border-y border-[var(--nx-rule)] bg-[var(--nx-work)] px-[15px] py-[15px] md:max-w-2xl", className)}
      onSubmit={handleSubmit}
      data-generation-intent-form="homepage"
      data-home-prompt={promptId}
      aria-busy={submitting}
    >
      <Label
        htmlFor={promptId}
        className={showLabel
          ? "mb-2 block text-sm font-semibold text-[var(--ds-text)]"
          : "sr-only"}
      >
        {homepagePrompt.label}
      </Label>
      <Textarea
          ref={inputRef}
          id={promptId}
          name="prompt"
          value={prompt}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={homepagePrompt.placeholder}
          autoComplete="off"
          disabled={submitting}
          aria-invalid={Boolean(error)}
          aria-describedby={messageId}
          rows={3}
          className="min-h-[92px] resize-none rounded-none border-0 border-l-2 border-[var(--nx-rule)] bg-transparent px-[15px] py-[9px] text-base leading-6 text-[var(--nx-text)] shadow-none placeholder:text-[var(--nx-text-muted)] focus-visible:border-[var(--nx-focus)] focus-visible:ring-0"
        />
      <div className="mt-[9px] flex flex-col gap-[9px] border-t border-[var(--nx-rule-quiet)] pt-[9px] sm:flex-row sm:items-center sm:justify-between">
        <span className="px-[5px] text-xs text-[var(--nx-text-muted)]">PROJECT REQUEST / Shift + Enter for a new line</span>
        <Button
          type="submit"
          onClick={() => {
            methodRef.current = "button";
          }}
          disabled={!prompt.trim() || submitting}
          className="h-11 rounded-none border-0 border-b border-[var(--nx-text-secondary)] bg-transparent px-[15px] text-sm font-semibold text-[var(--nx-text)] hover:border-[var(--nx-purple-muted)] hover:bg-[var(--nx-field)] hover:text-[var(--nx-purple)] disabled:border-[var(--nx-rule-quiet)] disabled:bg-transparent disabled:text-[var(--nx-text-disabled)] sm:min-w-32"
        >
          {submitting ? homepagePrompt.loadingLabel : ctaText}
        </Button>
      </div>
      {error ? (
        <p id={messageId} className="mt-[15px] text-sm font-medium text-[var(--nx-danger)]" role="alert">
          {error}
        </p>
      ) : (
        <p id={messageId} className="mt-[15px] text-xs text-[var(--nx-text-muted)]">
          {helperText}
        </p>
      )}
    </form>
  );
}
