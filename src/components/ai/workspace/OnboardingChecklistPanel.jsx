import React from "react";
import { CheckCircle2, Circle, ExternalLink, Sparkles, X } from "lucide-react";

function StepAction({ step, onMarkManualStepDone }) {
  if (step.completed) {
    return (
      <span className="inline-flex items-center rounded-full border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#00f5d4]">
        Complete
      </span>
    );
  }

  if (step.manual) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {step.actionHref ? (
          <a
            href={step.actionHref}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-300 transition hover:border-white/20 hover:text-white"
          >
            {step.actionLabel || "Docs"}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onMarkManualStepDone?.(step.id)}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-300 transition hover:border-white/20 hover:text-white"
        >
          Mark Done
        </button>
      </div>
    );
  }

  if (step.actionHref) {
    return (
      <a
        href={step.actionHref}
        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-300 transition hover:border-white/20 hover:text-white"
      >
        {step.actionLabel || "Open"}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
      In Workspace
    </span>
  );
}

export default function OnboardingChecklistPanel({
  onboarding,
  onMarkManualStepDone,
  onDismiss,
  onReopenModal,
}) {
  if (!onboarding?.checklistOpen) return null;

  const completedCount = onboarding.steps.filter((step) => step.completed).length;
  const allComplete = completedCount === onboarding.steps.length;

  return (
    <section className="mx-auto mb-4 w-full max-w-5xl rounded-3xl border border-white/10 bg-black/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/15 bg-[#00f5d4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#00f5d4]">
            <Sparkles className="h-3.5 w-3.5" />
            AI + Studio Onboarding
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            {allComplete ? "Core workflow complete" : "Work through the safest first-run path"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            {allComplete
              ? "You have completed the guided NexusRBX Studio workflow. Keep Manual Review on when testing new prompts."
              : "Install the plugin, pair Studio, keep Manual Review on, and ship your first approved change."}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:border-white/20 hover:text-white"
          aria-label="Dismiss onboarding checklist"
          title="Dismiss onboarding checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] via-[#00bbf9] to-[#9b5de5]"
            style={{ width: `${(completedCount / onboarding.steps.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
          {completedCount}/{onboarding.steps.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {onboarding.steps.map((step, index) => (
          <div
            key={step.id}
            className={`rounded-2xl border p-3 transition ${
              step.completed
                ? "border-[#00f5d4]/15 bg-[#00f5d4]/6"
                : "border-white/8 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 text-[#00f5d4]">
                  {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-gray-600" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{index + 1}</span>
                    <h3 className="text-sm font-bold text-white">{step.label}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">{step.description}</p>
                </div>
              </div>
              <StepAction step={step} onMarkManualStepDone={onMarkManualStepDone} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
        <button
          type="button"
          onClick={onReopenModal}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
        >
          Reopen Welcome
        </button>
        <a
          href="/docs#overview"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
        >
          Open Docs
        </a>
      </div>
    </section>
  );
}
