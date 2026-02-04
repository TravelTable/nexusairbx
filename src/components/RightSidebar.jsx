import React, { useState, useEffect } from "react";
import { Lock, Plus, Info } from "lucide-react";
import { useBilling } from "../context/BillingContext";
import { auth } from "../firebase"; // Make sure this path is correct for your project
import { onAuthStateChanged } from "firebase/auth";

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
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

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
    const currentUser = user || auth.currentUser;
    if (!currentUser) throw new Error("Not signed in");
    const token = await currentUser.getIdToken();

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
    if (!user) {
      setUserPromptTemplates?.([]);
      return () => {
        canceled = true;
      };
    }
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
  }, [setUserPromptTemplates, user]);

  async function addTemplate(name, content) {
    if (!user) {
      console.warn("Cannot add template: not signed in");
      return;
    }
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
    if (!user) {
      console.warn("Cannot update template: not signed in");
      return;
    }
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
    if (!user) {
      console.warn("Cannot delete template: not signed in");
      return;
    }
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
    if (!user) {
      didLoadSettingsRef.current = false;
      lastSavedSettingsRef.current = "";
      return () => {
        canceled = true;
      };
    }
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
  }, [setSettings, user]);

  useEffect(() => {
    if (!settings) return;
    if (!didLoadSettingsRef.current) return;
    if (!user) return;

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
  }, [settings, user]);

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
    <div className="flex flex-col h-full px-4 py-5 space-y-6">
      {/* Model Picker */}
      <div>
        <div className="font-semibold text-gray-200 mb-2 flex items-center">
          Model
          <span className="ml-2 text-xs text-gray-400">
            {!isProOrTeam && (
              <span className="bg-[#9b5de5]/10 text-[#9b5de5] px-2 py-0.5 rounded-full">
                Pro tip: Try Nexus-5 (GPT-5.2) for better scripts
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

      {/* Game Spec (persistent context) */}
      <div>
        <div className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
          Game Spec
          <Info className="h-4 w-4 text-gray-400" />
        </div>
        <textarea
          className="w-full h-28 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
          placeholder="Short persistent context: game genre, core loop, currency, screens, etc."
          value={settings.gameSpec || ""}
          onChange={(e) => setSettings((prev) => ({ ...prev, gameSpec: e.target.value }))}
        />
        <div className="text-xs text-gray-500 mt-1">
          This is sent as project context to reduce repeated prompting + token waste. Project structure (remotes, modules) is synced from Studio and shown in the Project panel on the AI page.
        </div>
      </div>

      {/* Output + UI builder controls */}
      <div>
        <div className="font-semibold text-gray-200 mb-2">AI Output</div>

        <label className="text-xs text-gray-400">Verbosity</label>
        <select
          className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
          value={settings.verbosity || "concise"}
          onChange={(e) => setSettings((prev) => ({ ...prev, verbosity: e.target.value }))}
        >
          <option value="concise">Concise</option>
          <option value="detailed">Detailed</option>
        </select>

        <label className="text-xs text-gray-400 mt-3 block">Max Output Tokens</label>
        <input
          type="number"
          min={800}
          max={16000}
          className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
          value={settings.maxOutputTokens ?? 8000}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, maxOutputTokens: Number(e.target.value) || 8000 }))
          }
        />

        <div className="mt-4 font-semibold text-gray-200 mb-2">UI Builder</div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400">Canvas W</label>
            <input
              type="number"
              className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
              value={settings.uiCanvasSize?.w ?? 1280}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  uiCanvasSize: {
                    ...(prev.uiCanvasSize || { w: 1280, h: 720 }),
                    w: Number(e.target.value) || 1280,
                  },
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Canvas H</label>
            <input
              type="number"
              className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
              value={settings.uiCanvasSize?.h ?? 720}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  uiCanvasSize: {
                    ...(prev.uiCanvasSize || { w: 1280, h: 720 }),
                    h: Number(e.target.value) || 720,
                  },
                }))
              }
            />
          </div>
        </div>

        <label className="text-xs text-gray-400 mt-3 block">Max Items</label>
        <input
          type="number"
          min={10}
          max={200}
          className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
          value={settings.uiMaxItems ?? 45}
          onChange={(e) => setSettings((prev) => ({ ...prev, uiMaxItems: Number(e.target.value) || 45 }))}
        />

        <label className="text-xs text-gray-400 mt-3 block">Systems Token Cap</label>
        <input
          type="number"
          min={400}
          max={6000}
          className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
          value={settings.uiMaxSystemsTokens ?? 2500}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, uiMaxSystemsTokens: Number(e.target.value) || 2500 }))
          }
        />

        <div className="mt-4 font-semibold text-gray-200 mb-2">UI Theme</div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-400">Primary</label>
            <input
              type="color"
              className="w-full mt-1 h-9 bg-gray-900/60 border border-gray-700 rounded"
              value={settings.uiThemePrimary || "#00f5d4"}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, uiThemePrimary: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Secondary</label>
            <input
              type="color"
              className="w-full mt-1 h-9 bg-gray-900/60 border border-gray-700 rounded"
              value={settings.uiThemeSecondary || "#9b5de5"}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, uiThemeSecondary: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Accent</label>
            <input
              type="color"
              className="w-full mt-1 h-9 bg-gray-900/60 border border-gray-700 rounded"
              value={settings.uiThemeAccent || "#f15bb5"}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, uiThemeAccent: e.target.value }))
              }
            />
          </div>
        </div>

        <label className="text-xs text-gray-400 mt-3 block">Font</label>
        <input
          type="text"
          className="w-full mt-1 bg-gray-900/60 border border-gray-700 rounded p-2 text-sm"
          value={settings.uiThemeFont || "Poppins, Roboto, sans-serif"}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, uiThemeFont: e.target.value }))
          }
        />
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
              className={`ml-2 px-3 py-1 rounded text-white text-xs font-semibold ${entitlements.includes("pro") ? "bg-white/5 text-gray-400 hover:text-white" : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4]"}`}
              onClick={() => window.location.href = "/subscribe"}
            >
              {entitlements.includes("pro") ? "Team" : "Upgrade"}
            </button>
          )}
        </div>
        {/* Inline note when at cap */}
        {(atTemplateCap || templatesMax === 0) && (
          <div className="mt-2 text-xs text-[#9b5de5] flex items-center gap-1">
            <Info className="w-4 h-4" />
            {templatesMax === 0
              ? (entitlements.includes("pro") ? "Upgrade to Team for more templates." : "Upgrade to add templates.")
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
