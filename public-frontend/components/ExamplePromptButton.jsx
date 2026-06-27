"use client";

import { track } from "@vercel/analytics";
import { getExperimentAnalyticsProperties } from "../../src/lib/experiments";

export default function ExamplePromptButton({ prompt, title, slug, category }) {
  const selectPrompt = async () => {
    const input = document.getElementById(`${slug}-prompt`);
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, prompt);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }

    const payload = {
      ...getExperimentAnalyticsProperties(),
      landing_page: `/${slug}`,
      landing_page_category: category,
      example_label: title,
    };
    track("example_prompt_selected", payload);
    try {
      const { trackProductEvent } = await import("../../src/lib/productAnalytics");
      await trackProductEvent("example_prompt_selected", payload);
    } catch (_) {
      // Vercel Analytics has already recorded the event.
    }
  };

  return (
    <button className="copy-button" type="button" onClick={selectPrompt}>
      Use this prompt
    </button>
  );
}
