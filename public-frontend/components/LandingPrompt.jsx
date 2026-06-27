"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { getExperimentAnalyticsProperties } from "../../src/lib/experiments";

function categorize(value, fallback) {
  const prompt = String(value || "").toLowerCase();
  if (/gui|ui|hud|menu|screen|button/.test(prompt)) return "roblox_ui";
  if (/studio|localscript|modulescript|remoteevent|placement/.test(prompt)) return "studio_workflow";
  if (/debug|error|fix|explain/.test(prompt)) return "script_debugging";
  return fallback || "roblox_scripting";
}

async function trackEvent(name, properties) {
  const payload = {
    ...getExperimentAnalyticsProperties(),
    ...properties,
  };
  track(name, payload);
  try {
    const { trackProductEvent } = await import("../../src/lib/productAnalytics");
    await trackProductEvent(name, payload);
  } catch (_) {
    // Public pages still emit Vercel Analytics if Firebase analytics is unavailable.
  }
}

export default function LandingPrompt({
  slug,
  category,
  mode,
  modeLabel,
  cta,
  placeholder,
  initialPrompt = "",
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    void trackEvent("landing_page_view", {
      landing_page: `/${slug}`,
      landing_page_category: category,
    });
    void trackEvent("generator_mode_selected", {
      landing_page: `/${slug}`,
      landing_page_category: category,
      generator_mode: mode,
      selection_source: "page_default",
    });
  }, [category, mode, slug]);

  const updatePrompt = (event) => {
    const next = event.target.value;
    setPrompt(next);
    if (!startedRef.current && next.trim()) {
      startedRef.current = true;
      void trackEvent("homepage_prompt_started", {
        surface: "search_landing_page",
        landing_page: `/${slug}`,
        landing_page_category: category,
      });
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    setError("");

    if (!trimmed) {
      setError("Describe the Roblox behavior you want to build first.");
      return;
    }

    setSubmitting(true);
    try {
      const { createGenerationIntent } = await import("../../src/lib/generationIntent");
      const intent = createGenerationIntent({
        prompt: trimmed,
        mode,
        source: `landing:${slug}`,
      });
      const promptCategory = categorize(trimmed, category);

      await trackEvent("landing_prompt_submitted", {
        surface: "search_landing_page",
        landing_page: `/${slug}`,
        landing_page_category: category,
        generator_mode: mode,
        prompt_length: trimmed.length,
        prompt_category: promptCategory,
      });
      await trackEvent("generation_intent_created", {
        surface: "search_landing_page",
        landing_page: `/${slug}`,
        landing_page_category: category,
        generator_mode: intent.mode,
        source: intent.source,
        prompt_length: trimmed.length,
        prompt_category: promptCategory,
      });

      window.location.assign("/ai");
    } catch (err) {
      setSubmitting(false);
      setError(err?.message || "Could not start generation. Try again.");
    }
  };

  return (
    <form
      className="prompt-panel"
      onSubmit={submit}
      data-generation-intent-form={slug}
      data-generation-mode={mode}
      data-landing-category={category}
    >
      <label htmlFor={`${slug}-prompt`} className="sr-only">Describe your Roblox request</label>
      <input
        id={`${slug}-prompt`}
        name="prompt"
        value={prompt}
        onChange={updatePrompt}
        placeholder={placeholder}
        autoComplete="off"
        disabled={submitting}
      />
      <button className="button button-primary" type="submit" disabled={!prompt.trim() || submitting}>
        {submitting ? "Opening..." : cta}
      </button>
      <p className="prompt-mode-note">Default mode: {modeLabel}</p>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
    </form>
  );
}
