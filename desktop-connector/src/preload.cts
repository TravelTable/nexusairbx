import { contextBridge, ipcRenderer } from "electron";
import type { ConnectorDesktopApi } from "./contracts.js";
import type { WorkspaceApi } from "./workspace-contracts.js";

const api: ConnectorDesktopApi = {
  reportReady: () => ipcRenderer.send("connector:renderer-ready"),
  getState: () => ipcRenderer.invoke("connector:get-state"),
  getDiagnostics: () => ipcRenderer.invoke("connector:diagnostics"),
  signIn: () => ipcRenderer.invoke("connector:sign-in"),
  retry: () => ipcRenderer.invoke("connector:retry"),
  start: () => ipcRenderer.invoke("connector:start"),
  stop: () => ipcRenderer.invoke("connector:stop"),
  revokeSession: () => ipcRenderer.invoke("connector:revoke-session"),
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
const workspace: WorkspaceApi = {
  open: () => ipcRenderer.invoke("workspace:open"),
  snapshot: id => ipcRenderer.invoke("workspace:snapshot", id),
  createConversation: id => ipcRenderer.invoke("workspace:create-conversation", id),
  list: query => ipcRenderer.invoke("workspace:list", query),
  saveEntity: input => ipcRenderer.invoke("workspace:save-entity", input),
  editPlan: (id, content) => ipcRenderer.invoke("workspace:edit-plan", id, content),
  resolveConflict: (id, choice) => ipcRenderer.invoke("workspace:resolve-conflict", id, choice),
  getEntity: id => ipcRenderer.invoke("workspace:get-entity", id),
  studioAction: input => ipcRenderer.invoke("workspace:studio-action", input),
  request: input => ipcRenderer.invoke("workspace:request", input),
  openExternal: url => ipcRenderer.invoke("workspace:open-external", url),
  submit: input => ipcRenderer.invoke("workspace:submit", input),
  cancel: () => ipcRenderer.invoke("workspace:cancel"),
  resume: (id) => ipcRenderer.invoke("workspace:resume", id),
  approveTool: (id, allow) => ipcRenderer.invoke("workspace:approve-tool", id, allow),
  studio: id => ipcRenderer.invoke("workspace:studio", id),
  sync: () => ipcRenderer.invoke("workspace:sync"),
  approvePlan: id => ipcRenderer.invoke("workspace:approve-plan", id),
  exportHistory: () => ipcRenderer.invoke("workspace:export"),
  attachFile: (id) => ipcRenderer.invoke("workspace:attach-file", id),
  saveFile: (id) => ipcRenderer.invoke("workspace:save-file", id),
  downloadBytes: (name, bytes) => ipcRenderer.invoke('workspace:download-bytes', name, bytes),
  onChange: listener => { const wrapped = () => listener(); ipcRenderer.on("workspace:changed", wrapped); return () => ipcRenderer.removeListener("workspace:changed", wrapped); },
};
contextBridge.exposeInMainWorld("nexusWorkspace", workspace);
