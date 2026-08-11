export const homepageV2Metadata = {
  title: "AI Roblox Game Builder & Studio Agent | NexusRBX",
  description:
    "Turn an idea into a Roblox game with project-aware planning, reviewable multi-file builds, Studio playtests, and an honest path from prototype to publish.",
};

export const homepageGenres = [
  {
    id: "obby",
    label: "Obby",
    description: "Movement, checkpoints, and daily challenges.",
    prompt: "Build a gravity-switching obby with checkpoints, daily challenges, and a clean mobile HUD.",
    outcome: "A replayable traversal loop with clear progression.",
  },
  {
    id: "tycoon",
    label: "Tycoon",
    description: "Upgrades, workers, and satisfying progression.",
    prompt: "Build a co-op pizza tycoon with upgradeable kitchens, worker stations, and shared team goals.",
    outcome: "A co-op upgrade loop built for repeat sessions.",
  },
  {
    id: "horror",
    label: "Horror",
    description: "Rounds, tension, and reactive encounters.",
    prompt: "Make a round-based horror game set in a broken arcade with shifting rooms and one stalking enemy.",
    outcome: "A testable round loop with escalating tension.",
  },
  {
    id: "social",
    label: "Social",
    description: "Cozy activities and places worth returning to.",
    prompt: "Create a cozy social island with fishing, house decorating, and shared community events.",
    outcome: "A welcoming social loop with reasons to return.",
  },
  {
    id: "racing",
    label: "Racing",
    description: "Responsive vehicles, tracks, and competition.",
    prompt: "Prototype an arcade racing game with drift boosts, three short tracks, and weekly time trials.",
    outcome: "A fast competitive loop with measurable mastery.",
  },
  {
    id: "rpg",
    label: "RPG",
    description: "Quests, combat, inventory, and progression.",
    prompt: "Build a compact action RPG with three quest lines, ability upgrades, loot, and a shared town hub.",
    outcome: "A focused adventure slice with room to expand.",
  },
];

export const homepageBuildStages = [
  {
    id: "prompt",
    label: "Prompt",
    title: "Describe the game, not a pile of scripts.",
    description: "Start with the player loop, genre, and feeling you want to create.",
  },
  {
    id: "plan",
    label: "Plan",
    title: "Approve the route before anything changes.",
    description: "See the systems, files, and Studio destinations in one reviewable plan.",
  },
  {
    id: "build",
    label: "Build",
    title: "Coordinate the whole project.",
    description: "NexusRBX works across scripts, services, UI, and assets without losing context.",
  },
  {
    id: "playtest",
    label: "Playtest",
    title: "Prove the change inside Studio.",
    description: "Run the game, surface the failure, fix it, and keep the evidence with the build.",
  },
];

export const homepageControlPoints = [
  {
    id: "context",
    title: "Whole-project context",
    description: "One persistent view of the goal, project tree, recent decisions, and current place.",
  },
  {
    id: "review",
    title: "Reviewable changes",
    description: "Inspect the plan, affected files, and exact diff before a material write lands.",
  },
  {
    id: "proof",
    title: "Playtest evidence",
    description: "A green code block is not enough. See whether the experience actually ran.",
  },
  {
    id: "undo",
    title: "Snapshots and undo",
    description: "Experiment without surrendering ownership of the project or its working state.",
  },
];

export const homepageGrowthLoop = [
  {
    id: "fun",
    title: "Build the fun",
    description: "Start with a loop players understand and want to repeat.",
  },
  {
    id: "retain",
    title: "Earn retention",
    description: "Playtest, listen, then use Roblox retention and session signals to find a real reason for players to return.",
  },
  {
    id: "monetize",
    title: "Add fair value",
    description: "Design passes, developer products, or subscriptions only when they improve the experience. Creator Rewards depend on Roblox eligibility.",
  },
  {
    id: "learn",
    title: "Learn and update",
    description: "Read engagement, retention, and conversion in Roblox Creator Analytics, then ship the next better version.",
  },
];

export const homepageExampleBuilds = [
  {
    id: "arcade-escape",
    genreId: "horror",
    title: "Arcade Escape",
    description: "A round-based chase game with shifting rooms, a reactive enemy, rewards, and a clear restart loop.",
    systems: ["Round service", "Enemy state", "Reward loop"],
  },
  {
    id: "gravity-shift",
    genreId: "obby",
    title: "Gravity Shift",
    description: "A mobile-friendly obby slice with gravity swaps, checkpoints, daily challenges, and clear recovery states.",
    systems: ["Checkpoints", "Mobile HUD", "Daily challenge"],
  },
  {
    id: "harbor-club",
    genreId: "social",
    title: "Harbor Club",
    description: "A cozy social loop built around fishing, home decoration, shared events, and reasons to return.",
    systems: ["Fishing loop", "Housing", "Live events"],
  },
];

export const homepagePreviewPlanIds = ["FREE", "PRO", "TEAM"];

export const homepagePreviewPlanFeatures = {
  FREE: [
    "Run one focused AI task at a time",
    "Revisit seven days of build history",
    "Keep one active UI project",
    "Use the core idea-to-review workflow",
  ],
  PRO: [
    "More capacity for longer build sessions",
    "Review 90 days of usage history",
    "Create game-ready icons",
    "Optionally choose supported premium models",
  ],
  TEAM: [
    "Pool build capacity across paid seats",
    "Cover 2–50 creators with one subscription",
    "Create game-ready icons",
    "Keep studio billing in one place",
  ],
};

export const homepageFocusedTools = [
  { href: "/roblox-script-generator", label: "Roblox script generator" },
  { href: "/roblox-ai-scripter", label: "Roblox AI scripter" },
  { href: "/roblox-studio-script-generator", label: "Studio script generator" },
  { href: "/roblox-lua-script-generator", label: "Luau script generator" },
  { href: "/roblox-gui-maker", label: "Roblox GUI maker" },
];
