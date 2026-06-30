import React, { useState } from "react";
import { Check, HelpCircle, ListChecks, SendPrompt, Pencil, Loader } from "lib/icons";
import MarkdownMessage from "./MarkdownMessage";

const CLASSIFICATION_LABELS = {
  ui: "Roblox UI",
  script: "Luau Script",
  project: "Full Project",
};

/**
 * ClarifyCard: rendered for assistant messages with stage "clarify".
 * Collects 1-3 short answers, then hands them back to re-orchestrate into a plan.
 */
export function ClarifyCard({ message, onSubmit, disabled }) {
  const questions = Array.isArray(message.questions) ? message.questions : [];
  const [answers, setAnswers] = useState({});
  const answered = message.stage === "clarify_answered";

  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const hasAnswer = Object.values(answers).some((v) => v != null && String(v).trim() !== "");

  if (answered) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
          <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> Answers submitted
        </div>
        <div className="space-y-1">
          {Object.entries(message.answers || {}).map(([k, v]) => (
            <div key={k} className="text-[13px] text-gray-300">
              <span className="text-gray-500">{k}:</span> {String(v)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#9b5de5]/25 bg-[#9b5de5]/5 p-4 space-y-4">
      <div className="flex items-center gap-2 font-display text-sm font-bold text-[#9b5de5]">
        <HelpCircle className="w-4 h-4" /> A few quick questions
      </div>

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <div className="text-[14px] text-gray-100 font-medium">{q.question}</div>
            {Array.isArray(q.options) && q.options.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => setAnswer(q.id, opt)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                        selected
                          ? "bg-[#9b5de5] text-white border-[#9b5de5]"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              disabled={disabled}
              value={answers[q.id] && (!q.options?.includes(answers[q.id])) ? answers[q.id] : ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Type an answer…"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#9b5de5]/50"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled || !hasAnswer}
        onClick={() => onSubmit?.(message, answers)}
        className="w-full py-2.5 rounded-xl bg-[#9b5de5] text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? <Loader className="w-4 h-4" /> : <SendPrompt className="w-4 h-4" />}
        Continue
      </button>
      {!hasAnswer && (
        <p className="text-[11px] text-gray-500 text-center">Answer at least one question to continue.</p>
      )}
    </div>
  );
}

/**
 * PlanCard: rendered for assistant messages with stage "plan" / "plan_approved".
 * Shows the build summary + steps with a single Approve & Build action.
 */
export function PlanCard({ message, onApprove, onEdit, disabled }) {
  const steps = Array.isArray(message.aiSteps) ? message.aiSteps : [];
  const assumptions = Array.isArray(message.aiAssumptions) ? message.aiAssumptions : [];
  const planMarkdown = String(message.planMarkdown || "").trim();
  const hasMarkdownPlan = planMarkdown.length > 0;
  const approved = message.stage === "plan_approved";
  const label = CLASSIFICATION_LABELS[message.classification] || "Artifact";
  const lifecycle = Array.isArray(message.planSteps) ? message.planSteps : [];

  return (
    <div className="rounded-2xl border border-[#00f5d4]/25 bg-[#00f5d4]/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-[#00f5d4]">
          <ListChecks className="w-4 h-4" /> Implementation plan
        </div>
        <span className="px-2 py-1 rounded-md bg-black/30 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300">
          {label}
        </span>
      </div>

      {hasMarkdownPlan ? (
        <MarkdownMessage text={planMarkdown} />
      ) : (
        <>
          {message.aiSummary && (
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Goal</div>
              <div className="text-[14px] text-gray-100 leading-relaxed">{message.aiSummary}</div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Implementation</div>
              <ol className="space-y-2">
                {steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[13px] text-gray-300">
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-[#00f5d4]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {assumptions.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Assumptions</div>
              <ul className="space-y-1.5">
                {assumptions.map((assumption, idx) => (
                  <li key={idx} className="text-[13px] text-gray-400 leading-relaxed">
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {lifecycle.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {lifecycle.map((s, idx) => {
            const done = s.status === "done" || (approved && s.id === "scope");
            return (
              <React.Fragment key={s.id || idx}>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                    done
                      ? "bg-[#00f5d4]/10 border-[#00f5d4]/30 text-[#00f5d4]"
                      : "bg-black/30 border-white/10 text-gray-500"
                  }`}
                >
                  {done && <Check className="w-2.5 h-2.5" />}
                  {s.label || s.id}
                </span>
                {idx < lifecycle.length - 1 && <span className="text-gray-700 text-[10px]">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {approved ? (
        <div className="w-full py-2.5 rounded-xl bg-black/30 border border-white/10 text-gray-400 font-bold text-sm flex items-center justify-center gap-2">
          <Check className="w-4 h-4 text-[#00f5d4]" /> Approved — building…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[12px] text-gray-400 leading-relaxed">
            Reply with <span className="font-bold text-gray-200">Start build</span> to approve this plan, or tell me what you want changed.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onApprove?.(message)}
              className="flex-1 py-2.5 rounded-xl bg-[#00f5d4] text-black font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(0,245,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disabled ? <Loader className="w-4 h-4" /> : <SendPrompt className="w-4 h-4" />}
              Approve &amp; Build
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onEdit?.(message)}
              className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
