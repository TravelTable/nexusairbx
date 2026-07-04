end

local ImportedAsset = {
	MAX_DESCENDANTS = 10000,
	MAX_DEPTH = 64,
	RECEIPTS_SETTING = "nexusrbxImportedAssetReceipts",
	RECEIPT_ORDER_SETTING = "nexusrbxImportedAssetReceiptOrder",
}

function ImportedAsset.failure(commandType, assetId, code, message, warnings)
	return {
		ok = false,
		type = commandType,
		assetId = tostring(assetId or ""),
		code = code,
		message = message,
		warnings = warnings or {},
	}
end

function ImportedAsset.settingTable(key)
	local ok, value = pcall(function()
		return plugin:GetSetting(key)
	end)
	if ok and type(value) == "table" then
		return value
	end
	return {}
end

function ImportedAsset.getStoredReceipt(idempotencyKey)
	if tostring(idempotencyKey or "") == "" then
		return nil
	end
	local receipts = ImportedAsset.settingTable(ImportedAsset.RECEIPTS_SETTING)
	return receipts[tostring(idempotencyKey)]
end

function ImportedAsset.storeReceipt(idempotencyKey, receipt)
	if tostring(idempotencyKey or "") == "" or type(receipt) ~= "table" then
		return
	end
	local key = tostring(idempotencyKey)
	local receipts = ImportedAsset.settingTable(ImportedAsset.RECEIPTS_SETTING)
	local order = ImportedAsset.settingTable(ImportedAsset.RECEIPT_ORDER_SETTING)
	if not receipts[key] then
		table.insert(order, key)
	end
	receipts[key] = receipt
	while #order > 50 do
		local oldKey = table.remove(order, 1)
		receipts[oldKey] = nil
	end
	pcall(function()
		plugin:SetSetting(ImportedAsset.RECEIPTS_SETTING, receipts)
		plugin:SetSetting(ImportedAsset.RECEIPT_ORDER_SETTING, order)
	end)
end

function ImportedAsset.cleanName(value, fallback)
	local text = tostring(value or ""):gsub("[%c]", ""):gsub("^%s+", ""):gsub("%s+$", "")
	if text == "" then
		text = fallback or "NexusImportedAsset"
	end
	if #text > 100 then
		text = string.sub(text, 1, 100)
	end
	return text
end

function ImportedAsset.uniqueChildName(parent, desiredName)
	local base = ImportedAsset.cleanName(desiredName, "NexusImportedAsset")
	if not parent:FindFirstChild(base) then
		return base
	end
	for index = 2, 500 do
		local candidate = string.format("%s (%d)", base, index)
		if not parent:FindFirstChild(candidate) then
			return candidate
		end
	end
	return base .. " (" .. tostring(HttpService:GenerateGUID(false)) .. ")"
end

function ImportedAsset.isAllowedTarget(path)
	local parts = splitPath(path)
	local root = parts[1]
	if root ~= "Workspace" and root ~= "ReplicatedStorage" and root ~= "ServerStorage" then
		return false
	end
	for _, part in ipairs(parts) do
		if part == "." or part == ".." then
			return false
		end
	end
	return #parts >= 1
end

function ImportedAsset.safeIsA(inst, className)
	local ok, result = pcall(function()
		return inst:IsA(className)
	end)
	return ok and result == true
end

function ImportedAsset.countTreeDepth(inst, depth)
	local maxDepth = depth or 0
	for _, child in ipairs(inst:GetChildren()) do
		maxDepth = math.max(maxDepth, ImportedAsset.countTreeDepth(child, (depth or 0) + 1))
	end
	return maxDepth
end

function ImportedAsset.belongsToRoot(value, root)
	return typeof(value) == "Instance" and (value == root or value:IsDescendantOf(root))
end

