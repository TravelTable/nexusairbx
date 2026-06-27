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
} from "lucide-react";

import { Button, cx } from "../../components/ui";

const QuickScriptCodeBlock = lazy(() => import("../../components/ai/QuickScriptCodeBlock"));

const EXAMPLES = [
  "Make a Script that damages players when they touch a part named DamagePart.",
  "Create a LocalScript that opens a shop frame when I press a button.",
  "Fix this Luau error and explain where to put the script.",
];

function ListSection({ title, items, empty }) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{title}</h3>
      {normalized.length ? (
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-300">
          {normalized.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#00f5d4]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500">{empty}</p>
      )}
    </section>
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
}) {
  const textareaRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
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

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0D0D0D]" aria-label="Quick Script generator">
      <div className="border-b border-white/5 bg-black/25 px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-[#00f5d4]" aria-hidden="true" />
              <h1 className="font-display text-sm font-black uppercase tracking-[0.18em] text-white">
                Quick Script
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Immediate focused code. Use Agent Build for planned multi-file systems and Studio workflows.
            </p>
          </div>
          <QuickScriptStatus status={status} stage={quickScript?.stage} error={quickScript?.error} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:py-5">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) onGenerate?.();
              }}
              className="scroll-mt-4 rounded-lg border border-white/10 bg-[#111116]/95 p-3 shadow-panel"
            >
              <label htmlFor="quick-script-prompt" className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                Script prompt
              </label>
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
                placeholder="Describe one Roblox script. Include where it should go if you know."
                className="mt-2 min-h-[92px] w-full resize-none rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-base leading-relaxed text-gray-100 outline-none transition focus:border-[#00f5d4]/45 focus:shadow-[0_0_0_3px_rgba(0,245,212,0.12)] disabled:opacity-60 md:text-sm"
                aria-describedby="quick-script-help"
                aria-invalid={Boolean(quickScript?.error && !result)}
              />
              <div id="quick-script-help" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>
                  Enter generates. Shift + Enter adds a new line.{" "}
                  <a href="/roblox-script-generator" className="text-[#00f5d4] hover:text-white">Examples</a>
                </span>
                <span>{String(prompt || "").trim().length} characters</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="submit" icon={isGenerating ? Loader : Send} disabled={!canSubmit} className="min-h-11">
                  {isGenerating ? "Generating" : result ? "Generate Update" : "Generate Script"}
                </Button>
                {quickScript?.error?.retryable && (
                  <Button variant="ghost" icon={RefreshCw} onClick={onRetry} disabled={isGenerating} className="min-h-11">
                    Retry
                  </Button>
                )}
              </div>
            </form>

            {!result && status === "idle" && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Try one</h2>
                <div className="mt-2 grid gap-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-left text-sm text-gray-300 transition hover:border-[#00f5d4]/30 hover:text-white focus-ring"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quickScript?.error && (
              <section className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3" aria-live="polite">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                  <div>
                    <h2 className="text-sm font-bold text-amber-100">
                      {quickScript.error.code === "AGENT_BUILD_RECOMMENDED" ? "Agent Build recommended" : "Quick Script could not finish"}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-amber-100/80">{quickScript.error.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickScript.error.retryable && (
                        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRetry} disabled={isGenerating} className="min-h-11">
                          Retry
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={onOpenAgentBuild} className="min-h-11">
                        Open as Agent Build
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {result && !user && (
              <div className="rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 p-3 text-sm text-[#d8fff9]">
                The generated code stays visible. Sign up only when you save, export, push to Studio, or continue with more restricted generation.
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {result ? (
              <>
                <section className="rounded-lg border border-white/10 bg-[#111116]/95 shadow-panel">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-3 py-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-white">{result.title || "Quick Script"}</h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-md border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#00f5d4]">
                          {result.scriptType || "Script"}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-300">
                          {result.studioLocation || "ServerScriptService"}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-300">
                          Luau
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" icon={Clipboard} onClick={onCopy} className="min-h-11">Copy</Button>
                      <Button variant="ghost" size="sm" icon={Save} onClick={onSave} className="min-h-11">Save</Button>
                      <Button variant="ghost" size="sm" icon={Download} onClick={onExport} className="min-h-11">Export</Button>
                      <Button variant="secondary" size="sm" icon={TerminalSquare} onClick={onStudioPush} className="min-h-11">Studio</Button>
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
                </section>

                <div className="grid gap-3 md:grid-cols-2">
                  <ListSection title="Required objects" items={result.requiredObjects} empty="No required objects listed." />
                  <ListSection title="Setup instructions" items={result.setup} empty="Paste the script in the placement shown above." />
                  <ListSection title="Test instructions" items={result.testing} empty="Run Play mode and verify the intended behavior." />
                  <ListSection title="Warnings" items={warnings} empty="No warnings reported." />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <ShieldCheck className="h-4 w-4 text-[#00f5d4]" />
                    Agent Build can expand this into files, plans, and Studio workflow steps.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={onContinueEditing} className="min-h-11">Continue editing</Button>
                    <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={onOpenAgentBuild} className="min-h-11">Open as Agent Build</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
                <div className="max-w-sm">
                  <Code2 className="mx-auto h-8 w-8 text-[#00f5d4]" />
                  <h2 className="mt-3 text-lg font-bold text-white">One prompt, one focused script</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Quick Script returns code, placement, setup, tests, and warnings without a plan approval step. Browse{" "}
                    <a href="/roblox-lua-script-generator" className="text-[#00f5d4] hover:text-white">Luau examples</a>{" "}
                    or{" "}
                    <a href="/roblox-gui-maker" className="text-[#00f5d4] hover:text-white">GUI scripting help</a>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
