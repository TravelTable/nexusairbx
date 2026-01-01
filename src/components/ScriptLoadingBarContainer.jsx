import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FileCode, Save, Check, XCircle } from "lucide-react";

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
  const [internalSaved, setInternalSaved] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      setInternalSaved(false);
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

  // Sync saved flag from parent
  useEffect(() => setInternalSaved(saved), [saved]);
  useEffect(() => {
    if (loading && !ready) setInternalSaved(false);
  }, [loading, ready]);

  const handleSave = useCallback(async () => {
  setSaveError("");
  if (saving || internalSaved) return;
  setSaving(true);
  try {
    // Prevent duplicate save if already marked as saved
    if (internalSaved) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setSaving(false);
      return;
    }
    let result = false;
    if (typeof onSave === "function") {
      result = await onSave();
    } else {
      // fallback: fire a global event for sidebar to handle saving
      window.dispatchEvent(
        new CustomEvent("nexus:saveScript", {
          detail: {
            code: typeof window !== "undefined" && window.nexusCurrentCode ? window.nexusCurrentCode : "",
            title: displayName || filename || "Script",
            version: version,
            language: language,
          },
        })
      );
      result = true;
    }
    // Also fire a global event for sidebar to handle saving (for sidebar "Saved" tab)
    window.dispatchEvent(
      new CustomEvent("nexus:sidebarSaveScript", {
        detail: {
          code: typeof window !== "undefined" && window.nexusCurrentCode ? window.nexusCurrentCode : "",
          title: displayName || filename || "Script",
          version: version,
          language: language,
        },
      })
    );
    if (result !== false) {
      setInternalSaved(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      setSaveError("Failed to save script.");
    }
  } catch (e) {
    setSaveError("Save error: " + (e?.message || String(e)));
  } finally {
    setSaving(false);
  }
}, [saving, internalSaved, onSave, displayName, filename, version, language]);

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
      <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700 shadow-lg">
        <div className="relative">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 z-10 relative">
            <div className="flex items-start w-full sm:w-auto min-w-0">
              <div className="bg-gray-800 bg-opacity-70 p-1.5 rounded-md mr-3 border border-gray-700 flex-shrink-0 mt-0.5">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap">
                  <span className="font-medium text-white truncate max-w-[160px] sm:max-w-none" title={prettyName}>
                    {prettyName}
                  </span>
                  {version && (
                    <span className="ml-2 text-xs text-gray-300 border-l border-gray-600 pl-2" title={`Script Version: ${version}`}>
                      {typeof version === "string" ? version : `v${version}`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1" aria-live="polite">
                  <span>
                    {canceled ? "Script generation canceled" : ready ? `${language.toUpperCase()} script generated` : `Generating ${language.toUpperCase()} script...`}
                  </span>
                  <span className="font-semibold">{progressLabelDisplay}</span>
                  <span className="text-gray-400">• {stageLabel}</span>
                  {estimatedLines != null && <span className="text-gray-400">• ~{estimatedLines} lines</span>}
                  {effectiveEta != null && !ready && <span className="text-gray-400">• ~{Math.ceil(effectiveEta)}s</span>}
                  {!ready && !canceled && (
                    <span className="text-yellow-400">This may take a few minutes depending on script complexity...</span>
                  )}
                  {canceled && <span className="text-red-400">Generation was canceled. No further progress.</span>}
                  {saveError && <span className="text-xs text-red-400">{saveError}</span>}
                </div>
                {previewSnippet && ready && (
                  <div className="mt-2 text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-16 overflow-hidden">
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
                  window.dispatchEvent(
                    new CustomEvent("nexus:openCodeDrawer", {
                      detail: {
                        code:
                          typeof window !== "undefined" && window.nexusCurrentCode
                            ? window.nexusCurrentCode
                            : "",
                        title: displayName || filename || "Script",
                        version: version,
                        language: language,
                      },
                    })
                  );
                }
              }}
              disabled={!canView}
              aria-disabled={!canView}
              className="relative z-10 flex items-center justify-center px-4 py-1.5 rounded-md text-sm bg-black text-white border border-transparent transition-all duration-300"
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
                    className="relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-transparent text-gray-300 border border-gray-600 hover:bg-gray-800 hover:text-white transition-all duration-200"
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
            className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Script generation progress"
            aria-valuetext={`${Math.round(pct)}% ${stageLabel}`}
          >
            <div className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
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
