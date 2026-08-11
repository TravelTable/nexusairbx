import React, { useState } from "react";
import { 
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
  RefreshCw,
  Brain
} from "lib/icons";
import PLAN_INFO from "../../lib/planInfo";
import { dollarsFromMicros, resolveUsagePercent } from "../../lib/billing";
import { getGravatarUrl, getUserInitials, formatResetDate } from "../../lib/aiUtils";

export const FormatText = React.memo(({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-[var(--ds-accent)] font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
});

export function TokenBar({
  tokensLeft,
  tokensLimit,
  resetsAt,
  plan,
  unlimitedTokens = false,
  devOverride = false,
  dailyUsage = null,
  includedUsage = null,
  isFreeUsagePlan = false,
  premiumBalance = null,
  usageLoading = false,
  usageUnavailable = false,
  compact = false,
}) {
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const usageLabel = isFreeUsagePlan ? "Daily usage" : "Included usage";
  const effectiveResetsAt = isFreeUsagePlan && dailyUsage?.resetsAt ? dailyUsage.resetsAt : resetsAt;
  const premiumMicros = Number(premiumBalance?.balanceMicros);
  const showPremiumBalance = !isFreeUsagePlan && Number.isFinite(premiumMicros);
  const premiumDollars = showPremiumBalance ? dollarsFromMicros(premiumMicros) : null;

  if (unlimitedTokens) {
    if (compact) {
      return (
        <div id="cloud-token-bar" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-semibold text-[var(--ds-text-secondary)]">
          <span>
            {usageLabel}: <span className="font-bold text-[var(--ds-accent)]">{devOverride ? "Dev unlimited" : "Unlimited"}</span>
          </span>
          {premiumDollars && (
            <span>
              Premium Balance: <span className="font-bold text-[var(--ds-accent)]">{premiumDollars}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[var(--ds-accent)]" title="Unlimited usage override is active">
            <Zap className="h-3 w-3" /> Active
          </span>
        </div>
      );
    }

    return (
      <div id="cloud-token-bar" className="relative z-10 flex w-full flex-col gap-1.5 px-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-[var(--ds-text-secondary)]">
            <span>
              {usageLabel}: <span className="font-bold text-[var(--ds-accent)]">{devOverride ? "Dev unlimited" : "Unlimited"}</span>
            </span>
            {premiumDollars && (
              <span>
                Premium Balance: <span className="font-bold text-[var(--ds-accent)]">{premiumDollars}</span>
              </span>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--ds-accent)]" title="Unlimited usage override is active">
            <Zap className="h-3.5 w-3.5" /> Active
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)]">
          <div className="h-full w-full rounded-full bg-[var(--ds-accent)]" />
        </div>
      </div>
    );
  }

  const percentUsed = resolveUsagePercent({
    isFreeUsagePlan,
    dailyUsage,
    includedUsage,
    tokensLeft,
    tokensLimit,
    usageLoading,
  });
  const isLow = typeof percentUsed === "number" && percentUsed >= 85;
  const usageLabelText = usageLoading
    ? "checking..."
    : usageUnavailable || percentUsed == null
      ? "unavailable"
      : `${percentUsed}%`;

  if (compact) {
    const resetText = typeof effectiveResetsAt === "string" || effectiveResetsAt instanceof Date
      ? `Resets ${formatResetDate(effectiveResetsAt)}`
      : planInfo.capText;

    return (
      <div id="cloud-token-bar" className={`min-w-0 ${isLow ? "flex w-full flex-col gap-1" : "flex flex-wrap items-center gap-x-3 gap-y-0.5"}`}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-semibold text-[var(--ds-text-secondary)]">
          <span>
            {usageLabel}: <span className={isLow ? "font-bold text-[var(--ds-warning)] " : "font-bold text-[var(--ds-text)]"}>{usageLabelText}</span>
            {!usageLoading && !usageUnavailable && percentUsed != null ? " used" : ""}
          </span>
          {premiumDollars && (
            <span>
              Premium Balance: <span className="font-bold text-[var(--ds-accent)]">{premiumDollars}</span>
            </span>
          )}
          {!isLow && <span className="text-[var(--ds-text-muted)]">{resetText}</span>}
          {isLow && plan === "free" ? (
            <a href="/subscribe" className="inline-flex items-center gap-1 font-black uppercase tracking-wider text-[var(--ds-accent)] hover:brightness-125">
              <Zap className="h-3 w-3 fill-current" /> Upgrade to Pro
            </a>
          ) : isLow && plan === "pro" ? (
            <a href="/subscribe" className="inline-flex items-center gap-1 font-semibold text-[var(--ds-accent)] hover:brightness-110">
              <Zap className="h-3 w-3 fill-current" /> Explore Team
            </a>
          ) : isLow ? (
            <span className="text-[var(--ds-text-muted)]">{resetText}</span>
          ) : null}
        </div>
        {isLow && (
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-[var(--ds-surface-2)]"
            role="progressbar"
            aria-label={usageLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentUsed ?? 0}
          >
            <div
              className="h-full rounded-full bg-[var(--ds-danger)] transition-[width] duration-500"
              style={{ width: `${usageLoading || usageUnavailable || percentUsed == null ? 0 : percentUsed}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="cloud-token-bar" className="relative z-10 flex w-full flex-col gap-1.5 px-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-[var(--ds-text-secondary)]">
          <span>
            {usageLabel}: <span className="font-bold text-[var(--ds-text)]">{usageLabelText}</span>
            {!usageLoading && !usageUnavailable && percentUsed != null ? " used" : ""}
          </span>
          {premiumDollars && (
            <span>
              Premium Balance: <span className="font-bold text-[var(--ds-accent)]">{premiumDollars}</span>
            </span>
          )}
        </div>
        {isLow && plan === "free" ? (
          <a href="/subscribe" className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--ds-accent)] transition-[filter,color] duration-[var(--motion-fast)] ease-[var(--ease-product)] hover:brightness-125">
            <Zap className="h-3 w-3 fill-current" /> Upgrade to Pro
          </a>
        ) : isLow && plan === "pro" ? (
          <a href="/subscribe" className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[var(--ds-accent)] transition-[filter,color] duration-[var(--motion-fast)] ease-[var(--ease-product)] hover:brightness-110">
            <Zap className="h-3 w-3 fill-current" /> Explore Team
          </a>
        ) : (
          <span className="shrink-0 text-[10px] text-[var(--ds-text-muted)]">
            {typeof effectiveResetsAt === "string" || effectiveResetsAt instanceof Date ? `Resets ${formatResetDate(effectiveResetsAt)}` : planInfo.capText}
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)]"
        role="progressbar"
        aria-label={usageLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentUsed ?? 0}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-[var(--motion-large)] ease-[var(--ease-standard)] ${
            isLow ? "bg-[var(--ds-danger)]" : "bg-[var(--ds-accent)]"
          }`}
          style={{ width: `${usageLoading || usageUnavailable || percentUsed == null ? 0 : percentUsed}%` }}
        />
      </div>
    </div>
  );
}

export function PlanBadge({ plan: planProp }) {
  const plan = (planProp || "free").toLowerCase();
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const premium = plan === "pro" || plan === "team";
  return (
    <span
      className={`mr-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${premium ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]" : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)]"}`}
    >
      {planInfo.label}
      <span className="ml-2 text-xs font-normal opacity-80">• {planInfo.capText}</span>
    </span>
  );
}

export function AssistantCodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="mt-4 border border-[var(--ds-border-subtle)] rounded-lg bg-[var(--ds-fill-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--ds-border-subtle)]">
        <span className="text-xs text-[var(--ds-accent)] font-semibold uppercase">Code</span>
        <button onClick={handleCopy} className="text-xs text-[var(--ds-text)] px-2 py-1 rounded bg-[var(--ds-surface-2)]">{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto scrollbar-subtle">{code}</pre>
    </div>
  );
}

export const NexusRBXAvatar = React.memo(({ isThinking = false, mode = "general", compact = false }) => {
  const modeColors = {
    general: "var(--ds-accent)",
    ui: "var(--ds-accent)",
    logic: "var(--ds-accent)",
    system: "var(--ds-info)",
    animator: "var(--ds-accent)",
    data: "var(--ds-warning)",
    performance: "var(--ds-accent)",
    security: "var(--ds-danger)",
  };
  const color = modeColors[mode] || modeColors.general;

  return (
    <div
      data-testid="nexusrbx-avatar"
      className={`${compact ? "h-7 w-7 rounded-lg" : "w-10 h-10 md:w-12 md:h-12 rounded-2xl"} bg-[var(--ds-fill-subtle)] flex items-center justify-center flex-shrink-0 border transition-colors duration-200`}
      style={{ 
        borderColor: isThinking ? color : "var(--ds-border-subtle)",
      }}
    >
      <Brain
        aria-hidden="true"
        className={compact ? "h-3.5 w-3.5" : "w-5 h-5 md:w-6 md:h-6"}
        style={{ color }}
      />
    </div>
  );
});

export const ThoughtAccordion = ({ thought }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!thought) return null;

  return (
    <div className="mt-2 mb-4 overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] backdrop-blur-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-colors uppercase tracking-widest"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[var(--ds-accent)]" />
          Nexus Thought Process
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 text-[13px] text-[var(--ds-text-secondary)] leading-relaxed animate-in slide-in-from-top-2 duration-300">
          <FormatText text={thought} />
        </div>
      )}
    </div>
  );
};

export const UiStatsBadge = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)]">
    {Icon && <Icon className="w-3 h-3 text-[var(--ds-accent)]" />}
    <span className="text-[10px] text-[var(--ds-text-secondary)] font-medium">{label}:</span>
    <span className="text-[10px] text-[var(--ds-text)] font-bold">{value}</span>
  </div>
);

