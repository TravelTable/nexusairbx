-- Read-only UI snapshot serializer for the `read_ui_snapshot` Studio command.
--
-- This module observes an already-authored ScreenGui subtree. It never sets a
-- property, writes an attribute, creates an instance, executes source, or
-- starts a playtest. The bridge admission path (registry.executeCommand) is the
-- only caller, and it already refuses to run while Studio is in Play/Run mode.
--
-- Bundle note: bundle-plugin.js promotes the three declarations below to script
-- globals (SCRIPT_GLOBAL_EXPORT_MODULES). They must stay as `local ... =` /
-- `local function ...` at column zero so the promotion regexes match; the
-- generated artifact is already at the bundler's top-level local ceiling, so a
-- plain module local here would fail the build.

local UI_SNAPSHOT = {
	SCHEMA_VERSION = 1,
	MAX_NODES = 1200,
	MAX_DEPTH = 32,
	MAX_NODE_ID_LENGTH = 180,

	VISUAL = {
		Frame = true, CanvasGroup = true, ScrollingFrame = true,
		TextLabel = true, TextButton = true, TextBox = true,
		ImageLabel = true, ImageButton = true,
	},

	MODIFIER = {
		UICorner = true, UIStroke = true, UIGradient = true, UIPadding = true,
		UIScale = true, UIListLayout = true, UIGridLayout = true,
		UIAspectRatioConstraint = true, UISizeConstraint = true,
		UITextSizeConstraint = true, UIFlexItem = true,
	},

	COMMON = {
		"Size", "Position", "AnchorPoint", "BackgroundColor3", "BackgroundTransparency",
		"BorderSizePixel", "BorderColor3", "ZIndex", "LayoutOrder", "Visible", "ClipsDescendants",
		"Rotation", "AutomaticSize", "SizeConstraint", "AbsolutePosition", "AbsoluteSize",
	},

	TEXT = {
		"Text", "TextColor3", "TextSize", "TextScaled", "TextWrapped", "TextTransparency",
		"TextXAlignment", "TextYAlignment", "RichText", "LineHeight", "FontFace",
		"TextStrokeColor3", "TextStrokeTransparency", "TextBounds", "TextTruncate",
	},

	IMAGE = {
		"Image", "ImageColor3", "ImageTransparency", "ScaleType", "TileSize",
		"SliceCenter", "SliceScale", "ImageRectSize", "ImageRectOffset", "ResampleMode",
	},

	PROPERTIES = {
		ScreenGui = {
			"Enabled", "DisplayOrder", "IgnoreGuiInset", "ScreenInsets", "ZIndexBehavior",
			"ClipToDeviceSafeArea", "SafeAreaCompatibility", "ResetOnSpawn",
			"AbsolutePosition", "AbsoluteSize",
		},
		CanvasGroup = { "GroupColor3", "GroupTransparency" },
		ScrollingFrame = {
			"CanvasSize", "CanvasPosition", "AutomaticCanvasSize", "ScrollingDirection",
			"ScrollBarImageColor3", "ScrollBarImageTransparency", "ScrollBarThickness",
		},
		TextBox = { "PlaceholderText", "PlaceholderColor3", "ClearTextOnFocus", "MultiLine" },
		UICorner = { "CornerRadius" },
		UIStroke = {
			"Enabled", "Color", "Transparency", "Thickness", "ApplyStrokeMode",
			"BorderStrokePosition", "LineJoinMode", "StrokeSizingMode", "BorderOffset",
		},
		UIGradient = { "Enabled", "Color", "Transparency", "Rotation", "Offset" },
		UIPadding = { "PaddingTop", "PaddingBottom", "PaddingLeft", "PaddingRight" },
		UIScale = { "Scale" },
		UIListLayout = {
			"FillDirection", "HorizontalAlignment", "VerticalAlignment", "Padding",
			"Wraps", "SortOrder", "HorizontalFlex", "VerticalFlex",
		},
		UIGridLayout = {
			"CellSize", "CellPadding", "FillDirection", "HorizontalAlignment",
			"VerticalAlignment", "SortOrder", "FillDirectionMaxCells", "StartCorner",
		},
		UIAspectRatioConstraint = { "AspectRatio", "AspectType", "DominantAxis" },
		UISizeConstraint = { "MinSize", "MaxSize" },
		UITextSizeConstraint = { "MinTextSize", "MaxTextSize" },
		UIFlexItem = { "FlexMode", "GrowRatio", "ShrinkRatio", "ItemLineAlignment" },
	},
}

