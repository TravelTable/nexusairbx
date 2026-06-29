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
          ? "border-[#00f5d4]/20 bg-[#00f5d4]/5 text-[#00f5d4]"
          : error || needsAgent
            ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
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
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 140)}px`;
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
    <section className="flex h-full min-h-0 flex-col lg:flex-row overflow-hidden bg-[#050505]" aria-label="Quick Script generator">
      
      {/* LEFT PANE (Composer + Examples) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#0d0d10]">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-black/20 h-[60px]">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-[#00f5d4]" aria-hidden="true" />
            <h1 className="font-display text-xs font-black uppercase tracking-[0.2em] text-white">
              Quick Script
            </h1>
          </div>
          <QuickScriptStatus status={status} stage={quickScript?.stage} error={quickScript?.error} />
        </div>

        {/* Scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader className="h-6 w-6 text-[#00f5d4] animate-spin" />
              <p className="mt-3 text-xs text-gray-400 font-mono">{quickScript?.stage || "Compiling script..."}</p>
            </div>
          )}

          {!result && status === "idle" && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Try one</h2>
              <div className="grid gap-2.5">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-xs leading-relaxed text-gray-300 transition-all hover:border-[#00f5d4]/30 hover:bg-[#00f5d4]/5 hover:text-white text-wrap"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickScript?.error && (
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-fadeIn" role="alert" aria-live="polite">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <h2 className="text-xs font-bold text-amber-200 font-display uppercase tracking-wider">
                    {quickScript.error.code === "AGENT_BUILD_RECOMMENDED" ? "Agent Build recommended" : "Quick Script could not finish"}
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
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#00f5d4] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Need a complex multi-file system?</h4>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                    Agent Build plans, creates, and verifies larger features across multiple scripts in your Roblox workspace.
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

        {/* Docked bottom area */}
        <div className="shrink-0 border-t border-white/5 bg-black/20 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) onGenerate?.();
            }}
            className="relative flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0a0a0a] p-3 focus-within:border-[#00f5d4]/45 focus-within:shadow-[0_0_15px_rgba(0,245,212,0.06)] transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                Prompt Composer
              </span>
              {onImprovePrompt && (
                <button
                  type="button"
                  onClick={() => onImprovePrompt()}
                  disabled={isGenerating || isImproving || !String(prompt || "").trim()}
                  data-tour="improve-btn"
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-[#9b5de5]/25 bg-[#9b5de5]/10 px-2 text-[9px] font-bold uppercase tracking-wider text-[#c9b3f7] transition-all hover:bg-[#9b5de5]/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Expand your prompt into a detailed brief"
                >
                  {isImproving ? <Loader className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5" />}
                  {isImproving ? "Improving" : "Improve"}
                </button>
              )}
            </div>
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
              className="w-full min-h-[72px] max-h-[140px] resize-none bg-transparent text-sm leading-relaxed text-gray-100 outline-none placeholder:text-gray-600 disabled:opacity-60"
              aria-describedby="quick-script-help"
              aria-invalid={Boolean(quickScript?.error && !result)}
            />
            <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2.5">
              <div id="quick-script-help" className="text-[9px] text-gray-500 flex items-center gap-1.5">
                <span><kbd className="rounded bg-white/5 border border-white/5 px-1 font-mono text-[8px]">Enter</kbd> send</span>
                <span>•</span>
                <span>{String(prompt || "").trim().length} chars</span>
              </div>
              <div className="flex items-center gap-2">
                {quickScript?.error?.retryable && (
                  <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRetry} disabled={isGenerating} className="h-8 text-xs font-bold border border-white/5">
                    Retry
                  </Button>
                )}
                <Button
                  type="submit"
                  icon={isGenerating ? Loader : Send}
                  disabled={!canSubmit}
                  data-tour="generate-btn"
                  className="h-8 px-4 text-xs font-bold bg-[#00f5d4] hover:bg-[#00f5d4]/90 text-black border-none transition-all duration-200"
                >
                  {isGenerating ? "Generating" : result ? "Generate Update" : "Generate Script"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT PANE (Workspace Tabs) */}
      <div className="w-full lg:w-[46%] xl:w-[42%] 2xl:w-[38%] lg:min-w-[420px] lg:max-w-[720px] lg:shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col min-h-0 bg-[#07070a]">
        {result ? (
          <Tabs defaultValue="code" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/30 shrink-0 h-[60px]">
              <div className="min-w-0">
                <div className="font-display text-sm font-bold text-white truncate">{result.title || "Quick Script"}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded bg-[#00f5d4]/10 border border-[#00f5d4]/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#00f5d4]">
                    {result.scriptType || "Script"}
                  </span>
                  <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-gray-300">
                    {result.studioLocation || "ServerScriptService"}
                  </span>
                </div>
              </div>
              <TabsList className="h-8 border border-white/5 bg-black/40 w-auto rounded-lg p-0.5 gap-0.5">
                <TabsTrigger value="code" className="px-3 py-1 text-[10px] rounded-md">Code</TabsTrigger>
                <TabsTrigger value="setup" className="px-3 py-1 text-[10px] rounded-md">Setup</TabsTrigger>
                <TabsTrigger value="diagnostics" className="px-3 py-1 text-[10px] rounded-md">Diagnostics</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 bg-[#07070a] flex flex-col">
              <TabsContent value="code" className="flex-1 min-h-0 mt-0 focus-visible:ring-0 flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col relative" data-tour="code-output">
                  <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-black/20 px-4 py-2 shrink-0">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <TerminalSquare className="h-3.5 w-3.5 text-[#00f5d4]" />
                      <span>{result.studioLocation || "ServerScriptService"}</span>
                    </div>
                    <div className="flex items-center gap-1.5" data-tour="code-actions">
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
              Quick Script compiles functional Luau code, placement directories, step-by-step setup guides, verification tests, and syntax diagnostics instantly.
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
    </section>
  );
}