function ImportedAsset.scanAndSanitizeRoot(root, requestedAssetType)
	local scan = {
		totalDescendants = 0,
		scriptsRemoved = 0,
		remoteObjectsRemoved = 0,
		bindableObjectsRemoved = 0,
		behaviouralObjectsFlagged = 0,
		invalidReferencesFound = 0,
		meshParts = 0,
		parts = 0,
		models = 0,
		constraints = 0,
		sounds = 0,
		tools = 0,
		prompts = 0,
		clickDetectors = 0,
		packages = 0,
	}
	local warnings = {}
	local blocked = {}
	local descendants = root:GetDescendants()
	scan.totalDescendants = #descendants
	if scan.totalDescendants > ImportedAsset.MAX_DESCENDANTS then
		return nil, "ASSET_TREE_TOO_LARGE", "The asset contains too many descendants.", scan, warnings
	end
	if ImportedAsset.countTreeDepth(root, 0) > ImportedAsset.MAX_DEPTH then
		return nil, "ASSET_TREE_TOO_DEEP", "The asset tree is too deeply nested.", scan, warnings
	end
	if root:IsA("MeshPart") then
		scan.meshParts = scan.meshParts + 1
	elseif root:IsA("BasePart") then
		scan.parts = scan.parts + 1
	elseif root:IsA("Model") then
		scan.models = scan.models + 1
	end
	for _, inst in ipairs(descendants) do
		if ImportedAsset.safeIsA(inst, "LuaSourceContainer") or SCRIPT_CLASSES[inst.ClassName] then
			scan.scriptsRemoved = scan.scriptsRemoved + 1
			table.insert(blocked, inst)
		elseif inst:IsA("RemoteEvent") or inst:IsA("RemoteFunction") or ImportedAsset.safeIsA(inst, "UnreliableRemoteEvent") then
			scan.remoteObjectsRemoved = scan.remoteObjectsRemoved + 1
			table.insert(blocked, inst)
		elseif inst:IsA("BindableEvent") or inst:IsA("BindableFunction") then
			scan.bindableObjectsRemoved = scan.bindableObjectsRemoved + 1
			table.insert(blocked, inst)
		end
		if inst:IsA("MeshPart") then
			scan.meshParts = scan.meshParts + 1
		elseif inst:IsA("BasePart") then
			scan.parts = scan.parts + 1
		elseif inst:IsA("Model") then
			scan.models = scan.models + 1
		end
		if inst:IsA("Tool") then
			scan.tools = scan.tools + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst.ClassName == "HopperBin" or inst:IsA("Humanoid") or inst:IsA("AnimationController") then
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst:IsA("Sound") then
			scan.sounds = scan.sounds + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst:IsA("ProximityPrompt") then
			scan.prompts = scan.prompts + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst:IsA("ClickDetector") then
			scan.clickDetectors = scan.clickDetectors + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst.ClassName == "TouchTransmitter" then
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst.ClassName == "PackageLink" or inst.Name == "PackageLink" then
			scan.packages = scan.packages + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		end
		if ImportedAsset.safeIsA(inst, "Constraint") then
			scan.constraints = scan.constraints + 1
			local okAttachment0, attachment0 = pcall(function()
				return inst.Attachment0
			end)
			local okAttachment1, attachment1 = pcall(function()
				return inst.Attachment1
			end)
			if (okAttachment0 and attachment0 and not ImportedAsset.belongsToRoot(attachment0, root)) or (okAttachment1 and attachment1 and not ImportedAsset.belongsToRoot(attachment1, root)) then
				scan.invalidReferencesFound = scan.invalidReferencesFound + 1
			end
		end
	end
	for _, inst in ipairs(blocked) do
		if inst and inst.Parent then
			inst:Destroy()
		end
	end
	if scan.scriptsRemoved > 0 then table.insert(warnings, string.format("Removed %d script object(s).", scan.scriptsRemoved)) end
	if scan.remoteObjectsRemoved > 0 then table.insert(warnings, string.format("Removed %d networking object(s).", scan.remoteObjectsRemoved)) end
	if scan.bindableObjectsRemoved > 0 then table.insert(warnings, string.format("Removed %d bindable object(s).", scan.bindableObjectsRemoved)) end
	if scan.behaviouralObjectsFlagged > 0 then table.insert(warnings, string.format("Flagged %d behavioural object(s) for review.", scan.behaviouralObjectsFlagged)) end
	if scan.invalidReferencesFound > 0 then table.insert(warnings, string.format("Found %d constraint reference(s) outside the imported tree.", scan.invalidReferencesFound)) end
	local remainingVisuals = root:IsA("BasePart") and 1 or 0
	for _, inst in ipairs(root:GetDescendants()) do
		if inst:IsA("BasePart") then
			remainingVisuals = remainingVisuals + 1
		end
	end
	if remainingVisuals == 0 then
		return nil, "NO_USABLE_CONTENT", "No usable visual content remained after sanitization.", scan, warnings
	end
	if requestedAssetType == "Mesh" and scan.meshParts == 0 then
		return nil, "UNSUPPORTED_ASSET_TYPE", "The loaded asset did not contain a compatible mesh.", scan, warnings
	end
	return true, nil, nil, scan, warnings
