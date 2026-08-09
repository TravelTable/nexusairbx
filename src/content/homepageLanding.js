export const homepageMetadata = {
  title: "Roblox AI Script Generator & Studio Code Agent | NexusRBX",
  description:
    "Generate focused Luau scripts from a prompt or use the NexusRBX Studio agent to plan coordinated changes across multiple Roblox files and services.",
};

export const homepageHero = {
  eyebrow: "NexusRBX",
  title: "AI Roblox Script Generator for Studio",
  titleLines: ["AI Roblox Script", "Generator for Studio"],
  description:
    "Generate a focused Luau script from one prompt, or use the Studio agent to plan coordinated changes across multiple files and Roblox services.",
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
    alt: "NexusRBX AI agent helping write Roblox Studio code",
  },
};

export const homepagePrompt = {
  label: "Describe the Roblox script or UI you want",
  placeholder: "Make a round timer script with intermission and victory rewards...",
  submitLabel: "Generate",
  loadingLabel: "Opening...",
  errorEmpty: "Describe the Roblox script or UI you want first.",
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
  { label: "Features", href: "/#features" },
  { label: "Downloads", href: "/downloads" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Support", href: "/contact" },
];
