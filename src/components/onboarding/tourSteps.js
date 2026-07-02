export const TOUR_STEPS = [
  {
    target: '[data-tour="prompt-input"]',
    targets: ['[data-tour="prompt-input"]', "#tour-prompt-box"],
    title: "Describe Your Needs",
    content: "Type what you want to build. Mention objects, triggers, rewards, Roblox services, or Studio context the agent should use.",
    position: "right"
  },
  {
    target: '[data-tour="improve-btn"]',
    targets: ['[data-tour="improve-btn"]'],
    title: "Polish Your Prompt",
    content: "Click Improve to expand your description into a detailed brief before the agent starts planning and generating.",
    position: "bottom"
  },
  {
    target: '[data-tour="generate-btn"]',
    targets: ['[data-tour="generate-btn"]', "#tour-generate-button"],
    title: "Start Agent Build",
    content: "Press Enter or click Generate. The agent will plan, ask clarifying questions when needed, and produce multi-file output.",
    position: "top"
  },
  {
    target: '[data-tour="studio-pair"]',
    targets: ['[data-tour="studio-pair"]'],
    title: "Roblox Studio Bridge",
    content: "Pair your workspace directly with Roblox Studio using our companion plugin to inspect and apply generated scripts.",
    position: "bottom"
  }
];
