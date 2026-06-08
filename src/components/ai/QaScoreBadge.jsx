import React from "react";
import { ShieldCheck, ShieldAlert, Wrench } from "lucide-react";

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
          text: "text-green-400",
          bg: "bg-green-400/10",
          border: "border-green-400/30",
          Icon: ShieldCheck,
        }
      : value >= 60
      ? {
          text: "text-yellow-400",
          bg: "bg-yellow-400/10",
          border: "border-yellow-400/30",
          Icon: ShieldAlert,
        }
      : {
          text: "text-red-400",
          bg: "bg-red-400/10",
          border: "border-red-400/30",
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#9b5de5]/15 border border-[#9b5de5]/30 text-[#c4a5f5] text-[10px] font-black uppercase tracking-widest hover:bg-[#9b5de5]/25 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Apply automated fixes to resolve the detected issues"
        >
          <Wrench className="w-3 h-3" />
          Fix issues
        </button>
      )}
    </div>
  );
}
