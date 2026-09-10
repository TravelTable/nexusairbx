import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { normalizeSettings, sanitizeSettingsPatch } from '../../../../src/lib/settingsSchema';
import { getAuth, onAuthStateChanged } from '../../../../src/desktop/identity';
const Context = createContext(null);
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => normalizeSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(getAuth().currentUser);
  const [saveStatus, setSaveStatus] = useState('idle');
  const sequence = useRef(0);
  useEffect(() => {
    const remove = onAuthStateChanged(getAuth(), value => { ++sequence.current; setUser(value); setSettings(normalizeSettings()); setError(null); });
    return () => { ++sequence.current; remove(); };
  }, []);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    if (!user) { setLoading(false); return; }
    try {
      const record = await window.nexusWorkspace.getEntity('preferences');
      if (current === sequence.current) { setSettings(normalizeSettings(record?.deleted ? undefined : record?.data)); setError(null); }
    } catch (failure) { if (current === sequence.current) setError(failure.message); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [user]);
  useEffect(() => {
    void refresh();
    return window.nexusWorkspace.onChange(() => void refresh());
  }, [refresh]);
  const updateSettings = useCallback(async patch => {
    setSaveStatus('saving');
    try {
      const sanitized = sanitizeSettingsPatch(patch);
      if (sanitized.invalidKeys.length) throw new Error('One or more settings are invalid.');
      const record = await window.nexusWorkspace.saveEntity({ kind: 'settings', id: 'preferences', data: sanitized.patch });
      setSettings(normalizeSettings(record.data)); setSaveStatus('saved'); setError(null);
      return { ok: true, settings: record.data };
    } catch (failure) { setSaveStatus('error'); setError(failure.message); return { ok: false, error: failure.message }; }
  }, []);
  return <Context.Provider value={{ settings, updateSettings, loading, error, user, saveStatus, saveError: error, reloadSettings: refresh }}>{children}</Context.Provider>;
}
export function useSettings() {
  const value = useContext(Context);
  if (!value) throw new Error('SettingsProvider is required.');
  return value;
}
