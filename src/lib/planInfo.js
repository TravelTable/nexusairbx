const PLAN_INFO = {
  free: {
    label: "Free",
    badge: "outline",
    color: "gray",
    cap: 50000,
    capText: "50,000 tokens/mo",
    promptCap: 400,
    promptPlaceholder: "Describe your idea (short prompts only).",
    upgradeLine: "Pro unlocks GPT-5.2 & priority runs.",
    upgradeCta: "Upgrade to Pro",
    upgradeDesc: "Upgrade to Pro: 500k tokens/mo, GPT-5.2, longer prompts.",
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
    welcome: "Try out scripts with limited tokens. Upgrade to unlock more.",
    welcomeCta: "See Plans",
    welcomeTokens: "You have 50,000 tokens this month.",
    toastNudge: "Enjoying this? Upgrade for faster runs + more tokens.",
    toastZero: "You’re out of tokens. Upgrade to keep generating.",
    sidebarCta: "Upgrade",
    sidebarCtaLink: "/subscribe",
    sidebarCtaDesc: "Upgrade to Pro for GPT-5.2 & more tokens.",
    sidebarCtaColor: "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white",
    sidebarCtaText: "Upgrade to Pro",
    sidebarCtaSub: "500k tokens/mo, GPT-5.2, longer prompts.",
  },
  pro: {
    label: "Pro",
    badge: "filled",
    color: "purple",
    cap: 500000,
    capText: "500,000 tokens/mo",
    promptCap: 1600,
    promptPlaceholder: "Describe your idea (up to 1,600 chars).",
    upgradeLine: "Team unlocks 1.5M tokens/mo + seats.",
    upgradeCta: "Upgrade to Team",
    upgradeDesc: "Upgrade to Team: 1.5M tokens/mo, team seats, priority support.",
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
    welcome: "Welcome back — you have 500k tokens this month.",
    welcomeCta: "See Plans",
    welcomeTokens: "You have 500,000 tokens this month.",
    toastNudge: null,
    toastZero: "You’re out of tokens. Upgrade to keep generating.",
    sidebarCta: "Upgrade",
    sidebarCtaLink: "/subscribe",
    sidebarCtaDesc: "Upgrade to Team for more tokens & seats.",
    sidebarCtaColor: "bg-gradient-to-r from-[#00f5d4] to-[#9b5de5] text-white",
    sidebarCtaText: "Upgrade to Team",
    sidebarCtaSub: "1.5M tokens/mo, team seats, priority support.",
  },
  team: {
    label: "Team",
    badge: "filled",
    color: "teal",
    cap: 1500000,
    capText: "1,500,000 tokens/mo",
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
    welcome: "Welcome, Team plan — 1.5M tokens shared across your workspace.",
    welcomeCta: "See Plans",
    welcomeTokens: "You have 1,500,000 tokens this month.",
    toastNudge: null,
    toastZero: "You’re out of tokens. Upgrade to keep generating.",
    sidebarCta: null,
    sidebarCtaLink: null,
    sidebarCtaDesc: null,
    sidebarCtaColor: "",
    sidebarCtaText: "",
    sidebarCtaSub: "",
  },
};

export default PLAN_INFO;
