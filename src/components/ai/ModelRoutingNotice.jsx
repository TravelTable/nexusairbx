import React from "react";

export default function ModelRoutingNotice({ routing, preview = false }) {
  if (!routing?.modelId) return null;
  const estimate = routing.estimatedCredits;
  return <div className="px-4 py-2 text-xs text-[var(--nx-text-muted)]" role="status" aria-live="polite">
    <p className="m-0">Nexus Auto {preview ? "would select" : "selected"} <strong className="text-[var(--nx-text-primary)]">{routing.modelName || routing.modelId}</strong>
      {routing.autoMode ? ` · ${routing.autoMode[0].toUpperCase()}${routing.autoMode.slice(1)}` : ""}</p>
    {estimate && <p className="mt-1">Estimated usage: {estimate.min}–{estimate.max} credits{preview ? " for the starting request" : ""}.</p>}
    <details className="mt-1"><summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Why this model?</summary>
      <ul className="my-1 list-disc pl-4">{(routing.reasons || []).map(reason => <li key={reason}>{reason}</li>)}</ul>
      <p className="mt-1">Estimates include the output budget. Extra context and additional agent requests can change total usage.</p>
    </details>
  </div>;
}
