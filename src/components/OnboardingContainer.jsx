import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Shield, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FLOW_POINTS = [
  {
    title: "Pair Studio first",
    description: "Install the plugin, mint a pairing code, and connect Roblox Studio before asking the agent to inspect or change anything.",
  },
  {
    title: "Keep Manual Review on",
    description: "Let the agent read and plan freely, but approve every mutating Studio step until you trust the workflow.",
  },
  {
    title: "Verify and recover",
    description: "Check the result in Studio, then use snapshots or restore if the change is not what you wanted.",
  },
];

export default function OnboardingContainer({
  open = false,
  user = null,
  onClose,
  onStart,
}) {
  const [step, setStep] = useState(1);

  const startLabel = useMemo(() => (user ? "Start in Workspace" : "Start in Workspace"), [user]);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0D0D0D] shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:border-white/20 hover:text-white"
          aria-label="Close onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#00f5d4] via-[#00bbf9] to-[#9b5de5]"
            style={{ width: `${step === 1 ? 50 : 100}%` }}
          />
        </div>

        <div className="overflow-y-auto p-8 md:p-10">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/15 bg-[#00f5d4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#00f5d4]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Studio Agent
                  </div>
                  <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white md:text-4xl">
                    Build, inspect, and apply Roblox Studio changes with a safer first-run flow
                  </h2>
                  <p className="max-w-2xl text-base leading-relaxed text-gray-400">
                    NexusRBX can read your place manifest, inspect scripts, propose changes, and apply approved edits back into Studio. The safest default is to pair Studio, keep Manual Review enabled, and verify every first change.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {FLOW_POINTS.map((point) => (
                    <div key={point.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-3 inline-flex rounded-xl border border-[#00f5d4]/15 bg-[#00f5d4]/10 p-2 text-[#00f5d4]">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{point.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-gray-400">{point.description}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                    <Shield className="h-3.5 w-3.5" />
                    Safe Default
                  </div>
                  <p className="text-sm leading-relaxed text-amber-50/90">
                    Manual Review is the recommended default. Let the agent inspect and plan, then approve destructive Studio steps one by one until you are comfortable with the workflow.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#9b5de5]/15 bg-[#9b5de5]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#9b5de5]">
                    <Shield className="h-3.5 w-3.5" />
                    First Run
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                    Take the real path, not a demo tour
                  </h2>
                  <p className="max-w-2xl text-base leading-relaxed text-gray-400">
                    Use the checklist in the AI workspace as your source of truth. It tracks pairing, Live Studio, your first prompt, approval, and final verification.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <a
                    href="/docs#install-plugin"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00f5d4]">Install</div>
                    <div className="mt-2 text-sm font-bold text-white">Install Plugin</div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                      Follow the current plugin install and update steps before you pair Studio.
                    </p>
                  </a>
                  <a
                    href="/docs#overview"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00bbf9]">Reference</div>
                    <div className="mt-2 text-sm font-bold text-white">Open Docs</div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                      Review pairing, approval modes, prompt examples, snapshots, and troubleshooting.
                    </p>
                  </a>
                  <button
                    type="button"
                    onClick={onStart}
                    className="rounded-2xl border border-[#9b5de5]/20 bg-[#9b5de5]/10 p-4 text-left transition hover:border-[#9b5de5]/35 hover:bg-[#9b5de5]/15"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f3d1ff]">Workspace</div>
                    <div className="mt-2 text-sm font-bold text-white">{startLabel}</div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-300">
                      Close this modal and follow the checklist beside the live AI workspace.
                    </p>
                  </button>
                </div>

                {!user && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
                    Sign in before pairing Studio so NexusRBX can store your runs, manifest state, and approvals.
                    <div className="mt-3">
                      <a
                        href="/signin"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:border-white/20"
                      >
                        Sign In
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-8 py-5">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition ${
              step === 1
                ? "border-white/5 bg-white/[0.02] text-gray-600 opacity-40"
                : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white"
            }`}
            disabled={step === 1}
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${step === 1 ? "bg-[#00f5d4]" : "bg-white/10"}`} />
            <span className={`h-2.5 w-2.5 rounded-full ${step === 2 ? "bg-[#00f5d4]" : "bg-white/10"}`} />
          </div>

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#00f5d4] transition hover:border-[#00f5d4]/35 hover:text-white"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full border border-[#9b5de5]/25 bg-[#9b5de5]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white transition hover:border-[#9b5de5]/45"
            >
              {startLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
