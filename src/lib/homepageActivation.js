import { createGenerationIntent } from "./generationIntent";
import { chooseHomepageGeneratorMode } from "./experiments";
import { categorizePrompt, trackProductEvent } from "./productAnalytics";

export function trackHomepagePromptStarted({
  value,
  promptStartedRef,
  surface = "homepage",
  trackEvent = trackProductEvent,
}) {
  if (!promptStartedRef || promptStartedRef.current || !String(value || "").trim()) return;

  promptStartedRef.current = true;
  void trackEvent("homepage_prompt_started", {
    surface,
  });
}

export function submitHomepagePrompt({
  inputValue,
  method = "button",
  surface = "homepage",
  source = surface,
  emptyError = "Describe what you want to build first.",
  submittingRef,
  navigate,
  setError,
  setLoading,
  clearInput,
  createIntent = createGenerationIntent,
  trackEvent = trackProductEvent,
}) {
  if (submittingRef?.current) return { status: "ignored" };

  setError?.("");
  const prompt = String(inputValue || "").trim();
  if (!prompt) {
    setError?.(emptyError);
    return { status: "rejected" };
  }

  if (submittingRef) submittingRef.current = true;
  setLoading?.(true);
  const mode = chooseHomepageGeneratorMode(prompt);

  void trackEvent("homepage_prompt_submitted", {
    surface,
    method,
    generator_mode: mode,
    prompt_length: prompt.length,
    prompt_category: categorizePrompt(prompt),
  });

  try {
    const intent = createIntent({
      prompt,
      mode,
      source,
    });

    void trackEvent("generation_intent_created", {
      surface,
      generator_mode: intent.mode,
      source: intent.source,
      prompt_length: prompt.length,
      prompt_category: categorizePrompt(prompt),
    });

    navigate?.("/ai", {
      state: {
        generationIntentId: intent.id,
      },
    });
    clearInput?.();
    return { status: "started", intentId: intent.id };
  } catch (err) {
    if (submittingRef) submittingRef.current = false;
    setLoading?.(false);
    setError?.(err?.message || "Could not start generation. Please try again.");
    return { status: "failed", error: err };
  }
}
