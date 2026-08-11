import React from "react";

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function resetText(resetsAt) {
  if (!resetsAt) return "Reset time unavailable";
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Resets soon";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  return hours <= 24 ? `Resets in ${hours} hour${hours === 1 ? "" : "s"}` : `Resets ${new Date(resetsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function FreeUsageMeter({ dailyUsage, fairUse, compact = false, className = "" }) {
  const used = clampPercent(dailyUsage?.percentUsed);
  const remaining = clampPercent(dailyUsage?.percentRemaining ?? (100 - used));
  const blocked = Boolean(fairUse?.blocked);
  let warning = "";
  if (blocked) warning = "You've reached the Free plan's fair-use limit.";
  else if (used >= 100) warning = "Daily Free usage reached.";
  else if (used >= 90) warning = "You're almost out of Free usage today.";
  else if (used >= 70) warning = `You've used ${used}% of today's Free usage.`;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--ds-text)] ${className}`}>
        <span>Free</span>
        <span className="text-[var(--ds-text-muted)]">·</span>
        <span>{used}% used today</span>
      </div>
    );
  }

  return (
    <section className={`rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ds-text)]">Daily Free Usage</h3>
          {dailyUsage?.boostActive && <p className="mt-1 text-xs text-[var(--ds-success)]">New-user boost active</p>}
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-[var(--ds-text)]">{used}% used</div>
          <div className="text-xs text-[var(--ds-text-muted)]">{remaining}% remaining</div>
        </div>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ds-fill-hover)]"
        role="progressbar"
        aria-label="Daily Free usage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={used}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${used}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className={warning ? "text-[var(--ds-warning)]" : "text-[var(--ds-text-muted)]"}>{warning || "Nexus Free Auto"}</span>
        <span className="text-[var(--ds-text-subtle)]">{resetText(dailyUsage?.resetsAt)}</span>
      </div>
    </section>
  );
}
