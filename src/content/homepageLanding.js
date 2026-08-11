export const homepageMetadata = {
  title: "AI Roblox Game Builder & Studio Agent | NexusRBX",
  description:
    "Turn a Roblox game idea into a reviewable plan, coordinated Studio changes, verified playtests, and a path to publishing with NexusRBX.",
};

export const homepageHero = {
  eyebrow: "NexusRBX",
  title: "Make the Roblox game in your head",
  titleLines: ["Make the Roblox game", "in your head"],
  description:
    "Plan the whole project, build it in Studio, review every change, and playtest the result before you ship.",
  primaryCta: {
    label: "Start Building",
    href: "/ai",
  },
  secondaryCta: {
    label: "Watch Demo",
    href: "#workflow",
  },
  image: {
    src: "/imageeeeAI.png",
    alt: "NexusRBX coordinating a Roblox game build from idea through Studio playtest",
  },
};

export const homepagePrompt = {
  label: "What Roblox game do you want to make?",
  placeholder: "Describe the game, player loop, or system in your head...",
  submitLabel: "Start building",
  loadingLabel: "Opening...",
  errorEmpty: "Describe the Roblox game or system you want to build first.",
};

export const homepageFeatures = [
  {
    icon: "wand",
    title: "AI-Powered Code Generation",
    description:
      "Describe your functionality, and NexusRBX creates optimized Luau code for scripts, local scripts, and module scripts.",
  },
  {
    icon: "debug",
    title: "Real-time Debugging & Optimization",
    description:
      "Find errors, get suggestions for better performance, and rewrite inefficient code blocks instantly.",
  },
  {
    icon: "api",
    title: "Roblox API Integration",
    description:
      "Seamlessly access and utilize the full Roblox API, including services, instances, and events, with context-aware code generation.",
  },
  {
    icon: "library",
    title: "Snippet Library & Collaboration",
    description:
      "Store, manage, and share your custom code snippets and full scripts with your team.",
  },
];

export const homepageWorkflow = [
  {
    title: "Install Plugin",
    description: "Add the NexusRBX plugin to Roblox Studio in minutes.",
    image: {
      src: "/luginimageeeeeeeee.png",
      alt: "Illustration of NexusRBX connecting with Roblox Studio",
    },
  },
  {
    title: "Describe Your Need",
    description: "Use the integrated console or chat to describe what you want to build.",
    image: {
      src: "/promptbox.png",
      alt: "Illustration of a Roblox scripting prompt",
    },
  },
  {
    title: "Review & Insert",
    description: "NexusRBX provides the code, ready to be reviewed, edited, and inserted directly into your game.",
    image: {
      src: "/generated-files.png",
      alt: "Illustration of multiple Luau files ready for review",
    },
  },
];

export const homepageFooterLinks = [
  { label: "Games", href: "/#genres" },
  { label: "How it works", href: "/#workflow" },
  { label: "Creator control", href: "/#control" },
  { label: "Creator upside", href: "/#grow" },
  { label: "Downloads", href: "/downloads" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Support", href: "/support" },
  { label: "Contact", href: "/contact" },
  { label: "Legal", href: "/legal" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
];
