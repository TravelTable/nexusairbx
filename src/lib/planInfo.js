const PLAN_INFO = {
  free: {
    label: "Free",
    badge: "outline",
    color: "gray",
    cap: 20000,
    capText: "Daily usage",
    promptCap: 400,
    promptPlaceholder: "Describe your idea (short prompts only).",
    upgradeLine: "Free uses Nexus Free Auto. Pro unlocks full model selection and higher included usage.",
    upgradeCta: "Upgrade to Pro",
    upgradeDesc: "Upgrade to Pro for full model selection, Studio Agent workflows, and higher included usage.",
    badgeClass: "border border-gray-400 text-gray-300 bg-transparent",
    badgeFilled: false,
    planNudge: "Generated with Free Plan",
    sidebarStrip: (
      <span>
        Free —{" "}
        <a
          href="/subscribe"
          className="text-[#9b5de5] underline hover:text-[#00f5d4] transition-colors"
        >
          Upgrade
        </a>
      </span>
    ),
    welcome: "Try Nexus Free Auto for scripts, debugging, and small revisions.",
    welcomeCta: "See Plans",
    welcomeTokens: "Daily Free usage is available.",
    toastNudge: "Enjoying this? Upgrade for full model selection and higher included usage.",
    toastZero: "You’re out of Free usage. Upgrade or wait for the daily reset.",
    sidebarCta: "Upgrade",
    sidebarCtaLink: "/subscribe",
    sidebarCtaDesc: "Upgrade to Pro for Studio Agent and full model selection.",
    sidebarCtaColor: "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white",
    sidebarCtaText: "Upgrade to Pro",
    sidebarCtaSub: "Studio Agent, Included Usage, Premium Direct support.",
  },
  pro: {
    label: "Pro",
    badge: "filled",
    color: "purple",
    cap: 500000,
    capText: "Included Usage",
    promptCap: 1600,
    promptPlaceholder: "Describe your idea (up to 1,600 chars).",
    upgradeLine: "Pro+ and Team unlock larger workflows and higher included usage.",
    upgradeCta: "Upgrade to Team",
    upgradeDesc: "Upgrade to Team for pooled usage, seats, collaboration, and priority support.",
    badgeClass: "bg-[#9b5de5] text-white border border-[#9b5de5]",
    badgeFilled: true,
    planNudge: "Generated with Pro Plan",
    sidebarStrip: (
      <span>
        Pro —{" "}
        <button
          type="button"
          className="text-[#9b5de5] underline hover:text-[#00f5d4] transition-colors"
          onClick={() => window.portal && window.portal()}
        >
          Manage Billing
        </button>
      </span>
    ),
    welcome: "Welcome back — your Included Usage is active for this billing period.",
    welcomeCta: "See Plans",
    welcomeTokens: "Included Usage resets at the end of your billing period.",
    toastNudge: null,
    toastZero: "Included Usage reached. Use Premium Balance or wait for the reset.",
    sidebarCta: "Team",
    sidebarCtaLink: "/subscribe",
    sidebarCtaDesc: "Explore Team features & seats.",
    sidebarCtaColor: "bg-white/5 text-gray-400 hover:text-white border border-white/10",
    sidebarCtaText: "Explore Team",
    sidebarCtaSub: "Pooled usage, seats, priority support.",
  },
  pro_plus: {
    label: "Pro+",
    badge: "filled",
    color: "teal",
    cap: 1000000,
    capText: "Higher Included Usage",
    promptCap: 2400,
    promptPlaceholder: "Describe your idea (larger workflows supported).",
    upgradeLine: "Team adds pooled usage, seats, and collaboration.",
    upgradeCta: "Upgrade to Team",
    upgradeDesc: "Upgrade to Team for pooled usage, seats, collaboration, and priority support.",
    badgeClass: "bg-[#00f5d4] text-black border border-[#00f5d4]",
    badgeFilled: true,
    planNudge: "Generated with Pro+ Plan",
    sidebarStrip: (
      <span>
        Pro+ —{" "}
        <button
          type="button"
          className="text-[#00f5d4] underline hover:text-[#9b5de5] transition-colors"
          onClick={() => window.portal && window.portal()}
        >
          Manage Billing
        </button>
      </span>
    ),
    welcome: "Welcome back — Pro+ Included Usage is active for this billing period.",
    welcomeCta: "See Plans",
    welcomeTokens: "Included Usage resets at the end of your billing period.",
    toastNudge: null,
    toastZero: "Included Usage reached. Use Premium Balance or wait for the reset.",
    sidebarCta: "Team",
    sidebarCtaLink: "/subscribe",
    sidebarCtaDesc: "Explore Team features & seats.",
    sidebarCtaColor: "bg-white/5 text-gray-400 hover:text-white border border-white/10",
    sidebarCtaText: "Explore Team",
    sidebarCtaSub: "Pooled usage, seats, priority support.",
  },
  team: {
    label: "Team",
    badge: "filled",
    color: "teal",
    cap: 1500000,
    capText: "Pooled Included Usage",
    promptCap: 3200,
    promptPlaceholder: "Describe your idea (extended prompts, team use).",
    upgradeLine: "",
    upgradeCta: "",
    upgradeDesc: "",
    badgeClass: "bg-[#00f5d4] text-black border border-[#00f5d4]",
    badgeFilled: true,
    planNudge: "Generated with Team Plan",
    sidebarStrip: (
      <span>
        Team —{" "}
        <button
          type="button"
          className="text-[#00f5d4] underline hover:text-[#9b5de5] transition-colors"
          onClick={() => window.portal && window.portal()}
        >
          Manage Billing
        </button>
      </span>
    ),
    welcome: "Welcome, Team plan — usage is pooled across your workspace.",
    welcomeCta: "See Plans",
    welcomeTokens: "Team Included Usage resets at the end of the billing period.",
    toastNudge: null,
    toastZero: "Team Included Usage reached. Use Premium Balance or wait for the reset.",
    sidebarCta: null,
    sidebarCtaLink: null,
    sidebarCtaDesc: null,
    sidebarCtaColor: "",
    sidebarCtaText: "",
    sidebarCtaSub: "",
  },
};

export default PLAN_INFO;
