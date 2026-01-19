import React, { useState } from "react";
import { Info } from "lucide-react";
import PLAN_INFO from "../../lib/planInfo";
import { getGravatarUrl, getUserInitials, formatNumber, formatResetDate } from "../../lib/aiUtils";

export const FormatText = React.memo(({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-[#00f5d4] font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
});

export function TokenBar({ tokensLeft, tokensLimit, resetsAt, plan }) {
  const percent = typeof tokensLeft === "number" && typeof tokensLimit === "number"
      ? Math.max(0, Math.min(100, (tokensLeft / tokensLimit) * 100))
      : 100;
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  return (
    <div id="tour-token-bar" className="w-full flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-300 font-medium">
          Tokens: <span className="text-white font-bold">{typeof tokensLeft === "number" ? formatNumber(tokensLeft) : "∞"}</span>{" "}
          <span className="text-gray-400">/ {formatNumber(tokensLimit)}</span>
        </div>
        <a href="/docs#tokens" className="flex items-center gap-1 text-xs text-[#9b5de5] hover:text-[#00f5d4] underline" title="How tokens work">
          <Info className="w-4 h-4" /> How tokens work
        </a>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden relative">
        <div className={`h-full rounded-full transition-all duration-500 ${plan === "team" ? "bg-gradient-to-r from-[#00f5d4] to-[#9b5de5]" : plan === "pro" ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4]" : "bg-gray-400"}`} style={{ width: `${percent}%` }}></div>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
        <span>{typeof resetsAt === "string" || resetsAt instanceof Date ? `Resets on ${formatResetDate(resetsAt)}` : ""}</span>
        <span className="text-gray-500">{planInfo.capText}</span>
      </div>
    </div>
  );
}

export function PlanBadge({ plan }) {
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mr-2 ${planInfo.badgeClass}`} style={{ background: plan === "pro" ? "linear-gradient(90deg, #9b5de5 0%, #00f5d4 100%)" : plan === "team" ? "linear-gradient(90deg, #00f5d4 0%, #9b5de5 100%)" : undefined, color: plan === "team" ? "#222" : undefined }}>
      {planInfo.label}
      <span className="ml-2 text-xs font-normal opacity-80">• {planInfo.capText}</span>
    </span>
  );
}

export function AssistantCodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="mt-4 border border-gray-800 rounded-lg bg-black/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs text-[#00f5d4] font-semibold uppercase">Code</span>
        <button onClick={handleCopy} className="text-xs text-white px-2 py-1 rounded bg-gray-800">{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto">{code}</pre>
    </div>
  );
}

export const NexusRBXAvatar = React.memo(({ isThinking = false }) => (
  <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl overflow-hidden flex-shrink-0 border-2 ${isThinking ? 'border-[#00f5d4] animate-pulse' : 'border-white/10'}`}>
    <img src="/logo.png" alt="NexusRBX" className={`w-9 h-9 object-contain ${isThinking ? 'animate-bounce' : ''}`} />
  </div>
));

export const UserAvatar = React.memo(({ email }) => {
  const url = getGravatarUrl(email);
  const initials = getUserInitials(email);
  return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center shadow-2xl overflow-hidden flex-shrink-0 border-2 border-white/20">
      {url ? (
        <img
          src={url}
          alt="User"
          className="w-full h-full object-cover"
          onError={(e) => (e.target.style.display = "none")}
        />
      ) : (
        <span className="text-white font-bold text-sm">{initials}</span>
      )}
    </div>
  );
});