export const PlanTracker = ({ plan, isExecuting = false }) => {
  if (!plan) return null;
  
  // Parse bullet points from the plan text
  const steps = plan.split('\n')
    .map(line => line.replace(/^[•\-\d.\s]+/, '').trim())
    .filter(line => line.length > 0);

  return (
    <div className={`mt-4 mb-6 overflow-hidden rounded-xl border animate-in fade-in slide-in-from-top-2 duration-500 ${isExecuting ? 'border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)]' : 'border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)]'}`}>
      <div className="px-4 py-3 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[var(--ds-fill-subtle)]">
        <div className="flex items-center gap-2">
          <ListTodo className={`w-4 h-4 ${isExecuting ? 'text-[var(--ds-accent)] animate-pulse' : 'text-[var(--ds-text-secondary)]'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">Execution Plan</span>
        </div>
        {isExecuting && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--ds-accent)] animate-ping" />
            <span className="text-[9px] font-black text-[var(--ds-accent)] uppercase tracking-widest">Executing...</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center transition-[background-color,border-color] duration-[var(--motion-standard)] ease-[var(--ease-standard)] ${isExecuting && i === 0 ? 'border-[var(--ds-accent)] bg-[var(--ds-accent-soft)]' : 'border-[var(--ds-border-strong)] group-hover:border-[var(--ds-accent)]'}`}>
              <div className={`w-1.5 h-1.5 rounded-full transition-[background-color,transform] duration-[var(--motion-standard)] ease-[var(--ease-product)] ${isExecuting && i === 0 ? 'bg-[var(--ds-accent)] scale-125' : 'bg-[var(--ds-fill-hover)] group-hover:bg-[var(--ds-accent)]'}`} />
            </div>
            <span className={`text-xs transition-colors leading-relaxed ${isExecuting && i === 0 ? 'text-[var(--ds-text)] font-bold' : 'text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text)]'}`}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TaskOrchestrator = ({ tasks, currentTaskId, onExecuteTask, plan }) => {
  if (!tasks || tasks.length === 0) return null;
  const isPro = plan === "pro" || plan === "team" || plan === "TEAM" || plan === "PRO";

  return (
    <div className={`relative mt-4 mb-6 overflow-hidden rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] animate-in fade-in slide-in-from-top-2 duration-300 ${!isPro ? 'opacity-50' : ''}`}>
      {!isPro && (
        <div className="absolute top-3 right-3 z-20">
          <Zap className="w-4 h-4 text-[var(--ds-accent)] fill-current" />
        </div>
      )}
      <div className="flex items-center justify-between border-b border-[var(--ds-accent-border)] bg-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--ds-accent)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text)]">Multi-Step Goal Orchestration</span>
        </div>
        <div className="text-[9px] font-semibold text-[var(--ds-accent)]">
          {tasks.filter(t => t.status === 'done').length} / {tasks.length} Steps
        </div>
      </div>
      <div className="p-4 space-y-4">
        {tasks.map((task, i) => {
          const isCurrent = task.id === currentTaskId;
          const isDone = task.status === 'done';

          return (
            <div key={task.id} className={`flex items-center gap-4 rounded-xl border p-3 transition-[background-color,border-color,opacity] duration-[var(--motion-standard)] ease-[var(--ease-standard)] ${isCurrent ? 'bg-[var(--ds-accent-soft)] border-[var(--ds-accent-border)]' : isDone ? 'bg-[var(--ds-fill-subtle)] border-[var(--ds-border-subtle)] opacity-60' : 'bg-[var(--ds-fill-subtle)] border-[var(--ds-border-subtle)]'}`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${isDone ? 'bg-[var(--ds-success)] text-[var(--ds-success-foreground)]' : isCurrent ? 'bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] animate-pulse' : 'bg-[var(--ds-surface-2)] text-[var(--ds-text-muted)]'}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold ${isCurrent ? 'text-[var(--ds-text)]' : 'text-[var(--ds-text-secondary)]'}`}>{task.label}</div>
                <div className="text-[10px] text-[var(--ds-text-muted)] truncate">{task.prompt}</div>
              </div>
              {isCurrent && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--ds-accent)] animate-ping" />
                  <span className="text-[9px] font-semibold text-[var(--ds-accent)]">Active</span>
                </div>
              )}
            </div>
          );
        })}
        
        {!currentTaskId && tasks.some(t => !t.status) && (
          <button 
            onClick={() => onExecuteTask(tasks.find(t => !t.status))}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ds-accent)] py-3 text-sm font-semibold text-[var(--ds-accent-foreground)] transition-[filter] duration-[var(--motion-fast)] ease-[var(--ease-product)] hover:brightness-110"
          >
            <Rocket className="w-4 h-4" />
            START AUTOMATED PIPELINE
          </button>
        )}
      </div>
    </div>
  );
};

export const ProjectContextStatus = ({
  context,
  onSync,
  onViewStructure,
  plan,
  studioConnected = false,
  studioConnectionType = null,
  studioManifestCount = 0,
  studioManifestSupported = false,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await onSync();
    setIsSyncing(false);
  };

  const isPro = plan === "pro" || plan === "team" || plan === "TEAM" || plan === "PRO";
  const remoteCount = context?.remoteEvents?.length || 0;
  const moduleCount = context?.modules?.length || 0;
  const hasArchitecture = Boolean(context);
  const architectureEmpty = hasArchitecture && remoteCount === 0 && moduleCount === 0;
  const isMcp = studioConnectionType === "mcp_local";
  const studioIndexed = studioConnected && studioManifestSupported && studioManifestCount > 0;
  const studioReadyDot = studioConnected && (isMcp || studioIndexed);

  let studioReadinessLabel = "Studio offline";
  let studioReadinessTitle =
    "Live Studio place readiness for Ask/Agent. Separate from the Architecture schema badge.";
  if (studioConnected && isMcp) {
    studioReadinessLabel = "Studio MCP · live search";
    studioReadinessTitle =
      "Connected via Studio MCP. Ask uses live script search — there is no full persisted place manifest on MCP-only sessions.";
  } else if (studioConnected && studioManifestSupported && studioManifestCount > 0) {
    studioReadinessLabel = `Studio indexed · ${studioManifestCount}`;
    studioReadinessTitle = `Plugin place index ready with ${studioManifestCount} script${studioManifestCount === 1 ? "" : "s"}.`;
  } else if (studioConnected && studioManifestSupported) {
    studioReadinessLabel = "Studio · no index yet";
    studioReadinessTitle =
      "Plugin is connected but the Studio manifest is empty. Rescan from Studio Manifest, or wait for indexing to finish.";
  } else if (studioConnected) {
    studioReadinessLabel = "Studio connected";
    studioReadinessTitle = "Studio is connected, but a full place index is not available for this session.";
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] backdrop-blur-md relative ${!isPro ? 'opacity-50' : ''}`}>
      {!isPro && (
        <div className="absolute top-[-6px] right-[-6px] z-20">
          <Zap className="w-3 h-3 text-[var(--ds-accent)] fill-current" />
        </div>
      )}
      <button
        type="button"
        onClick={onViewStructure}
        className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity"
        title="Saved remotes/modules architecture schema for generation — not your live Studio place index"
      >
        <div className={`h-2 w-2 rounded-full ${hasArchitecture ? 'bg-[var(--ds-accent)]' : 'bg-[var(--ds-surface-3)]'}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">
          {hasArchitecture ? (architectureEmpty ? "Arch empty" : "Architecture") : "No Architecture"}
        </span>
      </button>

      {hasArchitecture && (
        <div className="h-4 w-px bg-[var(--ds-fill-hover)]" />
      )}

      {hasArchitecture && (
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold text-[var(--ds-text-muted)] uppercase tracking-tighter"
            title="Counts from the saved architecture schema, not live Studio scripts"
          >
            {remoteCount} Remotes • {moduleCount} Modules
          </span>
        </div>
      )}

      <div className="h-4 w-px bg-[var(--ds-fill-hover)]" />

      <div
        className="flex items-center gap-2"
        title={studioReadinessTitle}
      >
        <div className={`h-2 w-2 rounded-full ${studioReadyDot ? "bg-[var(--ds-info)]" : "bg-[var(--ds-surface-3)]"}`} />
        <span className="text-[9px] font-bold uppercase tracking-tighter text-[var(--ds-text-muted)]">
          {studioReadinessLabel}
        </span>
      </div>

      {onViewStructure && (
        <button
          type="button"
          onClick={onViewStructure}
          className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--ds-accent)] hover:bg-[var(--ds-accent-soft)] transition-colors"
          title="View architecture schema"
        >
          View
        </button>
      )}

      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className={`p-1.5 rounded-lg hover:bg-[var(--ds-fill-hover)] transition-[background-color,color] duration-[var(--motion-fast)] ease-[var(--ease-product)] ${isSyncing ? 'animate-spin text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'}`}
        title="Edit architecture schema (not a Studio place rescan)"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const UnifiedStatusBar = ({ stage, isGenerating, mode = "general" }) => {
  if (!isGenerating && !stage) return null;

  const modeColors = {
    general: "var(--ds-accent)",
    ui: "var(--ds-accent)",
    logic: "var(--ds-accent)",
    system: "var(--ds-info)",
    animator: "var(--ds-accent)",
    data: "var(--ds-warning)",
    performance: "var(--ds-accent)",
    security: "var(--ds-danger)",
  };
  const color = modeColors[mode] || modeColors.general;

  return (
    <div className="w-full px-4 py-2 bg-[var(--ds-fill-hover)] backdrop-blur-md border-t border-[var(--ds-border-subtle)] flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-2 h-2 rounded-full animate-ping absolute inset-0" style={{ backgroundColor: color }} />
          <div className="w-2 h-2 rounded-full relative" style={{ backgroundColor: color }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ds-text)]">
            {stage || "Nexus is working..."}
          </span>
          {isGenerating && (
            <span className="text-[8px] font-bold text-[var(--ds-text-muted)] uppercase tracking-widest">
              Complex generations may take up to 5 minutes
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 w-24 bg-[var(--ds-fill-hover)] rounded-full overflow-hidden">
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

export const UserAvatar = React.memo(({ email, name = "", photoUrl = "" }) => {
  const url = photoUrl || getGravatarUrl(email);
  const initials = getUserInitials(name || email);
  return (
    <div className="w-9 h-9 rounded-xl bg-[var(--ds-fill-hover)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[var(--ds-border-strong)]">
      {url ? (
        <img
          src={url}
          alt="User"
          className="w-full h-full object-cover"
          onError={(e) => (e.target.style.display = "none")}
        />
      ) : (
        <span className="text-[var(--ds-text)] font-bold text-sm">{initials}</span>
      )}
    </div>
  );
});

export const QaBadge = ({ score }) => {
  const color = score > 80 ? ' text-[var(--ds-success)] ' : score > 50 ? ' text-[var(--ds-warning)] ' : ' text-[var(--ds-danger)] ';
  const bg = score > 80 ? ' bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] ' : score > 50 ? ' bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] ' : ' bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] ';
  const border = score > 80 ? ' border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)] ' : score > 50 ? ' border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] ' : ' border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] ';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${bg} ${border} ${color}`}>
      <ShieldCheck className="w-3 h-3" />
      <span className="text-[10px] font-black uppercase tracking-widest">QA {score}%</span>
    </div>
  );
};

export const SkeletonArtifact = ({ type = "code" }) => (
  <div className="mt-6 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] overflow-hidden animate-pulse">
    <div className="px-5 py-4 border-b border-[var(--ds-border-subtle)] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--ds-fill-subtle)]" />
        <div className="space-y-2">
          <div className="w-24 h-3 bg-[var(--ds-fill-hover)] rounded" />
          <div className="w-16 h-2 bg-[var(--ds-fill-subtle)] rounded" />
        </div>
      </div>
    </div>
    <div className="p-8 flex flex-col items-center justify-center gap-4">
      <div className="w-full h-32 bg-[var(--ds-fill-subtle)] rounded-xl" />
    </div>
  </div>
);

export const ArtifactCard = ({ title, subtitle, icon: Icon, type = "code", qaReport = null, children, actions = [] }) => {
  const typeColors = {
    code: "text-[var(--ds-accent)] bg-[var(--ds-accent-soft)] border-[var(--ds-accent-border)]",
    ui: "text-[var(--ds-accent)] bg-[var(--ds-accent-soft)] border-[var(--ds-accent-border)]",
    report: " text-[var(--ds-danger)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] ",
    system: " text-[var(--ds-info)]  bg-[color-mix(in_srgb,var(--ds-info)_12%,transparent)]  border-[color-mix(in_srgb,var(--ds-info)_35%,transparent)] ",
  };
  const colorClass = typeColors[type] || typeColors.code;
  const [showQa, setShowQa] = useState(false);

  return (
    <div className="mt-6 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-5 py-4 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[var(--ds-fill-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-[var(--ds-text)] truncate tracking-tight uppercase">{title}</h4>
              {qaReport && (
                <button onClick={() => setShowQa(!showQa)}>
                  <QaBadge score={qaReport.score} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-[var(--ds-text-muted)] font-bold uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`p-2 rounded-lg transition-[background-color,color,transform] duration-[var(--motion-fast)] ease-[var(--ease-product)] hover:scale-110 active:scale-95 ${action.primary ? 'bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)]' : 'bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]'}`}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
      
      {showQa && qaReport && (
        <div className="p-4 bg-[var(--ds-fill-hover)] border-b border-[var(--ds-border-subtle)] space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest">Automated QA Report</span>
            <button onClick={() => setShowQa(false)} className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"><X className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2">
            {qaReport.issues?.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${issue.severity === 'high' ? 'bg-[var(--ds-danger)]' : issue.severity === 'medium' ? 'bg-[var(--ds-warning)]' : 'bg-[var(--ds-info)]'}`} />
                <span className="text-[var(--ds-text-secondary)]">{issue.message}</span>
                {issue.line && <span className="text-[var(--ds-text-muted)] font-mono ml-auto">L{issue.line}</span>}
              </div>
            ))}
            {(!qaReport.issues || qaReport.issues.length === 0) && (
              <div className=" text-[var(--ds-success)] text-[11px] font-bold flex items-center gap-2">
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
    <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] flex items-center justify-between bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] ">
        <div className="flex items-center gap-2 text-[var(--ds-danger)] ">
          <ShieldAlert className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Security Audit Report</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--ds-danger)] font-bold uppercase">Risk Score:</span>
          <span className={`text-xs font-black ${riskScore > 70 ? ' text-[var(--ds-danger)] ' : riskScore > 30 ? ' text-[var(--ds-warning)] ' : ' text-[var(--ds-success)] '}`}>
            {riskScore}/100
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {vulnerabilities.map((v, i) => (
          <div key={i} className="p-3 rounded-xl bg-[var(--ds-fill-hover)] border border-[var(--ds-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${v.severity === 'high' ? 'bg-[var(--ds-danger)] text-[var(--ds-danger-foreground)]' : v.severity === 'medium' ? 'bg-[var(--ds-warning)] text-[var(--ds-warning-foreground)]' : 'bg-[var(--ds-info)] text-[var(--ds-info-foreground)]'}`}>
                {v.severity} severity
              </span>
              <span className="text-[10px] text-[var(--ds-text-muted)] font-bold">{v.type}</span>
            </div>
            <p className="text-xs text-[var(--ds-text-secondary)] leading-relaxed">{v.description}</p>
            <div className="pt-2 flex items-center justify-between border-t border-[var(--ds-border-subtle)]">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--ds-accent)] font-bold italic">
                <ShieldCheck className="w-3 h-3" />
                Recommended Fix: {v.fix}
              </div>
            </div>
          </div>
        ))}
        <button 
          onClick={onFix}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ds-danger)] py-2.5 text-xs font-semibold text-[var(--ds-danger-foreground)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
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
    <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[color-mix(in_srgb,var(--ds-success)_35%,transparent)] flex items-center justify-between bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] ">
        <div className="flex items-center gap-2 text-[var(--ds-success)] ">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Performance Audit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--ds-success)] font-bold uppercase">Efficiency:</span>
          <span className="text-xs font-black text-[var(--ds-success)] ">{score}%</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[var(--ds-fill-hover)] border border-[var(--ds-border-subtle)] flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[var(--ds-info)] mb-1">
              <Database className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase">Memory</span>
            </div>
            <span className="text-xs text-[var(--ds-text)] font-bold">-{estimatedSavings.memory || '0MB'}</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--ds-fill-hover)] border border-[var(--ds-border-subtle)] flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[var(--ds-warning)] mb-1">
              <Cpu className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase">CPU Time</span>
            </div>
            <span className="text-xs text-[var(--ds-text)] font-bold">-{estimatedSavings.cpu || '0ms'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-[var(--ds-text-muted)] font-black uppercase tracking-widest px-1">Bottlenecks Detected</span>
          {bottlenecks.map((b, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--ds-fill-subtle)] transition-colors">
              <div className={`mt-0.5 p-1 rounded ${b.impact === 'high' ? ' bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] ' : ' bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] '}`}>
                <AlertTriangle className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[var(--ds-text)] font-bold">{b.type}</div>
                <div className="text-[10px] text-[var(--ds-text-secondary)] line-clamp-1">{b.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onOptimize}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ds-success)] py-2.5 text-xs font-semibold text-[var(--ds-success-foreground)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
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
  const [color, setColor] = useState(initialData?.color || "#20808D");
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);

  if (!isOpen) return null;

  return (
    <div
      className="nexus-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ds-surface-overlay)] p-4"
      data-state="open"
      role="presentation"
    >
      <div
        className="nexus-modal-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-mode-title"
      >
        <div className="px-6 py-4 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[var(--ds-fill-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="custom-mode-title" className="text-lg font-black text-[var(--ds-text)] tracking-tight">
                {initialData ? "Edit Custom Mode" : "Create Custom Mode"}
              </h3>
              <p className="text-[10px] text-[var(--ds-text-muted)] font-bold uppercase tracking-widest">Define your own AI expert</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-subtle">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest px-1">Mode Name</label>
              <div className="relative group">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-muted)] group-focus-within:text-[var(--ds-accent)] transition-colors" />
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UI Specialist"
                  className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] py-3 pl-10 pr-4 text-sm text-[var(--ds-text)] outline-none transition-[border-color,background-color,color,opacity] duration-150 focus:border-[var(--ds-accent)] focus:ring-1 focus:ring-[var(--ds-accent)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest px-1">Theme Color</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] p-1 cursor-pointer"
                />
                <div className="flex-1 bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] rounded-xl px-4 py-3 text-xs text-[var(--ds-text-secondary)] font-mono">
                  {color.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest px-1">Short Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this expert specialize in?"
              rows="2"
              className="w-full resize-none rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 text-sm text-[var(--ds-text)] outline-none transition-[border-color,background-color,color,opacity] duration-150 focus:border-[var(--ds-accent)] focus:ring-1 focus:ring-[var(--ds-accent)]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest">System Prompt (The "Brain")</label>
              <span className="text-[9px] text-[var(--ds-accent)] font-semibold italic">Advanced users only</span>
            </div>
            <textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are an expert in... Your goal is to... Always prioritize..."
              rows="6"
              className="w-full resize-none rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 font-mono text-sm text-[var(--ds-text)] outline-none transition-[border-color,background-color,color,opacity] duration-150 focus:border-[var(--ds-accent)] focus:ring-1 focus:ring-[var(--ds-accent)]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-[var(--ds-text-muted)] uppercase tracking-widest">Creativity (Temperature)</label>
              <span className="text-xs font-bold text-[var(--ds-accent)]">{temperature}</span>
            </div>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[var(--ds-fill-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--ds-accent)]"
            />
            <div className="flex justify-between text-[9px] text-[var(--ds-text-muted)] font-bold uppercase tracking-tighter">
              <span>Precise (0.0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPublic ? 'bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-text-muted)]'}`}>
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--ds-text)]">Publish to Community</div>
                <div className="text-[10px] text-[var(--ds-text-muted)]">Allow other developers to use this expert</div>
              </div>
            </div>
            <button 
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-6 w-12 rounded-full transition-colors duration-150 ${isPublic ? 'bg-[var(--ds-accent)]' : 'bg-[var(--ds-surface-3)]'}`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-[left] duration-150 ${isPublic ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-[var(--ds-fill-subtle)] border-t border-[var(--ds-border-subtle)] flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] py-3 text-xs font-black uppercase tracking-widest text-[var(--ds-text)] transition-[border-color,background-color,color,opacity] duration-150 hover:bg-[var(--ds-fill-hover)]"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave({ label: name, description, systemPrompt, temperature, color, isPublic })}
            disabled={!name || !systemPrompt}
            className="flex-[2] rounded-xl bg-[var(--ds-accent)] py-3 text-xs font-semibold text-[var(--ds-accent-foreground)] transition-[background-color,color,opacity,transform] duration-150 hover:bg-[var(--ds-accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Custom Mode
          </button>
        </div>
      </div>
    </div>
  );
};
