import React, { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
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
  TerminalSquare,
  Wand2,
  Check,
} from "lib/icons";

import { Button, cx } from "../../components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/shadcn/tabs";

const QuickScriptCodeBlock = lazy(() => import("../../components/ai/QuickScriptCodeBlock"));

const EXAMPLES = [
  "Make a Script that damages players when they touch a part named DamagePart.",
  "Create a LocalScript that opens a shop frame when I press a button.",
  "Fix this Luau error and explain where to put the script.",
];

function ListSection({ title, items, empty, icon, isWarning }) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div
      className={cx(
        "rounded-xl border p-4 transition-all duration-200",
        isWarning
          ? "border-amber-500/10 bg-amber-500/[0.01] hover:border-amber-500/20"
          : "border-white/5 bg-white/[0.01] hover:border-white/10"
      )}
    >
      <div
        className={cx(
          "flex items-center gap-2 border-b pb-2",
          isWarning ? "border-amber-500/10" : "border-white/5"
        )}
      >
        {icon}
        <h3
          className={cx(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            isWarning ? "text-amber-200/80" : "text-gray-400"
          )}
        >
          {title}
        </h3>
      </div>
      {normalized.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-300">
          {normalized.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2.5">
              <span
                className={cx(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  isWarning ? "bg-amber-500/60" : "bg-[#00f5d4]/60"
                )}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-500">{empty}</p>
      )}
    </div>
  );
}

