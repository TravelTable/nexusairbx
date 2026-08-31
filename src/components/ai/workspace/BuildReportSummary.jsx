import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Loader2,
  ShieldCheck,
} from "lib/icons";
import { kindMeta } from "./workspaceMeta";
import styles from "./BuildReportSummary.module.css";

const RUNNING_STATES = new Set([
  "inspecting",
  "waiting_for_tool",
  "waiting_for_approval",
  "generating",
  "validating",
  "ready_to_apply",
  "assets_pending",
  "applying",
]);
const ERROR_STATES = new Set(["failed", "conflict", "iteration_limit", "timed_out"]);
const WARNING_STATES = new Set(["blocked", "cancelled"]);

function reportState(agentRun, fileCount) {
  const status = agentRun?.status || "";
  if (RUNNING_STATES.has(status)) return { label: "In progress", tone: "info", icon: Loader2 };
  if (ERROR_STATES.has(status)) return { label: "Needs attention", tone: "danger", icon: AlertTriangle };
  if (WARNING_STATES.has(status)) return { label: "Review needed", tone: "warning", icon: AlertTriangle };
  if (fileCount > 0) return { label: "Ready", tone: "success", icon: CheckCircle2 };
  return { label: "Draft", tone: "neutral", icon: FileCode2 };
}

function plural(value, singular, pluralValue = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

export default function BuildReportSummary({ artifact, agentRun }) {
  if (!artifact) return null;

  const files = Array.isArray(artifact.files) ? artifact.files : [];
  const placements = new Set(files.map((file) => file.placement).filter(Boolean));
  const steps = Array.isArray(agentRun?.steps) ? agentRun.steps : [];
  const completedSteps = steps.filter((step) => step.status === "succeeded").length;
  const qaScore = Number(artifact.qaReport?.score);
  const hasQaScore = Number.isFinite(qaScore);
  const qaIssues = Array.isArray(artifact.qaReport?.issues) ? artifact.qaReport.issues.length : 0;
  const issueCount = (artifact.warnings?.length || 0) + (artifact.securityNotes?.length || 0) + qaIssues;
  const state = reportState(agentRun, files.length);
  const StatusIcon = state.icon;
  const kindCounts = files.reduce((counts, file) => {
    const kind = String(file.kind || "file").toLowerCase();
    counts.set(kind, (counts.get(kind) || 0) + 1);
    return counts;
  }, new Map());
  const fallbackSummary = files.length
    ? `${plural(files.length, "file")} across ${plural(placements.size, "Studio service")}. Review the delivery evidence below before pushing to Studio.`
    : "The build report will fill in as the agent produces workspace files and validation evidence.";

  return (
    <section className={styles.summary} aria-labelledby="build-report-title">
      <div className={styles.header}>
        <span className={styles.statusIcon} data-tone={state.tone} aria-hidden="true">
          <StatusIcon className={state.tone === "info" ? styles.spinning : ""} />
        </span>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>Build outcome</span>
          <h3 id="build-report-title">{artifact.title || "Generated artifact"}</h3>
        </div>
        <span className={styles.status} data-tone={state.tone} aria-label={`Build status: ${state.label}`}>
          <i aria-hidden="true" />{state.label}
        </span>
      </div>

      <p className={styles.description}>{artifact.summary || fallbackSummary}</p>

      <dl className={styles.metrics} aria-label="Build metrics">
        <div><dt>Files</dt><dd aria-label={`${files.length} files`}>{files.length}</dd></div>
        <div><dt>Services</dt><dd aria-label={`${placements.size} Studio services`}>{placements.size}</dd></div>
        <div><dt>Run steps</dt><dd aria-label={`${completedSteps} of ${steps.length} run steps complete`}>{steps.length ? `${completedSteps}/${steps.length}` : "—"}</dd></div>
        <div><dt>Quality</dt><dd aria-label={hasQaScore ? `Quality score ${qaScore}` : "Quality score unavailable"}>{hasQaScore ? qaScore : "—"}</dd></div>
      </dl>

      <div className={styles.footer}>
        <div className={styles.kinds} aria-label="Generated file types">
          {[...kindCounts.entries()].map(([kind, count]) => {
            const meta = kindMeta(kind);
            const KindIcon = meta.icon;
            return (
              <span key={kind}><KindIcon aria-hidden="true" />{count} {meta.label}</span>
            );
          })}
          {!kindCounts.size ? <span><FileCode2 aria-hidden="true" />No files yet</span> : null}
        </div>
        <span className={styles.issueCount} data-clear={issueCount === 0 ? "true" : "false"}>
          {issueCount === 0 ? <ShieldCheck aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          {issueCount === 0 ? "No recorded issues" : plural(issueCount, "issue")}
        </span>
      </div>
    </section>
  );
}
