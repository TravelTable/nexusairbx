const PLAN_INFO = {
  free: {
    label: "Free",
    badge: "outline",
    color: "gray",
    cap: 0,
    capText: "Daily Free usage",
    promptCap: 400,
    promptPlaceholder: "Describe a Roblox script (up to 400 chars).",
    upgradeLine: "Free includes Quick Script plus a daily Agent Build allowance. Starter adds more usage, model choice, and saved scripts.",
    upgradeCta: "Get Starter",
    upgradeDesc: "Subscribe to Starter for more Agent usage, model selection, saved scripts, and longer history.",
    badgeClass: "border border-[var(--ds-border-strong)] text-[var(--ds-text-secondary)] bg-transparent",
    badgeFilled: false,
    planNudge: "Generated with Nexus Free",
    sidebarStrip: (
      <span>
        Free —{" "}
        <a
          href="/subscribe?highlight=starter"
          className="text-accent underline hover:text-[var(--ds-accent-hover)] transition-colors"
        >
          Get Starter
        </a>
      </span>
    ),
    welcome: "Quick Script and Agent Build are ready.",
    welcomeCta: "See Starter features",
    welcomeTokens: "Free includes three anonymous Quick Scripts per day and a fair-use Agent allowance after signup.",
    toastNudge: "Need more Agent usage, model choice, or saved scripts? Upgrade to Starter.",
    toastZero: "Daily Free usage reached. Try again tomorrow, or upgrade to continue now.",
    sidebarCta: "Subscribe",
    sidebarCtaLink: "/subscribe?highlight=starter",
    sidebarCtaDesc: "Starter adds more Agent usage, model choice, and saved scripts.",
    sidebarCtaColor: "bg-accent text-accent-foreground hover:bg-[var(--ds-accent-hover)]",
    sidebarCtaText: "Unlock Starter",
    sidebarCtaSub: "More usage, model choice, saved scripts.",
  },
  starter: {
    label: "Starter",
    badge: "filled",
    color: "blue",
    cap: 75000,
    capText: "Included Usage",
    promptCap: 900,
    promptPlaceholder: "Describe your idea (up to 900 chars).",
    upgradeLine: "Pro unlocks Premium Direct, Icon Generator, and Studio Agent workflows.",
    upgradeCta: "Upgrade to Pro",
    upgradeDesc: "Upgrade to Pro for Premium Direct models, Icon Generator, and higher included usage.",
    badgeClass: "bg-[var(--ds-accent-soft)] text-accent border border-[var(--ds-accent-border)]",
    badgeFilled: true,
    planNudge: "Generated with Starter Plan",
    sidebarStrip: (
      <span>
        Starter —{" "}
        <button
          type="button"
          className="text-accent underline hover:text-[var(--ds-plan)] transition-colors"
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
    sidebarCtaColor: "bg-gradient-to-r from-[var(--ds-plan)] to-accent text-white",
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
    badgeClass: "bg-[var(--ds-plan)] text-[var(--ds-plan-foreground)] border border-[var(--ds-plan)]",
    badgeFilled: true,
    planNudge: "Generated with Pro Plan",
    sidebarStrip: (
      <span>
        Pro —{" "}
        <button
          type="button"
          className="text-[var(--ds-plan)] underline hover:text-accent transition-colors"
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
    sidebarCtaColor: "bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] border border-[var(--ds-border-subtle)]",
    sidebarCtaText: "Explore Team",
    sidebarCtaSub: "Pooled usage, seats, priority support.",
  },
  pro_plus: {
    label: "Pro+",
    badge: "filled",
    color: "purple",
    cap: 1000000,
    capText: "Higher Included Usage",
    promptCap: 2400,
    promptPlaceholder: "Describe your idea (larger workflows supported).",
    upgradeLine: "Team adds pooled usage, seats, and collaboration.",
    upgradeCta: "Upgrade to Team",
    upgradeDesc: "Upgrade to Team for pooled usage, seats, collaboration, and priority support.",
    badgeClass: "bg-[var(--ds-plan)] text-[var(--ds-plan-foreground)] border border-[var(--ds-plan)]",
    badgeFilled: true,
    planNudge: "Generated with Pro+ Plan",
    sidebarStrip: (
      <span>
        Pro+ —{" "}
        <button
          type="button"
          className="text-[var(--ds-plan)] underline hover:text-accent transition-colors"
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
    sidebarCtaColor: "bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] border border-[var(--ds-border-subtle)]",
    sidebarCtaText: "Explore Team",
    sidebarCtaSub: "Pooled usage, seats, priority support.",
  },
  team: {
    label: "Team",
    badge: "filled",
    color: "purple",
    cap: 1500000,
    capText: "Pooled Included Usage",
    promptCap: 3200,
    promptPlaceholder: "Describe your idea (extended prompts, team use).",
    upgradeLine: "",
    upgradeCta: "",
    upgradeDesc: "",
    badgeClass: "bg-gradient-to-r from-[var(--ds-plan)] to-accent text-white border border-[var(--ds-plan)]",
    badgeFilled: true,
    planNudge: "Generated with Team Plan",
    sidebarStrip: (
      <span>
        Team —{" "}
        <button
          type="button"
          className="text-[var(--ds-plan)] underline hover:text-accent transition-colors"
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
