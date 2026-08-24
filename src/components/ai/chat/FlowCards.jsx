import React, { useState } from "react";
import {
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ListChecks,
  SendPrompt,
  Pencil,
  Loader,
} from "lib/icons";
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
  const defaults = [...new Set([
    ...configured,
    ...optionDefaults,
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

const recommendedClarificationAnswers = (questions) => {
  const recommended = {};
  for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
    const question = questions[questionIndex];
    const questionId = clarificationQuestionId(question, questionIndex);
    const options = Array.isArray(question.options)
      ? question.options.map(normalizeClarificationOption)
      : [];
    const values = options.filter((option) => option.recommended).map((option) => option.value);
    if (isMultiSelectQuestion(question) && values.length) {
      recommended[questionId] = values;
    } else if (values.length) {
      recommended[questionId] = values[0];
    } else if (question.required !== false) {
      return null;
    }
  }
  return Object.keys(recommended).length ? recommended : null;
};

function InlineBlockingQuestion({ message }) {
  const firstQuestion = Array.isArray(message.questions) ? message.questions[0] : null;
  const prompt = String(
    firstQuestion?.question
      || firstQuestion?.prompt
      || message.content
      || message.explanation
      || "I need one detail before I can safely continue.",
  ).trim();

  return (
    <div className="max-w-[720px] py-1">
      <p className="text-[14px] leading-6 text-[var(--ds-text)]">{prompt}</p>
      <p className="mt-1 text-[12px] leading-5 text-[var(--ds-text-muted)]">
        Reply in chat and I’ll continue from there.
      </p>
    </div>
  );
}

/**
 * ClarifyCard: rendered for assistant messages with stage "clarify".
 * Collects 1-3 short answers, then hands them back to re-orchestrate into a plan.
 */
export function ClarifyCard({ message, onSubmit, disabled }) {
  const questions = Array.isArray(message.questions) ? message.questions : [];
  const [answers, setAnswers] = useState(() => initialClarificationAnswers(questions));
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [customOpen, setCustomOpen] = useState({});
  const answered = message.stage === "clarify_answered";
  const structuredPlanQuestion = !message.requestMode || message.requestMode === "plan";
  const activeQuestion = questions[activeQuestionIndex] || null;
  const recommendedAnswers = recommendedClarificationAnswers(questions);

  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const requiredQuestionsAnswered = questions.every((question, questionIndex) => {
    if (question.required === false) return true;
    const questionId = clarificationQuestionId(question, questionIndex);
    return clarificationAnswerHasValue(answers[questionId]);
  });
  const canContinue = questions.length > 0 && requiredQuestionsAnswered;

  if (!structuredPlanQuestion && !answered) {
    return <InlineBlockingQuestion message={message} />;
  }

  if (answered) {
    return (
      <div className="border-y border-[var(--ds-border-subtle)] bg-transparent py-4">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-[var(--ds-text-muted)]">
          <Check className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> Answers submitted
        </div>
        <div className="space-y-1">
          {Object.entries(message.answers || {}).map(([k, v]) => (
            <div key={k} className="text-[13px] text-[var(--ds-text-secondary)]">
              <span className="text-[var(--ds-text-muted)]">{k}:</span> {Array.isArray(v) ? v.join(", ") : String(v)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeQuestion) return null;

  const questionId = clarificationQuestionId(activeQuestion, activeQuestionIndex);
  const options = Array.isArray(activeQuestion.options)
    ? activeQuestion.options.map(normalizeClarificationOption)
    : [];
  const optionValues = options.map((option) => option.value);
  const multiSelect = isMultiSelectQuestion(activeQuestion);
  const allowCustom = activeQuestion.allowCustom !== false && activeQuestion.customAllowed !== false;
  const currentValues = multiSelect ? configuredAnswerValues(answers[questionId]) : [];
  const customAnswer = multiSelect
    ? currentValues.find((value) => !optionValues.includes(value)) || ""
    : answers[questionId] && !optionValues.includes(answers[questionId])
      ? String(answers[questionId])
      : "";
  const currentQuestionAnswered = activeQuestion.required === false
    || clarificationAnswerHasValue(answers[questionId]);
  const onLastQuestion = activeQuestionIndex === questions.length - 1;
  const progress = ((activeQuestionIndex + 1) / questions.length) * 100;
  const customIsOpen = options.length === 0 || customOpen[questionId] === true || Boolean(customAnswer);

  const updateCustomAnswer = (nextCustomAnswer) => {
    if (!multiSelect) {
      setAnswer(questionId, nextCustomAnswer);
      return;
    }
    const optionSelections = currentValues.filter((value) => optionValues.includes(value));
    setAnswer(questionId, [
      ...optionSelections,
      ...(nextCustomAnswer ? [nextCustomAnswer] : []),
    ]);
  };

  return (
    <section
      className="w-full max-w-[640px] rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-1)] p-5 shadow-sm sm:p-6"
      aria-labelledby={`${questionId}-title`}
    >
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ds-accent)]">
            <HelpCircle className="h-4 w-4" /> Let’s shape the plan
          </div>
          <span className="shrink-0 text-[12px] font-medium text-[var(--ds-text-muted)]">
            Question {activeQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-[var(--ds-fill-subtle)]"
          role="progressbar"
          aria-label="Planning questions"
          aria-valuemin="1"
          aria-valuemax={questions.length}
          aria-valuenow={activeQuestionIndex + 1}
        >
          <div
            className="h-full rounded-full bg-[var(--ds-accent)] transition-[width] duration-[var(--motion-normal)] ease-[var(--ease-standard)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="mt-6">
        <h3 id={`${questionId}-title`} className="text-[16px] font-semibold leading-6 text-[var(--ds-text)]">
          {activeQuestion.question || activeQuestion.prompt}
        </h3>
        <div className="mt-1 flex flex-wrap gap-x-2 text-[12px] leading-5 text-[var(--ds-text-muted)]">
          {activeQuestion.reason ? <span>{activeQuestion.reason}</span> : null}
          {activeQuestion.required === false ? <span>(Optional)</span> : null}
          {multiSelect ? <span>Select all that apply.</span> : null}
        </div>

        {options.length > 0 ? (
          <div className="mt-4 grid gap-2" role="group" aria-label={activeQuestion.question || activeQuestion.prompt}>
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
                      setCustomOpen((previous) => ({ ...previous, [questionId]: false }));
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
                  className={`group min-h-[56px] rounded-xl border px-4 py-3 text-left transition-[background-color,border-color,color] duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-1)] ${
                    selected
                      ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-text)]"
                      : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)]"
                  }`}
                  aria-pressed={selected}
                >
                  <span className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-[var(--ds-accent)] bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)]"
                        : "border-[var(--ds-border-strong)] text-transparent"
                    }`} aria-hidden="true">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                        <span>{option.label}</span>
                        {option.recommended ? (
                          <span className="rounded-full bg-[var(--ds-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ds-accent)]">
                            Best fit
                          </span>
                        ) : null}
                      </span>
                      {option.description ? (
                        <span className="mt-1 block text-[12px] leading-5 text-[var(--ds-text-muted)]">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {allowCustom && options.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            aria-expanded={customIsOpen}
            onClick={() => {
              setCustomOpen((previous) => ({ ...previous, [questionId]: true }));
              if (!multiSelect && optionValues.includes(answers[questionId])) setAnswer(questionId, "");
            }}
            className={`mt-2 flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] ${
              customIsOpen
                ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-text)]"
                : "border-[var(--ds-border-subtle)] bg-transparent text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)]"
            }`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> Something else
          </button>
        ) : null}

        {allowCustom && customIsOpen ? (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[12px] font-medium text-[var(--ds-text-secondary)]">
              {options.length ? "Your answer" : "Answer"}
            </span>
            <input
              type="text"
              disabled={disabled}
              value={customAnswer}
              onChange={(event) => updateCustomAnswer(event.target.value)}
              placeholder={activeQuestion.placeholder || "Describe what you have in mind…"}
              aria-label={`Custom answer for ${activeQuestion.question || activeQuestion.prompt || `question ${activeQuestionIndex + 1}`}`}
              className="min-h-[48px] w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-3.5 py-2.5 text-[14px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
            />
          </label>
        ) : null}
      </div>

      <footer className="mt-6 space-y-3 border-t border-[var(--ds-border-subtle)] pt-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={disabled || activeQuestionIndex === 0}
            onClick={() => setActiveQuestionIndex((index) => Math.max(0, index - 1))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            disabled={disabled || !currentQuestionAnswered || (onLastQuestion && !canContinue)}
            onClick={() => {
              if (!onLastQuestion) {
                setActiveQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
                return;
              }
              onSubmit?.(message, answers);
            }}
            className="inline-flex min-h-[44px] min-w-[132px] items-center justify-center gap-2 rounded-full bg-[var(--ds-accent)] px-5 text-[13px] font-semibold text-[var(--ds-accent-foreground)] transition-[background-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-[var(--ds-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-1)]"
          >
            {disabled ? <Loader className="h-4 w-4" /> : onLastQuestion ? <SendPrompt className="h-4 w-4" /> : null}
            {onLastQuestion ? "Create plan" : "Next"}
            {!disabled && !onLastQuestion ? <ChevronRight className="h-4 w-4" /> : null}
          </button>
        </div>
        {recommendedAnswers ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSubmit?.(message, recommendedAnswers)}
            className="mx-auto flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-medium text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
          >
            <CheckCircle className="h-4 w-4 text-[var(--ds-accent)]" /> Use recommended settings
          </button>
        ) : null}
      </footer>
    </section>
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
    <Plan defaultOpen className="border-[color-mix(in_srgb,var(--ds-plan)_40%,transparent)] bg-[color-mix(in_srgb,var(--ds-plan)_8%,transparent)]">
      <PlanHeader className="pb-4">
        <div className="space-y-1">
          <PlanTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--ds-plan)]">
            <ListChecks className="w-4 h-4" /> Implementation plan
          </PlanTitle>
          {message.aiSummary && !hasMarkdownPlan ? (
            <PlanDescription className="text-[var(--ds-text-secondary)]">{message.aiSummary}</PlanDescription>
          ) : null}
        </div>
        <PlanAction className="flex items-center gap-1">
          <Badge variant="outline" className="border-[color-mix(in_srgb,var(--ds-plan)_35%,transparent)] text-[10px] font-semibold text-[var(--ds-plan)]">
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
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">Goal</div>
                <div className="text-[14px] text-[var(--ds-text)] leading-relaxed">{message.aiSummary}</div>
              </div>
            )}

            {steps.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">Implementation</div>
                <ol className="space-y-2">
                  {steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] text-[var(--ds-text-secondary)]">
                      <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--ds-plan)_10%,transparent)] border border-[color-mix(in_srgb,var(--ds-plan)_30%,transparent)] flex items-center justify-center text-[10px] font-semibold text-[var(--ds-plan)]">
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
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-muted)]">Assumptions</div>
                <ul className="space-y-1.5">
                  {assumptions.map((assumption, idx) => (
                    <li key={idx} className="text-[13px] text-[var(--ds-text-secondary)] leading-relaxed">
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
                        ? "bg-[var(--ds-success-soft)] border-[var(--ds-success-border)] text-[var(--ds-success)]"
                        : "bg-[var(--ds-fill-subtle)] border-[var(--ds-border-subtle)] text-[var(--ds-text-muted)]"
                    }`}
                  >
                    {done && <Check className="w-2.5 h-2.5" />}
                    {s.label || s.id}
                  </span>
                  {idx < lifecycle.length - 1 && <span className="text-[var(--ds-text-muted)] text-[10px]">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </PlanContent>

      <PlanFooter className="flex-col items-stretch gap-3 pt-0">
        {approved ? (
          <div className="w-full py-2.5 rounded-xl bg-[var(--ds-success-soft)] border border-[var(--ds-success-border)] text-[var(--ds-text-secondary)] font-medium text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-[var(--ds-success)]" /> Approved — building…
          </div>
        ) : (
          <>
            <div className="text-[12px] text-[var(--ds-text-secondary)] leading-relaxed">
              {opensEditableWorkspace
                ? "Review, edit, and check this plan before starting execution."
                : <>Reply with <span className="font-bold text-[var(--ds-text)]">Start build</span> to approve this plan, or tell me what you want changed.</>}
            </div>
            {opensEditableWorkspace ? (
              <Button
                type="button"
                disabled={disabled}
                onClick={() => onEdit(message)}
                className="flex-1 bg-[var(--ds-plan)] text-[var(--ds-plan-foreground)] font-semibold hover:opacity-90"
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
                  className="flex-1 bg-[var(--ds-plan)] text-[var(--ds-plan-foreground)] font-semibold hover:opacity-90"
                >
                  {disabled ? <Loader className="w-4 h-4" /> : <SendPrompt className="w-4 h-4" />}
                  Approve &amp; Build
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onEdit?.(message)}
                  className="font-medium"
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
