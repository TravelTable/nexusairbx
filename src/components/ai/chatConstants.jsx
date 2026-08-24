import { WandSparkles, ClipboardList } from "lib/icons";
import { DEFAULT_CHAT_MODE } from "../../lib/chatModes";

/**
 * User-facing conversation modes. Legacy Ask and Debug values are normalized
 * to Build when an older preference or chat is opened.
 *
 *  - agent : autonomous build, no questions, plan streamed inline.
 *  - plan  : proposes a plan and waits for approval; may ask clarifying questions.
 *
 * All modes are free; premium is gated on model + token limits, not mode.
 */
export const CHAT_MODES = [
  {
    id: "agent",
    label: "Build",
    icon: <WandSparkles className="w-4 h-4" />,
    color: "text-[var(--ds-text)]",
    bg: "bg-[var(--ds-fill-selected)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description:
      "Builds autonomously, makes safe assumptions, and verifies the result.",
    placeholder: "Describe the outcome you want Nexus to build…",
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
      "Discusses the approach and creates a reviewable plan before any changes.",
    placeholder: "Describe what you want to plan before building…",
    type: "operating-mode",
    requiresPremium: false,
  },
];

export { DEFAULT_CHAT_MODE };
