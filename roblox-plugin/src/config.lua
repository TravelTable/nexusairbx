-- NexusRBX Studio Bridge
-- Local Studio plugin: website-controlled apply + agent tool runner.

local BACKEND_URL = "https://api.nexusrbx.com"
local BACKEND_HOST = "api.nexusrbx.com"
local PLUGIN_VERSION = "0.10.0-verified-decoupled"
local STUDIO_PROTOCOL_VERSION = "2026-07-17-mcp-parity"

local Services = {
	HttpService = game:GetService("HttpService"),
	AssetService = game:GetService("AssetService"),
	ChangeHistoryService = game:GetService("ChangeHistoryService"),
	CollectionService = game:GetService("CollectionService"),
	ScriptEditorService = game:GetService("ScriptEditorService"),
	ReplicatedStorage = game:GetService("ReplicatedStorage"),
	ServerScriptService = game:GetService("ServerScriptService"),
	ServerStorage = game:GetService("ServerStorage"),
	StarterGui = game:GetService("StarterGui"),
	StarterPlayer = game:GetService("StarterPlayer"),
	Workspace = game:GetService("Workspace"),
	Lighting = game:GetService("Lighting"),
	Selection = game:GetService("Selection"),
}

-- Shared path roots for apply_artifact and Studio path resolution.
-- Lives in config (not rewritten by bundle-plugin.js) so every module sees the same string keys.
SERVICE_ROOTS = {
	ReplicatedStorage = Services.ReplicatedStorage,
	ServerScriptService = Services.ServerScriptService,
	ServerStorage = Services.ServerStorage,
	StarterGui = Services.StarterGui,
	StarterPlayer = Services.StarterPlayer,
	Workspace = Services.Workspace,
	Lighting = Services.Lighting,
	["Services.ReplicatedStorage"] = Services.ReplicatedStorage,
	["Services.ServerScriptService"] = Services.ServerScriptService,
	["Services.ServerStorage"] = Services.ServerStorage,
	["Services.StarterGui"] = Services.StarterGui,
	["Services.StarterPlayer"] = Services.StarterPlayer,
	["Services.Workspace"] = Services.Workspace,
	["Services.Lighting"] = Services.Lighting,
}

NATIVE_ALLOWED_ROOTS = {
	Workspace = Services.Workspace,
	ReplicatedStorage = Services.ReplicatedStorage,
	ServerStorage = Services.ServerStorage,
	["Services.Workspace"] = Services.Workspace,
	["Services.ReplicatedStorage"] = Services.ReplicatedStorage,
	["Services.ServerStorage"] = Services.ServerStorage,
}
