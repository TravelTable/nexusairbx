import React, { useState } from "react";
import { Info, ChevronDown, ChevronUp, Sparkles, Zap, Rocket, Layout, Eye, Download, RefreshCw } from "lucide-react";
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
    <div id="tour-token-bar" className="w-full flex flex-col gap-1 relative z-10">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-300 font-medium">
          Tokens: <span className="text-white font-bold">{typeof tokensLeft === "number" ? formatNumber(tokensLeft) : "∞"}</span>{" "}
          <span className="text-gray-400">/ {formatNumber(tokensLimit)}</span>
        </div>
        <a href="/docs#tokens" className="flex items-center gap-1 text-xs text-[#9b5de5] hover:text-[#00f5d4] underline" title="How tokens work">
          <Info className="w-4 h-4" /> How tokens work
        </a>
      </div>
      <div className="w-full h-3 bg-gray-800/50 rounded-full overflow-hidden relative border border-white/5">
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
  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl overflow-hidden flex-shrink-0 border-2 ${isThinking ? 'border-[#00f5d4] animate-pulse' : 'border-white/10'}`}>
    <img src="/logo.png" alt="NexusRBX" className={`w-7 h-7 md:w-9 md:h-9 object-contain ${isThinking ? 'animate-bounce' : ''}`} />
  </div>
));

export const ThoughtAccordion = ({ thought }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!thought) return null;

  return (
    <div className="mt-2 mb-4 overflow-hidden rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[#00f5d4]" />
          Nexus Thought Process
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 text-[13px] text-gray-300 leading-relaxed animate-in slide-in-from-top-2 duration-300">
          <FormatText text={thought} />
        </div>
      )}
    </div>
  );
};

export const UiStatsBadge = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5">
    {Icon && <Icon className="w-3 h-3 text-[#00f5d4]" />}
    <span className="text-[10px] text-gray-400 font-medium">{label}:</span>
    <span className="text-[10px] text-white font-bold">{value}</span>
  </div>
);

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
