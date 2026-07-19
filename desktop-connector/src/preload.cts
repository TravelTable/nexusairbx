import { contextBridge, ipcRenderer } from "electron";
import type { ConnectorDesktopApi } from "./contracts.js";

const api: ConnectorDesktopApi = {
  reportReady: () => ipcRenderer.send("connector:renderer-ready"),
  getState: () => ipcRenderer.invoke("connector:get-state"),
  getDiagnostics: () => ipcRenderer.invoke("connector:diagnostics"),
  pair: (code) => ipcRenderer.invoke("connector:pair", code),
  retry: () => ipcRenderer.invoke("connector:retry"),
  start: () => ipcRenderer.invoke("connector:start"),
  stop: () => ipcRenderer.invoke("connector:stop"),
  revokeSession: () => ipcRenderer.invoke("connector:revoke-session"),
  openPairing: () => ipcRenderer.invoke("connector:open-pairing"),
  openHelp: () => ipcRenderer.invoke("connector:open-help"),
  openDownloads: () => ipcRenderer.invoke("connector:open-downloads"),
  setPreference: (key, value) => ipcRenderer.invoke("connector:set-preference", key, value),
  getAvailableTools: () => ipcRenderer.invoke("connector:get-tools"),
  copyDiagnostics: () => ipcRenderer.invoke("connector:copy-diagnostics"),
  openLogs: () => ipcRenderer.invoke("connector:open-logs"),
  resizeWindow: (mode) => ipcRenderer.invoke("connector:resize-window", mode),
  minimizeWindow: () => ipcRenderer.invoke("connector:minimize-window"),
  closeWindow: () => ipcRenderer.invoke("connector:close-window"),
  checkForUpdates: () => ipcRenderer.invoke("connector:check-updates"),
  installUpdate: () => ipcRenderer.invoke("connector:install-update"),
  onState: (listener) => { const wrapped = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => listener(snapshot); ipcRenderer.on("connector:state", wrapped); return () => ipcRenderer.removeListener("connector:state", wrapped); },
  onNavigate: (listener) => { const wrapped = (_event: Electron.IpcRendererEvent, destination: Parameters<typeof listener>[0]) => listener(destination); ipcRenderer.on("connector:navigate", wrapped); return () => ipcRenderer.removeListener("connector:navigate", wrapped); },
};
contextBridge.exposeInMainWorld("nexusConnector", api);
