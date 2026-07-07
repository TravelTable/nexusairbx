import { InfinityIcon, ClipboardList, Bug, MessageCircle } from "lib/icons";

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
    icon: <InfinityIcon className="w-4 h-4" />,
    color: "text-[#00f5d4]",
    bg: "bg-[#00f5d4]/10",
    border: "hover:border-[#00f5d4]/50",
    description: "Autonomously plans and builds your Roblox project end-to-end.",
    placeholder: "Describe what you want to build…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "plan",
    label: "Plan",
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-[#9b5de5]",
    bg: "bg-[#9b5de5]/10",
    border: "hover:border-[#9b5de5]/50",
    description: "Proposes a plan (and may ask a few questions) before building.",
    placeholder: "Describe what you want to plan…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "debug",
    label: "Debug",
    icon: <Bug className="w-4 h-4" />,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "hover:border-yellow-400/50",
    description: "Finds the root cause and fixes bugs. Paste an error or file.",
    placeholder: "Paste an error or describe the bug…",
    type: "operating-mode",
    requiresPremium: false,
  },
  {
    id: "ask",
    label: "Ask",
    icon: <MessageCircle className="w-4 h-4" />,
    color: "text-gray-300",
    bg: "bg-gray-400/10",
    border: "hover:border-gray-400/50",
    description: "Read-only Q&A. When Studio is connected, can list and read scripts from your place.",
    placeholder: "Ask anything about Roblox development…",
    type: "operating-mode",
    requiresPremium: false,
  },
];

export const DEFAULT_CHAT_MODE = "agent";
