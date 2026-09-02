-- Studio manifests and tool payloads use slash-delimited paths. Older agent
-- runs occasionally produced a dotted Starter Player path, e.g.
-- `StarterPlayer.StarterPlayerScripts.MainMenuClient`; normalize only the
-- unambiguous service aliases so dots in ordinary instance names remain valid.
local starterPlayerService = "StarterPlayer"
local starterPlayerServicePath = "Services.StarterPlayer"

local function canonicalizePath(path)
	local raw = tostring(path or "")
	raw = raw:gsub("^%s+", ""):gsub("%s+$", "")
	raw = raw:gsub("\\", "/"):gsub("/+$", "")
	raw = raw:gsub("^game[/.]", "")
	raw = raw:gsub("^Services[/.]", "")

	local dottedPrefixes = {
		[starterPlayerService .. ".StarterPlayerScripts"] = starterPlayerService .. "/StarterPlayerScripts",
		["StarterPlayerScripts"] = starterPlayerService .. "/StarterPlayerScripts",
	}
	for dottedPrefix, canonicalPrefix in pairs(dottedPrefixes) do
		if raw == dottedPrefix then
			return canonicalPrefix
		end
		local dottedStart = dottedPrefix .. "."
		if raw:sub(1, #dottedStart) == dottedStart then
			-- This input form is an old dotted hierarchy, not an instance name.
			return canonicalPrefix .. "/" .. raw:sub(#dottedStart + 1):gsub("%.", "/")
		end
	end
	return raw
end

local function splitPath(path)
	local parts = {}
	for part in canonicalizePath(path):gmatch("[^/]+") do
		if part ~= "" and part ~= "game" then
			table.insert(parts, part)
		end
	end
	return parts
end

local function getStarterPlayerScripts()
	local folder = StarterPlayer:FindFirstChild("StarterPlayerScripts")
	if not folder then
		folder = Instance.new("StarterPlayerScripts")
		folder.Parent = StarterPlayer
	end
	return folder
end

local function rootFromParts(parts)
	local first = parts[1]
	if first == "StarterPlayerScripts" then
		return getStarterPlayerScripts(), 2
	end
	if (first == starterPlayerService or first == starterPlayerServicePath) and parts[2] == "StarterPlayerScripts" then
		return getStarterPlayerScripts(), 3
	end
	if first == "Services" and parts[2] == starterPlayerService and parts[3] == "StarterPlayerScripts" then
		return getStarterPlayerScripts(), 4
	end
	local rootInst = SERVICE_ROOTS and SERVICE_ROOTS[first]
	if rootInst then
		return rootInst, 2
	end
	if first == "Services" and parts[2] and SERVICE_ROOTS then
		local splitRoot = SERVICE_ROOTS[parts[2]] or SERVICE_ROOTS["Services." .. parts[2]]
		if splitRoot then
			return splitRoot, 3
		end
	end
	return nil, 1
end

local function fullPath(inst)
	if not inst then
		return ""
	end
	local names = {}
	local cur = inst
	while cur and cur ~= game do
		table.insert(names, 1, cur.Name)
		cur = cur.Parent
	end
	return table.concat(names, "/")
end

local function resolvePath(path)
	local parts = splitPath(path)
	local rootInst, startIndex = rootFromParts(parts)
	if not rootInst then
		return nil
	end
	local current = rootInst
	for i = startIndex, #parts do
		current = current:FindFirstChild(parts[i])
		if not current then
			return nil
		end
	end
	return current
end

local function ensureParent(path, createParents)
	local parts = splitPath(path)
	local rootInst, startIndex = rootFromParts(parts)
	if not rootInst or #parts < startIndex then
		return nil, nil
	end
	local current = rootInst
	for i = startIndex, #parts - 1 do
		local child = current:FindFirstChild(parts[i])
		if not child then
			if not createParents then
				return nil, nil
			end
			child = Instance.new("Folder")
			child.Name = parts[i]
			child.Parent = current
		end
		current = child
	end
	return current, parts[#parts]
end

SAFE_UI_RESTORE_PROPERTIES = {
	Enabled = true, DisplayOrder = true, PlaceholderText = true, BorderSizePixel = true, ClipsDescendants = true,
	Rotation = true, TextWrapped = true, TextScaled = true, TextXAlignment = true,
	TextYAlignment = true, Font = true, ImageColor3 = true, ScaleType = true, CanvasSize = true,
	AutomaticCanvasSize = true, ScrollBarThickness = true, AutoButtonColor = true,
	PaddingTop = true, PaddingRight = true, PaddingBottom = true, PaddingLeft = true,
	FillDirection = true, HorizontalAlignment = true, VerticalAlignment = true, CellSize = true,
	CellPadding = true, SortOrder = true, Color = true, Transparency = true, AspectRatio = true,
	MinSize = true, MaxSize = true, MinTextSize = true, MaxTextSize = true, Scale = true,
}

local function safeSetProperty(inst, key, value)
	local ok, err = pcall(function()
		if typeof(value) == "table" then
			local valueType = tostring(value.type or value["$type"] or "")
			if valueType == "UDim2" then
				value = UDim2.new(value.xScale or 0, value.xOffset or 0, value.yScale or 0, value.yOffset or 0)
			elseif (key == "Size" or key == "Position") and typeof(value.X) == "table" and typeof(value.Y) == "table" then
				-- The planner's structured-output schema uses Roblox's X/Y shape.
				-- Accept it at the trust boundary and convert it to the canonical
				-- UDim2 representation used by manifest readback.
				value = UDim2.new(
					value.X.Scale or value.X.scale or 0,
					value.X.Offset or value.X.offset or 0,
					value.Y.Scale or value.Y.scale or 0,
					value.Y.Offset or value.Y.offset or 0
				)
			elseif valueType == "UDim" then
				value = UDim.new(value.scale or 0, value.offset or 0)
			elseif valueType == "Color3" or (
				(key == "TextColor3" or key == "BackgroundColor3" or key == "ImageColor3" or key == "Color")
				and (value.r ~= nil or value.R ~= nil)
				and (value.g ~= nil or value.G ~= nil)
				and (value.b ~= nil or value.B ~= nil)
			) then
				local r = tonumber(value.r or value.R) or 0
				local g = tonumber(value.g or value.G) or 0
				local b = tonumber(value.b or value.B) or 0
				local divisor = (r > 2 or g > 2 or b > 2) and 255 or 1
				value = Color3.new(
					math.clamp(r / divisor, 0, 1),
					math.clamp(g / divisor, 0, 1),
					math.clamp(b / divisor, 0, 1)
				)
			elseif valueType == "Vector2" then
				value = Vector2.new(value.x or 0, value.y or 0)
			elseif valueType == "Vector3" then
				value = Vector3.new(value.x or 0, value.y or 0, value.z or 0)
			elseif valueType == "CFrame" and typeof(value.components) == "table" and #value.components == 12 then
				value = CFrame.new(table.unpack(value.components))
			elseif valueType == "ColorSequence" then
				local keypoints = {}
				for _, keypoint in ipairs(value.keypoints or {}) do
					local color = keypoint.color or {}
					table.insert(keypoints, ColorSequenceKeypoint.new(
						keypoint.time or 0,
						Color3.new(color.r or 0, color.g or 0, color.b or 0)
					))
				end
				value = ColorSequence.new(keypoints)
			elseif valueType == "NumberSequence" then
				local keypoints = {}
				for _, keypoint in ipairs(value.keypoints or {}) do
					table.insert(keypoints, NumberSequenceKeypoint.new(
						keypoint.time or 0,
						keypoint.value or 0,
						keypoint.envelope or 0
					))
				end
				value = NumberSequence.new(keypoints)
			end
		end
		if type(value) == "string" then
			local enumType, enumItem = value:match("^Enum%.([%w_]+)%.([%w_]+)$")
			if enumType and enumItem and Enum[enumType] then
				value = Enum[enumType][enumItem] or value
			end
		end
		local nativeAllow = NATIVE_PROPERTY_ALLOWLIST[inst.ClassName]
		if key == "Position" and inst:IsA("BasePart") and typeof(value) == "Vector3" then
			inst.Position = value
		elseif nativeAllow and nativeAllow[key] == true then
			-- create_instance and snapshot restore share the same conservative
			-- native-property boundary as build_native_model. Values have already
			-- been converted above and pcall keeps invalid assignments fail-closed.
			inst[key] = value
		elseif key == "Value" and inst:IsA("ValueBase") then
			inst.Value = value
		elseif key == "ResetOnSpawn" and inst:IsA("ScreenGui") then
			inst.ResetOnSpawn = value ~= false
		elseif key == "IgnoreGuiInset" and inst:IsA("ScreenGui") then
			inst.IgnoreGuiInset = value ~= false
		elseif key == "Enabled" and inst:IsA("ScreenGui") then
			inst.Enabled = value ~= false
		elseif key == "Text" and (inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox")) then
			inst.Text = tostring(value)
		elseif key == "Visible" and inst:IsA("GuiObject") then
			inst.Visible = value ~= false
		elseif key == "Size" and inst:IsA("GuiObject") and typeof(value) == "UDim2" then
			inst.Size = value
		elseif key == "Position" and inst:IsA("GuiObject") and typeof(value) == "UDim2" then
			inst.Position = value
		elseif key == "BackgroundTransparency" and inst:IsA("GuiObject") then
			inst.BackgroundTransparency = tonumber(value) or inst.BackgroundTransparency
		elseif key == "BackgroundColor3" and inst:IsA("GuiObject") and typeof(value) == "Color3" then
			inst.BackgroundColor3 = value
		elseif key == "TextColor3" and (inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox")) and typeof(value) == "Color3" then
			inst.TextColor3 = value
		elseif key == "TextSize" and (inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox")) then
			inst.TextSize = math.max(1, math.min(100, tonumber(value) or inst.TextSize))
		elseif key == "TextTransparency" and (inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox")) then
			inst.TextTransparency = tonumber(value) or inst.TextTransparency
		elseif key == "ImageTransparency" and (inst:IsA("ImageLabel") or inst:IsA("ImageButton")) then
			inst.ImageTransparency = tonumber(value) or inst.ImageTransparency
		elseif key == "AnchorPoint" and inst:IsA("GuiObject") and typeof(value) == "Vector2" then
			inst.AnchorPoint = value
		elseif key == "ZIndex" and inst:IsA("GuiObject") then
			inst.ZIndex = tonumber(value) or inst.ZIndex
		elseif key == "LayoutOrder" and inst:IsA("GuiObject") then
			inst.LayoutOrder = tonumber(value) or inst.LayoutOrder
		elseif key == "Padding" and inst:IsA("UIListLayout") and typeof(value) == "UDim" then
			inst.Padding = value
		elseif key == "Padding" and inst:IsA("UIPadding") and typeof(value) == "UDim" then
			inst.PaddingTop = value
			inst.PaddingBottom = value
			inst.PaddingLeft = value
			inst.PaddingRight = value
		elseif key == "CornerRadius" and inst:IsA("UICorner") and typeof(value) == "UDim" then
			inst.CornerRadius = value
		elseif key == "Thickness" and inst:IsA("UIStroke") then
			inst.Thickness = tonumber(value) or inst.Thickness
		elseif SAFE_UI_RESTORE_PROPERTIES[key] then
			inst[key] = value
		elseif key == "Loop" and inst:IsA("KeyframeSequence") then
			inst.Loop = value == true
		elseif key == "Priority" and inst:IsA("KeyframeSequence") then
			local enumName = tostring(value):match("%.([%w_]+)$") or tostring(value)
			inst.Priority = Enum.AnimationPriority[enumName] or Enum.AnimationPriority.Action
		elseif key == "Time" and inst:IsA("Keyframe") then
			inst.Time = tonumber(value) or 0
		elseif key == "Weight" and inst:IsA("Pose") then
			inst.Weight = tonumber(value) or 1
		elseif key == "CFrame" and inst:IsA("Pose") and typeof(value) == "CFrame" then
			inst.CFrame = value
		elseif key == "EasingStyle" and inst:IsA("Pose") then
			local enumName = tostring(value):match("%.([%w_]+)$") or tostring(value)
			inst.EasingStyle = Enum.PoseEasingStyle[enumName] or Enum.PoseEasingStyle.Cubic
		elseif key == "EasingDirection" and inst:IsA("Pose") then
			local enumName = tostring(value):match("%.([%w_]+)$") or tostring(value)
			inst.EasingDirection = Enum.PoseEasingDirection[enumName] or Enum.PoseEasingDirection.InOut
		elseif key == "Name" then
			inst.Name = tostring(value)
		else
			error("Unsupported or unsafe property: " .. tostring(key))
		end
	end)
	return ok, ok and nil or tostring(err)
end

-- Asset-bearing properties stay out of safeSetProperty so general agent
-- property writes cannot smuggle an arbitrary Roblox asset reference. Only the
-- server-owned apply_asset_reference command reaches this exact class/property
-- allowlist.
local ASSET_REFERENCE_TARGETS = {
	ImageLabel = { Image = true },
	ImageButton = { Image = true },
	Decal = { Texture = true },
	Texture = { Texture = true },
	MeshPart = { MeshId = true, TextureID = true },
	SpecialMesh = { MeshId = true, TextureId = true },
	Sound = { SoundId = true },
	Animation = { AnimationId = true },
}

local function assetReferencePropertyAllowed(inst, key, expectedClassName)
	if not inst or inst.ClassName ~= tostring(expectedClassName or "") then
		return false
	end
	local properties = ASSET_REFERENCE_TARGETS[inst.ClassName]
	return properties ~= nil and properties[tostring(key or "")] == true
end

local function safeSetAssetReference(inst, key, value, expectedClassName)
	local property = tostring(key or "")
	local reference = tostring(value or "")
	if not assetReferencePropertyAllowed(inst, property, expectedClassName) then
		return false, "Unsupported asset reference target: " .. tostring(expectedClassName) .. "." .. property
	end
	if reference:match("^rbxassetid://[1-9]%d*$") == nil then
		return false, "Invalid Roblox asset reference"
	end
	local ok, err = pcall(function()
		inst[property] = reference
	end)
	return ok, ok and nil or tostring(err)
end

-- Snapshot restore may write the empty pre-existing value as well as a
-- canonical Roblox asset reference. It reports whether the property belongs to
-- this narrow asset-reference boundary so callers can fall back safely.
local function safeRestoreAssetReference(inst, key, value)
	local property = tostring(key or "")
	if not assetReferencePropertyAllowed(inst, property, inst and inst.ClassName or "") then
		return false, nil, nil
	end
	local reference = tostring(value or "")
	if reference ~= "" and reference:match("^rbxassetid://[1-9]%d*$") == nil then
		return true, false, "Invalid snapshot asset reference"
	end
	local ok, err = pcall(function()
		inst[property] = reference
	end)
	return true, ok, ok and nil or tostring(err)
end

function readScriptSource(inst)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return false, "", {
			code = "not_script",
			className = inst and tostring(inst.ClassName) or "",
		}
	end
	local editorError = nil
	if ScriptEditorService and ScriptEditorService.GetEditorSource then
		local ok, source = pcall(function()
			return ScriptEditorService:GetEditorSource(inst)
		end)
		if ok and type(source) == "string" then
			return true, source, { method = "ScriptEditorService.GetEditorSource" }
		end
		editorError = ok and ("unexpected source type: " .. type(source))
			or string.sub(tostring(source or "unknown error"), 1, 240)
	else
		editorError = "ScriptEditorService.GetEditorSource unavailable"
	end
	local ok, source = pcall(function()
		return inst.Source
	end)
	if ok and type(source) == "string" then
		return true, source, {
			method = "Instance.Source",
			editorError = editorError,
		}
	end
	return false, "", {
		code = "source_unreadable",
		method = "ScriptEditorService.GetEditorSource+Instance.Source",
		editorError = editorError,
		propertyError = ok and ("unexpected source type: " .. type(source))
			or string.sub(tostring(source or "unknown error"), 1, 240),
	}
end

local function writeScriptSource(inst, source)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return false, "Not a script instance"
	end
	local nextSource = tostring(source or "")
	if ScriptEditorService and ScriptEditorService.UpdateSourceAsync then
		local ok, err = pcall(function()
			ScriptEditorService:UpdateSourceAsync(inst, function()
				return nextSource
			end)
		end)
		if ok then
			return true
		end
	end
	local ok, err = pcall(function()
		inst.Source = nextSource
	end)
	return ok, ok and nil or tostring(err)
end
