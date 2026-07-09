export const homepageMetadata = {
  title: "NexusRBX: Intelligent Roblox Studio Code Agent",
  description:
    "Boost productivity, generate scripts, and debug faster with AI integrated directly into your Roblox Studio workflow.",
};

export const homepageHero = {
  eyebrow: "Roblox Studio AI Agent",
  title: "NexusRBX: Your Intelligent Roblox Studio Code Agent",
  titleLines: ["NexusRBX: Your", "Intelligent Roblox", "Studio Code Agent"],
  description:
    "Boost productivity, generate scripts, and debug faster with powerful AI integrated directly into your workflow.",
  primaryCta: {
    label: "Start for $2",
    href: "/subscribe?highlight=starter",
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
      alt: "NexusRBX plugin connecting to Roblox Studio",
    },
  },
  {
    title: "Describe Your Need",
    description: "Use the integrated console or chat to describe what you want to build.",
    image: {
      src: "/promptbox.png",
      alt: "NexusRBX prompt box for describing what to build",
    },
  },
  {
    title: "Review & Insert",
    description: "NexusRBX provides the code, ready to be reviewed, edited, and inserted directly into your game.",
    image: {
      src: "/generated-files.png",
      alt: "Generated Luau script files ready to review and insert into Roblox Studio",
    },
  },
];

export const homepageTestimonial = {
  heading: "Trusted by Top Roblox Developers",
  quote: "NexusRBX is a game-changer! It saves me hours of coding every day.",
  author: "Alex, Studio Lead",
};

export const homepageFooterLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/subscribe" },
  { label: "Documentation", href: "/docs" },
  { label: "Support", href: "/contact" },
];
