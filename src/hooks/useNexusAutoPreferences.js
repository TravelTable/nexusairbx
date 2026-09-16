import { useCallback, useEffect, useState } from "react";
import {
  NEXUS_AUTO_PREFERENCES_EVENT, NEXUS_AUTO_STORAGE_KEY,
  readNexusAutoPreferences, writeNexusAutoPreferences,
} from "../lib/nexusAutoPreferences";

/** Device preferences shared by every composer and the settings model picker. */
export function useNexusAutoPreferences() {
  const [autoPreferences, setPreferences] = useState(readNexusAutoPreferences);
  useEffect(() => {
    const changed = (event) => setPreferences(event.detail || readNexusAutoPreferences());
    const stored = (event) => { if (event.key === NEXUS_AUTO_STORAGE_KEY) changed(event); };
    window.addEventListener(NEXUS_AUTO_PREFERENCES_EVENT, changed);
    window.addEventListener("storage", stored);
    return () => {
      window.removeEventListener(NEXUS_AUTO_PREFERENCES_EVENT, changed);
      window.removeEventListener("storage", stored);
    };
  }, []);
  const setAutoPreferences = useCallback((value) => {
    const next = typeof value === "function" ? value(readNexusAutoPreferences()) : value;
    return writeNexusAutoPreferences(next);
  }, []);
  return { autoPreferences, setAutoPreferences };
}
