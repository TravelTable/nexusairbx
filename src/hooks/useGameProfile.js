import { useState, useCallback, useMemo } from "react";
import {
  formatStructuredGameProfile,
  parseStructuredGameProfile,
} from "../lib/gameProfile";

export function useGameProfile(settings, updateSettings) {
  const [showWizard, setShowWizard] = useState(false);

  // Parse existing gameSpec if it's JSON, otherwise use defaults
  const initialProfile = useMemo(() => {
    const structured = parseStructuredGameProfile(settings.gameSpec);
    if (structured) {
      return structured;
    }
    return {
      isStructured: true,
      enabled: true,
      genre: "",
      platforms: [],
      theme: "",
      colors: { primary: "#00f5d4", secondary: "#9b5de5", accent: "#f15bb5" },
      systems: [],
      customNotes: settings.gameSpec || ""
    };
  }, [settings.gameSpec]);

  const [profile, setProfile] = useState(initialProfile);

  const updateProfile = useCallback((updates) => {
    setProfile(prev => {
      const newProfile = { ...prev, ...updates };
      // Sync back to settings.gameSpec as a stringified JSON
      updateSettings({ gameSpec: JSON.stringify(newProfile) });
      return newProfile;
    });
  }, [updateSettings]);

  const systemPrompt = useMemo(() => {
    return formatStructuredGameProfile(profile);
  }, [profile]);

  return {
    profile,
    showWizard,
    setShowWizard,
    updateProfile,
    systemPrompt,
  };
}
