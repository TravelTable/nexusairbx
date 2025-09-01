import React from "react";
import PLAN_INFO from "../lib/planInfo";// Or move PLAN_INFO to a shared location

function PlanBadge({ plan }) {
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mr-2 ${
        planInfo.badgeClass
      }`}
      style={{
        background:
          plan === "pro"
            ? "linear-gradient(90deg, #9b5de5 0%, #00f5d4 100%)"
            : plan === "team"
            ? "linear-gradient(90deg, #00f5d4 0%, #9b5de5 100%)"
            : undefined,
        color: plan === "team" ? "#222" : undefined,
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