end

function ImportedAsset.targetCFrame(placement)
	local mode = tostring((placement or {}).mode or "camera_focus")
	if mode == "explicit_position" and type(placement.position) == "table" then
		local pos = placement.position
		return CFrame.new(Vector3.new(tonumber(pos.x) or 0, tonumber(pos.y) or 0, tonumber(pos.z) or 0))
	end
	if mode == "camera_focus" then
		local camera = Workspace.CurrentCamera
		if camera then
			local cameraFrame = camera.CFrame
			local target = cameraFrame.Position + cameraFrame.LookVector * 24
			if target.Y < 3 then target = Vector3.new(target.X, 3, target.Z) end
			return CFrame.new(target)
		end
	end
	return CFrame.new(0, 3, 0)
end

function ImportedAsset.pivotRoot(root, placement)
	local target = ImportedAsset.targetCFrame(placement)
	if root:IsA("Model") then
		root:PivotTo(target)
	elseif root:IsA("BasePart") then
		root.CFrame = target
	else
		local primary = root:FindFirstChildWhichIsA("BasePart", true)
		if primary then
			local delta = target.Position - primary.Position
			for _, inst in ipairs(root:GetDescendants()) do
				if inst:IsA("BasePart") then
					inst.CFrame = inst.CFrame + delta
				end
			end
		end
	end
	return target
end

function ImportedAsset.applyPhysics(root, anchoredPolicy, collisionPolicy)
	local rootPart = nil
	if root:IsA("BasePart") then
		rootPart = root
	elseif root:IsA("Model") then
		rootPart = root.PrimaryPart or root:FindFirstChildWhichIsA("BasePart", true)
	else
		rootPart = root:FindFirstChildWhichIsA("BasePart", true)
	end
	local function applyPart(part)
		if anchoredPolicy == "anchor_all" then
			part.Anchored = true
		elseif anchoredPolicy == "anchor_root" and part == rootPart then
			part.Anchored = true
		end
		if collisionPolicy == "disable_all" then
			part.CanCollide = false
		elseif collisionPolicy == "enable_baseparts" then
			part.CanCollide = true
		end
	end
	if root:IsA("BasePart") then applyPart(root) end
	for _, inst in ipairs(root:GetDescendants()) do
		if inst:IsA("BasePart") then applyPart(inst) end
	end
end

