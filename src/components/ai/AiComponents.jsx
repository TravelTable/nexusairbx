import React, { useState } from "react";
import { 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ListTodo,
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Activity, 
  AlertTriangle, 
  Cpu,
  Database,
  X,
  Settings2,
  Type,
  Globe,
  Rocket,
  RefreshCw
} from "lucide-react";
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
  const isLow = percent < 15;

  return (
    <div id="tour-token-bar" className="w-full flex flex-col gap-1 relative z-10">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-300 font-medium">
          Tokens: <span className="text-white font-bold">{typeof tokensLeft === "number" ? formatNumber(tokensLeft) : "∞"}</span>{" "}
          <span className="text-gray-400">/ {formatNumber(tokensLimit)}</span>
        </div>
        {isLow && plan === "free" ? (
          <a href="/subscribe" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#00f5d4] hover:brightness-125 transition-all animate-pulse">
            <Zap className="w-3 h-3 fill-current" /> Upgrade to Pro
          </a>
        ) : (
          <a href="/docs#tokens" className="flex items-center gap-1 text-xs text-[#9b5de5] hover:text-[#00f5d4] underline" title="How tokens work">
            <Info className="w-4 h-4" /> How tokens work
          </a>
        )}
      </div>
      <div className="w-full h-3 bg-gray-800/50 rounded-full overflow-hidden relative border border-white/5">
        <div className={`h-full rounded-full transition-all duration-500 ${plan === "team" ? "bg-gradient-to-r from-[#00f5d4] to-[#9b5de5]" : plan === "pro" ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4]" : "bg-gray-400"} ${isLow ? 'animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]' : ''}`} style={{ width: `${percent}%` }}></div>
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

export const NexusRBXAvatar = React.memo(({ isThinking = false, mode = "general" }) => {
  const modeColors = {
    general: "#00f5d4",
    ui: "#00f5d4",
    logic: "#9b5de5",
    system: "#00bbf9",
    animator: "#f15bb5",
    data: "#fee440",
    performance: "#00f5d4",
    security: "#ff006e",
  };
  const color = modeColors[mode] || modeColors.general;

  return (
    <div 
      className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl overflow-hidden flex-shrink-0 border-2 transition-all duration-500 ${isThinking ? 'animate-pulse scale-110' : 'hover:scale-105'}`}
      style={{ 
        borderColor: isThinking ? color : 'rgba(255,255,255,0.1)',
        boxShadow: isThinking ? `0 0 20px ${color}40` : 'none'
      }}
    >
      <img src="/logo.png" alt="NexusRBX" className={`w-7 h-7 md:w-9 md:h-9 object-contain ${isThinking ? 'animate-bounce' : ''}`} />
    </div>
  );
});

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

export const PlanTracker = ({ plan, isExecuting = false }) => {
  if (!plan) return null;
  
  // Parse bullet points from the plan text
  const steps = plan.split('\n')
    .map(line => line.replace(/^[•\-\d.\s]+/, '').trim())
    .filter(line => line.length > 0);

  return (
    <div className={`mt-4 mb-6 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500 ${isExecuting ? 'border-[#00f5d4]/30 bg-[#00f5d4]/5 shadow-[0_0_30px_rgba(0,245,212,0.1)]' : 'border-white/10 bg-white/5'}`}>
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <ListTodo className={`w-4 h-4 ${isExecuting ? 'text-[#00f5d4] animate-pulse' : 'text-gray-400'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Execution Plan</span>
        </div>
        {isExecuting && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-ping" />
            <span className="text-[9px] font-black text-[#00f5d4] uppercase tracking-widest">Executing...</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-500 ${isExecuting && i === 0 ? 'border-[#00f5d4] bg-[#00f5d4]/20' : 'border-white/20 group-hover:border-[#00f5d4]'}`}>
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isExecuting && i === 0 ? 'bg-[#00f5d4] scale-125' : 'bg-white/10 group-hover:bg-[#00f5d4]'}`} />
            </div>
            <span className={`text-xs transition-colors leading-relaxed ${isExecuting && i === 0 ? 'text-white font-bold' : 'text-gray-300 group-hover:text-white'}`}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TaskOrchestrator = ({ tasks, currentTaskId, onExecuteTask }) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="mt-4 mb-6 rounded-2xl border border-[#9b5de5]/20 bg-[#9b5de5]/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="px-4 py-3 border-b border-[#9b5de5]/20 flex items-center justify-between bg-[#9b5de5]/10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#9b5de5]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Multi-Step Goal Orchestration</span>
        </div>
        <div className="text-[9px] font-bold text-[#9b5de5] uppercase tracking-widest">
          {tasks.filter(t => t.status === 'done').length} / {tasks.length} Steps
        </div>
      </div>
      <div className="p-4 space-y-4">
        {tasks.map((task, i) => {
          const isCurrent = task.id === currentTaskId;
          const isDone = task.status === 'done';

          return (
            <div key={task.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isCurrent ? 'bg-[#9b5de5]/20 border-[#9b5de5]/40 shadow-lg' : isDone ? 'bg-white/5 border-white/10 opacity-60' : 'bg-white/5 border-white/5'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isDone ? 'bg-[#00f5d4] text-black' : isCurrent ? 'bg-[#9b5de5] text-white animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{task.label}</div>
                <div className="text-[10px] text-gray-500 truncate">{task.prompt}</div>
              </div>
              {isCurrent && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#9b5de5] animate-ping" />
                  <span className="text-[9px] font-black text-[#9b5de5] uppercase tracking-widest">Active</span>
                </div>
              )}
            </div>
          );
        })}
        
        {!currentTaskId && tasks.some(t => !t.status) && (
          <button 
            onClick={() => onExecuteTask(tasks.find(t => !t.status))}
            className="w-full py-3 rounded-xl bg-[#9b5de5] text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(155,93,229,0.4)]"
          >
            <Rocket className="w-4 h-4" />
            START AUTOMATED PIPELINE
          </button>
        )}
      </div>
    </div>
  );
};

export const ProjectContextStatus = ({ context, onSync }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await onSync();
    setIsSyncing(false);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${context ? 'bg-[#00f5d4] shadow-[0_0_10px_rgba(0,245,212,0.5)]' : 'bg-gray-600'}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {context ? 'Studio Linked' : 'Studio Offline'}
        </span>
      </div>
      
      {context && (
        <div className="h-4 w-px bg-white/10" />
      )}

      {context && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
            {context.remoteEvents?.length || 0} Remotes • {context.modules?.length || 0} Modules
          </span>
        </div>
      )}

      <button 
        onClick={handleSync}
        disabled={isSyncing}
        className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${isSyncing ? 'animate-spin text-[#00f5d4]' : 'text-gray-500 hover:text-white'}`}
        title="Sync Context from Studio"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const UnifiedStatusBar = ({ stage, isGenerating, mode = "general" }) => {
  if (!isGenerating && !stage) return null;

  const modeColors = {
    general: "#00f5d4",
    ui: "#00f5d4",
    logic: "#9b5de5",
    system: "#00bbf9",
    animator: "#f15bb5",
    data: "#fee440",
    performance: "#00f5d4",
    security: "#ff006e",
  };
  const color = modeColors[mode] || modeColors.general;

  return (
    <div className="w-full px-4 py-2 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-2 h-2 rounded-full animate-ping absolute inset-0" style={{ backgroundColor: color }} />
          <div className="w-2 h-2 rounded-full relative" style={{ backgroundColor: color }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {stage || "Nexus is working..."}
          </span>
          {isGenerating && (
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
              Complex generations may take up to 5 minutes
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full animate-progress-indeterminate rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(400%); width: 30%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export const UserAvatar = React.memo(({ email }) => {
  const url = getGravatarUrl(email);
  const initials = getUserInitials(email);
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center shadow-2xl overflow-hidden flex-shrink-0 border border-white/20">
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

export const QaBadge = ({ score }) => {
  const color = score > 80 ? 'text-green-400' : score > 50 ? 'text-yellow-400' : 'text-red-400';
  const bg = score > 80 ? 'bg-green-400/10' : score > 50 ? 'bg-yellow-400/10' : 'bg-red-400/10';
  const border = score > 80 ? 'border-green-400/20' : score > 50 ? 'border-yellow-400/20' : 'border-red-400/20';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${bg} ${border} ${color}`}>
      <ShieldCheck className="w-3 h-3" />
      <span className="text-[10px] font-black uppercase tracking-widest">QA {score}%</span>
    </div>
  );
};

export const SkeletonArtifact = ({ type = "code" }) => (
  <div className="mt-6 rounded-2xl border border-white/5 bg-[#121212]/30 overflow-hidden animate-pulse">
    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="space-y-2">
          <div className="w-24 h-3 bg-white/10 rounded" />
          <div className="w-16 h-2 bg-white/5 rounded" />
        </div>
      </div>
    </div>
    <div className="p-8 flex flex-col items-center justify-center gap-4">
      <div className="w-full h-32 bg-white/5 rounded-xl" />
    </div>
  </div>
);

export const ArtifactCard = ({ title, subtitle, icon: Icon, type = "code", qaReport = null, children, actions = [] }) => {
  const typeColors = {
    code: "text-[#9b5de5] bg-[#9b5de5]/10 border-[#9b5de5]/20",
    ui: "text-[#00f5d4] bg-[#00f5d4]/10 border-[#00f5d4]/20",
    report: "text-red-400 bg-red-400/10 border-red-400/20",
    system: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  };
  const colorClass = typeColors[type] || typeColors.code;
  const [showQa, setShowQa] = useState(false);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#121212]/50 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white truncate tracking-tight uppercase">{title}</h4>
              {qaReport && (
                <button onClick={() => setShowQa(!showQa)}>
                  <QaBadge score={qaReport.score} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${action.primary ? 'bg-[#00f5d4] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
      
      {showQa && qaReport && (
        <div className="p-4 bg-black/40 border-b border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Automated QA Report</span>
            <button onClick={() => setShowQa(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2">
            {qaReport.issues?.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${issue.severity === 'high' ? 'bg-red-500' : issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                <span className="text-gray-300">{issue.message}</span>
                {issue.line && <span className="text-gray-600 font-mono ml-auto">L{issue.line}</span>}
              </div>
            ))}
            {(!qaReport.issues || qaReport.issues.length === 0) && (
              <div className="text-green-400 text-[11px] font-bold flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" />
                No issues detected. Code follows all best practices.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-0">
        {children}
      </div>
    </div>
  );
};

export const SecurityReport = ({ report, onFix }) => {
  if (!report) return null;
  const { vulnerabilities = [], riskScore = 0 } = report;

  return (
    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-red-500/20 flex items-center justify-between bg-red-500/10">
        <div className="flex items-center gap-2 text-red-400">
          <ShieldAlert className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Security Audit Report</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-red-400/60 font-bold uppercase">Risk Score:</span>
          <span className={`text-xs font-black ${riskScore > 70 ? 'text-red-500' : riskScore > 30 ? 'text-yellow-500' : 'text-green-500'}`}>
            {riskScore}/100
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {vulnerabilities.map((v, i) => (
          <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${v.severity === 'high' ? 'bg-red-500 text-white' : v.severity === 'medium' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'}`}>
                {v.severity} severity
              </span>
              <span className="text-[10px] text-gray-500 font-bold">{v.type}</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{v.description}</p>
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#00f5d4] font-bold italic">
                <ShieldCheck className="w-3 h-3" />
                Recommended Fix: {v.fix}
              </div>
            </div>
          </div>
        ))}
        <button 
          onClick={onFix}
          className="w-full py-2.5 rounded-xl bg-red-500 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
        >
          <Zap className="w-3 h-3 fill-current" />
          APPLY SECURITY PATCHES
        </button>
      </div>
    </div>
  );
};

export const PerformanceAudit = ({ audit, onOptimize }) => {
  if (!audit) return null;
  const { score = 0, bottlenecks = [], estimatedSavings = {} } = audit;

  return (
    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-500/10">
        <div className="flex items-center gap-2 text-emerald-400">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Performance Audit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400/60 font-bold uppercase">Efficiency:</span>
          <span className="text-xs font-black text-emerald-400">{score}%</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Database className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase">Memory</span>
            </div>
            <span className="text-xs text-white font-bold">-{estimatedSavings.memory || '0MB'}</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Cpu className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase">CPU Time</span>
            </div>
            <span className="text-xs text-white font-bold">-{estimatedSavings.cpu || '0ms'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Bottlenecks Detected</span>
          {bottlenecks.map((b, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className={`mt-0.5 p-1 rounded ${b.impact === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                <AlertTriangle className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white font-bold">{b.type}</div>
                <div className="text-[10px] text-gray-400 line-clamp-1">{b.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onOptimize}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Zap className="w-3 h-3 fill-current" />
          APPLY OPTIMIZATIONS
        </button>
      </div>
    </div>
  );
};

export const CustomModeModal = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [name, setName] = useState(initialData?.label || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt || "");
  const [temperature, setTemperature] = useState(initialData?.temperature || 0.7);
  const [color, setColor] = useState(initialData?.color || "#9b5de5");
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#9b5de5]/20 text-[#9b5de5]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {initialData ? "Edit Custom Mode" : "Create Custom Mode"}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Define your own AI expert</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Mode Name</label>
              <div className="relative group">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00f5d4] transition-colors" />
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UI Specialist"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#00f5d4] focus:ring-1 focus:ring-[#00f5d4] transition-all outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Theme Color</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 p-1 cursor-pointer"
                />
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-400 font-mono">
                  {color.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Short Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this expert specialize in?"
              rows="2"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#00f5d4] focus:ring-1 focus:ring-[#00f5d4] transition-all outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Prompt (The "Brain")</label>
              <span className="text-[9px] text-[#9b5de5] font-bold italic">Advanced users only</span>
            </div>
            <textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are an expert in... Your goal is to... Always prioritize..."
              rows="6"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white font-mono focus:border-[#00f5d4] focus:ring-1 focus:ring-[#00f5d4] transition-all outline-none resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Creativity (Temperature)</label>
              <span className="text-xs font-bold text-[#00f5d4]">{temperature}</span>
            </div>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00f5d4]"
            />
            <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
              <span>Precise (0.0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPublic ? 'bg-[#00f5d4]/20 text-[#00f5d4]' : 'bg-gray-800 text-gray-500'}`}>
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Publish to Community</div>
                <div className="text-[10px] text-gray-500">Allow other developers to use this expert</div>
              </div>
            </div>
            <button 
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-[#00f5d4]' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave({ label: name, description, systemPrompt, temperature, color, isPublic })}
            disabled={!name || !systemPrompt}
            className="flex-[2] py-3 rounded-xl bg-[#00f5d4] text-black font-black text-xs uppercase tracking-widest hover:bg-[#00f5d4]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#00f5d4]/20"
          >
            Save Custom Mode
          </button>
        </div>
      </div>
    </div>
  );
};
