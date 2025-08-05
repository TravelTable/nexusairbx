import React, { useEffect, useState } from "react";
import { Settings, Sparkles, Star, Loader, Trash2 } from "lucide-react";

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

  // Find the latest assistant message with code
  useEffect(() => {
    const latestScriptMsg = [...(messages || [])]
      .reverse()
      .find((msg) => msg.role === "assistant" && msg.code && typeof msg.code === "string" && msg.code.trim().length > 0);

    if (latestScriptMsg && latestScriptMsg.code) {
      setLoadingSuggestions(true);
      setSuggestionError(null);
      fetch("https://nexusrbx-backend-production.up.railway.app/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: latestScriptMsg.code })
      })
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.suggestions || []);
          setLoadingSuggestions(false);
        })
        .catch((err) => {
          setSuggestionError("Failed to load suggestions.");
          setLoadingSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setSuggestionError(null);
      setLoadingSuggestions(false);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full p-6 space-y-8">
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
            value={settings.modelVersion}
            onChange={e => setSettings(s => ({ ...s, modelVersion: e.target.value }))}
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
            value={settings.creativity}
            onChange={e => setSettings(s => ({ ...s, creativity: parseFloat(e.target.value) }))}
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
            value={settings.codeStyle}
            onChange={e => setSettings(s => ({ ...s, codeStyle: e.target.value }))}
          >
            {codeStyleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-[#9b5de5]" />
          Script Suggestions
        </h2>
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
                  className="w-full text-left text-sm bg-gray-800/60 hover:bg-[#9b5de5]/20 rounded px-3 py-2 transition-colors duration-200 text-gray-200"
                  onClick={() => setPrompt(sugg)}
                  title="Try this suggestion"
                >
                  {sugg}
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
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Star className="h-5 w-5 mr-2 text-[#fbbf24]" />
          Prompt Templates
          <button
            className="ml-auto px-2 py-1 rounded bg-[#9b5de5]/20 hover:bg-[#9b5de5]/40 text-[#9b5de5] text-xs font-bold"
            onClick={() => setShowPromptTemplateModal(true)}
          >
            Add
          </button>
        </h2>
        {userPromptTemplates.length > 0 ? (
          <ul className="space-y-2">
            {userPromptTemplates.map((tpl, i) => (
              <li key={i} className="flex items-center">
                <button
                  className="flex-1 text-left text-sm bg-gray-800/60 hover:bg-[#9b5de5]/20 rounded px-3 py-2 transition-colors duration-200 text-gray-200"
                  onClick={() => setPrompt(tpl)}
                >
                  {tpl}
                </button>
                <button
                  className="ml-2 p-1 rounded hover:bg-gray-800"
                  title="Delete template"
                  onClick={() => setUserPromptTemplates(prev => prev.filter((_, idx) => idx !== i))}
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
      <div>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-[#9b5de5]" />
          Trending Prompts
        </h2>
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
                  className="w-full text-left text-sm bg-gray-800/60 hover:bg-[#9b5de5]/20 rounded px-3 py-2 transition-colors duration-200 text-gray-200"
                  onClick={() => setPrompt(sugg)}
                >
                  {sugg}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 text-sm">No trending prompts.</div>
        )}
      </div>
    </div>
  );
}