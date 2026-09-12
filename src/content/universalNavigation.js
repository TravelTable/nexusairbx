import { PRODUCT_TERMS } from "./productVocabulary";

export const universalPrimaryNavigation = [
  { href: "/ai", label: "Workspace" },
  { href: "/assets", label: "Assets" },
  { href: "/downloads", label: "Studio" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
];

export const universalSiteIndexSections = [
  {
    label: "CREATE",
    items: [
      { href: "/ai", label: PRODUCT_TERMS.workspace, description: "Describe, plan, build, and verify your Roblox game", icon: "ai" },
      { href: "/roblox-script-generator", label: "Script generator", description: "Generate focused Roblox scripts", icon: "code" },
      { href: "/ai?mode=ui", label: "UI Creator", description: "Plan and create game interfaces", icon: "ui" },
      { href: "/downloads#studio-plugin", label: PRODUCT_TERMS.studioPlugin, description: "Recommended companion for Roblox Studio", icon: "link" },
    ],
  },
  {
    label: "ASSETS",
    items: [
      { href: "/icons-market", label: "Icons market", description: "Browse and reuse game-ready icons", icon: "photo" },
      { href: "/assets", label: "Your assets", description: "Find and manage project assets", icon: "assets" },
    ],
  },
  {
    label: "LEARN",
    items: [
      { href: "/docs", label: "Documentation", description: "Learn NexusRBX workflows and features", icon: "document" },
      { href: "/pricing", label: "Pricing and usage", description: "Compare plans and usage limits", icon: "usage" },
      { href: "/support", label: "Support", description: "Get help or review support cases", icon: "support" },
      { href: "/legal", label: "Legal documents", shortLabel: "Legal", description: "Read policies and product terms", icon: "security" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/signin", label: "Sign in", description: "Continue with your NexusRBX account", icon: "sign-in" },
      { href: "/settings", label: "Settings", description: "Manage Nexus, Roblox, Studio, and account preferences", icon: "settings" },
      { href: "/billing", label: "Billing and usage", description: "Review your plan, usage, and billing records", icon: "billing" },
      { href: "/contact", label: "Contact", description: "Reach the NexusRBX team", icon: "support" },
    ],
  },
];
