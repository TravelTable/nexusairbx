import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, Circle, Loader2, Play, RotateCcw, ShieldAlert, TerminalSquare, XCircle } from "lucide-react";
import { continueStudioAgent, getStudioAgentRun, restoreStudioAgent, startStudioAgent } from "../../lib/studioBridgeApi";

const TERMINAL = new Set(["succeeded", "failed"]);

function statusIcon(status) {
  if (status === "succeeded") return <CheckCircle2 className="w-3.5 h-3.5 text-[#00f5d4]" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === "queued" || status === "delivered" || status === "running") {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />;
  }
  return <Circle className="w-3.5 h-3.5 text-gray-500" />;
}

function summarizeResult(step) {
  if (step.error) return step.error;
  const result = step.result || {};
  if (step.type === "inspect_place") {
    return `${result.count || result.totalInstances || 0} instance(s) inspected${result.truncated ? " (truncated)" : ""}`;
  }
  if (step.type === "read_script" && result.scripts) return `${result.scripts.length} script source(s) returned`;
  if (step.type === "write_script" && result.path) return `Wrote ${result.path}`;
  if (step.type === "create_instance" && result.path) return `Created ${result.path}`;
  if (step.type === "delete_instance" && result.path) return `Deleted ${result.path}`;
  if (step.type === "restore_snapshot") return `Restored ${result.restored || 0} snapshot(s)`;
  if (step.type === "run_smoke_check") return `${result.issues?.length || 0} issue(s), ${result.checkedScripts || 0} script(s) checked`;
  if (step.type === "apply_artifact") return "Applied artifact";
  return step.status || "pending";
}

export default function StudioAgentPanel({ user, chatId, notify }) {
  const [goal, setGoal] = useState("");
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const autoContinueRef = useRef(false);

  const pendingStep = useMemo(
    () => run?.steps?.find((step) => !TERMINAL.has(step.status)) || null,
    [run]
  );
  const runDone = run ? TERMINAL.has(run.status) : false;
  const snapshots = run?.snapshots?.length || 0;

  const refreshRun = useCallback(async (runId) => {
    if (!runId) return null;
    const data = await getStudioAgentRun(runId);
    setRun(data.run || null);
    return data.run || null;
  }, []);

  const handleStart = async () => {
    if (!user) {
      notify?.({ message: "Sign in before starting a Studio agent run", type: "info" });
      return;
    }
    if (!goal.trim() || busy) return;
    setBusy(true);
    try {
      const data = await startStudioAgent({ goal: goal.trim(), chatId });
      setRun(data.run || null);
      setCollapsed(false);
      notify?.({ message: "Studio agent started", type: "success" });
    } catch (err) {
      notify?.({ message: err?.message || "Failed to start Studio agent", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = useCallback(async () => {
    if (!run?.id || busy) return;
    setBusy(true);
    try {
      const data = await continueStudioAgent(run.id);
      setRun(data.run || null);
    } catch (err) {
      notify?.({ message: err?.message || "Studio agent could not continue", type: "error" });
    } finally {
      setBusy(false);
    }
  }, [busy, notify, run?.id]);

  const handleRestore = async () => {
    if (!run?.id || !snapshots || busy) return;
    setBusy(true);
    try {
      const data = await restoreStudioAgent(run.id);
      setRun(data.run || null);
      notify?.({ message: "Queued Studio snapshot restore", type: "success" });
    } catch (err) {
      notify?.({ message: err?.message || "No Studio snapshots to restore", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!run?.id || runDone) return undefined;
    const timer = window.setInterval(() => {
      refreshRun(run.id).catch(() => {});
    }, 2200);
    return () => window.clearInterval(timer);
  }, [refreshRun, run?.id, runDone]);

  useEffect(() => {
    if (!autoAdvance || !run?.id || runDone || pendingStep || busy || autoContinueRef.current) return;
    autoContinueRef.current = true;
    continueStudioAgent(run.id)
      .then((data) => setRun(data.run || null))
      .catch((err) => notify?.({ message: err?.message || "Studio agent auto-continue failed", type: "error" }))
      .finally(() => {
        autoContinueRef.current = false;
      });
  }, [autoAdvance, busy, notify, pendingStep, run?.id, runDone]);

  return (
    <section className="mx-4 mt-3 rounded-xl border border-white/10 bg-[#050505]/80 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#00f5d4]/10 text-[#00f5d4] shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-white">Studio Agent</div>
            <div className="text-[11px] text-gray-500 truncate">
              {run ? `${run.status} · ${run.iteration}/${run.maxIterations} step cycles · ${snapshots} snapshot(s)` : "Unrestricted dev mode"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="accent-[#00f5d4]"
            />
            Auto
          </label>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white"
          >
            {collapsed ? "Open" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="Tell the Studio agent what to inspect, build, wire, or fix..."
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#00f5d4]/50"
            />
            <div className="flex md:flex-col gap-2 md:w-40">
              <button
                type="button"
                onClick={handleStart}
                disabled={busy || !goal.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#00f5d4] text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {busy && !run ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Start
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={busy || !run?.id || !!pendingStep || runDone}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {busy && run ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TerminalSquare className="w-3.5 h-3.5" />}
                Next
              </button>
            </div>
          </div>

          {run && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
                <span className="truncate">{run.summary || run.goal}</span>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={busy || !snapshots}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-400/20 bg-red-400/10 text-red-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                  title="Queue restore for snapshots captured during this run"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto rounded-lg border border-white/5 bg-black/20 divide-y divide-white/5">
                {(run.steps || []).length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No Studio tool steps yet.</div>
                ) : (
                  run.steps.map((step) => (
                    <div key={step.id} className="px-3 py-2 flex items-start gap-2">
                      <div className="mt-0.5">{statusIcon(step.status)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-white truncate">{step.label || step.type}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 shrink-0">{step.type}</span>
                        </div>
                        <div className={`text-[11px] truncate ${step.error ? "text-red-300" : "text-gray-500"}`}>
                          {summarizeResult(step)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {run.status === "failed" && (
                <div className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{run.summary || "Studio agent run failed."}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
