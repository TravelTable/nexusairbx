import React, { useEffect, useState, useMemo, useRef } from "react";
import { Settings, Sparkles, Star, Loader, Trash2 } from "lucide-react";

// Configurable backend URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

export default function RightSidebar({
  settings,
  setSettings,
  modelOptions,
  creativityOptions,
  codeStyleOptions,
  messages,
  setPrompt,
  userPromptTemplates,
  setUserPromptTemplates,
  setShowPromptTemplateModal,
  promptSuggestions,
  promptSuggestionLoading
}) {
  // --- Script Suggestions State ---
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const [justApplied, setJustApplied] = useState({}); // { type: "suggestion"|"template"|"trending", idx: number }

  // Persist settings & templates (localStorage)
  useEffect(() => {
    try {
      const s = localStorage.getItem("nexus_ai_settings");
      if (s) setSettings((prev) => ({ ...prev, ...JSON.parse(s) }));
      const t = localStorage.getItem("nexus_ai_user_templates");
      if (t) setUserPromptTemplates(JSON.parse(t));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("nexus_ai_settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem("nexus_ai_user_templates", JSON.stringify(userPromptTemplates));
    } catch {}
  }, [userPromptTemplates]);

  // Find the latest assistant message with code, memoized
  const lastCodeRef = useRef("");
  const latestScriptMsg = useMemo(() => {
    if (!Array.isArray(messages)) return null;
    return [...messages].reverse().find(
      (msg) => msg.role === "assistant" && typeof msg?.code === "string" && msg.code.trim()
    );
  }, [messages]);

  // Fetch suggestions only if code changes, abort on unmount/rapid changes
  useEffect(() => {
    const code = latestScriptMsg?.code?.trim() || "";
    if (!code) {
      setSuggestions([]);
      setSuggestionError(null);
      setLoadingSuggestions(false);
      lastCodeRef.current = "";
      return;
    }
    // short-circuit if unchanged
    if (code === lastCodeRef.current) return;

    lastCodeRef.current = code;
    setLoadingSuggestions(true);
    setSuggestionError(null);

    const ctrl = new AbortController();
    fetch(`${BACKEND_URL}/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: code }),
      signal: ctrl.signal
    })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`Suggest failed: ${res.status}`)))
      .then((data) => {
        // Dedupe, trim, filter empty
        const uniq = Array.from(new Set((data.suggestions || []).map((s) => String(s || "").trim()))).filter(Boolean);
        setSuggestions(uniq);
      })
      .catch(() => setSuggestionError("Failed to load suggestions."))
      .finally(() => setLoadingSuggestions(false));

    return () => ctrl.abort();
  }, [latestScriptMsg]);

  // Feedback for "applied" suggestion/template/trending
  const handleApply = (type, idx, value) => {
    setPrompt(value);
    setJustApplied({ type, idx });
    setTimeout(() => setJustApplied({}), 1500);
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-8">
      {/* AI Settings */}
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-[#9b5de5]" />
          AI Settings
        </h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-300 font-medium mb-1">
            Model
          </label>
          <select
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
            value={settings?.modelVersion ?? modelOptions?.[0]?.value ?? "nexus-3"}
            onChange={e => setSettings(s => ({ ...(s || {}), modelVersion: e.target.value }))}
          >
            {modelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-300 font-medium mb-1">
            Creativity
          </label>
          <select
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
            value={settings?.creativity ?? 0.7}
            onChange={e => setSettings(s => ({ ...(s || {}), creativity: parseFloat(e.target.value) }))}
          >
            {creativityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-300 font-medium mb-1">
            Code Style
          </label>
          <select
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
            value={settings?.codeStyle ?? "optimized"}
            onChange={e => setSettings(s => ({ ...(s || {}), codeStyle: e.target.value }))}
          >
            {codeStyleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Script Suggestions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-[#9b5de5]" />
          Script Suggestions
        </h2>
        <div className="space-y-2" aria-live="polite">
          {loadingSuggestions ? (
            <div className="flex items-center text-gray-400 text-sm">
              <Loader className="h-4 w-4 animate-spin mr-2" />
              Generating suggestions...
            </div>
          ) : suggestionError ? (
            <div className="text-red-400 text-sm">{suggestionError}</div>
          ) : suggestions.length > 0 ? (
            <ul className="space-y-2">
              {suggestions.map((sugg, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={`w-full text-left text-sm bg-gray-800/60 hover:bg-[#9b5de5]/20 rounded px-3 py-2 transition-colors duration-200 text-gray-200 flex items-center justify-between`}
                    onClick={() => handleApply("suggestion", i, sugg)}
                    title="Try this suggestion"
                  >
                    <span>{sugg}</span>
                    {justApplied.type === "suggestion" && justApplied.idx === i && (
                      <span className="ml-2 text-green-400 text-xs font-semibold">Applied ✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 text-sm">
              Generate a script to see suggestions for improvements and hacks!
            </div>
          )}
        </div>
      </div>
      {/* Prompt Templates */}
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Star className="h-5 w-5 mr-2 text-[#fbbf24]" />
          Prompt Templates
          <button
            type="button"
            className="ml-auto px-2 py-1 rounded bg-[#9b5de5]/20 hover:bg-[#9b5de5]/40 text-[#9b5de5] text-xs font-bold"
            onClick={() => setShowPromptTemplateModal(true)}
          >
            Add
          </button>
          <button
            type="button"
            className="ml-2 px-2 py-1 rounded bg-[#fbbf24]/20 hover:bg-[#fbbf24]/40 text-[#fbbf24] text-xs font-bold"
            title="Save current prompt as template"
            onClick={() => {
              const v = window.prompt("Save current prompt text as a template:");
              if (v && v.trim()) setUserPromptTemplates((prev) => [...prev, v.trim()]);
            }}
          >
            Quick Save
          </button>
        </h2>
        <div className="space-y-2" aria-live="polite">
          {userPromptTemplates.length > 0 ? (
            <ul className="space-y-2">
              {userPromptTemplates.map((tpl, i) => (
                <li key={i} className="flex items-center">
                  <button
                    type="button"
                    className="flex-1 text-left text-sm bg-gray-800/60 hover:bg-[#9b5de5]/20 rounded px-3 py-2 transition-colors duration-200 text-gray-200 flex items-center justify-between"
                    onClick={() => handleApply("template", i, tpl)}
                  >
                    <span>{tpl}</span>
                    {justApplied.type === "template" && justApplied.idx === i && (
                      <span className="ml-2 text-green-400 text-xs font-semibold">Applied ✓</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="ml-2 p-1 rounded hover:bg-gray-800"
                    title="Delete template"
                    onClick={() => {
                      if (window.confirm("Delete this template?")) {
                        setUserPromptTemplates(prev => prev.filter((_, idx) => idx !== i));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 text-sm">No saved templates yet.</div>
          )}
        </div>
      </div>
      {/* Trending Prompts */}
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-[#9b5de5]" />
          Trending Prompts
        </h2>
        <div className="space-y-2" aria-live="polite">
          {promptSuggestionLoading ? (
            <div className="flex items-center text-gray-400 text-sm">
              <Loader className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : promptSuggestions.length > 0 ? (
            <ul className="space-y-2">
              {promptSuggestions.map((sugg, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left text-sm bg-gray-800/60 hover:bg-[#9b5de5]/20 rounded px-3 py-2 transition-colors duration-200 text-gray-200 flex items-center justify-between"
                    onClick={() => handleApply("trending", i, sugg)}
                  >
                    <span>{sugg}</span>
                    {justApplied.type === "trending" && justApplied.idx === i && (
                      <span className="ml-2 text-green-400 text-xs font-semibold">Applied ✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 text-sm">No trending prompts.</div>
          )}
        </div>
      </div>
    </div>
  );
}
