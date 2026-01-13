import { useState, useCallback, useMemo } from "react";

export function useGameProfile(settings, updateSettings) {
  const [showWizard, setShowWizard] = useState(false);

  // Parse existing gameSpec if it's JSON, otherwise use defaults
  const initialProfile = useMemo(() => {
    try {
      const parsed = JSON.parse(settings.gameSpec);
      if (parsed && typeof parsed === 'object' && parsed.isStructured) {
        return parsed;
      }
    } catch (e) {
      // Not JSON or not structured
    }
    return {
      isStructured: true,
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
    if (!profile.genre && !profile.theme && !profile.customNotes) return "";
    
    return `
[GAME CONTEXT]
Genre: ${profile.genre || "Not specified"}
Platforms: ${profile.platforms.join(", ") || "Not specified"}
Theme: ${profile.theme || "Not specified"}
Primary Colors: ${profile.colors.primary}, ${profile.colors.secondary}
Systems: ${profile.systems.join(", ") || "None specified"}
Notes: ${profile.customNotes}
[/GAME CONTEXT]
`.trim();
  }, [profile]);

  return {
    profile,
    showWizard,
    setShowWizard,
    updateProfile,
    systemPrompt
  };
}
