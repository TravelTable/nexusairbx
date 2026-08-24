export const homepageV2Metadata = {
  title: "AI Roblox Script Generator & Studio Agent | NexusRBX",
  description:
    "Generate Roblox Luau scripts with AI, inspect Studio projects, review multi-file changes, and playtest safely with NexusRBX.",
};

export const homepageHeroPrompt =
  "Make a round-based horror game set in a broken arcade with shifting rooms, simple mobile controls, and one stalking enemy.";

export const homepageBuildStages = [
  {
    id: "prompt",
    label: "Prompt",
    title: "Describe the outcome",
    description: "Explain the player experience or system you want in ordinary language.",
    status: "Request captured",
  },
  {
    id: "inspect",
    label: "Inspect",
    title: "Read the real project",
    description: "Nexus finds the relevant place, objects, scripts, UI, and dependencies before proposing work.",
    status: "6 project references found",
  },
  {
    id: "plan",
    label: "Plan",
    title: "Agree on the route",
    description: "Review the systems, destinations, risks, and test plan before material changes begin.",
    status: "4-step plan ready",
  },
  {
    id: "build",
    label: "Build",
    title: "Construct one change set",
    description: "Scripts, interface, and project objects stay connected to one request and one recovery point.",
    status: "3 files and 1 ScreenGui updated",
  },
  {
    id: "test",
    label: "Test",
    title: "Verify it in Play mode",
    description: "Nexus keeps the output, failure, correction, and playtest evidence together.",
    status: "7 checks passed",
  },
  {
    id: "review",
    label: "Review",
    title: "Keep the decision",
    description: "Inspect the final diff, restore selectively, or continue the build through conversation.",
    status: "Change set ready to approve",
  },
];

export const homepageGenres = [
  {
    id: "simulator",
    label: "Simulator",
    image: "/assets/nexus-template-worlds/simulator.webp",
    imageAlt: "Hand-inked 2D simulator world with collection paths, upgrade pads, and a hatch pedestal",
    description: "Progression, collection, upgrades, and repeatable goals.",
    prompt: "Build a creature-collecting simulator with meaningful upgrades, mobile controls, and a clear first-session loop.",
    outcome: "A progression loop with a testable first session and room for live updates.",
  },
  {
    id: "tycoon",
    label: "Tycoon",
    image: "/assets/nexus-template-worlds/tycoon.webp",
    imageAlt: "Hand-inked 2D tycoon plot with an expandable foundation and compact production line",
    description: "Workers, production chains, co-op goals, and expansion.",
    prompt: "Build a co-op pizza tycoon with upgradeable kitchens, worker stations, and shared team goals.",
    outcome: "A co-op production loop built for repeat sessions.",
  },
  {
    id: "obby",
    label: "Obby",
    image: "/assets/nexus-template-worlds/obby.webp",
    imageAlt: "Hand-inked 2D obby map with floating platforms, rotating bars, and a finish arch",
    description: "Movement, checkpoints, recovery, and mastery.",
    prompt: "Build a gravity-switching obby with checkpoints, daily challenges, and a clean mobile HUD.",
    outcome: "A replayable traversal loop with clear progression and recovery.",
  },
  {
    id: "combat",
    label: "Combat",
    image: "/assets/nexus-template-worlds/combat.webp",
    imageAlt: "Hand-inked 2D combat arena with cover lanes, spawn gates, and a central capture point",
    description: "Abilities, hit validation, rounds, and fair feedback.",
    prompt: "Prototype a team arena game with three readable abilities, server-authoritative hits, and short competitive rounds.",
    outcome: "A focused combat slice with verifiable client and server boundaries.",
  },
  {
    id: "social",
    label: "Social",
    image: "/assets/nexus-template-worlds/social.webp",
    imageAlt: "Hand-inked 2D social plaza with a fountain, cafe terrace, benches, and outdoor stage",
    description: "Shared activities, expression, and reasons to return.",
    prompt: "Create a cozy social island with fishing, house decorating, and shared community events.",
    outcome: "A welcoming social loop with reasons to return.",
  },
  {
    id: "horror",
    label: "Horror",
    image: "/assets/nexus-template-worlds/horror.webp",
    imageAlt: "Hand-inked 2D horror map of a fenced abandoned facility surrounded by dark woodland",
    description: "Tension, reactive encounters, and replayable rounds.",
    prompt: "Make a round-based horror game set in a broken arcade with shifting rooms and one stalking enemy.",
    outcome: "A testable round loop with escalating tension.",
  },
  {
    id: "racing",
    label: "Racing",
    image: "/assets/nexus-template-worlds/racing.webp",
    imageAlt: "Hand-inked 2D racing world with a looping track, start grid, checkpoint arch, and pit lane",
    description: "Responsive vehicles, tracks, and measurable mastery.",
    prompt: "Prototype an arcade racing game with drift boosts, three short tracks, and weekly time trials.",
    outcome: "A fast competitive loop with measurable mastery.",
  },
  {
    id: "adventure",
    label: "Adventure",
    image: "/assets/nexus-template-worlds/adventure.webp",
    imageAlt: "Hand-inked 2D adventure valley with a cave, river bridge, ruins, and hilltop destination",
    description: "Quests, inventory, exploration, and progression.",
    prompt: "Build a compact action adventure with three quest lines, ability upgrades, loot, and a shared town hub.",
    outcome: "A focused adventure slice with a project structure that can expand.",
  },
];

