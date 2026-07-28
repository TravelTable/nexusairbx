import React from "react";

const ACTION_LABELS = Object.freeze({
  execute: "Starting",
  stage_for_review: "Starting",
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

function titleCase(value) {
  return String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function describeRunContext(decision) {
  const requestedMode = titleCase(decision?.requestedMode) || "Unknown";
  const effectiveMode = titleCase(decision?.effectiveMode) || requestedMode;
  const mode = requestedMode === effectiveMode
    ? requestedMode
    : `${requestedMode} → ${effectiveMode}`;
  const studio = decision?.studio || {};
  const target = String(studio.targetId || studio.placeId || "").trim() || "Not bound";
  const connection = studio.required
    ? (studio.connected ? "connected" : "not connected")
    : "not required";
  const manifest = decision?.manifest || {};
  const manifestStatus = titleCase(manifest.status) || "Not required";
  const manifestSource = titleCase(manifest.source);
  const confidence = Number.isFinite(Number(decision?.executionConfidence))
    ? `${Math.round(Number(decision.executionConfidence))}/100${decision.confidenceLabel ? ` · ${titleCase(decision.confidenceLabel)}` : ""}`
    : "Not scored";

  return {
    status: ACTION_LABELS[decision?.action] || "Deciding",
    mode,
    target,
    connection,
    manifest: manifestSource ? `${manifestStatus} · ${manifestSource}` : manifestStatus,
    confidence,
    confidenceFactors: Object.entries(decision?.confidenceFactors || {})
      .filter(([factor, value]) => FACTOR_LABELS[factor] && Number.isFinite(Number(value)))
      .map(([factor, value]) => ({
        factor,
        label: FACTOR_LABELS[factor],
        value: Math.round(Number(value)),
      })),
    nextAction: String(decision?.nextAction || "").trim(),
  };
}

export default function RunContextBar({ decision }) {
  if (!decision || typeof decision !== "object") return null;
  const context = describeRunContext(decision);

  return (
    <section
      aria-label="Run context"
      className="w-full max-w-[840px] rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-gray-400"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-gray-200">{context.status}</span>
        <span><span className="sr-only">Mode: </span>{context.mode}</span>
        <span><span className="text-gray-500">Studio:</span> {context.target} · {context.connection}</span>
        <span><span className="text-gray-500">Manifest:</span> {context.manifest}</span>
        <span><span className="text-gray-500">Confidence:</span> {context.confidence}</span>
      </div>
      {context.nextAction ? (
        <p className="mt-1 truncate text-gray-500" title={context.nextAction}>
          Next: {context.nextAction}
        </p>
      ) : null}
      {context.confidenceFactors.length ? (
        <details className="mt-1 text-gray-500">
          <summary className="w-fit cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            Confidence details
          </summary>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
            {context.confidenceFactors.map(({ factor, label, value }) => (
              <div key={factor} className="flex min-w-0 justify-between gap-2">
                <dt className="truncate" title={label}>{label}</dt>
                <dd aria-label={`${label}: ${value}`} className="tabular-nums text-gray-300">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </section>
  );
}