function ImportedAsset.insertTrustedRobloxAsset(payload, commandType)
	payload = payload or {}
	local assetId = tostring(payload.assetId or payload.robloxAssetId or "")
	local idempotencyKey = tostring(payload.idempotencyKey or "")
	local replay = ImportedAsset.getStoredReceipt(idempotencyKey)
	if replay then
		replay.replayed = true
		replay.code = "COMMAND_ALREADY_APPLIED"
		return replay
	end
	if not assetId:match("^[1-9]%d*$") then
		return ImportedAsset.failure(commandType, assetId, "INVALID_ASSET_ID", "assetId must be a positive integer.")
	end
	local assetType = tostring(payload.assetType or payload.expectedAssetType or "Model")
	if commandType == "insert_creator_store_asset" and assetType ~= "Model" and assetType ~= "Mesh" then
		return ImportedAsset.failure(commandType, assetId, "UNSUPPORTED_ASSET_TYPE", "Only Model and Mesh Creator Store assets can be imported.")
	end
	if commandType == "insert_uploaded_roblox_model" and assetType ~= "Model" then
		return ImportedAsset.failure(commandType, assetId, "ASSET_TYPE_MISMATCH", "Uploaded Roblox insertion only supports Model assets.")
	end
	local targetParentPath = tostring(payload.targetParentPath or "Workspace/NexusImports")
	if not ImportedAsset.isAllowedTarget(targetParentPath) then
		return ImportedAsset.failure(commandType, assetId, "INVALID_TARGET_PATH", "Imports can only target Workspace, ReplicatedStorage, or ServerStorage.")
	end
	if commandType == "insert_creator_store_asset" then
		local allowFreeAssets = false
		pcall(function()
			allowFreeAssets = AssetService.AllowInsertFreeAssets == true
		end)
		if not allowFreeAssets then
			return ImportedAsset.failure(commandType, assetId, "THIRD_PARTY_ASSETS_DISABLED", "Enable Allow Loading Third Party Assets in Studio Experience Settings.", {
				"Roblox Studio blocked public Creator Store asset loading for this experience.",
			})
		end
	end
	local loadedOk, loadedOrErr = pcall(function()
		return AssetService:LoadAssetAsync(tonumber(assetId))
	end)
	if not loadedOk then
		local message = tostring(loadedOrErr or "")
		local lower = string.lower(message)
		local code = "ASSET_LOAD_FAILED"
		if string.find(lower, "permission") or string.find(lower, "not allowed") or string.find(lower, "third") then
			code = commandType == "insert_creator_store_asset" and "THIRD_PARTY_ASSETS_DISABLED" or "ASSET_NOT_ACCESSIBLE"
			message = commandType == "insert_creator_store_asset" and "Enable Allow Loading Third Party Assets in Studio Experience Settings." or "The uploaded Roblox model is not accessible from this Studio session."
		elseif string.find(lower, "not found") or string.find(lower, "access") then
			code = "ASSET_NOT_ACCESSIBLE"
			message = "The Roblox asset is not accessible from this Studio session."
		else
			message = "The Roblox asset could not be loaded."
		end
		return ImportedAsset.failure(commandType, assetId, code, message)
	end
	local loadedRoot = loadedOrErr
	if typeof(loadedRoot) ~= "Instance" then
		return ImportedAsset.failure(commandType, assetId, "ASSET_LOAD_FAILED", "The Roblox asset returned an invalid object.")
	end
	loadedRoot.Parent = nil
	local scanOk, scanCode, scanMessage, scan, warnings = ImportedAsset.scanAndSanitizeRoot(loadedRoot, assetType)
	if not scanOk then
		loadedRoot:Destroy()
		return ImportedAsset.failure(commandType, assetId, scanCode or "SANITIZATION_FAILED", scanMessage or "Roblox asset import sanitization failed.", warnings)
	end
	local anchoredPolicy = tostring(payload.anchoredPolicy or payload.anchoringMode or "anchor_all")
	if anchoredPolicy ~= "preserve" and anchoredPolicy ~= "anchor_all" and anchoredPolicy ~= "anchor_root" then
		loadedRoot:Destroy()
		return ImportedAsset.failure(commandType, assetId, "INVALID_ANCHORED_POLICY", "Invalid anchoredPolicy.", warnings)
	end
	local collisionPolicy = tostring(payload.collisionPolicy or payload.collisionMode or "disable_all")
	if collisionPolicy == "disable" then collisionPolicy = "disable_all" end
	if collisionPolicy == "visual_default" then collisionPolicy = "enable_baseparts" end
	if collisionPolicy ~= "preserve" and collisionPolicy ~= "disable_all" and collisionPolicy ~= "enable_baseparts" then
		loadedRoot:Destroy()
		return ImportedAsset.failure(commandType, assetId, "INVALID_COLLISION_POLICY", "Invalid collisionPolicy.", warnings)
	end
	ImportedAsset.applyPhysics(loadedRoot, anchoredPolicy, collisionPolicy)
	local targetExisted = resolvePath(targetParentPath) ~= nil
	local parentPath = targetParentPath
	if commandType == "insert_creator_store_asset" then
		parentPath = targetParentPath .. "/ImportedAsset"
	end
	local parent = ensureParent(parentPath, true)
	if not parent then
		loadedRoot:Destroy()
		return ImportedAsset.failure(commandType, assetId, "INVALID_TARGET_PATH", "Could not resolve the import destination.", warnings)
	end
	local requestedName = ImportedAsset.cleanName(payload.requestedName, ImportedAsset.cleanName(payload.assetName, "NexusImportedAsset_" .. assetId))
	local insertedName = ImportedAsset.uniqueChildName(parent, requestedName)
	loadedRoot.Name = insertedName
	local placementCFrame = nil
	local placementOk = pcall(function()
		ChangeHistoryService:SetWaypoint("NexusRBX import start")
		loadedRoot.Parent = parent
		placementCFrame = ImportedAsset.pivotRoot(loadedRoot, payload.placement or {})
		ChangeHistoryService:SetWaypoint("NexusRBX import complete")
	end)
	if not placementOk then
		if loadedRoot then loadedRoot:Destroy() end
		if not targetExisted then
			local target = resolvePath(targetParentPath)
			if target and #target:GetChildren() == 0 then target:Destroy() end
		end
		return ImportedAsset.failure(commandType, assetId, "PLACEMENT_FAILED", "The sanitized asset could not be placed in Studio.", warnings)
	end
	local insertedPath = fullPath(loadedRoot)
	local receipt = {
		success = true,
		ok = true,
		operation = commandType,
		type = commandType,
		assetId = assetId,
		assetName = ImportedAsset.cleanName(payload.assetName, requestedName),
		insertedName = insertedName,
		insertedPath = insertedPath,
		insertedRootPath = insertedPath,
		insertedRootClass = loadedRoot.ClassName,
		sanitizationMode = "strict",
		scan = scan,
		warnings = warnings,
		placement = {
			mode = tostring((payload.placement or {}).mode or "camera_focus"),
			pivot = {
				x = placementCFrame and placementCFrame.Position.X or 0,
				y = placementCFrame and placementCFrame.Position.Y or 0,
				z = placementCFrame and placementCFrame.Position.Z or 0,
			},
		},
		creatorMetadata = payload.sourceMetadata or {},
		uploadId = payload.uploadId,
		insertionId = payload.insertionId,
		sourceHash = payload.expectedSourceSha256,
		history = { recorded = true },
		historyRecorded = true,
		affectedPaths = { insertedPath },
		removed = {
			scripts = scan.scriptsRemoved or 0,
			remotes = scan.remoteObjectsRemoved or 0,
			bindables = scan.bindableObjectsRemoved or 0,
			total = (scan.scriptsRemoved or 0) + (scan.remoteObjectsRemoved or 0) + (scan.bindableObjectsRemoved or 0),
		},
		counts = {
			instances = (scan.totalDescendants or 0) + 1,
			baseParts = (scan.parts or 0) + (scan.meshParts or 0),
			},
			anchoredPolicy = anchoredPolicy,
			collisionPolicy = collisionPolicy,
		}
		ImportedAsset.storeReceipt(idempotencyKey, receipt)
		return receipt
	end
