import React, { useState } from "react";
import { Check, HelpCircle, ListChecks, SendPrompt, Pencil, Loader } from "lib/icons";
import MarkdownMessage from "./MarkdownMessage";
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "../../ai-elements/plan";
import { Badge } from "../../shadcn/badge";
import { Button } from "../../shadcn/button";

const CLASSIFICATION_LABELS = {
  ui: "Roblox UI",
  script: "Luau Script",
  project: "Full Project",
};

const normalizeClarificationOption = (option, index) => {
  if (typeof option === "string") {
    return {
      value: option,
      label: option,
      description: "",
      recommended: false,
      defaultSelected: false,
    };
  }
  const label = String(option?.label || option?.title || option?.value || option?.id || `Option ${index + 1}`);
  return {
    value: String(option?.value || option?.id || label),
    label,
    description: String(option?.description || option?.helpText || ""),
    recommended: option?.recommended === true || option?.isRecommended === true,
    defaultSelected: option?.default === true || option?.isDefault === true || option?.selected === true,
  };
};

const clarificationQuestionId = (question, index) => question.id || `question-${index + 1}`;

const isMultiSelectQuestion = (question) => (
  question.kind === "multi"
  || question.type === "multi"
  || question.type === "multi_select"
  || question.selectionMode === "multiple"
  || question.multiple === true
  || question.multiSelect === true
);

const configuredAnswerValues = (value) => {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values
    .map((entry) => {
      if (entry && typeof entry === "object") {
        return entry.value || entry.id || entry.label || "";
      }
      return entry;
    })
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
};

const initialClarificationAnswers = (questions) => questions.reduce((initial, question, questionIndex) => {
  const questionId = clarificationQuestionId(question, questionIndex);
  const options = Array.isArray(question.options)
    ? question.options.map(normalizeClarificationOption)
    : [];
  const configured = configuredAnswerValues(
    question.answer
      ?? question.defaultValues
      ?? question.defaultOptionIds
      ?? question.defaultValue
      ?? question.defaultOptionId,
  );
  const optionDefaults = options
    .filter((option) => option.defaultSelected)
    .map((option) => option.value);
  const recommendedDefaults = options
    .filter((option) => option.recommended)
    .map((option) => option.value);
  const defaults = [...new Set([
    ...configured,
    ...optionDefaults,
    ...(configured.length || optionDefaults.length ? [] : recommendedDefaults),
  ])];

  if (isMultiSelectQuestion(question)) {
    if (defaults.length) initial[questionId] = defaults;
  } else if (defaults.length) {
    initial[questionId] = defaults[0];
  }
  return initial;
}, {});

const clarificationAnswerHasValue = (value) => (
  Array.isArray(value)
    ? value.some((entry) => String(entry || "").trim() !== "")
    : value != null && String(value).trim() !== ""
);

/**
 * ClarifyCard: rendered for assistant messages with stage "clarify".
 * Collects 1-3 short answers, then hands them back to re-orchestrate into a plan.
 */
