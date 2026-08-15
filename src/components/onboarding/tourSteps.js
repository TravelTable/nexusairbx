export const TOUR_STEPS = [
  {
    id: "describe-idea",
    title: "Describe the game in your head",
    content:
      "Lead with the player fantasy, then name the core loop, genre, and one must-have mechanic. NexusRBX can turn that into a buildable brief.",
    action:
      '“A co-op haunted hotel where players repair rooms before dawn.”',
    targetLabel: "Idea composer",
    targets: ['[data-tour="prompt-composer"]', '[data-tour="prompt-input"]', "#tour-prompt-box"],
    missingTargetHint:
      "Open Quick Script or Agent Build when you are ready. The guide will stay out of your way.",
  },
  {
    id: "connect-studio",
    title: "Connect Studio when the build needs it",
    content:
      "Stay in the browser while you shape the idea. Pair Studio when NexusRBX needs to inspect the place, apply changes, or run checks.",
    action:
      "Confirm the connected place name before any change is applied.",
    targetLabel: "Studio connection",
    targets: ['[data-tour="studio-pair"]', '[aria-label="Connect Roblox Studio"]'],
    missingTargetHint:
      "Studio pairing appears in Agent Build. You can connect later without interrupting planning.",
  },
  {
    id: "approve-plan",
    title: "Approve the plan before code moves",
    content:
      "For multi-file work, review the scope, destinations, and risks first. Approve only when the plan matches the experience you want.",
    action:
      "Check which scripts and services will change, then approve the plan.",
    targetLabel: "Plan review",
    targets: ['[aria-label="Review plan"]', '[aria-label="Editable plan sections"]'],
    missingTargetHint:
      "Plan review appears after Agent Build has enough context to propose coordinated work.",
  },
  {
    id: "review-change",
    title: "Review every change before applying",
    content:
      "Inspect diffs and generated assets. Keep manual review for structural or economy changes, and apply only the files you intended to change.",
    action:
      "Read the diff, confirm the Studio target, then apply or export.",
    targetLabel: "Change review",
    targets: [
      '[data-tour="code-output"]',
      '[data-tour="code-actions"]',
      '[title="Apply this project in Roblox Studio"]',
    ],
    missingTargetHint:
      "Review controls appear with the first generated change. Nothing is applied from this guide.",
  },
  {
    id: "verify-playtest",
    title: "Prove it in a playtest",
    content:
      "A successful apply is not a successful game. Run checks, play the core loop, and verify errors, feel, and player feedback before publishing.",
    action:
      "Test the loop, capture failures, and send the next fix through the same review cycle.",
    targetLabel: "Studio verification tools",
    targets: ['[aria-label="Studio and Roblox settings"]', '[data-tour="studio-pair"]'],
    missingTargetHint:
      "Verification tools appear once Studio work is ready. You can finish this guide without connecting.",
  },
];
