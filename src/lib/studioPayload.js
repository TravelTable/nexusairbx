import { collectScripts, safeProjectName } from "./rojoExport";

function buildUiBootstrap(projectName) {
  return `-- NexusRBX UI bootstrap
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local projectFolder = ReplicatedStorage:WaitForChild(${JSON.stringify(projectName)})
local UI = require(projectFolder:WaitForChild("UI"))

local existing = playerGui:FindFirstChild(${JSON.stringify(`${projectName}_Screen`)})
if existing then existing:Destroy() end

local ui = UI.new()
local gui
if typeof(ui.Build) == "function" then
\tgui = ui:Build(playerGui)
elseif typeof(ui.Render) == "function" then
\tgui = ui:Render(playerGui)
else
\terror("NexusRBX UI module does not expose Build or Render")
end

if gui then
\tgui.Name = ${JSON.stringify(`${projectName}_Screen`)}
end
`;
}

function serviceForKind(kind) {
  if (kind === "server") return "ServerScriptService";
  if (kind === "client") return "StarterPlayerScripts";
  return "ReplicatedStorage";
}

function collectAssetWarnings({ boardState, scripts }) {
  const warnings = [];
  const items = Array.isArray(boardState?.items) ? boardState.items : [];
  const tempImages = items
    .map((item) => item?.imageId)
    .filter((imageId) => typeof imageId === "string" && /^https?:\/\//i.test(imageId));

  if (tempImages.length) {
    warnings.push(`${tempImages.length} image asset(s) still use temporary web URLs. Upload them to Roblox and replace with rbxassetid:// IDs.`);
  }

  const sourceHasTempUrl = scripts.some((script) => /https?:\/\/[^\s"')]+/i.test(script.source || ""));
  if (sourceHasTempUrl && tempImages.length === 0) {
    warnings.push("Generated source contains web URL references. Confirm any images are uploaded to Roblox before publishing.");
  }

  return warnings;
}

export function buildStudioPayload({
  title,
  kind = "script",
  lua = "",
  uiModuleLua = "",
  systemsLua = "",
  files = [],
  boardState = null,
  artifactId = null,
} = {}) {
  const projectName = safeProjectName(title || "NexusRBX_Project");
  const input =
    kind === "ui"
      ? { title: projectName, uiModuleLua: uiModuleLua || lua, systemsLua, files }
      : { title: projectName, systemsLua: lua || systemsLua, files };

  const scripts = collectScripts(input).map((script) => ({
    name: script.name,
    kind: script.kind,
    className: script.className,
    service: serviceForKind(script.kind),
    source: script.source,
  }));

  const hasUiModule = scripts.some((script) => script.kind === "module" && script.name === "UI");
  const hasClientScript = scripts.some((script) => script.kind === "client");
  if ((kind === "ui" || hasUiModule) && hasUiModule && !hasClientScript) {
    scripts.push({
      name: "NexusUIBootstrap",
      kind: "client",
      className: "LocalScript",
      service: "StarterPlayerScripts",
      source: buildUiBootstrap(projectName),
    });
  }

  const screenGuis = kind === "ui" ? [{ name: `${projectName}_Screen`, resetOnSpawn: false, ignoreGuiInset: true }] : [];

  return {
    schemaVersion: 1,
    projectName,
    title: title || projectName,
    kind,
    artifactId,
    scripts,
    remotes: [],
    screenGuis,
    warnings: collectAssetWarnings({ boardState, scripts }),
  };
}