-- Coercion is deliberately lossless for the values a 2D preview needs: UDim
-- keeps scale AND offset, Color3 keeps all three channels, sequences keep every
-- keypoint. `false`, `0` and `""` are returned as-is, never normalized away.
local function encodeUiSnapshotValue(value)
	local kind = typeof(value)
	if kind == "boolean" or kind == "string" then
		return value
	end
	if kind == "number" then
		if value ~= value or value == math.huge or value == -math.huge then
			error("non-finite number", 0)
		end
		return value
	end
	if kind == "EnumItem" then
		return value.Name
	end
	if kind == "Color3" then
		return { r = value.R, g = value.G, b = value.B }
	end
	if kind == "Vector2" then
		return { x = value.X, y = value.Y }
	end
	if kind == "UDim" then
		return { scale = value.Scale, offset = value.Offset }
	end
	if kind == "UDim2" then
		return { x = encodeUiSnapshotValue(value.X), y = encodeUiSnapshotValue(value.Y) }
	end
	if kind == "Rect" then
		return { min = encodeUiSnapshotValue(value.Min), max = encodeUiSnapshotValue(value.Max) }
	end
	if kind == "Font" then
		return { family = value.Family, weight = value.Weight.Name, style = value.Style.Name }
	end
	if kind == "ColorSequence" then
		local stops = {}
		for _, point in ipairs(value.Keypoints) do
			table.insert(stops, { time = point.Time, color = encodeUiSnapshotValue(point.Value) })
		end
		return stops
	end
	if kind == "NumberSequence" then
		local stops = {}
		for _, point in ipairs(value.Keypoints) do
			table.insert(stops, { time = point.Time, value = point.Value, envelope = point.Envelope })
		end
		return stops
	end
	error("unsupported value type " .. tostring(kind), 0)
end

