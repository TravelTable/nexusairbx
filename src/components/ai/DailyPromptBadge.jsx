import React from "react";
import { Zap } from "lib/icons";

// Friendly "prompts left" framing layered on top of the token system.
//
// ASSUMPTION: the backend tracks usage in *tokens* (subLimit / totalRemaining),
// not per-prompt counts. We derive an approximate prompt count client-side by
// dividing remaining tokens by an average cost-per-generation. This is a display
// convenience only — billing/enforcement still happens against the real token
// balance. Tune AVG_TOKENS_PER_PROMPT if the real average shifts.
const AVG_TOKENS_PER_PROMPT = 6000;

function formatResetLabel(resetsAt) {
  if (!resetsAt) return null;
  const date = resetsAt instanceof Date ? resetsAt : new Date(resetsAt);
  if (Number.isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = date.getTime() - now;
  if (diffMs <= 0) return "soon";

  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export default function DailyPromptBadge({
  totalRemaining = 0,
  subLimit = 0,
  resetsAt = null,
  planKey = "free",
  unlimitedTokens = false,
  devOverride = false,
}) {
  const promptsLeft = Math.max(0, Math.floor(Number(totalRemaining || 0) / AVG_TOKENS_PER_PROMPT));
  const promptsTotal = Math.max(0, Math.floor(Number(subLimit || 0) / AVG_TOKENS_PER_PROMPT));

  if (unlimitedTokens) {
    const title = devOverride
      ? "Dev override active. Tokens are unlimited for this account."
      : "Unlimited tokens are active for this account.";

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold"
        style={{
          color: "#00f5d4",
          borderColor: "#00f5d433",
          backgroundColor: "#00f5d414",
        }}
        title={title}
        aria-label={title}
      >
        <Zap className="w-3.5 h-3.5" />
        <span>{devOverride ? "Dev unlimited" : "Unlimited tokens"}</span>
      </div>
    );
  }

  // Nothing useful to show (e.g. signed-out / no allowance loaded yet).
  if (!subLimit && !totalRemaining) return null;

  const resetLabel = formatResetLabel(resetsAt);
  const isLow = promptsLeft <= 2;

  const accent = isLow ? "#f15bb5" : "#00f5d4";
  const title = `≈ ${promptsLeft} prompt${promptsLeft === 1 ? "" : "s"} left${
    promptsTotal ? ` of ~${promptsTotal}` : ""
  } (estimated from your remaining tokens${resetLabel ? `, resets in ${resetLabel}` : ""}).`;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold"
      style={{
        color: accent,
        borderColor: `${accent}33`,
        backgroundColor: `${accent}14`,
      }}
      title={title}
      aria-label={title}
    >
      <Zap className="w-3.5 h-3.5" />
      <span>
        ≈ {promptsLeft} <span className="hidden sm:inline">prompt{promptsLeft === 1 ? "" : "s"} left</span>
        <span className="sm:hidden">left</span>
      </span>
      {resetLabel && (
        <span className="text-gray-400 font-medium hidden md:inline">· {resetLabel}</span>
      )}
    </div>
  );
}
