import { useEffect, useRef } from "react";
import { FileCode, Save, Check } from "lucide-react";

/**
 * ScriptLoadingBarContainer
 * Props:
 * - filename: string (required) - now always passed as the sanitized script title from parent
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
  const progressRef = useRef(0);
  const intervalRef = useRef(null);

  // Progress state is managed via ref for smooth animation
  useEffect(() => {
    if (loading && !codeReady) {
      progressRef.current = 0;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        // Accelerate progress as it nears completion
        let increment = 0.5;
        if (progressRef.current > 70) increment = 2.5;
        else if (progressRef.current > 40) increment = 1.2;
        progressRef.current = Math.min(progressRef.current + increment, 98);
        // Update progress bar width
        const bar = document.getElementById("script-progress-bar");
        if (bar) {
          bar.style.setProperty("width", `${progressRef.current}%`);
        }
        // Update progress label
        const label = document.getElementById("script-progress-label");
        if (label) {
          label.innerText = `${Math.round(progressRef.current)}%`;
        }
      }, 80);
    }
    if (codeReady) {
      // Instantly fill to 100%
      if (intervalRef.current) clearInterval(intervalRef.current);
      progressRef.current = 100;
      setTimeout(() => {
        const bar = document.getElementById("script-progress-bar");
        if (bar) {
          bar.style.setProperty("width", `100%`);
        }
        const label = document.getElementById("script-progress-label");
        if (label) {
          label.innerText = `100%`;
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, codeReady]);

  return (
    <div className="max-w-3xl mx-auto my-4 w-full">
      <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700 shadow-lg">
        <div className="relative">
          {/* Header Content */}
          <div className="flex items-center justify-between px-4 py-3 z-10 relative">
            <div className="flex items-center">
              <div className="bg-gray-800 bg-opacity-70 p-1.5 rounded-md mr-3 border border-gray-700">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center">
                  <span className="font-medium text-white">
                    {filename || "Script.lua"}
                  </span>
                  {version && (
                    <span className="ml-2 text-xs text-gray-300 border-l border-gray-600 pl-2">
                      {version}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 flex items-center">
                  <span>
                    {codeReady
                      ? `${language.toUpperCase()} script generated`
                      : `Generating ${language.toUpperCase()} script...`}
                  </span>
                  <span
                    id="script-progress-label"
                    className="ml-2 font-semibold"
                    aria-live="polite"
                  >
                    {codeReady ? "100%" : "0%"}
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
            <div className="flex items-center gap-2">
              {/* View Button */}
              <div className={`relative group ${!codeReady ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`absolute inset-0 rounded-md bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 
                  opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 
                  ${!codeReady ? 'hidden' : ''}`}>
                </div>
                <button
                  onClick={codeReady && typeof onView === "function" ? onView : undefined}
                  disabled={!codeReady}
                  className={`relative flex items-center px-4 py-1.5 rounded-md text-sm bg-black text-white
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
              <div className={`relative group ${!codeReady ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`absolute inset-0 rounded-md bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 
                  opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 
                  ${!codeReady ? 'hidden' : ''}`}>
                </div>
                <button
                  onClick={onSave}
                  disabled={!codeReady}
                  className={`relative flex items-center px-4 py-1.5 rounded-md text-sm bg-black text-white
                    border border-transparent group-hover:border-transparent transition-all duration-300
                    ${codeReady ? 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]' : ''}`}
                  title={codeReady ? "Save script" : "Wait for script to complete"}
                  aria-disabled={!codeReady}
                >
                  {saved ? (
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
              id="script-progress-bar"
              className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: codeReady ? "100%" : "0%" }}
              aria-valuenow={codeReady ? 100 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            ></div>
          </div>
        </div>
      </div>
      {/* CSS for animated gradient border */}
      <style jsx>{`
        @keyframes borderAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .group:hover .bg-gradient-to-r {
          animation: borderAnimation 3s ease infinite;
          background-size: 200% 200%;
        }
      `}</style>
    </div>
  );
}