import React, {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clipboard,
  Code2,
  Download,
  FileCode2,
  Loader,
  Pencil,
  RefreshCw,
  Save,
  SendPrompt,
  ShieldCheck,
  SlidersHorizontal,
  TerminalSquare,
} from "lib/icons";

import { Button, cx } from "../../components/ui";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/shadcn/tabs";
import "./QuickScriptWorkspace.css";

const QuickScriptCodeBlock = lazy(
  () => import("../../components/ai/QuickScriptCodeBlock"),
);

const EXAMPLES = [
  {
    icon: FileCode2,
    target: "server",
    type: "Server Script",
    title: "Damage on touch",
    prompt:
      "Make a Script that damages players when they touch a part named DamagePart.",
  },
  {
    icon: Code2,
    target: "local",
    type: "LocalScript",
    title: "Open a shop UI",
    prompt:
      "Create a LocalScript that opens a shop frame when I press a button.",
  },
  {
    icon: AlertTriangle,
    target: "auto",
    type: "Debug",
    title: "Fix a Luau error",
    prompt: "Fix this Luau error and explain where to put the script.",
  },
];

const SCRIPT_TARGETS = [
  { id: "auto", label: "Auto" },
  { id: "server", label: "Server" },
  { id: "local", label: "Local" },
  { id: "module", label: "Module" },
];

const SCRIPT_TARGET_INSTRUCTIONS = {
  server: "Return a Roblox server Script.",
  local: "Return a Roblox LocalScript.",
  module: "Return a Roblox ModuleScript.",
};

const WORKFLOW_STEPS = ["Describe", "Generate", "Review", "Studio"];

function withScriptTarget(prompt, scriptTarget) {
  const instruction = SCRIPT_TARGET_INSTRUCTIONS[scriptTarget];
  return instruction
    ? `${String(prompt || "").trim()}\n\n${instruction}`
    : prompt;
}

function generationLabel(stage) {
  const normalized = String(stage || "").toLowerCase();
  if (normalized.includes("validat") || normalized.includes("check"))
    return "Checking script";
  if (normalized.includes("plan")) return "Planning";
  return "Writing Luau";
}

function ListSection({ title, items, empty, icon, isWarning }) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div
      className={cx(
        "quick-script-record border p-4",
        isWarning
          ? "border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] hover:border-[var(--ds-warning)]"
          : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] hover:border-[var(--ds-border-subtle)]",
      )}
    >
      <div
        className={cx(
          "flex items-center gap-2 border-b pb-2",
          isWarning
            ? " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] "
            : "border-[var(--ds-border-subtle)]",
        )}
      >
        {icon}
        <h3
          className={cx(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            isWarning
              ? " text-[var(--ds-warning)] "
              : "text-[var(--ds-text-secondary)]",
          )}
        >
          {title}
        </h3>
      </div>
      {normalized.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          {normalized.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2.5">
              <span
                className={cx(
                  "quick-script-record__mark mt-1.5 h-1.5 w-1.5 shrink-0",
                  isWarning
                    ? " bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] "
                    : "bg-[var(--ds-accent-hover)]",
                )}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--ds-text-muted)]">{empty}</p>
      )}
    </div>
  );
}

