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
import { subscribeToAppearanceTheme } from "../lib/appearanceTheme";

const SettingsContext = createContext(null);

function storageKeyForUser(user) {
  const uid = String(user?.uid || "").trim();
  return uid ? `${SETTINGS_STORAGE_KEY}:${encodeURIComponent(uid)}` : SETTINGS_STORAGE_KEY;
}

function settingsForStorageKey(settings, storageKey) {
  const normalized = normalizeSettings(settings);
  if (storageKey !== SETTINGS_STORAGE_KEY) return normalized;

  // The unscoped key predates per-user caches and may contain project context
  // written by a previously signed-in account. Keep device preferences, but
  // never expose account-authored long-form context after sign-out.
  return {
    ...normalized,
    codingStandards: DEFAULT_SETTINGS.codingStandards,
    gameSpec: DEFAULT_SETTINGS.gameSpec,
    lastAuthorizedStudioSessionId: DEFAULT_SETTINGS.lastAuthorizedStudioSessionId,
  };
}

function loadLocalSettings(storageKey) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return normalizeSettings();
    const normalized = settingsForStorageKey(JSON.parse(saved), storageKey);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    return normalized;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return normalizeSettings();
  }
}

function persistLocalSettings(settings, storageKey) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(settingsForStorageKey(settings, storageKey)),
    );
    return true;
  } catch {
    return false;
  }
}

function scrubLegacyAnonymousSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return;
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settingsForStorageKey(JSON.parse(saved), SETTINGS_STORAGE_KEY)),
    );
  } catch {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }
}

function parseSettingsError(error) {
  if (!error) return "Settings could not be saved.";
  if (typeof error === "string") return error;
  return error.message || "Settings could not be saved.";
}

