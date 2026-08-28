import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Send, SlidersHorizontal, Sparkles } from "lib/icons";
import InfoHint from "./InfoHint";

const STARTER_LABELS = ["Hero landing", "Friendly wave", "Stylized run"];

export default function MotionPromptComposer({
  hasAnimation,
  busy,
  value,
  onChange,
  onSubmit,
  onStarter,
  starterPrompts,
  inputRef,
}) {
  const reduceMotion = useReducedMotion();
  const label = hasAnimation ? "Refine this animation" : "Animation brief";

  return (
    <>
      {!hasAnimation ? (
        <div className="animate-starters">
          <div className="animate-field-heading">
            <span>Try a direction</span>
            <InfoHint label="Choose an example to generate immediately, or write your own brief below." side="right" />
          </div>
          <div aria-label="Starter prompts">
            {starterPrompts.map((starter, index) => (
              <motion.button
                key={starter}
                type="button"
                aria-label={starter}
                onClick={(event) => onStarter(event, starter)}
                disabled={busy}
                initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.035 }}
              >
                <i>0{index + 1}</i>
                <span>{STARTER_LABELS[index] || starter}</span>
                <Plus aria-hidden="true" />
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}

      <form className="animate-composer" onSubmit={onSubmit}>
        <div className="animate-field-heading">
          <label htmlFor="animation-prompt">{label}</label>
          <InfoHint label="Include the action, mood, timing, and any important body language." side="right" />
        </div>
        <div className="animate-composer__surface">
          <textarea
            ref={inputRef}
            id="animation-prompt"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={hasAnimation ? "Make the landing heavier and hold the final pose…" : "Describe the action, style, timing, and mood…"}
            maxLength={1000}
            rows={3}
            disabled={busy}
          />
          <div>
            <span><SlidersHorizontal aria-hidden="true" /> {hasAnimation ? "Rebuilds 3 variants" : "AI plans · compiler validates"}</span>
            <button type="submit" disabled={busy || value.trim().length < 3}>
              {hasAnimation ? <Sparkles aria-hidden="true" /> : <Send aria-hidden="true" />}
              {hasAnimation ? "Refine" : "Generate"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
