import { readFile, writeFile } from "node:fs/promises";
import type { CompanionPreferences, PreferenceKey } from "./contracts.js";

export interface LoginItemController {
  getLoginItemSettings(): { openAtLogin: boolean };
  setLoginItemSettings(options: { openAtLogin: boolean; openAsHidden: boolean }): void;
}

export const DEFAULT_PREFERENCES: CompanionPreferences = {
  autoStart: true,
  minimizeToTray: true,
  startMinimized: false,
  theme: "dark",
  autoReconnect: true,
  reconnectDelayMs: 2_000,
  automaticUpdates: true,
};

export function getAutoStart(controller: LoginItemController): boolean { return controller.getLoginItemSettings().openAtLogin === true; }
export function setAutoStart(controller: LoginItemController, enabled: boolean): boolean {
  controller.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  return getAutoStart(controller);
}

export function validatePreferenceUpdate(key: unknown, value: unknown): { key: PreferenceKey; value: CompanionPreferences[PreferenceKey] } {
  if (key === "autoStart" || key === "minimizeToTray" || key === "startMinimized" || key === "autoReconnect" || key === "automaticUpdates") {
    if (typeof value !== "boolean") throw new TypeError("Preference must be a boolean.");
    return { key, value };
  }
  if (key === "theme") {
    if (value !== "dark" && value !== "light" && value !== "system") throw new TypeError("Invalid theme preference.");
    return { key, value };
  }
  if (key === "reconnectDelayMs") {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError("Reconnect delay must be a number.");
    return { key, value: Math.max(1_000, Math.min(30_000, Math.round(value))) };
  }
  throw new TypeError("Unknown preference.");
}

export class PreferenceStore {
  constructor(private readonly path: string) {}
  async load(): Promise<CompanionPreferences> {
    try {
      const raw = JSON.parse(await readFile(this.path, "utf8")) as Record<string, unknown>;
      let result = { ...DEFAULT_PREFERENCES };
      for (const key of Object.keys(DEFAULT_PREFERENCES) as PreferenceKey[]) {
        if (raw[key] === undefined) continue;
        try { const update = validatePreferenceUpdate(key, raw[key]); result = { ...result, [update.key]: update.value }; } catch { /* keep safe default */ }
      }
      return result;
    } catch { return { ...DEFAULT_PREFERENCES }; }
  }
  async save(preferences: CompanionPreferences): Promise<void> { await writeFile(this.path, JSON.stringify(preferences, null, 2), { mode: 0o600 }); }
}
