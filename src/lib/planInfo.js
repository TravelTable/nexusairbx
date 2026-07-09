const PLAN_INFO = {
  free: {
    label: "No plan",
    badge: "outline",
    color: "gray",
    cap: 0,
    capText: "Subscription required",
    promptCap: 400,
    promptPlaceholder: "Subscribe to Starter to use the AI workspace.",
    upgradeLine: "AI access requires Starter ($2/mo) or higher.",
    upgradeCta: "Get Starter",
    upgradeDesc: "Subscribe to Starter for model selection, saved scripts, and included AI usage.",
    badgeClass: "border border-gray-400 text-gray-300 bg-transparent",
    badgeFilled: false,
    planNudge: "Subscribe to use NexusRBX AI",
    sidebarStrip: (
      <span>
        No active plan —{" "}
        <a
          href="/subscribe?highlight=starter"
          className="text-[#9b5de5] underline hover:text-[#00f5d4] transition-colors"
        >
          Get Starter
        </a>
      </span>
    ),
    welcome: "Subscribe to Starter ($2/mo) to use the NexusRBX AI workspace.",
    welcomeCta: "See Plans",
    welcomeTokens: "Starter includes included AI usage each billing period.",
    toastNudge: "Subscribe to Starter for $2/mo to unlock the AI workspace.",
    toastZero: "AI access requires Starter ($2/mo) or higher.",
    sidebarCta: "Subscribe",
    sidebarCtaLink: "/subscribe?highlight=starter",
    sidebarCtaDesc: "Starter unlocks the AI workspace from $2/mo.",
    sidebarCtaColor: "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white",
    sidebarCtaText: "Get Starter for $2",
    sidebarCtaSub: "Model selection, saved scripts, included usage.",
  },
  starter: {
    label: "Starter",
    badge: "filled",
    color: "cyan",
    cap: 75000,
    capText: "Included Usage",
    promptCap: 900,
    promptPlaceholder: "Describe your idea (up to 900 chars).",
    upgradeLine: "Pro unlocks Premium Direct, Icon Generator, and Studio Agent workflows.",
    upgradeCta: "Upgrade to Pro",
    upgradeDesc: "Upgrade to Pro for Premium Direct models, Icon Generator, and higher included usage.",
    badgeClass: "bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40",
    badgeFilled: true,
    planNudge: "Generated with Starter Plan",
    sidebarStrip: (
      <span>
        Starter —{" "}
        <button
          type="button"
          className="text-[#00f5d4] underline hover:text-[#9b5de5] transition-colors"
          onClick={() => window.portal && window.portal()}
        >
          Manage Billing
        </button>
      </span>
    ),
    welcome: "Starter is active — model selection and saved scripts are unlocked.",
    welcomeCta: "See Plans",
    welcomeTokens: "Included Usage resets at the end of your billing period.",
    toastNudge: "Need Icon Generator or Premium Direct? Upgrade to Pro.",
    toastZero: "Included Usage reached. Upgrade to Pro or wait for the reset.",
    sidebarCta: "Upgrade",
    sidebarCtaLink: "/subscribe",
    sidebarCtaDesc: "Upgrade to Pro for Premium Direct and Icon Generator.",
    sidebarCtaColor: "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white",
    sidebarCtaText: "Upgrade to Pro",
    sidebarCtaSub: "Premium Direct, Icon Generator, Studio Agent.",
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