export function SettingsProvider({ children }) {
  const initialStorageKey = storageKeyForUser(auth.currentUser);
  const [settings, setSettings] = useState(() => {
    if (auth.currentUser) scrubLegacyAnonymousSettings();
    return loadLocalSettings(initialStorageKey);
  });
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(Boolean(auth.currentUser));
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const settingsRef = useRef(settings);
  const committedSettingsRef = useRef(settings);
  const userRef = useRef(auth.currentUser);
  const storageKeyRef = useRef(initialStorageKey);
  const operationEpochRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingSaveCountsRef = useRef(new Map());

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => subscribeToAppearanceTheme(settings.theme), [settings.theme]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== storageKeyRef.current || !event.newValue) return;
      if ((pendingSaveCountsRef.current.get(event.key) || 0) > 0) return;
      try {
        const normalized = settingsForStorageKey(JSON.parse(event.newValue), event.key);
        operationEpochRef.current += 1;
        settingsRef.current = normalized;
        committedSettingsRef.current = normalized;
        setSettings(normalized);
        setLoading(false);
        setSaveStatus("saved");
        setSaveError("");
      } catch {
        // Ignore malformed writes from another tab and keep the current state.
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const reloadSettings = useCallback(async (providedUser) => {
    const activeUser = providedUser || userRef.current;
    const activeStorageKey = storageKeyForUser(activeUser);
    if (activeUser && storageKeyRef.current !== activeStorageKey) {
      return { ok: false, stale: true };
    }
    const operationId = operationEpochRef.current + 1;
    operationEpochRef.current = operationId;
    const isCurrentOperation = () => (
      operationEpochRef.current === operationId
      && storageKeyRef.current === activeStorageKey
    );

    if (!activeUser) {
      setLoading(false);
      return { ok: true, settings: settingsRef.current };
    }

    setLoading(true);
    setSaveError("");
    try {
      const pendingSaves = saveQueueRef.current;
      await pendingSaves;
      if (!isCurrentOperation()) return { ok: false, stale: true };

      const token = await activeUser.getIdToken();
      if (!isCurrentOperation()) return { ok: false, stale: true };
      const res = await fetch(`${BACKEND_URL}/api/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Settings could not be loaded.");
      }

      if (!isCurrentOperation()) return { ok: false, stale: true };

      const normalized = normalizeSettings(data);
      settingsRef.current = normalized;
      committedSettingsRef.current = normalized;
      setSettings(normalized);
      persistLocalSettings(normalized, activeStorageKey);
      setSaveStatus("saved");
      setSaveError("");
      setLastSavedAt(data?.updatedAt || null);
      return { ok: true, settings: normalized };
    } catch (error) {
      if (!isCurrentOperation()) return { ok: false, stale: true };
      const message = parseSettingsError(error);
      setSaveStatus("error");
      setSaveError(message);
      return { ok: false, error: message };
    } finally {
      if (isCurrentOperation()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      const nextStorageKey = storageKeyForUser(nextUser);
      const identityChanged = storageKeyRef.current !== nextStorageKey;
      if (nextUser) scrubLegacyAnonymousSettings();
      userRef.current = nextUser;
      setUser(nextUser);

      if (identityChanged) {
        operationEpochRef.current += 1;
        saveQueueRef.current = Promise.resolve();
        storageKeyRef.current = nextStorageKey;
        const localSettings = loadLocalSettings(nextStorageKey);
        settingsRef.current = localSettings;
        committedSettingsRef.current = localSettings;
        setSettings(localSettings);
        setSaveStatus("idle");
        setSaveError("");
        setLastSavedAt(null);
      }

      if (nextUser) {
        void reloadSettings(nextUser);
      } else {
        if (!identityChanged) operationEpochRef.current += 1;
        setLoading(false);
        setSaveStatus("idle");
        setSaveError("");
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
    const activeStorageKey = storageKeyRef.current;
    const previous = settingsRef.current;
    const optimistic = settingsForStorageKey(
      mergeSettingsPatch(previous, patch),
      activeStorageKey,
    );
    const operationId = operationEpochRef.current + 1;
    operationEpochRef.current = operationId;

    settingsRef.current = optimistic;
    setSettings(optimistic);
    const persistedLocally = activeUser
      ? true
      : persistLocalSettings(optimistic, activeStorageKey);
    setLoading(false);
    setSaveStatus("saving");
    setSaveError("");

    if (!activeUser) {
      if (!persistedLocally) {
        const message = "Settings could not be saved on this device.";
        settingsRef.current = previous;
        setSettings(previous);
        setSaveStatus("error");
        setSaveError(message);
        return { ok: false, error: message };
      }
      committedSettingsRef.current = optimistic;
      setSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
      return { ok: true, settings: optimistic };
    }

    pendingSaveCountsRef.current.set(
      activeStorageKey,
      (pendingSaveCountsRef.current.get(activeStorageKey) || 0) + 1,
    );

    const executeSave = async () => {
      if (storageKeyRef.current !== activeStorageKey) {
        return { ok: false, stale: true };
      }

      try {
        const token = await activeUser.getIdToken();
        if (storageKeyRef.current !== activeStorageKey) {
          return { ok: false, stale: true };
        }
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
        if (storageKeyRef.current === activeStorageKey) {
          committedSettingsRef.current = serverSettings;
          if (operationEpochRef.current === operationId) {
            settingsRef.current = serverSettings;
            setSettings(serverSettings);
            persistLocalSettings(serverSettings, activeStorageKey);
            setSaveStatus("saved");
            setSaveError("");
            setLastSavedAt(data?.updatedAt || new Date().toISOString());
          }
        }
        return { ok: true, settings: serverSettings, updatedAt: data?.updatedAt };
      } catch (error) {
        const message = parseSettingsError(error);
        if (
          storageKeyRef.current === activeStorageKey
          && operationEpochRef.current === operationId
        ) {
          const rollback = committedSettingsRef.current;
          settingsRef.current = rollback;
          setSettings(rollback);
          persistLocalSettings(rollback, activeStorageKey);
          setSaveStatus("error");
          setSaveError(message);
        }
        return { ok: false, error: message };
      }
    };

    const queuedSave = saveQueueRef.current.then(executeSave, executeSave);
    const trackedSave = queuedSave.finally(() => {
      const remaining = (pendingSaveCountsRef.current.get(activeStorageKey) || 1) - 1;
      if (remaining > 0) {
        pendingSaveCountsRef.current.set(activeStorageKey, remaining);
      } else {
        pendingSaveCountsRef.current.delete(activeStorageKey);
      }
    });
    saveQueueRef.current = trackedSave.then(() => undefined, () => undefined);
    return trackedSave;
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
