import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Loader2, Play, RefreshCw, ShieldCheck, StopCircle, XCircle } from "lucide-react";
import {
  cancelStudioValidation,
  getStudioValidation,
  getStudioValidationReport,
  prepareStudioValidation,
  rerunStudioValidation,
  startStudioValidation,
} from "../../../lib/studioBridgeApi";

const FINAL_STATES = new Set(["passed", "passed_with_warnings", "failed", "cancelled", "timed_out", "validation_error"]);
const RUNNING_STATES = new Set(["queued", "waiting_for_studio", "running_static_checks", "collecting_diagnostics", "starting_playtest", "playtesting", "stopping_playtest", "building_report"]);

function title(value) {
  return String(value || "").replace(/_/g, " ");
}

function statusMeta(status) {
  if (status === "passed") return { icon: CheckCircle2, color: "text-emerald-300" };
  if (status === "passed_with_warnings") return { icon: AlertTriangle, color: "text-amber-200" };
  if (status === "failed" || status === "validation_error" || status === "timed_out") return { icon: XCircle, color: "text-rose-300" };
  if (status === "cancelled") return { icon: StopCircle, color: "text-gray-300" };
  return { icon: Loader2, color: "text-cyan-300", spin: true };
}

function formatVec(vec) {
  if (!vec) return "none";
  return `${Number(vec.x || 0).toFixed(1)}, ${Number(vec.y || 0).toFixed(1)}, ${Number(vec.z || 0).toFixed(1)}`;
}

function profileLabel(profile) {
  if (profile === "quick") return "Quick";
  if (profile === "playtest") return "Playtest";
  return "Standard";
}