local function captureUiSnapshot(payload)
	local options = type(payload) == "table" and payload or {}
	local mode = tostring(options.mode or "studio_edit")
	local requestedPath = options.path or options.rootPath
	requestedPath = requestedPath ~= nil and tostring(requestedPath) or nil

	local function unavailable(code, message)
		local result = structuredUnsupported("read_ui_snapshot", message)
		result.code = code
		result.error.code = code
		result.retryable = false
		result.captureMode = mode
		result.requestedPath = requestedPath
		result.schemaVersion = UI_SNAPSHOT.SCHEMA_VERSION
		result.complete = false
		return result
	end

	if mode == "studio_runtime" then
		-- Honest unavailability, not an invented tree. executeCommand refuses
		-- every command unless RunService:IsEdit(), so this plugin transport can
		-- never be attached to the play session that owns the real PlayerGui.
		return unavailable(
			"STUDIO_RUNTIME_CAPTURE_UNAVAILABLE",
			"This Studio bridge only executes commands while Studio is in edit mode, so it cannot observe the player's PlayerGui after client code has run. Request mode \"studio_edit\" to capture the authored StarterGui tree, and treat LocalScript-built UI as not yet observed."
		)
	end
	if mode ~= "studio_edit" then
		return unavailable(
			"UI_SNAPSHOT_MODE_UNSUPPORTED",
			"Unsupported UI capture mode \"" .. mode .. "\". This plugin supports \"studio_edit\" only."
		)
	end
	if requestedPath == nil or requestedPath == "" then
		return unavailable(
			"UI_SNAPSHOT_PATH_REQUIRED",
			"read_ui_snapshot requires a root instance path, for example \"StarterGui/ShopScreen\"."
		)
	end

	local root = resolvePath(requestedPath)
	if not root then
		return unavailable(
			"UI_SNAPSHOT_ROOT_NOT_FOUND",
			"No instance exists at \"" .. requestedPath .. "\" in this place."
		)
	end
	if not root:IsA("ScreenGui") then
		return unavailable(
			"UI_SNAPSHOT_ROOT_NOT_SCREENGUI",
			"\"" .. requestedPath .. "\" is a " .. root.ClassName .. ". read_ui_snapshot captures one authorized ScreenGui root."
		)
	end

	local maxNodes = math.clamp(math.floor(tonumber(options.maxNodes) or UI_SNAPSHOT.MAX_NODES), 1, UI_SNAPSHOT.MAX_NODES)
	local maxDepth = math.clamp(math.floor(tonumber(options.maxDepth) or UI_SNAPSHOT.MAX_DEPTH), 1, UI_SNAPSHOT.MAX_DEPTH)

	local count = 0
	local usedIds = {}
	local warnings = {}
	local complete = true
	local truncationReported = false

	local function warn(nodeId, code, message)
		table.insert(warnings, { nodeId = nodeId, code = code, message = message })
	end

	local function reportTruncation(parentId, reason)
		complete = false
		if truncationReported then
			return
		end
		truncationReported = true
		warn(parentId, "CAPTURE_TRUNCATED", reason)
	end

	local function uniqueId(ordinal)
		local candidate = "capture_" .. tostring(ordinal)
		local suffix = 0
		while usedIds[candidate] do
			suffix = suffix + 1
			candidate = "capture_" .. tostring(ordinal) .. "_" .. tostring(suffix)
		end
		usedIds[candidate] = true
		return candidate
	end

	-- DEVIATION from the supplied module: it asserted on duplicate node IDs,
	-- which lets one authoring mistake abort an entire capture. Fall back to a
	-- generated ID and surface the collision as a warning instead.
	local function claimId(instance, ordinal)
		local rawId = instance:GetAttribute("NexusUiNodeId")
		if typeof(rawId) == "string" and #rawId > 0 and #rawId <= UI_SNAPSHOT.MAX_NODE_ID_LENGTH then
			if not usedIds[rawId] then
				usedIds[rawId] = true
				return rawId, nil
			end
			return uniqueId(ordinal), rawId
		end
		return uniqueId(ordinal), nil
	end

	local function visit(instance, depth)
		if depth > maxDepth or count >= maxNodes then
			return nil
		end
		count = count + 1
		local id, duplicatedFrom = claimId(instance, count)
		if duplicatedFrom then
			warn(id, "DUPLICATE_NODE_ID", string.format(
				"%s (%s) reuses NexusUiNodeId \"%s\", which another captured node already claimed. It was captured as \"%s\" instead.",
				instance.Name, instance.ClassName, duplicatedFrom, id
			))
		end

		local node = {
			id = id,
			name = instance.Name,
			className = instance.ClassName,
			properties = {},
			children = {},
		}

		local function readProperties(names)
			for _, name in ipairs(names) do
				local ok, value = pcall(function()
					return encodeUiSnapshotValue(instance[name])
				end)
				if ok then
					node.properties[name] = value
				else
					warn(id, "PROPERTY_NOT_CAPTURED", string.format(
						"%s.%s was not captured: %s",
						instance.ClassName, name, string.sub(tostring(value), 1, 200)
					))
				end
			end
		end

		if UI_SNAPSHOT.VISUAL[instance.ClassName] then
			readProperties(UI_SNAPSHOT.COMMON)
		end
		if instance:IsA("TextLabel") or instance:IsA("TextButton") or instance:IsA("TextBox") then
			readProperties(UI_SNAPSHOT.TEXT)
		end
		if instance:IsA("ImageLabel") or instance:IsA("ImageButton") then
			readProperties(UI_SNAPSHOT.IMAGE)
		end
		readProperties(UI_SNAPSHOT.PROPERTIES[instance.ClassName] or {})

		for _, child in ipairs(instance:GetChildren()) do
			if child:IsA("LuaSourceContainer") then
				-- Source and its revision travel through the file artifact path.
				continue
			end
			if UI_SNAPSHOT.VISUAL[child.ClassName] or UI_SNAPSHOT.MODIFIER[child.ClassName] or child:IsA("Folder") then
				local captured = visit(child, depth + 1)
				if captured then
					table.insert(node.children, captured)
				else
					reportTruncation(id, string.format(
						"Traversal budget reached (maxNodes=%d, maxDepth=%d). This capture is incomplete and must not be treated as a synced tree.",
						maxNodes, maxDepth
					))
				end
			elseif child:IsA("GuiObject") or child:IsA("UIComponent") then
				warn(id, "CLASS_NOT_CAPTURED", string.format(
					"%s (%s) is not supported by the 2D preview and was not captured",
					child.Name, child.ClassName
				))
			end
		end

		return node
	end

	local capturedRoot = visit(root, 0)

	return {
		ok = true,
		schemaVersion = UI_SNAPSHOT.SCHEMA_VERSION,
		complete = complete,
		nodeCount = count,
		root = capturedRoot,
		capturedAt = DateTime.now():ToIsoDate(),
		warnings = warnings,
		captureMode = "studio_edit",
		rootPath = fullPath(root),
		requestedPath = requestedPath,
		maxNodes = maxNodes,
		maxDepth = maxDepth,
		pluginVersion = PLUGIN_VERSION,
		protocolVersion = STUDIO_PROTOCOL_VERSION,
	}
end
