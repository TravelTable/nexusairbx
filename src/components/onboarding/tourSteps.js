export const TOUR_STEPS = [
  {
    target: '[data-tour="mode-switcher"]',
    targets: ['[data-tour="mode-switcher"]'],
    mobileTargets: ['[data-tour="mobile-mode-switcher"]'],
    title: "Choose Your Mode",
    content: "Switch between Quick for instant, standalone scripts, or Agent Build for complex multi-file projects.",
    position: "bottom"
  },
  {
    target: '[data-tour="prompt-input"]',
    targets: ['[data-tour="prompt-input"]', "#tour-prompt-box"],
    title: "Describe Your Needs",
    content: "Type what your script should do. Mention any specific objects, triggers, rewards, or Roblox services you need.",
    position: "right"
  },
  {
    target: '[data-tour="improve-btn"]',
    targets: ['[data-tour="improve-btn"]'],
    title: "Polish Your Prompt",
    content: "Click 'Improve' to let the AI automatically expand your description into a detailed tech brief for better code results.",
    position: "bottom"
  },
  {
    target: '[data-tour="generate-btn"]',
    targets: ['[data-tour="generate-btn"]', "#tour-generate-button"],
    title: "Generate Luau Code",
    content: "Press Enter or click Generate. The AI will immediately start writing optimized code for you.",
    position: "top"
  },
  {
    target: '[data-tour="code-output"]',
    targets: ['[data-tour="code-output"]'],
    title: "Your Generated Code",
    content: "Your final syntax-highlighted Luau code is generated here. You can edit, audit, and analyze it directly.",
    position: "left"
  },
  {
    target: '[data-tour="code-actions"]',
    targets: ['[data-tour="code-actions"]'],
    title: "Action Controls",
    content: "Copy the script to your clipboard, save it to your catalog, export as .lua, or push it directly to Roblox Studio.",
    position: "bottom"
  },
  {
    target: '[data-tour="studio-pair"]',
    targets: ['[data-tour="studio-pair"]'],
    title: "Roblox Studio Bridge",
    content: "Pair your workspace directly with Roblox Studio using our companion plugin to sync scripts instantly.",
    position: "bottom"
  }
];