export default function StudioValidationPanel({
  targetType = "managed_native_model",
  targetReferenceId = "",
  modelId = "",
  sessionId = null,
  onClose,
}) {
  const [profile, setProfile] = useState("standard");
  const [prepared, setPrepared] = useState(null);
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("preparing");
  const [severity, setSeverity] = useState("all");
  const [playtestConfirmed, setPlaytestConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [rerunning, setRerunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setPrepared(null);
    setSession(null);
    setReport(null);
    setStatus("preparing");
    prepareStudioValidation({
      sessionId,
      profile,
      targetType,
      targetReferenceId,
      modelId,
    })
      .then((data) => {
        if (cancelled) return;
        setPrepared(data.validationSession);
        setSession(data.validationSession);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to prepare Studio validation");
        setStatus("validation_error");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, profile, targetType, targetReferenceId, modelId]);

  useEffect(() => {
    if (!session?.validationSessionId || !RUNNING_STATES.has(status)) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const data = await getStudioValidation(session.validationSessionId);
        if (cancelled) return;
        setSession(data.session);
        setStatus(data.session.status);
        if (FINAL_STATES.has(data.session.status)) {
          clearInterval(timer);
          try {
            const reportData = await getStudioValidationReport(session.validationSessionId);
            if (!cancelled) setReport(reportData.report);
          } catch (_) {}
        }
      } catch (_) {}
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session?.validationSessionId, status]);

  const plan = prepared?.plan || session?.plan || null;
  const checks = useMemo(() => Object.entries(plan?.checks || {}).filter(([, enabled]) => enabled === true).map(([key]) => key), [plan]);
  const issues = useMemo(() => {
    const all = report?.issues || [];
    return severity === "all" ? all : all.filter((issue) => issue.severity === severity);
  }, [report, severity]);
  const meta = statusMeta(report?.status || status);
  const StatusIcon = meta.icon;
  const busy = RUNNING_STATES.has(status) || status === "preparing";
  const needsPlaytestConfirm = profile === "playtest";
  const canStart = prepared?.validationSessionId && status === "ready" && (!needsPlaytestConfirm || playtestConfirmed);

  const start = async () => {
    if (!canStart) return;
    setError("");
    setStatus("queued");
    try {
      const started = await startStudioValidation({
        preparedValidationId: prepared.validationSessionId,
        playtestConfirmed,
      });
      setSession((current) => ({ ...(current || prepared), ...started }));
      setStatus(started.status || "queued");
    } catch (err) {
      setError(err?.message || "Failed to start Studio validation");
      setStatus("validation_error");
    }
  };

  const cancel = async () => {
    if (!session?.validationSessionId) {
      onClose?.();
      return;
    }
    try {
      const cancelled = await cancelStudioValidation(session.validationSessionId);
      setStatus(cancelled.status || "cancelled");
      const reportData = await getStudioValidationReport(session.validationSessionId).catch(() => null);
      if (reportData?.report) setReport(reportData.report);
    } catch (err) {
      setError(err?.message || "Failed to cancel validation");
    }
  };

  const rerun = async () => {
    if (!session?.validationSessionId || rerunning) return;
    setError("");
    setRerunning(true);
    setStatus("queued");
    try {
      const next = await rerunStudioValidation(session.validationSessionId);
      setReport(null);
      setSession((current) => ({ ...(current || session), ...next }));
      setStatus(next.status || "queued");
    } catch (err) {
      setError(err?.message || "Failed to rerun validation");
      setStatus(report?.status || session?.status || "validation_error");
    } finally {
      setRerunning(false);
    }
  };

  const copySummary = async () => {
    const summary = report
      ? `${report.target?.name || "Studio target"}: ${title(report.status)}. Warnings: ${report.summary?.warnings || 0}. Errors: ${report.summary?.errors || 0}. Critical: ${report.summary?.critical || 0}.`
      : `${prepared?.targetName || "Studio target"} validation is ${title(status)}.`;
    await navigator.clipboard?.writeText(summary).catch(() => {});
  };

  return (
    <section className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.04] p-3 text-xs text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>{prepared?.targetName || report?.target?.name || "Studio validation"}</span>
          </div>
          <div className="mt-1 text-white/55">
            {title(targetType)} · {prepared?.targetReference?.path || report?.target?.path || "Studio project"}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 font-black uppercase tracking-widest ${meta.color}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${meta.spin ? "animate-spin" : ""}`} />
          {title(report?.status || status)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {["quick", "standard", "playtest"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setProfile(item)}
            disabled={busy}
            className={`rounded-md border px-3 py-2 font-bold ${profile === item ? "border-emerald-300 bg-emerald-300/15 text-emerald-100" : "border-white/10 text-white/65 hover:bg-white/5"} disabled:opacity-50`}
          >
            {profileLabel(item)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <div className="font-bold text-white/80">Checks</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {checks.map((check) => (
              <span key={check} className="rounded border border-white/10 px-2 py-1 text-white/60">{title(check)}</span>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <div className="font-bold text-white/80">Playtest</div>
          <div className="mt-1 text-white/60">
            {plan?.playtest?.enabled ? `Explicit approval required. Max ${plan.playtest.durationSeconds}s.` : "Not included in this profile."}
          </div>
          {plan?.playtest?.unavailableCode && (
            <div className="mt-1 text-amber-200">Automation unavailable; report includes a manual playtest recommendation.</div>
          )}
        </div>
      </div>

      {needsPlaytestConfirm && (
        <label className="mt-3 flex items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 p-2 text-amber-100">
          <input type="checkbox" checked={playtestConfirmed} onChange={(event) => setPlaytestConfirmed(event.target.checked)} />
          Confirm the bounded playtest validation profile.
        </label>
      )}

      {error && <div className="mt-3 rounded-md border border-rose-300/25 bg-rose-300/10 p-2 text-rose-100">{error}</div>}

      {report && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <Metric label="Passed" value={report.summary?.passed ?? 0} />
            <Metric label="Warnings" value={report.summary?.warnings ?? 0} />
            <Metric label="Errors" value={report.summary?.errors ?? 0} />
            <Metric label="Critical" value={report.summary?.critical ?? 0} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="Parts" value={report.counts?.baseParts ?? 0} />
            <Metric label="Scripts" value={report.counts?.scripts ?? 0} />
            <Metric label="Bounds" value={formatVec(report.bounds?.size)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["all", "info", "warning", "error", "critical"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSeverity(item)}
                className={`rounded border px-2 py-1 font-bold ${severity === item ? "border-white/40 text-white" : "border-white/10 text-white/55"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="max-h-56 space-y-2 overflow-auto">
            {issues.map((issue, index) => (
              <div key={`${issue.code}-${index}`} className="rounded-md border border-white/10 bg-black/20 p-2">
                <div className="font-black uppercase tracking-widest text-white/50">{issue.severity} · {issue.code}</div>
                <div className="mt-1 text-white/85">{issue.message}</div>
                {issue.targetPath && <div className="mt-1 text-white/45">{issue.targetPath}</div>}
                {issue.recommendation && <div className="mt-1 text-emerald-100/80">{issue.recommendation}</div>}
              </div>
            ))}
            {!issues.length && <div className="rounded-md border border-white/10 p-2 text-white/55">No findings for this filter.</div>}
          </div>
          <div className="text-white/45">Rules: {report.rulesVersion} · Completed: {report.completedAt || "pending"}</div>
          {session?.reportHistory?.length > 0 && (
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <div className="font-bold text-white/80">History</div>
              <div className="mt-1 space-y-1 text-white/55">
                {session.reportHistory.slice(-5).map((entry, index) => (
                  <div key={`${entry.executionId || index}-${entry.completedAt || index}`}>
                    {title(entry.status || "completed")} · {entry.completedAt || entry.executionId || "previous execution"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-3 py-2 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Start validation
        </button>
        <button type="button" onClick={copySummary} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-bold text-white/70">
          <Clipboard className="h-3.5 w-3.5" />
          Copy summary
        </button>
        {FINAL_STATES.has(status) && (
          <button type="button" onClick={rerun} disabled={rerunning} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-bold text-white/70 disabled:opacity-40">
            {rerunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Rerun
          </button>
        )}
        <button type="button" onClick={cancel} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-bold text-white/70">
          <StopCircle className="h-3.5 w-3.5" />
          {RUNNING_STATES.has(status) ? "Cancel" : "Close"}
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-2">
      <div className="text-white/45">{label}</div>
      <div className="mt-1 font-black text-white">{value}</div>
    </div>
  );
}
