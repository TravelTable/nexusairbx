import React, { useEffect, useState } from "react";
import { FileCode, Save, Check } from "lucide-react";

/**
 * ScriptLoadingBarContainer
 * Props:
 * - filename: string (required)
 * - version: string (optional, e.g. "v1", "v2", etc.)
 * - language: string (default: "lua")
 * - loading: boolean (true while code is being fetched)
 * - onSave: function (called when Save is clicked)
 * - codeReady: boolean (true when code is ready)
 * - estimatedLines: number (optional)
 * - saved: boolean (true if script is saved)
 * - onView: function (called when View is clicked, should open the drawer for this script)
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
  onView, // handler for View button
}) {
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("0%");
  const [internalSaved, setInternalSaved] = useState(saved);
  const [saving, setSaving] = useState(false);

  // Helper for pretty display name, language-aware, consistent truncation
  const prettyName = (() => {
    const base = displayName || (filename || "Script").replace(new RegExp(`\\.${language}\\b`, "i"), "");
    return base.length > 28 ? base.slice(0, 25) + "…" : base;
  })();

  // Reset progress and saved state when loading starts
  useEffect(() => {
    if (loading && !codeReady) {
      setProgress(0);
      setProgressLabel("0%");
      setInternalSaved(false);
    }
  }, [loading, codeReady]);

  // Progress animation logic: buttery-smooth, no race conditions, no stale state
  useEffect(() => {
    let rafId = null;
    let intervalId = null;
    let cancelled = false;

    const tickTo100 = (durationMs = 400) => {
      const start = performance.now();
      const startVal = progress;
      const delta = 100 - startVal;

      const step = (t) => {
        if (cancelled) return;
        const elapsed = t - start;
        const pct = elapsed >= durationMs
          ? 100
          : startVal + (delta * (elapsed / durationMs));
        setProgress(pct);
        setProgressLabel(`${Math.round(pct)}%`);
        if (pct < 100) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

    if (loading && !codeReady) {
      // Slow linear climb to 95%
      setProgress((p) => (p > 0 && p < 95 ? p : 0));
      setProgressLabel("0%");
      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (cancelled) return prev;
          const next = Math.min(prev + 0.2, 95);
          if (next !== prev) setProgressLabel(`${Math.round(next)}%`);
          return next;
        });
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
  }, [loading, codeReady]); // deliberately not depending on `progress`

  // When parent updates saved prop, sync internal state
  useEffect(() => {
    setInternalSaved(saved);
  }, [saved]);

  // Save handler with saving guard
  const handleSave = async () => {
    if (saving || internalSaved || typeof onSave !== "function") return;
    try {
      setSaving(true);
      const result = await onSave();
      if (result !== false) setInternalSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // View handler
  const handleView = () => {
    if (typeof onView === "function" && codeReady) {
      onView();
    }
  };

  return (
    <div className="sbc max-w-3xl mx-auto my-4 w-full px-2 sm:px-4">
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
                  <span className="ml-2 font-semibold">{progressLabel}</span>
                  {estimatedLines && (
                    <span className="ml-2 text-gray-400">
                      • ~{estimatedLines} lines
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
            {/* View and Save Buttons */}
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
                    ${codeReady && !internalSaved && !saving ? 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}`}
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
            </div>
          </div>
          {/* Progress Bar */}
          <div
            className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              aria-label="Script generation progress"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            ></div>
          </div>
        </div>
      </div>
      {/* Responsive and animated gradient border CSS, scoped to .sbc */}
      <style>{`
        .sbc @keyframes borderAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sbc .group:hover .bg-gradient-to-r {
          animation: borderAnimation 3s ease infinite;
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
