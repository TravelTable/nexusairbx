import { PLAN } from "./prices";

export const SUBSCRIPTION_PLANS = [
  {
    id: PLAN.STARTER,
    name: "Starter",
    audience: "Entry access to NexusRBX AI",
    monthly: 2,
    yearly: 0,
    cta: "Get Starter",
    starterBadge: "From $2/mo",
    features: [
      "Nexus Auto + model selection",
      "Included AI usage each month",
      "Script generation, debugging and revisions",
      "30-day chat & project history",
      "3 active projects",
      "2 concurrent AI jobs",
      "Saved scripts + refine iterations",
      "Upgrade to Pro for Premium Direct & Icon Generator",
    ],
  },
  {
    id: PLAN.PRO,
    name: "Pro",
    audience: "For individual Roblox developers",
    monthly: 19.99,
    yearly: 199,
    cta: "Upgrade to Pro",
    features: [
      "Nexus Auto",
      "Higher included AI usage",
      "Full model selection",
      "Larger projects and context",
      "Multi-file script generation",
      "Unlimited generation history",
      "Premium Direct model support",
    ],
  },
  {
    id: PLAN.PRO_PLUS,
    name: "Pro+",
    audience: "For serious builders and larger projects",
    monthly: 39.99,
    yearly: 399,
    cta: "Upgrade to Pro+",
    recommended: true,
    features: [
      "Everything in Pro",
      "Significantly higher included usage",
      "Larger context windows",
      "Longer autonomous workflows",
      "Larger multi-file changes",
      "Priority processing",
      "Premium Direct model support",
    ],
  },
  {
    id: PLAN.TEAM,
    name: "Team",
    audience: "For studios and development teams",
    monthly: 29,
    yearly: 290,
    cta: "Start Team",
    perSeat: true,
    features: [
      "Everything in Pro+",
      "Shared team workspaces",
      "Pooled included AI usage",
      "Member and administrator roles",
      "Centralized billing",
      "Team collaboration",
      "Priority support",
    ],
  },
];

export function formatMoney(value) {
  if (value === 0) return "$0";
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function formatMonthlyPrice(plan) {
  if (plan.monthly === 0) return "$0";
  const base = formatMoney(plan.monthly);
  return plan.perSeat ? `${base}/user/mo` : `${base}/mo`;
}