function QuickScriptComposer({
  prompt,
  setPrompt,
  scriptTarget,
  setScriptTarget,
  textareaRef,
  isGenerating,
  isImproving,
  isComposing,
  setIsComposing,
  canSubmit,
  stage,
  hasResult,
  hasError,
  onGenerate,
  onImprovePrompt,
  onFocus,
}) {
  const submit = (event) => {
    event?.preventDefault?.();
    if (canSubmit) onGenerate?.(withScriptTarget(prompt, scriptTarget));
  };

  const visibleGenerationLabel = generationLabel(stage);

  return (
    <form
      onSubmit={submit}
      className="quick-script-composer-form group relative"
    >
      <div className="quick-script-composer relative flex flex-col border border-[var(--ds-border)] bg-[var(--ds-surface-1)]">
        <div className="quick-script-composer__toolbar flex flex-wrap items-center gap-2">
          <div
            className={cx(
              "quick-script-run-state inline-flex h-8 items-center border px-3 text-[11px] font-medium",
              isGenerating
                ? "border-[var(--ds-success)] text-[var(--ds-success)]"
                : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]",
            )}
            aria-live="polite"
          >
            {isGenerating
              ? stage || "Working"
              : hasResult
                ? "Luau · Update script"
                : "Luau · Focused script"}
          </div>
          <div className="hidden h-px min-w-[1rem] flex-1 bg-[var(--ds-fill-subtle)] sm:block" />
          {onImprovePrompt ? (
            <button
              type="button"
              onClick={() => onImprovePrompt()}
              disabled={
                isGenerating || isImproving || !String(prompt || "").trim()
              }
              data-tour="improve-btn"
              className="quick-script-text-action inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[11px] font-medium text-[var(--ds-text-secondary)] hover:text-[var(--nx-purple)] focus-ring disabled:cursor-not-allowed disabled:opacity-40"
              title="Expand your prompt into a detailed brief"
            >
              {isImproving ? (
                <Loader className="h-3 w-3 animate-spin" />
              ) : (
                <SlidersHorizontal className="h-3 w-3" />
              )}
              {isImproving ? "Improving" : "Improve"}
            </button>
          ) : null}
        </div>

        <div className="quick-script-prompt-field border-y border-[var(--ds-border-subtle)] bg-transparent">
          <label htmlFor="quick-script-prompt" className="sr-only">
            Describe the Roblox script
          </label>
          <textarea
            id="quick-script-prompt"
            ref={textareaRef}
            value={prompt}
            rows={1}
            onChange={(event) => setPrompt(event.target.value)}
            onFocus={onFocus}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !isComposing &&
                !event.nativeEvent?.isComposing
              ) {
                event.preventDefault();
                submit(event);
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            disabled={isGenerating}
            data-tour="prompt-input"
            placeholder="Describe one Roblox script and where it should go."
            className="min-h-[84px] max-h-[160px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed text-[var(--ds-text)] outline-none placeholder:text-[var(--ds-text-muted)] disabled:opacity-60 md:text-[15px]"
            aria-label="Quick Script prompt"
            aria-describedby="quick-script-help"
            aria-invalid={hasError}
          />
        </div>

        <div className="quick-script-composer__footer">
          <fieldset className="quick-script-targets">
            <legend>Script type</legend>
            <div role="group" aria-label="Script type">
              {SCRIPT_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  aria-pressed={scriptTarget === target.id}
                  onClick={() => setScriptTarget(target.id)}
                  disabled={isGenerating}
                  className="focus-ring"
                >
                  {target.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="quick-script-composer__submit-row">
            <div id="quick-script-help" className="quick-script-composer__help">
              <span>Enter to generate · Shift + Enter for a new line</span>
              <span>{String(prompt || "").trim().length} characters</span>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              data-tour="generate-btn"
              className="quick-script-submit focus-ring"
              aria-label={
                isGenerating
                  ? "Generation in progress"
                  : hasResult
                    ? "Generate updated script"
                    : "Generate script"
              }
            >
              {isGenerating ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <SendPrompt className="h-4 w-4" />
              )}
              <span>
                {isGenerating
                  ? visibleGenerationLabel
                  : hasResult
                    ? "Update script"
                    : "Generate script"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function QuickScriptWorkflow({ isGenerating, hasResult }) {
  const activeIndex = hasResult ? 2 : isGenerating ? 1 : 0;

  return (
    <ol className="quick-script-workflow" aria-label="Quick Script workflow">
      {WORKFLOW_STEPS.map((step, index) => (
        <li
          key={step}
          data-state={
            index < activeIndex
              ? "complete"
              : index === activeIndex
                ? "active"
                : "upcoming"
          }
          aria-current={index === activeIndex ? "step" : undefined}
        >
          <span aria-hidden="true">
            {index < activeIndex ? <Check /> : index + 1}
          </span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

function QuickScriptOverview({ studioConnected }) {
  return (
    <aside
      className="quick-script-overview"
      aria-labelledby="quick-script-overview-title"
    >
      <div className="quick-script-overview__heading">
        <p>Quick output</p>
        <h2 id="quick-script-overview-title">
          Ready to review, not just paste.
        </h2>
      </div>
      <ul>
        <li>
          <FileCode2 aria-hidden="true" />
          <span>
            <strong>One Luau file</strong>Focused on the requested behavior.
          </span>
        </li>
        <li>
          <Pencil aria-hidden="true" />
          <span>
            <strong>Placement guide</strong>Know which service or object owns
            it.
          </span>
        </li>
        <li>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Test checklist</strong>Review setup, assumptions, and
            warnings.
          </span>
        </li>
      </ul>
      <div
        className="quick-script-overview__studio"
        data-connected={studioConnected ? "true" : "false"}
      >
        <span
          className="nx-build-signal"
          data-state={studioConnected ? "ready" : "warning"}
          aria-hidden="true"
        />
        <div>
          <strong>
            {studioConnected ? "Studio connected" : "Studio offline"}
          </strong>
          <span>
            {studioConnected
              ? "The result can be sent after review."
              : "Connect from the top bar when you are ready."}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default function QuickScriptWorkspace({
  prompt,
  setPrompt,
  quickScript,
  studioConnected = false,
  user,
  authReady = true,
  onGenerate,
  onRetry,
  onCopy,
  onSave,
  onExport,
  onStudioPush,
  onContinueEditing,
  onOpenAgentBuild,
  onImprovePrompt,
  isImproving = false,
}) {
  const textareaRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scriptTarget, setScriptTarget] = useState("auto");
  const result = quickScript?.result || null;
  const status = quickScript?.status || "idle";
  const scriptValidation = result?.validation || null;
  const studioPushBlocked =
    scriptValidation?.status === "blocked" ||
    !["Script", "LocalScript", "ModuleScript"].includes(result?.scriptType) ||
    !String(result?.studioLocation || "").trim();
  const [mobilePane, setMobilePane] = useState(result ? "result" : "prompt");
  const isGenerating = status === "generating";
  const canSubmit = Boolean(String(prompt || "").trim()) && !isGenerating;

  useEffect(() => {
    if (!prompt && quickScript?.prompt) {
      setPrompt(quickScript.prompt);
    }
  }, [prompt, quickScript?.prompt, setPrompt]);

  useEffect(() => {
    if (isGenerating) {
      setMobilePane("prompt");
    } else if (result) {
      setMobilePane("result");
    }
  }, [isGenerating, result]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 42), 140)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 140 ? "auto" : "hidden";
  }, [prompt]);

  const keepPromptVisible = () => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      )?.matches;
      textarea.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }, 80);
  };

  const warnings = useMemo(() => {
    const items = [];
    if (Array.isArray(result?.limitations)) items.push(...result.limitations);
    if (Array.isArray(result?.assumptions))
      items.push(...result.assumptions.map((item) => `Assumption: ${item}`));
    return items;
  }, [result]);

  const handleCopyClick = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const composer = (
    <QuickScriptComposer
      prompt={prompt}
      setPrompt={setPrompt}
      scriptTarget={scriptTarget}
      setScriptTarget={setScriptTarget}
      textareaRef={textareaRef}
      isGenerating={isGenerating}
      isImproving={isImproving}
      isComposing={isComposing}
      setIsComposing={setIsComposing}
      canSubmit={canSubmit}
      stage={quickScript?.stage}
      hasResult={Boolean(result)}
      hasError={Boolean(quickScript?.error && !result)}
      onGenerate={onGenerate}
      onImprovePrompt={onImprovePrompt}
      onFocus={keepPromptVisible}
    />
  );

  return (
    <section
      className="quick-script-workspace relative flex h-full min-h-0 overflow-hidden bg-[var(--ds-bg-workspace)]"
      aria-label="Quick generator"
    >
      {result && (
        <h1 className="sr-only">{result.title || "Generated Quick script"}</h1>
      )}
      <div
        className={cx(
          "quick-script-prompt-pane min-h-0 min-w-0 flex-1 flex-col bg-[var(--ds-bg-workspace)]",
          result
            ? "lg:w-[40%] lg:flex-none lg:border-r lg:border-[var(--ds-border-subtle)]"
            : "",
          mobilePane === "prompt"
            ? `flex ${result ? "pb-16 lg:pb-0" : ""}`
            : "hidden lg:flex",
        )}
        data-testid="quick-prompt-pane"
      >
        <div className="pc-page-gutter flex-1 min-h-0 overflow-y-auto py-6 md:py-8 scrollbar-subtle">
          <div className="quick-script-content mx-auto space-y-4">
            {status !== "idle" ? (
              <QuickScriptWorkflow
                isGenerating={isGenerating}
                hasResult={Boolean(result)}
              />
            ) : null}
            {isGenerating && (
              <div
                className="quick-script-state-record border-y border-[var(--ds-accent-border)] bg-transparent py-4"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--ds-accent)]">
                    <Loader
                      className="h-4 w-4 animate-spin text-[var(--ds-accent)]"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--ds-accent)]">
                      Quick is working
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                      {quickScript?.stage || "Compiling your Luau script..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!result && status === "idle" && (
              <div className="quick-script-start py-2 sm:py-6">
                <div className="quick-script-start__intro">
                  <p className="quick-script-phase text-xs font-medium text-[var(--ds-accent)]">
                    Script · New request
                  </p>
                  <h1 className="quick-script-heading pc-display-heading mt-2 text-[2rem] leading-tight text-[var(--ds-text)] sm:text-[2.25rem]">
                    Build one <span>focused</span> Roblox script
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ds-text-muted)]">
                    Describe the behavior and placement. Quick returns
                    ready-to-use Luau with setup and testing guidance.
                  </p>
                </div>
                <QuickScriptWorkflow isGenerating={false} hasResult={false} />
                <div className="quick-script-start__body">
                  <div className="quick-script-start__primary">
                    <div className="quick-script-start__composer">
                      {composer}
                    </div>
                    <div className="quick-script-examples">
                      <h2>Start with an example</h2>
                      <div className="quick-script-examples__grid">
                        {EXAMPLES.map((example) => {
                          const ExampleIcon = example.icon;
                          return (
                            <button
                              key={example.prompt}
                              type="button"
                              onClick={() => {
                                setScriptTarget(example.target);
                                setPrompt(example.prompt);
                              }}
                              className="quick-script-example focus-ring"
                              aria-label={`Load example: ${example.title}. ${example.prompt}`}
                            >
                              <span
                                className="quick-script-example__icon"
                                aria-hidden="true"
                              >
                                <ExampleIcon />
                              </span>
                              <small>{example.type}</small>
                              <strong>{example.title}</strong>
                              <span>{example.prompt}</span>
                              <i aria-hidden="true">
                                Load example <ArrowRight />
                              </i>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <QuickScriptOverview studioConnected={studioConnected} />
                </div>
              </div>
            )}

            {status !== "idle" && quickScript?.prompt && (
              <div className="quick-script-request-record border-y border-[var(--ds-border-subtle)] px-0 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ds-text-muted)]">
                  Your request
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ds-text)]">
                  {quickScript.prompt}
                </p>
              </div>
            )}

            {quickScript?.error && (
              <section
                className="quick-script-error-record border-y border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] p-4"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-warning)] " />
                  <div>
                    <h2 className="text-xs font-bold text-[var(--ds-warning)] font-display uppercase tracking-wider">
                      {quickScript.error.code === "AGENT_BUILD_RECOMMENDED"
                        ? "Agent Build recommended"
                        : "Quick could not finish"}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ds-warning)] ">
                      {quickScript.error.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickScript.error.retryable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={RefreshCw}
                          onClick={onRetry}
                          disabled={isGenerating}
                          className="min-h-[44px] text-xs"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        iconRight={ArrowRight}
                        onClick={onOpenAgentBuild}
                        className="min-h-[44px] text-xs bg-[var(--ds-fill-hover)] text-[var(--ds-text)] hover:bg-[var(--ds-fill-active)]"
                      >
                        Open as Agent Build
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {result && (
              <div className="quick-script-result-record border-y border-[var(--ds-border-subtle)] p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-success)]" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--ds-success)]">
                      Script ready
                    </p>
                    <h2 className="mt-1 text-sm font-bold text-[var(--ds-text)]">
                      {result.title || "Your Quick script"}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--ds-text-muted)] leading-relaxed">
                      Review the code, setup steps, and diagnostics in the
                      result workspace. For a multi-file system, continue in
                      Agent Build.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Pencil}
                    onClick={onContinueEditing}
                    className="min-h-[44px] text-xs border border-[var(--ds-border-subtle)]"
                  >
                    Continue editing
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconRight={ArrowRight}
                    onClick={onOpenAgentBuild}
                    className="min-h-[44px] text-xs bg-[var(--ds-fill-hover)] text-[var(--ds-text)] hover:bg-[var(--ds-fill-active)]"
                  >
                    Open as Agent Build
                  </Button>
                </div>
              </div>
            )}

            {result && authReady && !user && (
              <div className="quick-script-access-record border-y border-[var(--ds-accent-border)] p-3.5 text-[11px] leading-relaxed text-[var(--ds-accent)]">
                The generated code remains visible. Sign up to save, export,
                push to Studio, or continue editing.
              </div>
            )}
          </div>
        </div>

        {result || status !== "idle" ? (
          <div className="pc-page-gutter shrink-0 bg-[var(--ds-bg-workspace)] py-3">
            <div className="mx-auto max-w-[800px]">{composer}</div>
          </div>
        ) : null}
      </div>

      {result ? (
        <div
          className={cx(
            "w-full min-h-0 flex-col bg-[var(--ds-bg-workspace)] lg:flex-1",
            mobilePane === "result" ? "flex pb-16 lg:pb-0" : "hidden lg:flex",
          )}
          data-testid="quick-result-pane"
        >
          <Tabs defaultValue="code" className="flex-1 flex flex-col min-h-0">
            <div className="flex min-h-[60px] shrink-0 flex-col gap-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-display text-sm font-bold text-[var(--ds-text)] truncate">
                  {result.title || "Quick"}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="quick-script-path-label border-b border-[var(--ds-accent-border)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--ds-accent)]">
                    {result.scriptType || "Class required"}
                  </span>
                  <span className="quick-script-path-label border-b border-[var(--ds-border-subtle)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">
                    {result.targetPath ||
                      result.studioLocation ||
                      "Location required"}
                  </span>
                </div>
              </div>
              <TabsList className="quick-script-evidence-tabs min-h-[44px] w-full gap-0 border-y border-[var(--ds-border-subtle)] bg-transparent p-0 sm:w-auto">
                <TabsTrigger
                  value="code"
                  className="quick-script-evidence-tab min-h-[44px] px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px]"
                >
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="setup"
                  className="quick-script-evidence-tab min-h-[44px] px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px]"
                >
                  Setup
                </TabsTrigger>
                <TabsTrigger
                  value="diagnostics"
                  className="quick-script-evidence-tab min-h-[44px] px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px]"
                >
                  Diagnostics
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 bg-[var(--ds-bg-workspace)] flex flex-col">
              <TabsContent
                value="code"
                className="flex-1 min-h-0 mt-0 focus-visible:ring-0 flex flex-col"
              >
                <div
                  className="flex-1 min-h-0 flex flex-col relative"
                  data-tour="code-output"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] px-3 py-2 shrink-0 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2 text-[10px] text-[var(--ds-text-muted)] font-mono">
                      <TerminalSquare className="h-3.5 w-3.5 text-[var(--ds-accent)]" />
                      <span className="truncate">
                        {result.targetPath ||
                          result.studioLocation ||
                          "Studio location required"}
                      </span>
                    </div>
                    <div
                      className="flex flex-wrap items-center justify-end gap-2"
                      data-tour="code-actions"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={copied ? Check : Clipboard}
                        onClick={handleCopyClick}
                        className="min-h-[44px] px-2 py-0 text-[10px] hover:bg-[var(--ds-fill-subtle)]"
                      >
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Save}
                        onClick={onSave}
                        className="min-h-[44px] px-2 py-0 text-[10px] hover:bg-[var(--ds-fill-subtle)]"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Download}
                        onClick={onExport}
                        className="min-h-[44px] px-2 py-0 text-[10px] hover:bg-[var(--ds-fill-subtle)]"
                      >
                        Export
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={TerminalSquare}
                        onClick={onStudioPush}
                        disabled={studioPushBlocked}
                        title={
                          studioPushBlocked
                            ? "Studio push is blocked until script context validation passes"
                            : "Push to Studio"
                        }
                        className="min-h-[44px] px-2.5 py-0 text-[10px] bg-[var(--ds-fill-hover)] text-[var(--ds-text)] hover:bg-[var(--ds-fill-active)]"
                      >
                        Studio
                      </Button>
                    </div>
                  </div>
                  {scriptValidation && (
                    <div
                      role={
                        scriptValidation.status === "blocked"
                          ? "alert"
                          : "status"
                      }
                      className={cx(
                        "flex items-start gap-2 border-b px-4 py-2 text-xs",
                        scriptValidation.status === "blocked"
                          ? " border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]  text-[var(--ds-danger)] "
                          : scriptValidation.status === "adjusted"
                            ? " border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)]  text-[var(--ds-warning)] "
                            : "border-[color-mix(in_srgb,var(--ds-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-success)_10%,transparent)] text-[var(--ds-success)]",
                      )}
                    >
                      {scriptValidation.status === "blocked" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span>
                        {scriptValidation.message ||
                          scriptValidation.adjustments?.[0]?.message ||
                          scriptValidation.findings?.[0]?.explanation ||
                          "Script context validation passed."}
                      </span>
                    </div>
                  )}
                  <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain quick-script-code-scroll bg-[var(--ds-fill-subtle)] scrollbar-subtle"
                    tabIndex={0}
                    aria-label="Generated Luau code. Scroll to read."
                  >
                    <Suspense
                      fallback={
                        <div className="flex h-40 items-center justify-center text-sm text-[var(--ds-text-muted)]">
                          <Loader className="h-5 w-5 animate-spin mr-2" />
                          Loading code view...
                        </div>
                      }
                    >
                      <QuickScriptCodeBlock
                        code={result.code || "-- No code returned"}
                      />
                    </Suspense>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="setup"
                className="flex-1 min-h-0 mt-0 focus-visible:ring-0 overflow-y-auto p-4 space-y-4 scrollbar-subtle"
              >
                <ListSection
                  title="Required Objects"
                  items={result.requiredObjects}
                  empty="No required objects listed."
                  icon={<Code2 className="h-4 w-4 text-[var(--ds-accent)]" />}
                />
                <ListSection
                  title="Setup & Placement"
                  items={result.setup}
                  empty="Paste the script in the placement shown above."
                  icon={<Pencil className="h-4 w-4 text-[var(--ds-accent)]" />}
                />
                <ListSection
                  title="Verification & Testing"
                  items={result.testing}
                  empty="Run Play mode and verify the intended behavior."
                  icon={
                    <TerminalSquare className="h-4 w-4 text-[var(--ds-accent)]" />
                  }
                />
              </TabsContent>

              <TabsContent
                value="diagnostics"
                className="flex-1 min-h-0 mt-0 focus-visible:ring-0 overflow-y-auto p-4 space-y-4 scrollbar-subtle"
              >
                <ListSection
                  title="Warnings & Limitations"
                  items={warnings}
                  empty="No warnings or limitations reported."
                  icon={
                    <AlertTriangle className="h-4 w-4 text-[var(--ds-warning)] " />
                  }
                  isWarning={true}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : null}

      {result ? (
        <nav
          className="quick-script-mobile-states fixed inset-x-0 bottom-0 z-50 flex items-center border-t border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] lg:hidden"
          aria-label="Quick Script workspace"
        >
          {[
            { id: "prompt", label: "Prompt", icon: Pencil },
            { id: "result", label: "Result", icon: FileCode2 },
          ].map((item) => {
            const Icon = item.icon;
            const active = mobilePane === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMobilePane(item.id)}
                className={cx(
                  "quick-script-mobile-state inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium focus-ring",
                  active
                    ? "text-[var(--ds-accent)]"
                    : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]",
                )}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      ) : null}
    </section>
  );
}
