import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FileCode, Save, Check, X } from "lucide-react";

/**
 * ScriptLoadingBarContainer
 * Props:
 * - filename: string (required)
 * - displayName: string (optional)
 * - version: string (optional, e.g. "v1", "v2", etc.)
 * - language: string (default: "lua")
 * - loading: boolean (true while code is being fetched)
 * - onSave: function (called when Save is clicked)
 * - codeReady: boolean (true when code is ready)
 * - estimatedLines: number (optional)
 * - saved: boolean (true if script is saved)
 * - onView: function (called when View is clicked, should open the drawer for this script)
 * - jobProgress: number (0..1, optional, backend-driven progress)
 * - jobStage: string (optional, e.g. "Preparing", "Calling model", etc.)
 * - etaSeconds: number (optional, estimated seconds remaining)
 * - onCancel: function (optional, called when Cancel is clicked)
 */
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
  jobProgress = null,
  jobStage = null,
  etaSeconds = null,
  onCancel = null,
}) {
  const [progress, setProgress] = useState(0);
  const [internalSaved, setInternalSaved] = useState(saved);
  const [saving, setSaving] = useState(false);

  // Memoized pretty name, language-proof extension stripping
  const prettyName = useMemo(() => {
    const base = (displayName || filename || "Script");
    const ext = language ? `.${language}` : "";
    const lowerBase = base.toLowerCase();
    const noExt = lowerBase.endsWith(ext) ? base.slice(0, -ext.length) : base;
    return noExt.length > 28 ? noExt.slice(0, 25) + "…" : noExt;
  }, [displayName, filename, language]);

// Reset progress and saved state when loading starts
useEffect(() => {
  if (loading && !codeReady) {
    setProgress(0);
    setInternalSaved(false);
  }
}, [loading, codeReady]);


  // Clamp and guard progress
  const clampProgress = (val, max = 100) =>
    Math.min(max, Math.max(0, +val.toFixed(1)));

  // Progress animation logic: backend-driven or faux timer
  useEffect(() => {
    let rafId = null;
    let intervalId = null;
    let cancelled = false;

    // If backend progress is provided, use it
if (typeof jobProgress === "number" && !isNaN(jobProgress)) {
  const pct = clampProgress(jobProgress * 100, 100);
  setProgress(pct);
  return () => {};
}


    // Otherwise, use faux timer
    const tickTo100 = (durationMs = 400) => {
      const start = performance.now();
      const startVal = Number.isFinite(progress) ? Math.min(progress, 100) : 0;
      const delta = 100 - startVal;
      const step = (t) => {
        if (cancelled) return;
        const elapsed = t - start;
        const pct =
          elapsed >= durationMs
            ? 100
            : clampProgress(startVal + delta * (elapsed / durationMs), 100);
setProgress(pct);
        if (pct < 100) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

if (loading && !codeReady) {
  setProgress(0);
  intervalId = setInterval(() => {
    if (cancelled) return;
    setProgress((prev) => clampProgress(prev + 0.2, 95));
  }, 200);
}


    if (codeReady) {
      if (intervalId) clearInterval(intervalId);
      tickTo100(450);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codeReady, jobProgress]);

  // When parent updates saved prop, sync internal state
  useEffect(() => {
    setInternalSaved(saved);
  }, [saved]);

  // Reset internalSaved when loading flips true
  useEffect(() => {
    if (loading && !codeReady) setInternalSaved(false);
  }, [loading, codeReady]);

  // Save handler with saving guard, useCallback for perf
  const handleSave = useCallback(async () => {
    if (saving || internalSaved || typeof onSave !== "function") return;
    try {
      setSaving(true);
      const result = await onSave();
      if (result !== false) setInternalSaved(true);
    } finally {
      setSaving(false);
    }
  }, [saving, internalSaved, onSave]);

  // View handler, useCallback for perf
  const handleView = useCallback(() => {
    if (typeof onView === "function" && codeReady) {
      onView();
    }
  }, [onView, codeReady]);

  // Cancel handler, useCallback for perf
  const handleCancel = useCallback(() => {
    if (typeof onCancel === "function" && loading && !codeReady) {
      onCancel();
    }
  }, [onCancel, loading, codeReady]);

  // Compose progress percent for display and bar
  const pct = useMemo(() => {
    if (typeof jobProgress === "number" && !isNaN(jobProgress)) {
      return clampProgress(jobProgress * 100, 100);
    }
    return clampProgress(progress, 100);
  }, [jobProgress, progress]);

  // Compose progress label
  const progressLabelDisplay = useMemo(
    () => `${Math.round(pct)}%`,
    [pct]
  );

  // Compose stage label
  const stageLabel = jobStage || (codeReady ? "Finalizing" : "Generating");

  
return (
  <div
    className="sbc max-w-3xl mx-auto my-4 w-full px-2 sm:px-4"
    aria-busy={loading}
    onSubmit={(e) => e.preventDefault()}
  >
      <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700 shadow-lg">
        <div className="relative">
          {/* Header Content */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-3 z-10 relative gap-3 sm:gap-0">
            <div className="flex items-center w-full sm:w-auto">
              <div className="bg-gray-800 bg-opacity-70 p-1.5 rounded-md mr-3 border border-gray-700 flex-shrink-0">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center flex-wrap">
                  <span
                    className="font-medium text-white truncate max-w-[160px] sm:max-w-none"
                    title={prettyName}
                  >
                    {prettyName}
                  </span>
                  {version && (
                    <span className="ml-2 text-xs text-gray-300 border-l border-gray-600 pl-2" title={`Script Version: ${version}`}>
                      {typeof version === "string" ? version : `v${version}`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 flex items-center flex-wrap" aria-live="polite">
                  <span>
                    {codeReady
                      ? `${language.toUpperCase()} script generated`
                      : `Generating ${language.toUpperCase()} script...`}
                  </span>
                  <span className="ml-2 font-semibold">{progressLabelDisplay}</span>
                  <span className="ml-2 text-gray-400">• {stageLabel}</span>
                  {estimatedLines != null && (
                    <span className="ml-2 text-gray-400">
                      • ~{estimatedLines} lines
                    </span>
                  )}
                  {etaSeconds != null && !codeReady && (
                    <span className="ml-2 text-gray-400">
                      • ~{Math.ceil(etaSeconds)}s
                    </span>
                  )}
                  {!codeReady && (
                    <span className="ml-2 text-yellow-400">
                      This may take a few minutes depending on script complexity...
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* View, Save, Cancel Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* View Button */}
              <div className={`relative group flex-1 sm:flex-none ${!codeReady ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`absolute inset-0 rounded-md bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 
                  opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 
                  ${!codeReady ? 'hidden' : ''}`}>
                </div>
                <button
                  type="button"
                  onClick={handleView}
                  disabled={!codeReady}
                  aria-disabled={!codeReady}
                  className={`relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-black text-white
                    border border-transparent group-hover:border-transparent transition-all duration-300
                    ${codeReady ? 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}`}
                  title={codeReady ? "View script" : "Wait for script to complete"}
                  style={{ marginRight: "0.5rem" }}
                >
                  <FileCode className="w-4 h-4 mr-1.5" />
                  <span>View</span>
                </button>
              </div>
              {/* Save Button */}
              <div className={`relative group flex-1 sm:flex-none ${!codeReady ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`absolute inset-0 rounded-md bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 
                  opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 
                  ${!codeReady ? 'hidden' : ''}`}>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!codeReady || internalSaved || saving}
                  aria-disabled={!codeReady || internalSaved || saving}
                  className={`relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-black text-white
                    border border-transparent group-hover:border-transparent transition-all duration-300
                    ${codeReady && !internalSaved && !saving ? 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}
                    ${saving ? 'cursor-wait opacity-80' : ''}`}
                  title={codeReady ? (internalSaved ? "Already saved" : "Save script") : "Wait for script to complete"}
                >
                  {internalSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      <span>Saved</span>
                    </>
                  ) : saving ? (
                    <>
                      <Save className="w-4 h-4 mr-1.5 animate-pulse" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
              {/* Cancel Button */}
              {typeof onCancel === "function" && loading && !codeReady && (
                <div className="relative group flex-1 sm:flex-none">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-transparent text-gray-300 border border-gray-600 hover:bg-gray-800 hover:text-white transition-all duration-200"
                    title="Cancel script generation"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Progress Bar */}
<div
  className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full overflow-hidden"
  role="progressbar"
  aria-valuenow={Math.round(pct)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Script generation progress"
  aria-valuetext={`${Math.round(pct)}% ${stageLabel}`}
>
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>
      </div>
      {/* Responsive and animated gradient border CSS, scoped to .sbc */}
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
          .sbc .max-w-3xl {
            max-width: 100vw !important;
          }
          .sbc .rounded-lg {
            border-radius: 1rem !important;
          }
          .sbc .px-3, .sbc .sm\\:px-4 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          .sbc .py-3 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          .sbc .flex-row {
            flex-direction: column !important;
          }
          .sbc .items-center {
            align-items: flex-start !important;
          }
          .sbc .gap-2 {
            gap: 0.5rem !important;
          }
          .sbc .mr-3 {
            margin-right: 0.75rem !important;
          }
          .sbc .w-full {
            width: 100% !important;
          }
          .sbc .justify-end {
            justify-content: flex-end !important;
          }
        }
      `}</style>
    </div>
  );
}