export function ClarifyCard({ message, onSubmit, disabled }) {
  const questions = Array.isArray(message.questions) ? message.questions : [];
  const [answers, setAnswers] = useState(() => initialClarificationAnswers(questions));
  const answered = message.stage === "clarify_answered";

  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const requiredQuestionsAnswered = questions.every((question, questionIndex) => {
    if (question.required === false) return true;
    const questionId = clarificationQuestionId(question, questionIndex);
    return clarificationAnswerHasValue(answers[questionId]);
  });
  const canContinue = questions.length > 0 && requiredQuestionsAnswered;

  if (answered) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
          <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> Answers submitted
        </div>
        <div className="space-y-1">
          {Object.entries(message.answers || {}).map(([k, v]) => (
            <div key={k} className="text-[13px] text-gray-300">
              <span className="text-gray-500">{k}:</span> {Array.isArray(v) ? v.join(", ") : String(v)}
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
        {questions.map((q, questionIndex) => {
          const questionId = clarificationQuestionId(q, questionIndex);
          const options = Array.isArray(q.options)
            ? q.options.map(normalizeClarificationOption)
            : [];
          const optionValues = options.map((option) => option.value);
          const multiSelect = isMultiSelectQuestion(q);
          const allowCustom = q.allowCustom !== false && q.customAllowed !== false;
          const currentValues = multiSelect
            ? configuredAnswerValues(answers[questionId])
            : [];
          const customAnswer = multiSelect
            ? currentValues.find((value) => !optionValues.includes(value)) || ""
            : answers[questionId] && !optionValues.includes(answers[questionId])
              ? String(answers[questionId])
              : "";
          return (
          <div key={questionId} className="space-y-2">
            <div className="text-[14px] text-gray-100 font-medium">
              {q.question || q.prompt}
              {q.required === false ? <span className="ml-1 text-[11px] font-normal text-gray-500">(optional)</span> : null}
              {multiSelect ? <span className="ml-1 text-[11px] font-normal text-gray-500">(select all that apply)</span> : null}
            </div>
            {options.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((option) => {
                  const selected = multiSelect
                    ? currentValues.includes(option.value)
                    : answers[questionId] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!multiSelect) {
                          setAnswer(questionId, option.value);
                          return;
                        }
                        const optionSelections = currentValues.filter((value) => optionValues.includes(value));
                        const nextSelections = selected
                          ? optionSelections.filter((value) => value !== option.value)
                          : [...optionSelections, option.value];
                        setAnswer(questionId, [
                          ...nextSelections,
                          ...(customAnswer ? [customAnswer] : []),
                        ]);
                      }}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-[12px] transition-colors ${
                        selected
                          ? "bg-[#9b5de5] text-white border-[#9b5de5]"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="flex items-center justify-between gap-2 font-bold">
                        <span>{option.label}</span>
                        {option.recommended ? (
                          <span className={`text-[9px] uppercase tracking-wider ${selected ? "text-white/80" : "text-[#00f5d4]"}`}>
                            Recommended
                          </span>
                        ) : null}
                      </span>
                      {option.description && <span className={`mt-0.5 block text-[11px] leading-snug ${selected ? "text-white/75" : "text-gray-500"}`}>{option.description}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {allowCustom ? (
              <input
                type="text"
                disabled={disabled}
                value={customAnswer}
                onChange={(event) => {
                  const nextCustomAnswer = event.target.value;
                  if (!multiSelect) {
                    setAnswer(questionId, nextCustomAnswer);
                    return;
                  }
                  const optionSelections = currentValues.filter((value) => optionValues.includes(value));
                  setAnswer(questionId, [
                    ...optionSelections,
                    ...(nextCustomAnswer ? [nextCustomAnswer] : []),
                  ]);
                }}
                placeholder="Type an answer…"
                aria-label={`Custom answer for ${q.question || q.prompt || `question ${questionIndex + 1}`}`}
                className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#9b5de5]/50"
              />
            ) : null}
          </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled || !canContinue}
        onClick={() => onSubmit?.(message, answers)}
        className="w-full py-2.5 rounded-xl bg-[#9b5de5] text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? <Loader className="w-4 h-4" /> : <SendPrompt className="w-4 h-4" />}
        Continue
      </button>
      {!canContinue && (
        <p className="text-[11px] text-gray-500 text-center">Answer every required question to continue.</p>
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
  const opensEditableWorkspace = typeof onApprove !== "function" && typeof onEdit === "function";

  return (
    <Plan defaultOpen className="border-[#00f5d4]/25 bg-[#00f5d4]/5">
      <PlanHeader className="pb-4">
        <div className="space-y-1">
          <PlanTitle className="flex items-center gap-2 text-sm font-bold text-[#00f5d4]">
            <ListChecks className="w-4 h-4" /> Implementation plan
          </PlanTitle>
          {message.aiSummary && !hasMarkdownPlan ? (
            <PlanDescription className="text-gray-300">{message.aiSummary}</PlanDescription>
          ) : null}
        </div>
        <PlanAction className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
            {label}
          </Badge>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>

      <PlanContent className="space-y-4 pt-0">
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
      </PlanContent>

      <PlanFooter className="flex-col items-stretch gap-3 pt-0">
        {approved ? (
          <div className="w-full py-2.5 rounded-xl bg-black/30 border border-white/10 text-gray-400 font-bold text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-[#00f5d4]" /> Approved — building…
          </div>
        ) : (
          <>
            <div className="text-[12px] text-gray-400 leading-relaxed">
              {opensEditableWorkspace
                ? "Review, edit, and check this plan before starting execution."
                : <>Reply with <span className="font-bold text-gray-200">Start build</span> to approve this plan, or tell me what you want changed.</>}
            </div>
            {opensEditableWorkspace ? (
              <Button
                type="button"
                disabled={disabled}
                onClick={() => onEdit(message)}
                className="flex-1 bg-[#00f5d4] text-black font-black hover:bg-[#00f5d4]/90"
              >
                {disabled ? <Loader className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                Review &amp; edit plan
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => onApprove?.(message)}
                  className="flex-1 bg-[#00f5d4] text-black font-black hover:bg-[#00f5d4]/90"
                >
                  {disabled ? <Loader className="w-4 h-4" /> : <SendPrompt className="w-4 h-4" />}
                  Approve &amp; Build
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onEdit?.(message)}
                  className="font-bold"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>
            )}
          </>
        )}
      </PlanFooter>
    </Plan>
  );
}
