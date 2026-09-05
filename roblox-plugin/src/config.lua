-- NexusRBX Studio Bridge
-- Local Studio plugin: website-controlled apply + agent tool runner.

local BACKEND_URL = "https://api.nexusrbx.com"
local BACKEND_HOST = "api.nexusrbx.com"
local PLUGIN_VERSION = "0.14.0-r15-animation"
local STUDIO_PROTOCOL_VERSION = "2026-08-27-r15-animation"

-- This identifies the exact release artifact, independently of the user-facing
-- version. Keep it in lockstep with the generated bundle and backend allowlist.
-- A plugin session must attest its build and actual command handlers at pairing
-- time; version strings alone are not evidence that a command exists.
local PLUGIN_BUILD_ID = "nexusrbx-studio-0.14.0-r15-animation.11-chat-model-files"

-- These are deliberately capability-level (rather than UI-level) claims. The
-- pairing payload also includes the exact sorted command list derived from the
-- live registry, which lets the backend reject a stale bundle before dispatch.
local PLUGIN_CAPABILITIES = {
	readProject = true,
	readScript = true,
	searchProject = true,
	writeScript = true,
	instanceMutation = true,
	snapshotRestore = true,
	diagnostics = true,
	nativeModel = true,
	assetInsert = true,
	r15Animation = true,
}

local Services = {
	HttpService = game:GetService("HttpService"),
	GuiService = game:GetService("GuiService"),
	AssetService = game:GetService("AssetService"),
	ChangeHistoryService = game:GetService("ChangeHistoryService"),
	CollectionService = game:GetService("CollectionService"),
	ScriptEditorService = game:GetService("ScriptEditorService"),
	ReplicatedStorage = game:GetService("ReplicatedStorage"),
	ReplicatedFirst = game:GetService("ReplicatedFirst"),
	ServerScriptService = game:GetService("ServerScriptService"),
	ServerStorage = game:GetService("ServerStorage"),
	StarterGui = game:GetService("StarterGui"),
	StarterPlayer = game:GetService("StarterPlayer"),
	StarterPack = game:GetService("StarterPack"),
	Workspace = game:GetService("Workspace"),
	Lighting = game:GetService("Lighting"),
	Selection = game:GetService("Selection"),
}

-- Shared path roots for apply_artifact and Studio path resolution.
-- Lives in config (not rewritten by bundle-plugin.js) so every module sees the same string keys.
SERVICE_ROOTS = {
	ReplicatedStorage = Services.ReplicatedStorage,
	ReplicatedFirst = Services.ReplicatedFirst,
	ServerScriptService = Services.ServerScriptService,
	ServerStorage = Services.ServerStorage,
	StarterGui = Services.StarterGui,
	StarterPlayer = Services.StarterPlayer,
	StarterPack = Services.StarterPack,
	Workspace = Services.Workspace,
	Lighting = Services.Lighting,
	["Services.ReplicatedStorage"] = Services.ReplicatedStorage,
	["Services.ReplicatedFirst"] = Services.ReplicatedFirst,
	["Services.ServerScriptService"] = Services.ServerScriptService,
	["Services.ServerStorage"] = Services.ServerStorage,
	["Services.StarterGui"] = Services.StarterGui,
	["Services.StarterPlayer"] = Services.StarterPlayer,
	["Services.StarterPack"] = Services.StarterPack,
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
