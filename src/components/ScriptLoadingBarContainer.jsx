import React, { useEffect, useRef, useState } from "react";
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

  // Reset progress and saved state when loading starts
  useEffect(() => {
    if (loading && !codeReady) {
      setProgress(0);
      setProgressLabel("0%");
      setInternalSaved(false);
    }
  }, [loading, codeReady]);

  // Progress animation logic with delays at 30%, 60%, 90%
  useEffect(() => {
    let cancelled = false;
    let timeouts = [];

    const animateProgress = async () => {
      // Helper to animate to a target percent with optional delay
      const goTo = (target, duration = 600, delay = 0) =>
        new Promise((resolve) => {
          if (cancelled) return resolve();
          setTimeout(() => {
            if (cancelled) return resolve();
            const start = progress;
            const diff = target - start;
            const steps = Math.max(1, Math.floor(duration / 30));
            let step = 0;
            const stepFn = () => {
              if (cancelled) return resolve();
              step++;
              const next =
                step >= steps
                  ? target
                  : start + (diff * step) / steps;
              setProgress(next);
              setProgressLabel(`${Math.round(next)}%`);
              if (step < steps) {
                timeouts.push(setTimeout(stepFn, 30));
              } else {
                resolve();
              }
            };
            stepFn();
          }, delay);
        });

      // Animate to 30%
      await goTo(30, 700);
      // Pause at 30%
      await goTo(30, 0, 400);

      // Animate to 60%
      await goTo(60, 900);
      // Pause at 60%
      await goTo(60, 0, 500);

      // Animate to 90%
      await goTo(90, 1200);
      // Pause at 90%
      await goTo(90, 0, 600);

      // Wait for codeReady, or slowly approach 98%
      let waitTime = 0;
      while (!codeReady && !cancelled && waitTime < 10000) {
        await goTo(Math.min(98, progress + 1), 200);
        waitTime += 200;
      }
    };

    if (loading && !codeReady) {
      animateProgress();
    }

    // When codeReady, animate to 100% immediately
    if (codeReady) {
      setProgress(100);
      setProgressLabel("100%");
    }

    return () => {
      cancelled = true;
      timeouts.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line
  }, [loading, codeReady]);

  // When parent updates saved prop, sync internal state
  useEffect(() => {
    setInternalSaved(saved);
  }, [saved]);

  // Save handler
  const handleSave = () => {
    if (!internalSaved && typeof onSave === "function") {
      onSave();
      setInternalSaved(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-4 w-full px-2 sm:px-4">
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
                  <span className="font-medium text-white truncate max-w-[120px] sm:max-w-none">
                    {filename || "Script.lua"}
                  </span>
                  {version && (
                    <span className="ml-2 text-xs text-gray-300 border-l border-gray-600 pl-2">
                      {version}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 flex items-center flex-wrap">
                  <span>
                    {codeReady
                      ? `${language.toUpperCase()} script generated`
                      : `Generating ${language.toUpperCase()} script...`}
                  </span>
                  <span
                    className="ml-2 font-semibold"
                    aria-live="polite"
                  >
                    {progressLabel}
                  </span>
                  {estimatedLines && (
                    <span className="ml-2 text-gray-400">
                      • ~{estimatedLines} lines
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
                  onClick={codeReady && typeof onView === "function" ? onView : undefined}
                  disabled={!codeReady}
                  className={`relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-black text-white
                    border border-transparent group-hover:border-transparent transition-all duration-300
                    ${codeReady ? 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}`}
                  title={codeReady ? "View script" : "Wait for script to complete"}
                  aria-disabled={!codeReady}
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
                  onClick={handleSave}
                  disabled={!codeReady || internalSaved}
                  className={`relative flex items-center justify-center w-full sm:w-auto px-4 py-1.5 rounded-md text-sm bg-black text-white
                    border border-transparent group-hover:border-transparent transition-all duration-300
                    ${codeReady && !internalSaved ? 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}`}
                  title={codeReady ? (internalSaved ? "Already saved" : "Save script") : "Wait for script to complete"}
                  aria-disabled={!codeReady || internalSaved}
                >
                  {internalSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      <span>Saved</span>
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
          <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            ></div>
          </div>
        </div>
      </div>
      {/* Responsive and animated gradient border CSS */}
      <style>{`
        @keyframes borderAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .group:hover .bg-gradient-to-r {
          animation: borderAnimation 3s ease infinite;
          background-size: 200% 200%;
        }
        @media (max-width: 640px) {
          .max-w-3xl {
            max-width: 100vw !important;
          }
          .rounded-lg {
            border-radius: 1rem !important;
          }
          .px-3, .sm\\:px-4 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          .py-3 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          .flex-row {
            flex-direction: column !important;
          }
          .items-center {
            align-items: flex-start !important;
          }
          .gap-2 {
            gap: 0.5rem !important;
          }
          .mr-3 {
            margin-right: 0.75rem !important;
          }
          .w-full {
            width: 100% !important;
          }
          .justify-end {
            justify-content: flex-end !important;
          }
        }
      `}</style>
    </div>
  );
}
