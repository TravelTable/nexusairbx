import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { BACKEND_URL } from "../config";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  mergeSettingsPatch,
  normalizeSettings,
  sanitizeSettingsPatch,
} from "../lib/settingsSchema";

const SettingsContext = createContext(null);

function loadLocalSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return normalizeSettings();
    const normalized = normalizeSettings(JSON.parse(saved));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return normalizeSettings();
  }
}

function persistLocalSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}

function parseSettingsError(error) {
  if (!error) return "Settings could not be saved.";
  if (typeof error === "string") return error;
  return error.message || "Settings could not be saved.";
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadLocalSettings);
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(Boolean(auth.currentUser));
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const settingsRef = useRef(settings);
  const userRef = useRef(auth.currentUser);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const reloadSettings = useCallback(async (providedUser) => {
    const activeUser = providedUser || userRef.current;
    if (!activeUser) {
      setLoading(false);
      return { ok: true, settings: settingsRef.current };
    }

    setLoading(true);
    setSaveError("");
    try {
      const token = await activeUser.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Settings could not be loaded.");
      }

      const normalized = normalizeSettings(data);
      setSettings(normalized);
      persistLocalSettings(normalized);
      setSaveStatus("saved");
      setLastSavedAt(data?.updatedAt || null);
      return { ok: true, settings: normalized };
    } catch (error) {
      const message = parseSettingsError(error);
      setSaveStatus("error");
      setSaveError(message);
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      userRef.current = nextUser;
      setUser(nextUser);
      if (nextUser) {
        reloadSettings(nextUser);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [reloadSettings]);

  const updateSettings = useCallback(async (newSettings) => {
    const { patch, invalidKeys } = sanitizeSettingsPatch(newSettings);
    if (invalidKeys.length > 0) {
      const message = `Unsupported setting: ${invalidKeys.join(", ")}`;
      setSaveStatus("error");
      setSaveError(message);
      return { ok: false, error: message };
    }

    if (Object.keys(patch).length === 0) {
      return { ok: true, settings: settingsRef.current };
    }

    const activeUser = userRef.current;
    const previous = settingsRef.current;
    const optimistic = mergeSettingsPatch(previous, patch);
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;

    setSettings(optimistic);
    persistLocalSettings(optimistic);
    setSaveStatus("saving");
    setSaveError("");

    if (!activeUser) {
      setSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
      return { ok: true, settings: optimistic };
    }

    try {
      const token = await activeUser.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/user/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Settings could not be saved.");
      }

      const serverSettings = normalizeSettings(data?.settings || optimistic);
      if (saveRequestRef.current === requestId) {
        setSettings(serverSettings);
        persistLocalSettings(serverSettings);
        setSaveStatus("saved");
        setSaveError("");
        setLastSavedAt(data?.updatedAt || new Date().toISOString());
      }
      return { ok: true, settings: serverSettings, updatedAt: data?.updatedAt };
    } catch (error) {
      const message = parseSettingsError(error);
      if (saveRequestRef.current === requestId) {
        setSettings(previous);
        persistLocalSettings(previous);
        setSaveStatus("error");
        setSaveError(message);
      }
      return { ok: false, error: message };
    }
  }, []);

  const resetSaveStatus = useCallback(() => {
    setSaveStatus("idle");
    setSaveError("");
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        defaultSettings: DEFAULT_SETTINGS,
        updateSettings,
        reloadSettings,
        resetSaveStatus,
        user,
        loading,
        saveStatus,
        saveError,
        lastSavedAt,
      }}
    >
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
