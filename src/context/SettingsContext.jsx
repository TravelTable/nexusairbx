import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { BACKEND_URL } from "../config";
import { DEFAULT_FREE_MODEL, normalizeModelId } from "../lib/modelProviders";

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  modelVersion: DEFAULT_FREE_MODEL,
  creativity: 0.7,
  codeStyle: "optimized",
  verbosity: "concise",
  gameSpec: "",
  theme: "dark",
  enableGameWizard: true,
  chatMode: "agent",
  showThinking: true,
  studioAutoPushEnabled: false,
  studioAutoPushPolicy: "after_validation",
  lastAuthorizedStudioSessionId: null,
  robloxAssetUploadsEnabled: false,
  robloxWritePolicy: {
    assetWrites: "allowed_after_toggle",
    universeWrites: "approval_required",
    groupWrites: "approval_required",
    secretWrites: "approval_required",
    serverActions: "approval_required",
  },
};

function hydrateSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  const normalizedModel = normalizeModelId(merged.modelVersion);
  if (normalizedModel && normalizedModel !== merged.modelVersion) {
    merged.modelVersion = normalizedModel;
  }
  return merged;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("nexusrbx:settings");
    if (!saved) return DEFAULT_SETTINGS;
    try {
      const raw = JSON.parse(saved);
      const hydrated = hydrateSettings(raw);
      if (raw.modelVersion !== hydrated.modelVersion) {
        localStorage.setItem(
          "nexusrbx:settings",
          JSON.stringify({ ...raw, modelVersion: hydrated.modelVersion })
        );
      }
      return hydrated;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  // Sync with Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchBackendSettings(u);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchBackendSettings = async (u) => {
    try {
      const token = await u.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setSettings((prev) => hydrateSettings({ ...prev, ...data }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch settings from backend", e);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = useCallback(async (newSettings) => {
    const patch = { ...newSettings };
    if (patch.modelVersion != null) {
      patch.modelVersion = normalizeModelId(patch.modelVersion) || patch.modelVersion;
    }
    const updated = { ...settings, ...patch };
    setSettings(updated);
    localStorage.setItem("nexusrbx:settings", JSON.stringify(updated));

    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch(`${BACKEND_URL}/api/user/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updated),
        });
      } catch (e) {
        console.error("Failed to save settings to backend", e);
      }
    }
  }, [settings, user]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
