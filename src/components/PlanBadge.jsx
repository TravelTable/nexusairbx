import React from "react";
import PLAN_INFO from "../lib/planInfo";

function PlanBadge({ plan: planProp }) {
  const plan = (planProp || "free").toLowerCase();
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mr-2 ${
        planInfo.badgeClass
      }`}
      style={{
        background:
          (plan === "pro" || plan === "team")
            ? (plan === "team" ? "linear-gradient(90deg, var(--ds-accent) 0%, var(--ds-plan) 100%)" : "linear-gradient(90deg, var(--ds-plan) 0%, var(--ds-accent) 100%)")
            : undefined,
        color: plan === "team" ? "var(--ds-accent-foreground)" : undefined,
      }}
    >
      {planInfo.label}
      <span className="ml-2 text-xs font-normal opacity-80">
        • {planInfo.capText}
      </span>
    </span>
  );
}

export default PlanBadge;
