local function splitPath(path)
	local parts = {}
	for part in tostring(path or ""):gmatch("[^/]+") do
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
	if first == "StarterPlayer" and parts[2] == "StarterPlayerScripts" then
		return getStarterPlayerScripts(), 3
	end
	local starterPlayerSegment = "Starter" .. "Player"
	if first == "Services" and parts[2] == starterPlayerSegment and parts[3] == "StarterPlayerScripts" then
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

local function safeSetProperty(inst, key, value)
	local ok, err = pcall(function()
		if typeof(value) == "table" and value.type == "UDim2" then
			value = UDim2.new(value.xScale or 0, value.xOffset or 0, value.yScale or 0, value.yOffset or 0)
		elseif typeof(value) == "table" and value.type == "UDim" then
			value = UDim.new(value.scale or 0, value.offset or 0)
		elseif typeof(value) == "table" and value.type == "Color3" then
			value = Color3.new(value.r or 0, value.g or 0, value.b or 0)
		elseif typeof(value) == "table" and value.type == "Vector2" then
			value = Vector2.new(value.x or 0, value.y or 0)
		elseif typeof(value) == "table" and value.type == "Vector3" then
			value = Vector3.new(value.x or 0, value.y or 0, value.z or 0)
		end
		if key == "Value" and inst:IsA("ValueBase") then
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
		elseif key == "Padding" and inst:IsA("UIPadding") and typeof(value) == "UDim" then
			inst.PaddingTop = value
			inst.PaddingBottom = value
			inst.PaddingLeft = value
			inst.PaddingRight = value
		elseif key == "CornerRadius" and inst:IsA("UICorner") and typeof(value) == "UDim" then
			inst.CornerRadius = value
		elseif key == "Thickness" and inst:IsA("UIStroke") then
			inst.Thickness = tonumber(value) or inst.Thickness
		elseif key == "Name" then
			inst.Name = tostring(value)
		else
			error("Unsupported or unsafe property: " .. tostring(key))
		end
	end)
	return ok, ok and nil or tostring(err)
end

function readScriptSource(inst)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return false, ""
	end
	if ScriptEditorService and ScriptEditorService.GetEditorSource then
		local ok, source = pcall(function()
			return ScriptEditorService:GetEditorSource(inst)
		end)
		if ok and type(source) == "string" then
			return true, source
		end
	end
	local ok, source = pcall(function()
		return inst.Source
	end)
	return ok, ok and source or ""
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
