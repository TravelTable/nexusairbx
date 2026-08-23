import { WandSparkles, ClipboardList, Bug, MessageCircle } from "lib/icons";

/**
 * Cursor-style operating modes (replaces the legacy expert personas).
 *
 *  - agent : autonomous build, no questions, plan streamed inline.
 *  - plan  : proposes a plan and waits for approval; may ask clarifying questions.
 *  - debug : diagnoses and fixes; no questions.
 *  - ask   : read-only conversational Q&A.
 *
 * All modes are free; premium is gated on model + token limits, not mode.
 */
export const CHAT_MODES = [
  {
    id: "agent",
    label: "Agent",
    icon: <WandSparkles className="w-4 h-4" />,
    color: "text-[var(--ds-text)]",
    bg: "bg-[var(--ds-fill-selected)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description:
      "Autonomously plans and builds your Roblox project end-to-end.",
    placeholder: "Describe what you want to build…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "plan",
    label: "Plan",
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-[var(--ds-text-secondary)]",
    bg: "bg-[var(--ds-fill-selected)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description:
      "Proposes a plan (and may ask a few questions) before building.",
    placeholder: "Describe what you want to plan…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "debug",
    label: "Debug",
    icon: <Bug className="w-4 h-4" />,
    color: "text-[var(--ds-warning)]",
    bg: "bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]",
    border:
      "hover:border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]",
    description: "Finds the root cause and fixes bugs. Paste an error or file.",
    placeholder: "Paste an error or describe the bug…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "ask",
    label: "Ask",
    icon: <MessageCircle className="w-4 h-4" />,
    color: "text-[var(--ds-text-secondary)]",
    bg: "bg-[var(--ds-fill-subtle)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description:
      "Read-only Q&A. When Studio is connected, can list and read scripts from your place.",
    placeholder: "Ask anything about Roblox development…",
    type: "operating-mode",
    requiresPremium: false,
  },
];

export const DEFAULT_CHAT_MODE = "agent";
