"use client";

import { useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  chooseHomepageGeneratorMode,
  getExperimentAnalyticsProperties,
  getHomepageCtaCopy,
} from "../../src/lib/experiments";

function categorizePrompt(prompt) {
  const value = prompt.toLowerCase();
  if (/script|lua|luau|code|server|local/.test(value)) return "script";
  if (/ui|menu|button|screen|frame|interface/.test(value)) return "ui";
  if (/datastore|leaderboard|inventory|shop|system/.test(value)) return "system";
  return "general";
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
    // Vercel Analytics remains the public-page fallback if Firebase analytics is unavailable.
  }
}

export default function HomePrompt() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);
  const ctaText = getHomepageCtaCopy();

  const onChange = (event) => {
    const next = event.target.value;
    setPrompt(next);
    if (!startedRef.current && next.trim()) {
      startedRef.current = true;
      void trackEvent("homepage_prompt_started", { surface: "public_next_homepage" });
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    setError("");

    if (!trimmed) {
      setError("Describe the Roblox script or UI you want first.");
      return;
    }

    setSubmitting(true);
    try {
      const { createGenerationIntent } = await import("../../src/lib/generationIntent");
      const mode = chooseHomepageGeneratorMode(trimmed);
      const intent = createGenerationIntent({
        prompt: trimmed,
        mode,
        source: "public_next_homepage",
      });

      await trackEvent("homepage_prompt_submitted", {
        surface: "public_next_homepage",
        generator_mode: mode,
        prompt_length: trimmed.length,
        prompt_category: categorizePrompt(trimmed),
      });
      await trackEvent("generation_intent_created", {
        surface: "public_next_homepage",
        generator_mode: intent.mode,
        source: intent.source,
        prompt_length: trimmed.length,
        prompt_category: categorizePrompt(trimmed),
      });

      window.location.assign("/ai");
    } catch (err) {
      setSubmitting(false);
      setError(err?.message || "Could not start generation. Try again.");
    }
  };

  return (
    <form className="prompt-panel" onSubmit={submit} data-generation-intent-form="homepage">
      <label htmlFor="homepage-prompt" className="sr-only">Describe a Roblox script or UI idea</label>
      <input
        id="homepage-prompt"
        name="prompt"
        value={prompt}
        onChange={onChange}
        placeholder="Make a round timer script with intermission and victory rewards..."
        autoComplete="off"
        disabled={submitting}
      />
      <button className="button button-primary" type="submit" disabled={!prompt.trim() || submitting}>
        {submitting ? "Opening..." : ctaText}
      </button>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
    </form>
  );
}
