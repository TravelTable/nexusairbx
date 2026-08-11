import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FileCode, XCircle } from "lib/icons";
import { AI_EVENTS, emitAiEvent } from "../lib/aiEvents";

export default function ScriptLoadingBarContainer({
  filename = "Script.lua",
  displayName = "",
  version = "v1.0",
  language = "lua",
  loading = false,
  onSave,
  codeReady = false,
  estimatedLines = null,
  saved = false,
  onView,
  previewSnippet = "",
  jobProgress = null,
  jobStage = null,
  etaSeconds = null,
  stage = null,
  eta = null,
  onCancel = null,
}) {
  const [progress, setProgress] = useState(0);
  const [canceled, setCanceled] = useState(false);

  const effectiveStage = jobStage ?? stage ?? null;
  const effectiveEta = etaSeconds ?? eta ?? null;

  const prettyName = useMemo(() => {
    const base = displayName || filename || "Script";
    const ext = language ? `.${language}` : "";
    const noExt =
      base.toLowerCase().endsWith(ext.toLowerCase()) ? base.slice(0, -ext.length) : base;
    return noExt.length > 28 ? noExt.slice(0, 25) + "…" : noExt;
  }, [displayName, filename, language]);

  // Reset progress and flags when (re)starting a job
  useEffect(() => {
    if (loading && !codeReady) {
      setProgress(0);
      setCanceled(false);
    }
  }, [loading, codeReady]);

  const clampProgress = (val, max = 100) =>
    Math.min(max, Math.max(0, +Number(val).toFixed(1)));

  // Faux progress when backend doesn't provide jobProgress
  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    // if backend drives progress, just mirror it
    if (typeof jobProgress === "number" && !isNaN(jobProgress)) {
      setProgress(clampProgress(jobProgress * 100, 100));
      return () => {};
    }

    if (canceled || !loading || codeReady) return () => {};

    let local = 0;
    intervalId = setInterval(() => {
      if (cancelled) return;
      if (local < 80) local += Math.random() * 2 + 1;
      else if (local < 95) local += Math.random() * 0.5 + 0.2;
      else local += Math.random() * 0.1;
      if (local > 99) local = 99;
      setProgress(clampProgress(local, 99));
    }, 120);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [loading, codeReady, jobProgress, canceled]);

  // === The important part: derive readiness without relying solely on codeReady ===
  const ready = useMemo(() => {
    const backendDone =
      typeof jobProgress === "number" && !isNaN(jobProgress) && jobProgress >= 1;
    const finishedWithoutBackend = !loading && (progress >= 99 || jobProgress == null);
    return !!(codeReady || backendDone || finishedWithoutBackend);
  }, [codeReady, jobProgress, loading, progress]);

  // Snap to 100% when ready
  useEffect(() => {
    if (ready && !canceled) setProgress(100);
  }, [ready, canceled]);

  const handleCancel = useCallback(() => {
    if (typeof onCancel === "function" && loading && !ready) {
      onCancel();
      setCanceled(true);
    }
  }, [onCancel, loading, ready]);

  const pct = clampProgress(progress, 100);
  const progressLabelDisplay = `${Math.round(pct)}%`;
  const stageLabel = canceled ? "Canceled" : effectiveStage || (ready ? "Finalizing" : "Generating");
  const canView = !!(codeReady || ready);

  return (
    <div className="sbc max-w-3xl mx-auto my-4 w-full px-2 sm:px-4" aria-busy={loading}>
      <div className="bg-[color-mix(in_srgb,var(--ds-surface-overlay)_84%,transparent)] backdrop-blur-sm rounded-lg overflow-hidden border border-[var(--ds-border-subtle)] shadow-panel">
        <div className="relative">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 z-10 relative">
            <div className="flex items-start w-full sm:w-auto min-w-0">
              <div className="bg-[var(--ds-surface-2)] p-1.5 rounded-md mr-3 border border-[var(--ds-border-subtle)] flex-shrink-0 mt-0.5">
                <FileCode className="w-5 h-5 text-[var(--ds-text)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap">
                  <span className="font-medium text-[var(--ds-text)] truncate max-w-[160px] sm:max-w-none" title={prettyName}>
                    {prettyName}
                  </span>
                  {version && (
                    <span className="ml-2 text-xs text-[var(--ds-text-secondary)] border-l border-[var(--ds-border-strong)] pl-2" title={`Script Version: ${version}`}>
                      {typeof version === "string" ? version : `v${version}`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--ds-text-secondary)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1" aria-live="polite">
                  <span>
                    {canceled ? "Script generation canceled" : ready ? `${language.toUpperCase()} script generated` : `Generating ${language.toUpperCase()} script...`}
                  </span>
                  <span className="font-semibold">{progressLabelDisplay}</span>
                  <span className="text-[var(--ds-text-muted)]">• {stageLabel}</span>
                  {estimatedLines != null && <span className="text-[var(--ds-text-muted)]">• ~{estimatedLines} lines</span>}
                  {effectiveEta != null && !ready && <span className="text-[var(--ds-text-muted)]">• ~{Math.ceil(effectiveEta)}s</span>}
                  {!ready && !canceled && (
                    <span className="text-[var(--ds-warning)]">This may take a few minutes depending on script complexity...</span>
                  )}
                  {canceled && <span className="text-[var(--ds-danger)]">Generation was canceled. No further progress.</span>}
                </div>
                {previewSnippet && ready && (
                  <div className="mt-2 text-xs text-[var(--ds-text-muted)] font-mono whitespace-pre-wrap max-h-16 overflow-hidden">
                    {previewSnippet}
                  </div>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-2 sm:mt-0">
            {/* View */}
            <button
              type="button"
              onClick={() => {
                // If parent provided a view handler, use it whenever we can view
                if (typeof onView === "function" && canView) {
                  onView();
                  return;
                }

                // Fallback: if ready and no handler, try the legacy global drawer event
                if (canView) {
                  emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, {
                    code:
                      typeof window !== "undefined" && window.nexusCurrentCode
                        ? window.nexusCurrentCode
                        : "",
                    title: displayName || filename || "Script",
                    version: version,
                    language: language,
                  });
                }
              }}
              disabled={!canView}
              aria-disabled={!canView}
              className="relative z-10 flex items-center justify-center px-4 py-1.5 rounded-md text-sm bg-accent text-accent-foreground border border-transparent transition-all duration-300 hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)] disabled:bg-[var(--ds-fill-subtle)] disabled:text-[var(--ds-text-disabled)]"
              title={canView ? "View script" : "No code available yet"}
              tabIndex={canView ? 0 : -1}
            >
              <FileCode className="w-4 h-4 mr-1.5" />
              <span>View</span>
            </button>

              {/* Cancel */}
              {typeof onCancel === "function" && loading && !ready && !canceled && (
                <div className="relative group flex-1 sm:flex-none min-w-[120px]">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-transparent text-[var(--ds-text-secondary)] border border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] transition-all duration-200"
                    title="Cancel script generation"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className="absolute bottom-0 left-0 h-1 bg-[var(--ds-fill-hover)] w-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Script generation progress"
            aria-valuetext={`${Math.round(pct)}% ${stageLabel}`}
          >
            <div className="h-full bg-gradient-to-r from-[var(--ds-plan)] via-accent to-[var(--ds-info)] transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sbcBorderAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sbc .group:hover .bg-gradient-to-r {
          animation: sbcBorderAnimation 3s ease infinite;
          background-size: 200% 200%;
        }
        @media (max-width: 640px) {
          .sbc .max-w-3xl { max-width: 100vw !important; }
          .sbc .rounded-lg { border-radius: 1rem !important; }
          .sbc .px-3, .sbc .sm\\:px-4 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
          .sbc .py-3 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
          .sbc .flex-row { flex-direction: column !important; }
          .sbc .items-center { align-items: flex-start !important; }
          .sbc .gap-2 { gap: 0.5rem !important; }
          .sbc .mr-3 { margin-right: 0.75rem !important; }
          .sbc .w-full { width: 100% !important; }
          .sbc .justify-end { justify-content: flex-end !important; }
          .sbc .min-w-0 { min-width: 0 !important; }
          .sbc .min-w-\\[120px\\] { min-width: 100px !important; }
          .sbc .min-w-\\[160px\\] { min-width: 120px !important; }
        }
      `}</style>
    </div>
  );
}
