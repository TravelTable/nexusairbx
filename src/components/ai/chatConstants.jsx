import { WandSparkles, ClipboardList, HelpCircle } from "lib/icons";
import { DEFAULT_CHAT_MODE } from "../../lib/chatModes";

/**
 * User-facing conversation modes inside the Agent workspace.
 *
 *  - plan  : proposes a plan and waits for approval; may ask clarifying questions.
 *  - ask   : answers with project context without running development tools.
 *  - agent : autonomously inspects, implements, and verifies actionable requests.
 *
 * All modes are free; premium is gated on model + token limits, not mode.
 */
export const CHAT_MODES = [
  {
    id: "plan",
    label: "Plan",
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-[var(--ds-text-secondary)]",
    bg: "bg-[var(--ds-fill-selected)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description: "Discusses the approach and plans in chat. Nothing changes until you explicitly proceed.",
    placeholder: "Describe what you want to plan…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "ask",
    label: "Ask",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "text-[var(--ds-text-secondary)]",
    bg: "bg-[var(--ds-fill-selected)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description: "Talks through the project, explains code, and gives advice without making changes.",
    placeholder: "Ask Nexus about this project…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "agent",
    label: "Agent",
    icon: <WandSparkles className="w-4 h-4" />,
    color: "text-[var(--ds-text)]",
    bg: "bg-[var(--ds-fill-selected)]",
    border: "hover:border-[var(--ds-border-strong)]",
    description: "Builds autonomously, makes safe assumptions, and verifies the result.",
    placeholder: "Tell Nexus what to build or fix…",
    type: "operating-mode",
    requiresPremium: false,
  },
];

export { DEFAULT_CHAT_MODE };