export const homepageProjectEvidence = [
  {
    id: "context",
    label: "Project context",
    title: "Nexus reads beyond the open script.",
    description:
      "Explorer relationships, shared remotes, client/server boundaries, UI state, and the current place stay attached to the conversation.",
  },
  {
    id: "changes",
    label: "Change set",
    title: "One request remains one reviewable unit.",
    description:
      "See every affected file and instance together instead of hunting through a transcript for disconnected code blocks.",
  },
  {
    id: "recovery",
    label: "Recovery",
    title: "Experiment without surrendering control.",
    description:
      "Snapshots, expected source checks, selective review, and explicit apply states make iteration safer.",
  },
];

export const homepageGrowthLoop = [
  {
    id: "fun",
    title: "Build the fun",
    description: "Prototype a loop players can understand, test, and want to repeat.",
  },
  {
    id: "learn",
    title: "Learn from play",
    description: "Use playtests and Roblox Creator Analytics to find where players stop, return, or convert.",
  },
  {
    id: "value",
    title: "Add fair value",
    description: "Introduce passes, products, or subscriptions only when they improve the experience.",
  },
  {
    id: "update",
    title: "Ship the next version",
    description: "Keep the project brief, decisions, and evidence so the next update starts with context.",
  },
];

export const homepageExampleBuilds = [
  {
    id: "arcade-escape",
    genre: "Round-based horror",
    title: "Arcade Escape",
    description: "A reactive enemy, shifting rooms, rewards, and a verified restart loop.",
    systems: ["RoundService", "Enemy state", "Reward loop"],
  },
  {
    id: "gravity-shift",
    genre: "Mobile obby",
    title: "Gravity Shift",
    description: "Gravity swaps, checkpoints, daily challenges, and readable recovery states.",
    systems: ["Checkpoints", "Mobile HUD", "Daily challenge"],
  },
  {
    id: "harbor-club",
    genre: "Social experience",
    title: "Harbor Club",
    description: "Fishing, home decoration, shared events, and a reason to return.",
    systems: ["Fishing loop", "Housing", "Live events"],
  },
];

export const homepageFocusedTools = [
  { href: "/roblox-script-generator", label: "Roblox script generator" },
  { href: "/roblox-ai-scripter", label: "Roblox AI scripter" },
  { href: "/roblox-studio-script-generator", label: "Studio script generator" },
  { href: "/roblox-lua-script-generator", label: "Luau script generator" },
  { href: "/roblox-gui-maker", label: "Roblox GUI maker" },
];
