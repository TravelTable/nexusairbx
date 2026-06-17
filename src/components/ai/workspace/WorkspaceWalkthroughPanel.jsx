import React from "react";
import { CheckCircle2, Circle, ExternalLink, RotateCcw, X } from "lucide-react";

function StepAction({ step, onMarkManualStepDone }) {
  if (step.completed) {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
        Complete
      </span>
    );
  }

  if (step.manual) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onMarkManualStepDone?.(step.id)}
          className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/25 hover:bg-white/10"
        >
          Mark done
        </button>
        {step.actionHref ? (
          <a
            href={step.actionHref}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-transparent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition hover:border-white/25 hover:text-white"
          >
            {step.actionLabel || "Docs"}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    );
  }

  if (step.actionHref) {
    return (
      <a
        href={step.actionHref}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/25 hover:bg-white/10"
      >
        {step.actionLabel || "Open"}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
      In workspace
    </span>
  );
}

export default function WorkspaceWalkthroughPanel({
  onboarding,
  onMarkManualStepDone,
  onDismiss,
  onReplay,
}) {
  if (!onboarding?.walkthroughOpen && !onboarding?.checklistOpen) return null;

  const steps = onboarding.steps || [];
  const completedCount = steps.filter((step) => step.completed).length;
  const totalCount = steps.length || 1;
  const allComplete = steps.length > 0 && completedCount === steps.length;
  const nextStep = steps.find((step) => !step.completed);
  const progressWidth = `${(completedCount / totalCount) * 100}%`;

  if (allComplete) {
    return (
      <section className="mx-auto mb-3 w-full max-w-5xl rounded-lg border border-white/10 bg-black/35 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">Workspace Walkthrough complete</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                Studio is paired, Manual Review is set, and the first approved Studio change has been verified.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-300 transition hover:border-white/25 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-400 transition hover:border-white/25 hover:text-white"
              aria-label="Dismiss Workspace Walkthrough"
              title="Dismiss Workspace Walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mb-3 w-full max-w-5xl rounded-lg border border-white/10 bg-black/35 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
            Workspace Walkthrough
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            Pair Studio and apply the first reviewed change
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            Complete the Studio plugin, pairing code, Manual Review, approval, and Studio verification steps in order.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-400 transition hover:border-white/25 hover:text-white"
          aria-label="Dismiss Workspace Walkthrough"
          title="Dismiss Workspace Walkthrough"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.45fr)]">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
              Progress
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
              {completedCount}/{steps.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-300 transition-[width]" style={{ width: progressWidth }} />
          </div>
        </div>

        {nextStep ? (
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Next step</div>
            <div className="mt-1 text-sm font-bold text-white">{nextStep.label}</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`rounded-md border p-3 transition ${
              step.completed
                ? "border-emerald-400/15 bg-emerald-400/[0.06]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className={step.completed ? "mt-0.5 text-emerald-300" : "mt-0.5 text-gray-600"}>
                  {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{index + 1}</span>
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
          onClick={onReplay}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-bold uppercase tracking-[0.14em] text-gray-300 transition hover:border-white/25 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay walkthrough
        </button>
        <a
          href="/docs#overview"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-bold uppercase tracking-[0.14em] text-gray-300 transition hover:border-white/25 hover:text-white"
        >
          Open docs
        </a>
      </div>
    </section>
  );
}
