-- NexusRBX Studio Bridge
-- Local Studio plugin: website-controlled apply + agent tool runner.

local BACKEND_URL = "https://api.nexusrbx.com"
local PLUGIN_VERSION = "0.9.1-bundle-exports-fix"
local STUDIO_PROTOCOL_VERSION = "2026-06-20-phases1-9"

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
