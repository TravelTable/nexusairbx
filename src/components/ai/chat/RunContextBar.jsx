import React from "react";
import { formatChatModeLabel } from "../../../lib/chatModes";

const ACTION_LABELS = Object.freeze({
  execute: "Building",
  stage_for_review: "Preparing review",
  recover: "Recovering",
  clarify: "Needs input",
  block: "Blocked",
  refuse: "Blocked",
  answer: "Read-only",
  inspect: "Read-only",
  plan: "Planning",
});

const FACTOR_LABELS = Object.freeze({
  intentClarity: "Intent clarity",
  targetBinding: "Target binding",
  toolAvailability: "Tool availability",
  contextFreshness: "Context freshness",
  reversibility: "Reversibility",
  verificationCoverage: "Verification coverage",
});

function capabilitySummary(decision) {
  const required = new Set(
    Array.isArray(decision?.requiredCapabilityIds)
      ? decision.requiredCapabilityIds.map((value) => String(value || "").toLowerCase())
      : []
  );
  const hasStudioRead = [...required].some((id) => (
    id === "get_project_manifest"
    || id === "search_project"
    || id === "read_script"
  ));
  const hasStudioWrite = [...required].some((id) => (
    id === "write_script"
    || id === "apply_artifact"
    || id.includes("write")
    || id.includes("patch")
  ));
  const hasRobloxCloud = [...required].some((id) => (
    id.includes("roblox_cloud")
    || id.includes("open_cloud")
    || id.includes("asset")
  ));

  if (hasStudioWrite) return "Studio read/write";
  if (hasStudioRead) return "Studio read";
  if (hasRobloxCloud) return "Roblox Cloud";
  if (decision?.executionPolicy === "read" || ["answer", "inspect", "plan"].includes(decision?.action)) {
    return "Read only";
  }
  return "No external tools";
}

function titleCase(value) {
  return String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function describeRunContext(decision) {
  const requestedMode = formatChatModeLabel(decision?.requestedMode) || "Unknown";
  const effectiveMode = formatChatModeLabel(decision?.effectiveMode) || requestedMode;
  const mode = requestedMode === effectiveMode
    ? requestedMode
    : `${requestedMode} → ${effectiveMode}`;
  const studio = decision?.studio || {};
  const targetIdentity = String(studio.targetId || studio.placeId || "").trim();
  const targetName = String(
    studio.targetName || studio.placeName || studio.projectName || ""
  ).trim();
  const target = targetName || (targetIdentity ? "Selected place" : "Not bound");
  const connection = studio.required
    ? (studio.connected ? "connected" : "not connected")
    : "not required";
  const manifest = decision?.manifest || {};
  const manifestStatus = titleCase(manifest.status) || "Not required";
  const rawManifestSource = String(manifest.source || "").trim().toLowerCase();
  const manifestSource = ["", "none", "null", "undefined", "unavailable"].includes(rawManifestSource)
    ? ""
    : titleCase(manifest.source);
  const confidence = Number.isFinite(Number(decision?.executionConfidence))
    ? `${Math.round(Number(decision.executionConfidence))}/100${decision.confidenceLabel ? ` · ${titleCase(decision.confidenceLabel)}` : ""}`
    : "Not scored";
  const reasons = (Array.isArray(decision?.reasons) ? decision.reasons : [])
    .map((reason) => String(reason || "").trim())
    .filter(Boolean);
  const unavailableCapabilities = (Array.isArray(decision?.unavailableCapabilities)
    ? decision.unavailableCapabilities
    : [])
    .map((capability) => ({
      id: String(capability?.id || "").trim(),
      resolution: String(capability?.resolution || "").trim(),
    }))
    .filter(({ id }) => id);

  return {
    status: ACTION_LABELS[decision?.action] || "Deciding",
    mode,
    target,
    connection,
    manifest: manifestSource ? `${manifestStatus} · ${manifestSource}` : manifestStatus,
    confidence,
    confidenceTooltip: [
      ...Object.entries(decision?.confidenceFactors || {})
        .filter(([factor, value]) => FACTOR_LABELS[factor] && Number.isFinite(Number(value)))
        .map(([factor, value]) => `${FACTOR_LABELS[factor]}: ${Math.round(Number(value))}`),
      ...reasons,
    ].join(" · "),
    confidenceFactors: Object.entries(decision?.confidenceFactors || {})
      .filter(([factor, value]) => FACTOR_LABELS[factor] && Number.isFinite(Number(value)))
      .map(([factor, value]) => ({
        factor,
        label: FACTOR_LABELS[factor],
        value: Math.round(Number(value)),
      })),
    reasons,
    toolSummary: capabilitySummary(decision),
    unavailableCapabilities,
    nextAction: String(decision?.nextAction || "").trim(),
  };
}

export default function RunContextBar({ decision }) {
  if (!decision || typeof decision !== "object") return null;
  const context = describeRunContext(decision);

  return (
    <section
      aria-label="Run context"
      className="w-full max-w-[840px] rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-3 py-2 text-[11px] text-[var(--ds-text-secondary)]"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-[var(--ds-text)]">{context.status}</span>
        {context.target !== "Not bound" ? (
          <span className="text-[var(--ds-text-muted)]">in {context.target}</span>
        ) : null}
      </div>
      {context.nextAction ? (
        <p className="mt-1 truncate text-[var(--ds-text-muted)]" title={context.nextAction}>
          Next: {context.nextAction}
        </p>
      ) : null}
      <details className="mt-1 text-[var(--ds-text-muted)]">
          <summary
            className="w-fit cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-info)]"
            title={context.confidenceTooltip || "Run details"}
          >
            Run details
          </summary>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
            <div><dt>Mode</dt><dd className="text-[var(--ds-text-secondary)]">{context.mode}</dd></div>
            <div><dt>Studio</dt><dd className="text-[var(--ds-text-secondary)]">{context.target} · {context.connection}</dd></div>
            <div><dt>Tools</dt><dd className="text-[var(--ds-text-secondary)]">{context.toolSummary}</dd></div>
            <div><dt>Manifest</dt><dd className="text-[var(--ds-text-secondary)]">{context.manifest}</dd></div>
            <div>
              <dt>Confidence</dt>
              <dd className="text-[var(--ds-text-secondary)]" title={context.confidenceTooltip || undefined}>{context.confidence}</dd>
            </div>
          </dl>
          {context.confidenceFactors.length ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 border-t border-[var(--ds-border-subtle)] pt-2 sm:grid-cols-3">
              {context.confidenceFactors.map(({ factor, label, value }) => (
                <div key={factor} className="flex min-w-0 justify-between gap-2">
                  <dt className="truncate" title={label}>{label}</dt>
                  <dd aria-label={`${label}: ${value}`} className="tabular-nums text-[var(--ds-text-secondary)]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {context.reasons.length ? (
            <ul aria-label="Decision reasons" className="mt-1 list-disc space-y-0.5 pl-4">
              {context.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : null}
          {context.unavailableCapabilities.length ? (
            <ul aria-label="Unavailable capabilities" className="mt-1 space-y-0.5">
              {context.unavailableCapabilities.map(({ id, resolution }) => (
                <li key={id}>
                  <span className="font-medium text-[var(--ds-text-secondary)]">{id}</span>
                  {resolution ? ` · ${resolution}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
      </details>
    </section>
  );
}
