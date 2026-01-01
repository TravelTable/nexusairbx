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
  // --- API base: MUST point at backend, not the frontend origin ---
  const API_BASE =
    (process.env.REACT_APP_BACKEND_URL ||
      "https://nexusrbx-backend-production.up.railway.app").replace(/\/+$/, "");

  const DEBUG =
    (typeof window !== "undefined" &&
      (window.localStorage.getItem("nexusrbx:debug") === "true" ||
        window.location.search.includes("debug=1"))) ||
    false;

  function debugLog(...args) {
    if (DEBUG) console.log("[RightSidebar]", ...args);
  }

  async function safeJson(res) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();

    // If we got HTML (common when hitting the wrong origin), surface a real error.
    const text = await res.text();
    throw new Error(
      `Expected JSON but got "${ct || "unknown"}" (${res.status}). ` +
        `First 120 chars: ${text.slice(0, 120)}`
    );
  }

  async function authedFetch(path, { method = "GET", body, headers = {} } = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    const token = await user.getIdToken();

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let extra = "";
      try {
        const ct = res.headers.get("content-type") || "";
        extra = ct.includes("application/json")
          ? JSON.stringify(await res.json())
          : (await res.text()).slice(0, 300);
      } catch {}
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${extra}`);
    }

    // For 204 / empty responses
    if (res.status === 204) return null;
    return safeJson(res);
  }

  // ---------- Templates ----------
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const data = await authedFetch("/api/user/templates");
        if (!canceled) setUserPromptTemplates(data?.templates || []);
        debugLog("templates loaded", data?.templates?.length || 0);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [setUserPromptTemplates]);

  async function addTemplate(name, content) {
    try {
      const tpl = await authedFetch("/api/user/templates", {
        method: "POST",
        body: { name, content },
      });
      setUserPromptTemplates((prev) => [...prev, tpl]);
    } catch (e) {
      console.error(e);
    }
  }

  async function updateTemplate(id, name, content) {
    try {
      await authedFetch(`/api/user/templates/${id}`, {
        method: "PUT",
        body: { name, content },
      });
      setUserPromptTemplates((prev) =>
        prev.map((tpl) => (tpl.id === id ? { ...tpl, name, content } : tpl))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteTemplate(id) {
    try {
      await authedFetch(`/api/user/templates/${id}`, { method: "DELETE" });
      setUserPromptTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  // ---------- Settings (load once + debounced save) ----------
  const didLoadSettingsRef = React.useRef(false);
  const lastSavedSettingsRef = React.useRef("");

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const data = await authedFetch("/api/user/settings");
        if (canceled) return;
        setSettings((prev) => ({ ...prev, ...(data || {}) }));
        didLoadSettingsRef.current = true;
        lastSavedSettingsRef.current = JSON.stringify({
          ...settings,
          ...(data || {}),
        });
        debugLog("settings loaded");
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSettings]);

  useEffect(() => {
    if (!settings) return;
    if (!didLoadSettingsRef.current) return;

    const next = JSON.stringify(settings);
    if (next === lastSavedSettingsRef.current) return;

    const t = setTimeout(async () => {
      try {
        await authedFetch("/api/user/settings", { method: "POST", body: settings });
        lastSavedSettingsRef.current = next;
        debugLog("settings saved");
      } catch (e) {
        console.error(e);
      }
    }, 700); // debounce to stop POST-spam

    return () => clearTimeout(t);
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
                Pro tip: Try Nexus-4 for faster scripts
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
