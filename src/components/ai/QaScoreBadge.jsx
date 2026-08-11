import React from "react";
import { ShieldCheck, ShieldAlert, Wrench } from "lib/icons";

/**
 * Visible QA score badge for generated artifacts.
 *
 * Reads the score already present on a message's qaReport and renders a compact,
 * color-coded "Quality NN/100" pill (green >= 85, yellow 60-84, red < 60).
 * When `onFix` is provided (and there are issues to fix) it surfaces a one-click
 * "Fix issues" affordance next to the badge using the existing callback.
 *
 * Renders nothing when there is no usable score.
 */
export default function QaScoreBadge({ score, issueCount = 0, onFix, disabled = false }) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return null;

  const value = Math.max(0, Math.min(100, Math.round(numeric)));

  const tone =
    value >= 85
      ? {
          text: " text-[var(--ds-success)] ",
          bg: " bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] ",
          border: " border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)] ",
          Icon: ShieldCheck,
        }
      : value >= 60
      ? {
          text: " text-[var(--ds-warning)] ",
          bg: " bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] ",
          border: " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] ",
          Icon: ShieldAlert,
        }
      : {
          text: " text-[var(--ds-danger)] ",
          bg: " bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] ",
          border: " border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] ",
          Icon: ShieldAlert,
        };

  const { Icon } = tone;
  const showFix = typeof onFix === "function" && issueCount > 0;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${tone.bg} ${tone.border} ${tone.text}`}
        title={
          issueCount > 0
            ? `Automated quality score. ${issueCount} issue${issueCount === 1 ? "" : "s"} detected.`
            : "Automated quality score."
        }
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-black uppercase tracking-widest">
          Quality {value}/100
        </span>
      </div>

      {showFix && (
        <button
          type="button"
          onClick={onFix}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ds-accent)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:opacity-50"
          title="Apply automated fixes to resolve the detected issues"
        >
          <Wrench className="w-3 h-3" />
          Fix issues
        </button>
      )}
    </div>
  );
}
