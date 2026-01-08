import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  modelVersion: "nexus-4",
  creativity: 0.7,
  codeStyle: "optimized",
  verbosity: "concise",
  gameSpec: "",
  theme: "dark",
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("nexusrbx:settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
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
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}/api/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch settings from backend", e);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = useCallback(async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("nexusrbx:settings", JSON.stringify(updated));

    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch(`${process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}/api/user/settings`, {
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