export default function QuickScriptWorkspace({
  prompt,
  setPrompt,
  quickScript,
  user,
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
  const result = quickScript?.result || null;
  const status = quickScript?.status || "idle";
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
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      textarea.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }, 80);
  };

  const warnings = useMemo(() => {
    const items = [];
    if (Array.isArray(result?.limitations)) items.push(...result.limitations);
    if (Array.isArray(result?.assumptions)) items.push(...result.assumptions.map((item) => `Assumption: ${item}`));
    return items;
  }, [result]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposing && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      if (canSubmit) onGenerate?.();
    }
  };

  const handleCopyClick = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative flex h-full min-h-0 overflow-hidden bg-[#050505]" aria-label="Quick generator">
      <div
        className={cx(
          "min-h-0 min-w-0 flex-1 flex-col bg-ink-900",
          mobilePane === "prompt" ? "flex pb-16 lg:pb-0" : "hidden lg:flex"
        )}
        data-testid="quick-prompt-pane"
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 scrollbar-thin">
          <div className="mx-auto max-w-3xl space-y-4">
            {isGenerating && (
            <div className="rounded-2xl border border-[#00f5d4]/15 bg-[#00f5d4]/[0.04] p-4 motion-safe:animate-fade-in-up" aria-live="polite">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/10">
                  <Loader className="h-4 w-4 animate-spin text-[#00f5d4]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00f5d4]">Quick is working</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-300">{quickScript?.stage || "Compiling your Luau script..."}</p>
                </div>
              </div>
            </div>
            )}

            {!result && status === "idle" && (
            <div className="space-y-5 py-2 sm:py-6">
              <div className="max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00f5d4]">Quick Script</p>
                <h1 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">Build one focused Roblox script</h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Describe the behavior and placement. Quick returns ready-to-use Luau with setup and testing guidance.
                </p>
              </div>
              <div>
                <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Try an example</h2>
                <div className="grid gap-2.5">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className="min-h-11 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left text-sm leading-relaxed text-gray-300 transition-[border-color,background-color,color,transform] duration-150 hover:border-[#00f5d4]/30 hover:bg-[#00f5d4]/5 hover:text-white active:scale-[0.99] focus-ring motion-reduce:transition-none"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}

            {status !== "idle" && quickScript?.prompt && (
            <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md border border-white/10 bg-white/[0.05] px-4 py-3 motion-safe:animate-fade-in-up">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Your request</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{quickScript.prompt}</p>
            </div>
            )}

            {quickScript?.error && (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 motion-safe:animate-fade-in-up" role="alert" aria-live="assertive">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <h2 className="text-xs font-bold text-amber-200 font-display uppercase tracking-wider">
                    {quickScript.error.code === "AGENT_BUILD_RECOMMENDED" ? "Agent Build recommended" : "Quick could not finish"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-amber-200/80">{quickScript.error.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickScript.error.retryable && (
                      <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRetry} disabled={isGenerating} className="h-8 text-xs">
                        Retry
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={onOpenAgentBuild} className="h-8 text-xs bg-white/10 text-white hover:bg-white/15">
                      Open as Agent Build
                    </Button>
                  </div>
                </div>
              </div>
            </section>
            )}

            {result && (
            <div className="max-w-[94%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.025] p-4 space-y-3 motion-safe:animate-fade-in-up">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#00f5d4] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00f5d4]">Script ready</p>
                  <h2 className="mt-1 text-sm font-bold text-white">{result.title || "Your Quick script"}</h2>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Review the code, setup steps, and diagnostics in the result workspace. For a multi-file system, continue in Agent Build.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button variant="ghost" size="sm" icon={Pencil} onClick={onContinueEditing} className="h-8 text-xs border border-white/5">
                  Continue editing
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconRight={ArrowRight}
                  onClick={onOpenAgentBuild}
                  className="h-8 text-xs bg-white/10 text-white hover:bg-white/15"
                >
                  Open as Agent Build
                </Button>
              </div>
            </div>
            )}

            {result && !user && (
            <div className="rounded-xl border border-[#00f5d4]/10 bg-[#00f5d4]/5 p-3.5 text-[11px] leading-relaxed text-[#a8fff4]">
              The generated code remains visible. Sign up to save, export, push to Studio, or continue editing.
            </div>
            )}
          </div>
        </div>

        <div className="shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
          <div className="mx-auto max-w-5xl">
            <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) onGenerate?.();
            }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] opacity-15 blur transition duration-500 group-focus-within:opacity-35 motion-reduce:transition-none" aria-hidden="true" />
            <div className="relative flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-800/95 p-2 shadow-panel backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={cx(
                    "inline-flex h-8 items-center rounded-lg border px-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                    isGenerating
                      ? "border-[#00f5d4] bg-[#00f5d4] text-black motion-safe:animate-pulse"
                      : "border-white/10 bg-white/5 text-gray-500"
                  )}
                  aria-live="polite"
                >
                  {isGenerating ? quickScript?.stage || "Working" : "Ready"}
                </div>
                <div className="hidden h-px min-w-[1rem] flex-1 bg-white/5 sm:block" />
              {onImprovePrompt && (
                <button
                  type="button"
                  onClick={() => onImprovePrompt()}
                  disabled={isGenerating || isImproving || !String(prompt || "").trim()}
                  data-tour="improve-btn"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#9b5de5]/25 bg-[#9b5de5]/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#c9b3f7] transition-[border-color,background-color,color,transform] duration-150 hover:bg-[#9b5de5]/20 hover:text-white active:scale-[0.98] focus-ring disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                  title="Expand your prompt into a detailed brief"
                >
                  {isImproving ? <Loader className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  {isImproving ? "Improving" : "Improve"}
                </button>
              )}
              </div>
              <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/30 p-1.5 transition-[border-color,box-shadow] duration-200 focus-within:border-[#00f5d4]/35 focus-within:shadow-[0_0_24px_rgba(0,245,212,0.10)] motion-reduce:transition-none">
                <textarea
                  id="quick-script-prompt"
                  ref={textareaRef}
                  value={prompt}
                  rows={1}
                  onChange={(event) => setPrompt(event.target.value)}
                  onFocus={keepPromptVisible}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  disabled={isGenerating}
                  data-tour="prompt-input"
                  placeholder="Describe one Roblox script and where it should go."
                  className="min-h-[42px] max-h-[140px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-relaxed text-gray-100 outline-none placeholder:text-gray-500 disabled:opacity-60 md:text-[15px]"
                  aria-label="Quick Script prompt"
                  aria-describedby="quick-script-help"
                  aria-invalid={Boolean(quickScript?.error && !result)}
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  data-tour="generate-btn"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexus-cyan text-black transition-[transform,box-shadow,opacity,background-color] duration-150 hover:shadow-[0_0_24px_rgba(0,245,212,0.45)] active:scale-95 focus-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none"
                  aria-label={isGenerating ? "Generation in progress" : result ? "Generate updated script" : "Generate script"}
                  title={isGenerating ? "Generation in progress" : result ? "Generate updated script" : "Generate script"}
                >
                  {isGenerating ? <Loader className="h-5 w-5 animate-spin" /> : <SendPrompt className="h-5 w-5" />}
                </button>
              </div>
              <div id="quick-script-help" className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-semibold text-gray-500">
                <span>Enter to send · Shift + Enter for a new line</span>
                <span>{String(prompt || "").trim().length} characters</span>
              </div>
            </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className={cx(
          "w-full min-h-0 flex-col bg-[#07070a] lg:w-[46%] lg:min-w-[420px] lg:max-w-[720px] lg:shrink-0 lg:border-l xl:w-[42%] 2xl:w-[38%] border-white/5",
          mobilePane === "result" ? "flex pb-16 lg:pb-0" : "hidden lg:flex"
        )}
        data-testid="quick-result-pane"
      >
        {result ? (
          <Tabs defaultValue="code" className="flex-1 flex flex-col min-h-0">
            <div className="flex min-h-[60px] shrink-0 flex-col gap-3 border-b border-white/10 bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-display text-sm font-bold text-white truncate">{result.title || "Quick"}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded bg-[#00f5d4]/10 border border-[#00f5d4]/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#00f5d4]">
                    {result.scriptType || "Script"}
                  </span>
                  <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-gray-300">
                    {result.studioLocation || "ServerScriptService"}
                  </span>
                </div>
              </div>
              <TabsList className="h-8 w-full gap-0.5 rounded-lg border border-white/5 bg-black/40 p-0.5 sm:w-auto">
                <TabsTrigger value="code" className="rounded-md px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px]">Code</TabsTrigger>
                <TabsTrigger value="setup" className="rounded-md px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px]">Setup</TabsTrigger>
                <TabsTrigger value="diagnostics" className="rounded-md px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px]">Diagnostics</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 bg-[#07070a] flex flex-col">
              <TabsContent value="code" className="flex-1 min-h-0 mt-0 focus-visible:ring-0 flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col relative" data-tour="code-output">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-black/20 px-3 py-2 shrink-0 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <TerminalSquare className="h-3.5 w-3.5 text-[#00f5d4]" />
                      <span className="truncate">{result.studioLocation || "ServerScriptService"}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1" data-tour="code-actions">
                      <Button variant="ghost" size="sm" icon={copied ? Check : Clipboard} onClick={handleCopyClick} className="h-7 py-0 px-2 text-[10px] hover:bg-white/5">
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button variant="ghost" size="sm" icon={Save} onClick={onSave} className="h-7 py-0 px-2 text-[10px] hover:bg-white/5">Save</Button>
                      <Button variant="ghost" size="sm" icon={Download} onClick={onExport} className="h-7 py-0 px-2 text-[10px] hover:bg-white/5">Export</Button>
                      <Button variant="secondary" size="sm" icon={TerminalSquare} onClick={onStudioPush} className="h-7 py-0 px-2.5 text-[10px] bg-white/10 text-white hover:bg-white/15">Studio</Button>
                    </div>
                  </div>
                  <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain quick-script-code-scroll bg-black/20 scrollbar-thin"
                    tabIndex={0}
                    aria-label="Generated Luau code. Scroll to read."
                  >
                    <Suspense fallback={<div className="flex h-40 items-center justify-center text-sm text-gray-500"><Loader className="h-5 w-5 animate-spin mr-2" />Loading code view...</div>}>
                      <QuickScriptCodeBlock code={result.code || "-- No code returned"} />
                    </Suspense>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="setup" className="flex-1 min-h-0 mt-0 focus-visible:ring-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                <ListSection
                  title="Required Objects"
                  items={result.requiredObjects}
                  empty="No required objects listed."
                  icon={<Code2 className="h-4 w-4 text-[#00f5d4]" />}
                />
                <ListSection
                  title="Setup & Placement"
                  items={result.setup}
                  empty="Paste the script in the placement shown above."
                  icon={<Pencil className="h-4 w-4 text-[#00f5d4]" />}
                />
                <ListSection
                  title="Verification & Testing"
                  items={result.testing}
                  empty="Run Play mode and verify the intended behavior."
                  icon={<TerminalSquare className="h-4 w-4 text-[#00f5d4]" />}
                />
              </TabsContent>

              <TabsContent value="diagnostics" className="flex-1 min-h-0 mt-0 focus-visible:ring-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                <ListSection
                  title="Warnings & Limitations"
                  items={warnings}
                  empty="No warnings or limitations reported."
                  icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                  isWarning={true}
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#07070a]" data-tour="code-output">
            <div className="p-4 rounded-2xl bg-[#00f5d4]/[0.02] border border-[#00f5d4]/10 mb-4 shadow-[0_0_40px_-15px_rgba(0,245,212,0.2)]">
              <Code2 className="h-8 w-8 text-[#00f5d4]" />
            </div>
            <h2 className="font-display text-sm font-bold text-gray-200">One prompt, one focused script</h2>
            <p className="mt-2 text-xs text-gray-500 max-w-xs leading-relaxed">
              Quick compiles functional Luau code, placement directories, step-by-step setup guides, verification tests, and syntax diagnostics instantly.
            </p>
            <div className="mt-5 flex items-center gap-3 text-[10px] border-t border-white/5 pt-4 w-full max-w-[200px] justify-center">
              <a href="/roblox-lua-script-generator" className="text-gray-400 hover:text-[#00f5d4] transition-all">
                Luau examples
              </a>
              <span className="text-gray-700">|</span>
              <a href="/roblox-gui-maker" className="text-gray-400 hover:text-[#00f5d4] transition-all">
                GUI help
              </a>
            </div>
          </div>
        )}
      </div>

      <nav
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/80 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden"
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
                "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-[background-color,color] duration-150 focus-ring motion-reduce:transition-none",
                active ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </section>
  );
}
