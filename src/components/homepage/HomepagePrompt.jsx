"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";

import { Button } from "../shadcn/button";
import { Label } from "../shadcn/label";
import { Textarea } from "../shadcn/textarea";
import { homepagePrompt } from "../../content/homepageLanding";
import { getExperimentAnalyticsProperties, getHomepageCtaCopy } from "../../lib/experiments";
import { submitHomepagePrompt, trackHomepagePromptStarted } from "../../lib/homepageActivation";
import { cn } from "../../lib/utils";
import styles from "./HomepagePrompt.module.css";

const CREATION_MODES = [
  {
    id: "agent",
    label: "Agent",
    description: "Plan and build",
  },
  {
    id: "script",
    label: "Script",
    description: "Focused Luau",
  },
  {
    id: "asset",
    label: "Asset",
    description: "Image assets",
  },
];

function ModeIcon({ mode }) {
  if (mode === "script") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16" />
      </svg>
    );
  }

  if (mode === "asset") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <path d="m5.5 18 4.5-4 3 2.5 2.5-2 3 3.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3M5.6 5.6l2.1 2.1M18.4 5.6l-2.1 2.1" />
      <rect x="4" y="8" width="16" height="12" rx="4" />
      <path d="M8 14h.01M16 14h.01M9 17h6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10.5 3.25 3.25L15.5 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

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
  inputRef,
}) {
  const [prompt, setPrompt] = useState("");
  const [creationMode, setCreationMode] = useState("agent");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [promptOverflowing, setPromptOverflowing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const promptStartedRef = useRef(false);
  const methodRef = useRef("button");
  const modeControlRef = useRef(null);
  const internalInputRef = useRef(null);
  const ctaText = submitLabel || getHomepageCtaCopy() || homepagePrompt.submitLabel;
  const messageId = `${promptId}-message`;
  const selectedMode = CREATION_MODES.find(({ id }) => id === creationMode) || CREATION_MODES[0];

  const assignInputRef = useCallback((node) => {
    internalInputRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) inputRef.current = node;
  }, [inputRef]);

  const updatePromptOverflow = useCallback(() => {
    const node = internalInputRef.current;
    if (node) setPromptOverflowing(node.scrollWidth > node.clientWidth + 1);
  }, []);

  useEffect(() => {
    if (!suggestedPrompt) return;
    setPrompt(suggestedPrompt);
    setError("");
  }, [suggestedPrompt, suggestionVersion]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updatePromptOverflow);
    window.addEventListener("resize", updatePromptOverflow);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePromptOverflow);
    };
  }, [prompt, updatePromptOverflow]);

  useEffect(() => {
    if (!modeMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!modeControlRef.current?.contains(event.target)) setModeMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setModeMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [modeMenuOpen]);

  const handleChange = (event) => {
    const next = event.target.value;
    setPrompt(next);
    trackHomepagePromptStarted({
      value: next,
      promptStartedRef,
      surface,
      trackEvent: trackHomepageEvent,
      creationMode,
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
      creationMode,
    });
    methodRef.current = "button";
  };

  return (
    <form
      className={cn(
        styles.composer,
        prompt.trim() && styles.composerReady,
        submitting && styles.composerSubmitting,
        className,
      )}
      onSubmit={handleSubmit}
      data-generation-intent-form="homepage"
      data-home-prompt={promptId}
      aria-busy={submitting}
    >
      <div className={styles.promptSurface}>
        <div ref={modeControlRef} className={styles.modeControl}>
          <button
            type="button"
            className={styles.modeTrigger}
            aria-label={`Choose creation mode. Current mode: ${selectedMode.label}`}
            aria-haspopup="true"
            aria-expanded={modeMenuOpen}
            title={`Change creation mode (${selectedMode.label})`}
            onClick={() => setModeMenuOpen((open) => !open)}
          >
            <span key={selectedMode.id} className={styles.currentModeIcon}>
              <ModeIcon mode={selectedMode.id} />
            </span>
            <span className={styles.modeAddBadge}><PlusIcon /></span>
          </button>
          <div
            className={cn(styles.modeMenu, modeMenuOpen && styles.modeMenuOpen)}
            role="group"
            aria-label="Creation mode"
            aria-hidden={!modeMenuOpen}
            inert={!modeMenuOpen ? "inert" : undefined}
          >
            {CREATION_MODES.map(({ id, label, description }) => (
              <button
                key={id}
                type="button"
                className={cn(styles.modeButton, creationMode === id && styles.modeButtonActive)}
                aria-label={label}
                aria-pressed={creationMode === id}
                title={description}
                tabIndex={modeMenuOpen ? 0 : -1}
                onClick={() => {
                  setCreationMode(id);
                  setModeMenuOpen(false);
                }}
              >
                <span className={styles.modeIcon}><ModeIcon mode={id} /></span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className={cn(styles.promptField, promptOverflowing && styles.promptFieldOverflowing)}>
          <Label htmlFor={promptId} className={styles.srOnly}>
            {homepagePrompt.label}
          </Label>
          <Textarea
            ref={assignInputRef}
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
            rows={1}
            className={styles.textarea}
          />
        </div>
        <div className={styles.actionBar}>
          <Button
            type="submit"
            onClick={() => {
              methodRef.current = "button";
            }}
            disabled={!prompt.trim() || submitting}
            className={styles.submitButton}
            aria-label={submitting ? homepagePrompt.loadingLabel : ctaText}
          >
            <span className={styles.submitLabel}>{submitting ? homepagePrompt.loadingLabel : ctaText}</span>
            {submitting ? <CheckIcon /> : <ArrowIcon />}
          </Button>
        </div>
        {submitting ? <span className={styles.submissionSweep} aria-hidden="true" /> : null}
      </div>

      {error ? (
        <p id={messageId} className={cn(styles.message, styles.error)} role="alert">
          {error}
        </p>
      ) : (
        <p id={messageId} className={styles.assistiveMessage}>
          {helperText}
        </p>
      )}
    </form>
  );
}
