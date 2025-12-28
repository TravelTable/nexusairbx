import React, { useState, useEffect } from "react";
import { Lock, Plus, Info } from "lucide-react";
import { useBilling } from "../context/BillingContext";
import { auth } from "../pages/firebase"; // Make sure this path is correct for your project

/**
 * RightSidebar
 * 
 * Props:
 * - settings, setSettings
 * - modelOptions, creativityOptions, codeStyleOptions
 * - messages, setPrompt
 * - userPromptTemplates, setUserPromptTemplates
 * - promptSuggestions, promptSuggestionLoading
 * - isMobile (optional)
 */
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
  promptSuggestions,
  promptSuggestionLoading,
  isMobile = false,
}) {

  // Load templates from backend
  useEffect(() => {
    async function fetchTemplates() {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("/api/user/templates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserPromptTemplates(data.templates || []);
      }
    }
    fetchTemplates();
  }, [setUserPromptTemplates]);

  // Add, update, delete template functions
  async function addTemplate(name, content) {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/user/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, content })
    });
    if (res.ok) {
      const tpl = await res.json();
      setUserPromptTemplates((prev) => [...prev, tpl]);
    }
  }

  async function updateTemplate(id, name, content) {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/user/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, content })
    });
    setUserPromptTemplates((prev) =>
      prev.map((tpl) => (tpl.id === id ? { ...tpl, name, content } : tpl))
    );
  }

  async function deleteTemplate(id) {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/user/templates/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    setUserPromptTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
  }

  // Load user settings from backend
  useEffect(() => {
    async function fetchSettings() {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("/api/user/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    }
    fetchSettings();
  }, [setSettings]);

  // Save settings to backend on change
  useEffect(() => {
    async function saveSettings() {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
    }
    if (settings) saveSettings();
  }, [settings]);

  const {
    plan,
    entitlements = [],
    modelsAllowed = [],
    templatesMax = 0,
    apiLevel,
    totalTemplates = 0,
    refresh: refreshBilling,
  } = useBilling();

  // Helper: check if user is pro or team by entitlements
  const isProOrTeam = entitlements.includes("pro") || entitlements.includes("team");

  // For template quota
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
// For locked model selection
const [lockedModelBanner, setLockedModelBanner] = useState(null); // No longer used, but kept for legacy

// --- Model Picker Filtering ---
// For this version, allow all models for everyone (even free users)
const allowedModels = modelOptions;
const lockedModels = [];
const displayAllowedModels = modelOptions;
const displayLockedModels = [];

  // --- Template Quota Meter ---
  // For demo: count userPromptTemplates as "used"
  const templatesUsed = userPromptTemplates?.length || 0;
  const atTemplateCap = templatesUsed >= templatesMax;

  // --- Advanced Toggles (example: only for Pro/Team) ---
  // For demo, let's say "Advanced Creativity" is Pro+
  const advancedToggles = [
    {
      key: "advancedCreativity",
      label: "Advanced Creativity",
      description: "Unlock higher creativity settings for more flexible scripts.",
      proOnly: true, // Only show as locked for non-pro/team
    },
    // Add more toggles as needed
  ];

  // isProOrTeam is now based on entitlements above

  // --- Handle Model Change ---
function handleModelChange(e) {
  const value = e.target.value;
  // All models are allowed for all users
  setSettings((prev) => ({ ...prev, modelVersion: value }));
}

  // --- Handle Add Template ---
  function handleAddTemplate() {
    if (atTemplateCap) {
      setShowUpgradeBanner(true);
      return;
    }
    // Add a new template (persist to backend)
    addTemplate(`Template ${userPromptTemplates.length + 1}`, "");
  }

  // --- UI ---
  return (
    <div className="flex flex-col h-full px-4 py-6 space-y-8">
      {/* Model Picker */}
      <div>
        <div className="font-semibold text-gray-200 mb-2 flex items-center">
          Model
          <span className="ml-2 text-xs text-gray-400">
            {plan === "free" && (
              <span className="bg-[#9b5de5]/10 text-[#9b5de5] px-2 py-0.5 rounded-full">
                Pro tip: Try GPT-4.1 for faster scripts
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Allowed models */}
          {displayAllowedModels.map((m) => (
            <label
              key={m.value}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                settings.modelVersion === m.value
                  ? "bg-[#9b5de5]/20 border border-[#9b5de5]"
                  : "hover:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="model"
                value={m.value}
                checked={settings.modelVersion === m.value}
                onChange={handleModelChange}
                className="accent-[#9b5de5]"
              />
              <span className="font-medium">{m.label}</span>
            </label>
          ))}

          {/* Locked models */}
{/* No locked models for any user */}
        </div>

        {/* Inline “locked” banner when user tries to pick a locked model */}
{/* No locked model banner needed, all models are available */}
      </div>

      {/* Creativity Picker */}
      <div>
        <div className="font-semibold text-gray-200 mb-2">Creativity</div>
        <div className="flex flex-col gap-2">
          {creativityOptions.map((c) => (
            <label
              key={c.value}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                settings.creativity === c.value
                  ? "bg-[#00f5d4]/20 border border-[#00f5d4]"
                  : "hover:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="creativity"
                value={c.value}
                checked={settings.creativity === c.value}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creativity: Number(e.target.value),
                  }))
                }
                className="accent-[#00f5d4]"
              />
              <span className="font-medium">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Code Style Picker */}
      <div>
        <div className="font-semibold text-gray-200 mb-2">Code Style</div>
        <div className="flex flex-col gap-2">
          {codeStyleOptions.map((c) => (
            <label
              key={c.value}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                settings.codeStyle === c.value
                  ? "bg-[#00f5d4]/10 border border-[#00f5d4]"
                  : "hover:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="codeStyle"
                value={c.value}
                checked={settings.codeStyle === c.value}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    codeStyle: e.target.value,
                  }))
                }
                className="accent-[#00f5d4]"
              />
              <span className="font-medium">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Template Quota Meter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-200">Templates</span>
          <span className="text-xs text-gray-400">
            {templatesMax > 0
              ? `Templates: ${templatesUsed}/${templatesMax}`
              : `Templates: 0/0 (Upgrade to add)`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {userPromptTemplates && userPromptTemplates.length > 0 ? (
            userPromptTemplates.map((tpl, idx) => (
              <div
                key={tpl.id || idx}
                className="flex items-center gap-2 px-3 py-2 rounded bg-gray-800 text-gray-200 text-sm"
              >
                <span className="flex-1">{tpl.name || `Template ${idx + 1}`}</span>
                <button
                  className="text-xs text-[#9b5de5] underline"
                  onClick={() => {
                    const newName = prompt("Rename template:", tpl.name);
                    if (newName && newName !== tpl.name) {
                      updateTemplate(tpl.id, newName, tpl.content);
                    }
                  }}
                  title="Rename"
                >
                  Rename
                </button>
                <button
                  className="text-xs text-red-400 underline"
                  onClick={() => {
                    if (window.confirm("Delete this template?")) {
                      deleteTemplate(tpl.id);
                    }
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 px-3 py-2">
              No templates yet.
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium ${
              atTemplateCap || templatesMax === 0
                ? "bg-gray-800 text-gray-400 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow"
            }`}
            onClick={handleAddTemplate}
            disabled={atTemplateCap || templatesMax === 0}
            title={
              templatesMax === 0
                ? "Upgrade to add templates"
                : atTemplateCap
                ? "Template limit reached"
                : "Add new template"
            }
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
          {(atTemplateCap || templatesMax === 0) && (
            <button
              className="ml-2 px-3 py-1 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-xs font-semibold"
              onClick={() => window.location.href = "/subscribe"}
            >
              Upgrade
            </button>
          )}
        </div>
        {/* Inline note when at cap */}
        {(atTemplateCap || templatesMax === 0) && (
          <div className="mt-2 text-xs text-[#9b5de5] flex items-center gap-1">
            <Info className="w-4 h-4" />
            {templatesMax === 0
              ? "Upgrade to add templates."
              : "Template limit reached. Upgrade for more."}
          </div>
        )}
        {/* Inline banner for upgrade */}
        {showUpgradeBanner && (
          <div className="mt-3 bg-[#9b5de5]/10 border border-[#9b5de5] text-[#9b5de5] px-3 py-2 rounded flex items-center gap-2 text-sm">
            <Info className="w-4 h-4" />
            <span>
              Upgrade your plan to add more templates.
            </span>
            <button
              className="ml-auto px-3 py-1 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-xs font-semibold"
              onClick={() => window.location.href = "/subscribe"}
            >
              Upgrade
            </button>
            <button
              className="ml-2 text-xs text-gray-400 underline"
              onClick={() => setShowUpgradeBanner(false)}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Advanced Toggles */}
      <div>
        <div className="font-semibold text-gray-200 mb-2">Advanced</div>
        <div className="flex flex-col gap-2">
          {advancedToggles.map((toggle) =>
            toggle.proOnly && !isProOrTeam ? (
              <div
                key={toggle.key}
                className="flex items-center gap-2 px-3 py-2 rounded bg-gray-800 text-gray-400 opacity-60"
              >
                <Lock className="w-4 h-4 text-[#9b5de5]" />
                <span className="font-medium">{toggle.label}</span>
                <span className="ml-auto text-xs">
                  <button
                    className="underline"
                    onClick={() => window.location.href = "/subscribe"}
                  >
                    Upgrade to unlock
                  </button>
                </span>
              </div>
            ) : (
              <label
                key={toggle.key}
                className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={!!settings[toggle.key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [toggle.key]: e.target.checked,
                    }))
                  }
                  className="accent-[#9b5de5]"
                  disabled={toggle.proOnly && !isProOrTeam}
                />
                <span className="font-medium">{toggle.label}</span>
                <span className="ml-2 text-xs text-gray-400">{toggle.description}</span>
              </label>
            )
          )}
        </div>
      </div>
    </div>
  );
}
