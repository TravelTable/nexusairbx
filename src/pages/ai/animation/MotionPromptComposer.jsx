import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import CreationPromptComposer from "components/ai/chat/CreationPromptComposer";
import { AnimatedMotionIcon } from "components/ui/AnimatedActionIcon";
import { Plus } from "lib/icons";
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
  onAttachmentRequest,
}) {
  const reduceMotion = useReducedMotion();
  const label = hasAnimation ? "Refine this animation" : "Animation brief";

  return (
    <>
      {!hasAnimation ? (
        <div className="animate-starters">
          <div className="animate-field-heading">
            <span>Starting points</span>
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
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: reduceMotion ? 0 : index * 0.025 }}
              >
                <span>{STARTER_LABELS[index] || starter}</span>
                <Plus aria-hidden="true" />
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}

      <form className="animate-composer" onSubmit={onSubmit}>
        <CreationPromptComposer
          prompt={value}
          setPrompt={onChange}
          attachments={[]}
          setAttachments={() => {}}
          onSubmit={(event) => event?.currentTarget?.closest?.("form")?.requestSubmit()}
          onAttachmentRequest={onAttachmentRequest}
          attachmentLabel="Import an R15 GLB preview model"
          isGenerating={busy}
          disabled={busy}
          placeholder={hasAnimation ? "Make the landing heavier and hold the final pose…" : "Describe the action, timing, weight, and mood…"}
          promptAriaLabel={label}
          submitLabel={hasAnimation ? "Refine" : "Generate"}
          contextIcon={AnimatedMotionIcon}
          contextLabel={hasAnimation ? "Refine" : "Motion"}
          showWorkspaceOptions={false}
          inputRef={inputRef}
          regionClassName="animate-composer-region"
          composerClassName="animate-prompt-composer"
        />
      </form>
    </>
  );
}
