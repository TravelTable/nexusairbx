import React, { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  FileCode2,
  Loader,
  Pencil,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wand2,
  Check,
} from "lucide-react";

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
        "rounded-xl border p-4 transition-all duration-300",
        isWarning
          ? "border-amber-500/20 bg-amber-500/[0.02] hover:border-amber-500/30"
          : "border-white/10 bg-white/[0.02] hover:border-white/15"
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
            isWarning ? "text-amber-200" : "text-gray-400"
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
                  isWarning ? "bg-amber-400" : "bg-[#00f5d4]"
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

function QuickScriptStatus({ status, stage, error }) {
  const isBusy = status === "generating";
  const isReady = status === "succeeded";
  const needsAgent = status === "needs_agent_build";
  const Icon = isBusy ? Loader : isReady ? CheckCircle2 : needsAgent ? ArrowRight : error ? AlertTriangle : Sparkles;

  return (
    <div
      className={cx(
        "inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold",
        isReady
          ? "border-[#00f5d4]/25 bg-[#00f5d4]/10 text-[#00f5d4]"
          : error || needsAgent
            ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
            : "border-white/10 bg-white/5 text-gray-400"
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cx("h-3.5 w-3.5", isBusy && "animate-spin")} />
      {stage || "Ready"}
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
  const isGenerating = status === "generating";
  const canSubmit = Boolean(String(prompt || "").trim()) && !isGenerating;

  useEffect(() => {
    if (!prompt && quickScript?.prompt) {
      setPrompt(quickScript.prompt);
    }
  }, [prompt, quickScript?.prompt, setPrompt]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 92), 180)}px`;
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#050505]" aria-label="Quick Script generator">
      <div className="border-b border-white/5 bg-black/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#00f5d4]/10 p-1.5 text-[#00f5d4]">
                <FileCode2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-sm font-black uppercase tracking-[0.2em] text-white">
                  Quick Script
                </h1>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  Immediate single-file script compiler & diagnostics
                </p>
              </div>
            </div>
          </div>
          <QuickScriptStatus status={status} stage={quickScript?.stage} error={quickScript?.error} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) onGenerate?.();
              }}
              className="rounded-2xl border border-white/10 bg-[#0d0d10]/80 p-5 shadow-panel backdrop-blur-xl transition-all duration-300 hover:border-white/15"
            >
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="quick-script-prompt" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Script prompt
                </label>
                {onImprovePrompt && (
                  <button
                    type="button"
                    onClick={() => onImprovePrompt()}
                    disabled={isGenerating || isImproving || !String(prompt || "").trim()}
                    data-tour="improve-btn"
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#9b5de5]/25 bg-[#9b5de5]/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#c9b3f7] transition-all hover:bg-[#9b5de5]/20 hover:text-white focus-ring disabled:cursor-not-allowed disabled:opacity-40"
                    title="Expand your prompt into a detailed brief"
                    aria-label="Improve my prompt"
                  >
                    {isImproving ? (
                      <Loader className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    {isImproving ? "Improving" : "Improve"}
                  </button>
                )}
              </div>
              <div className="relative mt-3">
                <textarea
                  id="quick-script-prompt"
                  ref={textareaRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onFocus={keepPromptVisible}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  disabled={isGenerating}
                  data-tour="prompt-input"
                  placeholder="Describe one Roblox script. Include where it should go if you know."
                  className="w-full min-h-[92px] resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-base leading-relaxed text-gray-100 outline-none transition-all duration-300 focus:border-[#00f5d4]/50 focus:shadow-[0_0_20px_rgba(0,245,212,0.12)] disabled:opacity-60 md:text-sm"
                  aria-describedby="quick-script-help"
                  aria-invalid={Boolean(quickScript?.error && !result)}
                />
              </div>
              <div id="quick-script-help" className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] font-mono border border-white/5">Enter</span> generates. 
                  <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] font-mono border border-white/5">Shift + Enter</span> new line.
                </span>
                <span>{String(prompt || "").trim().length} characters</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button 
                  type="submit" 
                  icon={isGenerating ? Loader : Send} 
                  disabled={!canSubmit} 
                  data-tour="generate-btn" 
                  className="min-h-11 bg-gradient-to-r from-[#00f5d4]/90 to-[#9b5de5]/90 hover:from-[#00f5d4] hover:to-[#9b5de5] text-black font-bold border-none transition-all duration-300"
                >
                  {isGenerating ? "Generating" : result ? "Generate Update" : "Generate Script"}
                </Button>
                {quickScript?.error?.retryable && (
                  <Button variant="ghost" icon={RefreshCw} onClick={onRetry} disabled={isGenerating} className="min-h-11 border border-white/10 hover:bg-white/5">
                    Retry
                  </Button>
                )}
              </div>
            </form>

            {!result && status === "idle" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d10]/40 p-5 backdrop-blur-xl">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Try one</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className="min-h-16 rounded-xl border border-white/10 bg-black/30 p-3.5 text-left text-xs leading-relaxed text-gray-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00f5d4]/40 hover:bg-[#00f5d4]/5 hover:text-white focus-ring shadow-sm"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quickScript?.error && (
              <section className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5" aria-live="polite">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                  <div>
                    <h2 className="text-sm font-bold text-amber-100 font-display uppercase tracking-wider">
                      {quickScript.error.code === "AGENT_BUILD_RECOMMENDED" ? "Agent Build recommended" : "Quick Script could not finish"}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-100/80">{quickScript.error.message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quickScript.error.retryable && (
                        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRetry} disabled={isGenerating} className="min-h-11">
                          Retry
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={onOpenAgentBuild} className="min-h-11 bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border-none">
                        Open as Agent Build
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {result && !user && (
              <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-4 text-xs leading-relaxed text-[#d8fff9]">
                The generated code stays visible. Sign up only when you save, export, push to Studio, or continue with more restricted generation.
              </div>
            )}
          </div>

          <div className="min-w-0">
            {result ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d10]/80 p-5 shadow-panel backdrop-blur-xl">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4 mb-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold tracking-tight text-white font-display">{result.title || "Quick Script"}</h2>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="rounded-md border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#00f5d4]">
                          {result.scriptType || "Script"}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                          {result.studioLocation || "ServerScriptService"}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                          Luau
                        </span>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="code" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="code">Code</TabsTrigger>
                      <TabsTrigger value="setup">Setup</TabsTrigger>
                      <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="code" className="mt-4 focus-visible:ring-0">
                      <div className="relative rounded-xl border border-white/10 bg-black/40 overflow-hidden" data-tour="code-output">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-white/[0.02] px-4 py-2">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <FileCode2 className="h-3.5 w-3.5 text-[#00f5d4]" />
                            <span className="font-mono">{result.studioLocation || "ServerScriptService"}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5" data-tour="code-actions">
                            <Button variant="ghost" size="sm" icon={copied ? Check : Clipboard} onClick={handleCopyClick} className="h-8 py-0 px-2.5 text-xs hover:bg-white/5">
                              {copied ? "Copied" : "Copy"}
                            </Button>
                            <Button variant="ghost" size="sm" icon={Save} onClick={onSave} className="h-8 py-0 px-2.5 text-xs hover:bg-white/5">Save</Button>
                            <Button variant="ghost" size="sm" icon={Download} onClick={onExport} className="h-8 py-0 px-2.5 text-xs hover:bg-white/5">Export</Button>
                            <Button variant="secondary" size="sm" icon={TerminalSquare} onClick={onStudioPush} className="h-8 py-0 px-2.5 text-xs bg-white/10 text-white hover:bg-white/15">Studio</Button>
                          </div>
                        </div>
                        <div
                          className="quick-script-code-scroll max-w-full overflow-x-auto overscroll-x-contain"
                          tabIndex={0}
                          aria-label="Generated Luau code. Scroll horizontally to read long lines."
                        >
                          <Suspense fallback={<pre className="m-0 min-h-40 bg-black/40 p-4 text-sm text-gray-400">Loading code view...</pre>}>
                            <QuickScriptCodeBlock code={result.code || "-- No code returned"} />
                          </Suspense>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="setup" className="mt-4 focus-visible:ring-0 space-y-4">
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

                    <TabsContent value="diagnostics" className="mt-4 focus-visible:ring-0">
                      <ListSection
                        title="Warnings & Limitations"
                        items={warnings}
                        empty="No warnings or limitations reported."
                        icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                        isWarning={true}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.01] to-white/[0.03] p-5 transition-all duration-300 hover:border-white/15">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-[#00f5d4]/10 p-2 text-[#00f5d4] shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-display">Need a complex multi-file system?</h4>
                      <p className="mt-1 text-xs text-gray-400 max-w-md leading-relaxed">
                        Agent Build plans, creates, and verifies larger features across multiple scripts in your Roblox workspace.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={onContinueEditing} className="min-h-10 border border-white/10 hover:bg-white/5">
                      Continue editing
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      iconRight={ArrowRight}
                      onClick={onOpenAgentBuild}
                      className="min-h-10 bg-white/10 text-white hover:bg-white/15"
                    >
                      Open as Agent Build
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0d0d10]/40 p-8 text-center" data-tour="code-output">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#00f5d4]/5 border border-[#00f5d4]/10 shadow-[0_0_50px_rgba(0,245,212,0.05)] mb-5">
                  <Code2 className="h-7 w-7 text-[#00f5d4]" />
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9b5de5] opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#9b5de5]"></span>
                  </span>
                </div>
                <h2 className="font-display text-base font-black tracking-widest text-white uppercase">One prompt, one focused script</h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-400">
                  Quick Script returns fully functional Luau code, placement directories, step-by-step setup guides, verification tests, and syntax diagnostics instantly.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs border-t border-white/5 pt-5 w-full max-w-xs">
                  <a href="/roblox-lua-script-generator" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-[#00f5d4] transition-all">
                    <Sparkles className="h-3.5 w-3.5 text-[#00f5d4]" />
                    Luau examples
                  </a>
                  <span className="text-gray-700">|</span>
                  <a href="/roblox-gui-maker" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-[#00f5d4] transition-all">
                    <TerminalSquare className="h-3.5 w-3.5 text-[#00f5d4]" />
                    GUI scripting help
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
