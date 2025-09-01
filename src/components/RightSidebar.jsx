import React, { useState } from "react";
import { Lock, Plus, Info } from "lucide-react";
import { useBilling } from "../context/BillingContext";

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
  const {
    plan,
    modelsAllowed = [],
    templatesMax = 0,
    apiLevel,
    totalTemplates = 0,
    refresh: refreshBilling,
  } = useBilling();

  // For template quota
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  // For locked model selection
  const [lockedModelBanner, setLockedModelBanner] = useState(null);

  // --- Model Picker Filtering ---
  // Allowed models at top, locked below divider
  const allowedModels = modelOptions.filter((m) =>
    modelsAllowed.includes(m.value)
  );
  const lockedModels = modelOptions.filter(
    (m) => !modelsAllowed.includes(m.value)
  );

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
      proOnly: true,
    },
    // Add more toggles as needed
  ];

  // --- Handle Model Change ---
  function handleModelChange(e) {
    const value = e.target.value;
    if (!modelsAllowed.includes(value)) {
      setLockedModelBanner(value);
      return;
    }
    setSettings((prev) => ({ ...prev, modelVersion: value }));
  }

  // --- Handle Add Template ---
  function handleAddTemplate() {
    if (atTemplateCap) {
      setShowUpgradeBanner(true);
      return;
    }
    // Add a new template (for demo, just push a blank)
    setUserPromptTemplates((prev) => [
      ...prev,
      { name: `Template ${prev.length + 1}`, content: "" },
    ]);
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
                Pro tip: Try Nexus-4 for faster scripts
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {/* Allowed models */}
          {allowedModels.map((m) => (
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
          {lockedModels.length > 0 && (
            <>
              <div className="my-2 border-t border-gray-800" />
              <div className="text-xs text-gray-400 mb-1">Pro & Team</div>
              {lockedModels.map((m) => (
                <label
                  key={m.value}
                  className="flex items-center gap-2 px-3 py-2 rounded cursor-not-allowed opacity-60 relative group"
                  title="Pro unlocks Nexus-4 (fast, accurate)."
                >
                  <input
                    type="radio"
                    name="model"
                    value={m.value}
                    checked={settings.modelVersion === m.value}
                    onChange={handleModelChange}
                    disabled
                  />
                  <span className="font-medium">{m.label}</span>
                  <Lock className="w-4 h-4 text-[#9b5de5] ml-1" />
                  <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-xs text-gray-200 px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Pro unlocks Nexus-4 (fast, accurate).
                  </span>
                </label>
              ))}
            </>
          )}
        </div>
        {/* Inline banner for locked model selection */}
        {lockedModelBanner && (
          <div className="mt-3 bg-[#9b5de5]/10 border border-[#9b5de5] text-[#9b5de5] px-3 py-2 rounded flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4" />
            <span>
              Nexus-4 is a Pro feature.
            </span>
            <button
              className="ml-auto px-3 py-1 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-xs font-semibold"
              onClick={() => window.location.href = "/subscribe"}
            >
              Upgrade to Pro
            </button>
            <button
              className="ml-2 text-xs text-gray-400 underline"
              onClick={() => setLockedModelBanner(null)}
            >
              Dismiss
            </button>
          </div>
        )}
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
                key={idx}
                className="flex items-center gap-2 px-3 py-2 rounded bg-gray-800 text-gray-200 text-sm"
              >
                <span className="flex-1">{tpl.name || `Template ${idx + 1}`}</span>
                {/* Optionally: edit/delete buttons */}
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
            toggle.proOnly && plan === "free" ? (
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