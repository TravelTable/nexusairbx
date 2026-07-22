local MUTATING_COMMANDS = {
	apply_artifact = true,
	create_script = true,
	write_script = true,
	patch_script = true,
	rename_script = true,
	move_script = true,
	duplicate_script = true,
	delete_script = true,
	format_script = true,
	replace_in_files = true,
	create_instance = true,
	update_properties = true,
	apply_asset_reference = true,
	update_attributes = true,
	update_tags = true,
	rename_instance = true,
	move_instance = true,
	duplicate_instance = true,
	delete_instance = true,
	batch_operations = true,
	build_native_model = true,
	insert_creator_store_asset = true,
	insert_uploaded_roblox_model = true,
	apply_native_model_patch = true,
	restore_snapshot = true,
	undo_last_batch = true,
}

local executedCommandCount = 0
local COMMAND_RECEIPTS_SETTING, COMMAND_RECEIPT_ORDER_SETTING, COMMAND_RECEIPT_LIMIT =
	"nexusrbxCommandReceiptsV2", "nexusrbxCommandReceiptOrderV2", 50

local TOOL_HANDLERS = {
	apply_artifact = applyArtifact,
	insert_creator_store_asset = function(payload)
		return ImportedAsset.insertTrustedRobloxAsset(payload, "insert_creator_store_asset")
	end,
	insert_uploaded_roblox_model = function(payload)
		return ImportedAsset.insertTrustedRobloxAsset(payload, "insert_uploaded_roblox_model")
	end,
	get_project_manifest = inspectPlace,
	list_children = listChildren,
	inspect_place = inspectPlace,
	inspect_instances = inspectInstances,
	search_project = searchProject,
	search_source = searchSource,
	read_script = readScript,
	read_scripts = readScript,
	read_instance = readInstance,
	read_properties = readProperties,
	get_selection = getSelectionTool,
	get_studio_context = getStudioContext,
	get_change_history = function()
		return { snapshots = localSnapshots, snapshotCount = #localSnapshots }
	end,
	get_output_logs = collectOutput,
	collect_output = collectOutput,
	build_native_model = buildNativeModel,
	inspect_native_model = inspectNativeModel,
	apply_native_model_patch = applyNativeModelPatch,
	create_script = createScript,
	write_script = writeScript,
	patch_script = patchScript,
	rename_script = renameInstanceTool,
	move_script = moveInstanceTool,
	duplicate_script = duplicateInstanceTool,
	delete_script = deleteScript,
	format_script = function(payload)
		return structuredUnsupported("format_script", "Formatting Luau source requires a formatter outside this Studio plugin runtime.")
	end,
	replace_in_files = replaceInFiles,
	create_instance = createInstanceTool,
	update_properties = updateProperties,
	apply_asset_reference = applyAssetReference,
	update_attributes = updateAttributes,
	update_tags = updateTags,
	rename_instance = renameInstanceTool,
	move_instance = moveInstanceTool,
	duplicate_instance = duplicateInstanceTool,
	delete_instance = deleteInstanceTool,
	parse_luau = parseLuau,
	run_project_validation = runProjectValidation,
	collect_diagnostics = collectDiagnostics,
	run_test_service = function()
		return structuredUnsupported("run_test_service", "Running TestService from a plugin is not safely supported by this bridge.")
	end,
	run_play_test = function()
		return structuredUnsupported("run_play_test", "Starting play tests from this plugin bridge is not supported.")
	end,
	stop_play_test = function()
		return structuredUnsupported("stop_play_test", "Stopping play tests from this plugin bridge is not supported.")
	end,
	create_snapshot = createSnapshotTool,
	restore_snapshot = restoreSnapshots,
	undo_last_batch = function()
		return restoreSnapshots({ snapshots = lastBatchSnapshots })
	end,
	run_smoke_check = runSmokeCheck,
}

-- Pairing must describe the handlers this *loaded bundle* can actually run.
-- Deriving this from TOOL_HANDLERS prevents an old generated artifact from
-- advertising a command just because it copied a version/protocol string.
local function getPluginAttestation()
	local supportedCommands = {}
	for commandType, handler in pairs(TOOL_HANDLERS) do
		if type(handler) == "function" then
			table.insert(supportedCommands, commandType)
		end
	end
	table.sort(supportedCommands)

	local capabilities = {}
	for capability, enabled in pairs(PLUGIN_CAPABILITIES or {}) do
		capabilities[capability] = enabled == true
	end

	return {
		pluginVersion = PLUGIN_VERSION,
		protocolVersion = STUDIO_PROTOCOL_VERSION,
		buildId = PLUGIN_BUILD_ID,
		supportedCommands = supportedCommands,
		capabilities = capabilities,
	}
end

local function isMutatingCommand(commandType)
	return MUTATING_COMMANDS[tostring(commandType or "")] == true
end

local function batchOperations(payload)
	local snapshots = {}
	local results = {}
	local previousBatch = lastBatchSnapshots
	lastBatchSnapshots = snapshots
	local ok, err = pcall(function()
		for index, op in ipairs(payload.operations or {}) do
			local opType = tostring(op.type or "")
			if opType == "apply_artifact" or opType == "apply_asset_reference" or opType == "batch_operations" then
				error("Nested or artifact batch operation is not supported")
			end
			local handler = TOOL_HANDLERS[opType]
			if not handler then
				error("Unsupported batch operation: " .. opType)
			end
			local result = handler(op.payload or {})
			if type(result) == "table" and result.snapshots then
				for _, snap in ipairs(result.snapshots) do
					table.insert(snapshots, snap)
				end
			end
			if type(result) == "table" and result.ok == false then
				table.insert(results, { index = index, type = opType, ok = false, error = result.error or result.message, result = result })
				error(result.error or "Batch operation failed")
			end
			table.insert(results, { index = index, type = opType, ok = true, result = result })
		end
	end)
	if not ok then
		if payload.atomic ~= false then
			restoreSnapshots({ snapshots = snapshots })
		end
		if #snapshots == 0 then
			lastBatchSnapshots = previousBatch
		end
		return {
			ok = false,
			error = tostring(err),
			atomic = payload.atomic ~= false,
			rolledBack = payload.atomic ~= false,
			results = results,
			snapshots = snapshots,
		}
	end
	return { ok = true, results = results, snapshots = snapshots, snapshotCount = #snapshots }
end

TOOL_HANDLERS.batch_operations = batchOperations

function getStoredCommandReceipt(operationId)
	if tostring(operationId or "") == "" then return nil end
	local ok, receipts = pcall(function()
		return plugin:GetSetting(COMMAND_RECEIPTS_SETTING)
	end)
	if not ok or type(receipts) ~= "table" then return nil end
	local receipt = receipts[tostring(operationId)]
	return type(receipt) == "table" and receipt or nil
end

-- Persist the mutation outcome before attempting its network acknowledgment.
-- A bounded journal lets a redelivered operation reconcile its prior result
-- without ever invoking the Studio mutation twice.
function storeCommandReceipt(command, status, result, errorMessage)
	if type(command) ~= "table" or not isMutatingCommand(command.type) then return true end
	local operationId = tostring(command.operationId or "")
	local idempotencyKey = tostring(command.idempotencyKey or "")
	if operationId == "" or idempotencyKey == "" then return false end

	local existing = getStoredCommandReceipt(operationId)
	if existing and tostring(existing.idempotencyKey or "") ~= idempotencyKey then
		return false
	end
	local settingsOk, receipts, order = pcall(function()
		local storedReceipts = plugin:GetSetting(COMMAND_RECEIPTS_SETTING)
		local storedOrder = plugin:GetSetting(COMMAND_RECEIPT_ORDER_SETTING)
		return type(storedReceipts) == "table" and storedReceipts or {},
			type(storedOrder) == "table" and storedOrder or {}
	end)
	if not settingsOk then return false end
	if receipts[operationId] == nil then table.insert(order, operationId) end
	receipts[operationId] = {
		journalVersion = 1,
		operationId = operationId,
		idempotencyKey = idempotencyKey,
		commandId = command.id or command.commandId,
		commandType = command.type,
		status = status,
		result = result,
		error = errorMessage,
		recordedAt = os.time(),
	}
	while #order > COMMAND_RECEIPT_LIMIT do
		local expiredOperationId = table.remove(order, 1)
		receipts[expiredOperationId] = nil
	end
	return pcall(function()
		plugin:SetSetting(COMMAND_RECEIPTS_SETTING, receipts)
		plugin:SetSetting(COMMAND_RECEIPT_ORDER_SETTING, order)
	end)
end

local function ack(commandOrId, status, result, errorMessage)
	local token = getToken()
	if not token then
		return false
	end
	local command = type(commandOrId) == "table" and commandOrId or nil
	local commandId = command and (command.id or command.commandId) or commandOrId
	if not commandId or tostring(commandId) == "" then
		return false
	end
	local receiptResult = result
	if command and tonumber(command.lifecycleVersion) == 2 then
		if type(receiptResult) ~= "table" then
			receiptResult = {}
		end
		local lease = type(command.lease) == "table" and command.lease or {}
		receiptResult.leaseFence = receiptResult.leaseFence or lease.fence or command.leaseFence
		receiptResult.lifecycleVersion = 2
		receiptResult.operationId = receiptResult.operationId or command.operationId
		receiptResult.idempotencyKey = receiptResult.idempotencyKey or command.idempotencyKey
	end
	local requestOptions = { idempotent = true }
	if command and command.idempotencyKey then
		requestOptions.idempotencyKey = tostring(command.idempotencyKey) .. ":studio-ack:" .. tostring(status)
	end
	if command and tonumber(command.lifecycleVersion) == 2
		and (status == "succeeded" or status == "failed") then
		storeCommandReceipt(command, status, receiptResult, errorMessage)
	end
	local ok = request("POST", "/api/studio/commands/" .. HttpService:UrlEncode(tostring(commandId)) .. "/ack", {
		status = status,
		result = receiptResult,
		error = errorMessage,
	}, token, requestOptions)
	return ok == true
end

function reconcileStoredCommandReceipt(command)
	local stored = getStoredCommandReceipt(command and command.operationId)
	if not stored then return false, false end
	if tostring(stored.idempotencyKey or "") ~= tostring(command.idempotencyKey or "") then
		local conflict = {
			ok = false,
			success = false,
			verified = false,
			code = "OPERATION_ID_CONFLICT",
			operationId = command.operationId,
			idempotencyKey = command.idempotencyKey,
			error = {
				code = "OPERATION_ID_CONFLICT",
				message = "This operationId was already used with a different idempotencyKey",
				retryable = false,
			},
		}
		return true, ack(command, "failed", conflict, conflict.error.message)
	end

	local status, result, errorMessage = stored.status, stored.result, stored.error
	if status == "started" then
		status = "failed"
		result = {
			ok = false,
			success = false,
			verified = false,
			outcome = "studio_state_uncertain",
			code = "OPERATION_OUTCOME_UNCERTAIN",
			operationId = command.operationId,
			idempotencyKey = command.idempotencyKey,
			error = {
				code = "OPERATION_OUTCOME_UNCERTAIN",
				message = "Studio restarted or lost connection after execution began; the mutation will not be replayed",
				retryable = false,
			},
		}
		errorMessage = result.error.message
	end
	if status ~= "succeeded" and status ~= "failed" then return false, false end
	local confirmed = ack(command, status, result, errorMessage)
	setBridgeState(confirmed and "live" or "reconciling", confirmed and "prior operation reconciled" or "stored result confirmation pending")
	setLast(confirmed and "Reconciled a previously executed Studio operation" or "Stored Studio result is waiting for website confirmation")
	return true, confirmed
end

local function commandStartedMs()
	if type(nowMs) == "function" then
		return nowMs()
	end
	return math.floor(os.clock() * 1000)
end

-- Commands whose success can be proven by re-reading the place after the write.
local DELETE_COMMANDS = {
	delete_script = true,
	delete_instance = true,
}

local SCRIPT_WRITE_COMMANDS = {
	write_script = true,
	create_script = true,
	patch_script = true,
}

local function currentScriptHashAt(path)
	if type(path) ~= "string" or path == "" then
		return nil, nil
	end
	local inst = resolvePath(path)
	if not inst then
		return nil, nil
	end
	if SCRIPT_CLASSES and SCRIPT_CLASSES[inst.ClassName] and type(scriptHash) == "function" then
		return inst, scriptHash(inst)
	end
	return inst, nil
end

-- Re-inspect the place after a mutating command and return semantic evidence
-- for the exact requested post-state. A path existing is never sufficient for
-- property, attribute, tag, source, artifact, or native-model writes.
local function verifyCommandOutcome(command, payload, result)
	local commandType = command.type or ""
	if not isMutatingCommand(commandType) then
		return true, nil, { commandType = commandType, acknowledged = true }
	end

	local checks = {}
	local evidence = { commandType = commandType, checks = checks }
	local function addCheck(kind, path, ok, details)
		local check = details or {}
		check.kind = kind
		check.path = path or ""
		check.ok = ok == true
		table.insert(checks, check)
		return check.ok
	end
	local function valuesMatch(expected, actual)
		if type(expected) == "number" and type(actual) == "number" then
			return math.abs(expected - actual) <= 0.00001
		end
		if type(expected) ~= type(actual) then
			return false
		end
		if type(expected) ~= "table" then
			return expected == actual
		end
		for key, expectedValue in pairs(expected) do
			local actualValue = actual[key]
			if key == "type" and actualValue == nil then
				actualValue = actual["$type"]
			elseif key == "$type" and actualValue == nil then
				actualValue = actual.type
			end
			if not valuesMatch(expectedValue, actualValue) then
				return false
			end
		end
		return true
	end
	local function instanceProperty(inst, key, useNativeEncoding)
		if not inst then
			return nil
		end
		if useNativeEncoding then
			local ok, value = pcall(function()
				return inst[key]
			end)
			return ok and nativeTypedValue(value) or nil
		end
		return safePropertyValue(inst, key)
	end
	local function checkProperties(inst, path, properties, kind, useNativeEncoding, operationIndex)
		local count = 0
		for key, expected in pairs(properties or {}) do
			count = count + 1
			local actual = instanceProperty(inst, key, useNativeEncoding)
			addCheck(kind, path, valuesMatch(expected, actual), {
				key = tostring(key),
				expected = expected,
				actual = actual,
				operationIndex = operationIndex,
				reason = actual == nil and "unreadable" or nil,
			})
		end
		return count
	end
	local function checkAttributes(inst, path, attributes, kind, operationIndex)
		local count = 0
		for key, expected in pairs(attributes or {}) do
			count = count + 1
			local actual = inst and inst:GetAttribute(tostring(key)) or nil
			addCheck(kind, path, valuesMatch(expected, actual), {
				key = tostring(key),
				expected = expected,
				actual = actual,
				operationIndex = operationIndex,
			})
		end
		return count
	end
	local function tagSetMatches(inst, requested)
		if not inst then
			return false, {}
		end
		local actual = CollectionService:GetTags(inst)
		local expectedSet = {}
		local actualSet = {}
		for _, tag in ipairs(requested or {}) do
			expectedSet[tostring(tag)] = true
		end
		for _, tag in ipairs(actual) do
			actualSet[tostring(tag)] = true
		end
		for tag in pairs(expectedSet) do
			if not actualSet[tag] then
				return false, actual
			end
		end
		for tag in pairs(actualSet) do
			if not expectedSet[tag] then
				return false, actual
			end
		end
		return true, actual
	end
	local function verifyNativeModelIdentity(root, path, modelId, expectedRevision)
		local actualModelId = root and tostring(root:GetAttribute("NexusModelId") or "") or ""
		local revision = root and nativeRevision(root) or nil
		local managed = root and (root:GetAttribute("NexusManaged") == true or root:GetAttribute("NexusGenerated") == true)
		local ok = root ~= nil
			and root:IsA("Model")
			and managed == true
			and actualModelId == tostring(modelId or "")
			and revision ~= nil
			and (expectedRevision == nil or expectedRevision == "" or revision == expectedRevision)
		addCheck("native_model", path, ok, {
			modelId = tostring(modelId or ""),
			actualModelId = actualModelId,
			revision = revision,
			expectedRevision = expectedRevision,
		})
		return ok, revision
	end

	if DELETE_COMMANDS[commandType] then
		local target = result.path or payload.path
		addCheck("instance_absence", target, type(target) == "string" and target ~= "" and resolvePath(target) == nil, {
			reason = resolvePath(target) and "still_present" or nil,
		})
	elseif SCRIPT_WRITE_COMMANDS[commandType] then
		local target = result.path or payload.path
		local inst, currentHash = currentScriptHashAt(target)
		local expectedHash = result.sourceHash or (type(payload.source) == "string" and stableHash(payload.source) or nil)
		addCheck("script_source", target, inst ~= nil and currentHash ~= nil and expectedHash ~= nil and currentHash == expectedHash, {
			expectedHash = expectedHash,
			actualHash = currentHash,
			reason = not inst and "missing" or (currentHash ~= expectedHash and "hash_mismatch" or nil),
		})
		evidence.readbackHash = currentHash
		evidence.currentSourceHash = currentHash
		evidence.baselineSourceHash = result.previousHash or payload.expectedSourceHash
		evidence.previousSourceHash = result.previousHash or payload.expectedSourceHash
	elseif commandType == "apply_asset_reference" then
		local target = result.path or payload.path
		local inst = resolvePath(target)
		local property = tostring(payload.property or "")
		local expectedClassName = tostring(payload.className or "")
		local robloxAssetId = tostring(payload.robloxAssetId or "")
		local expected = "rbxassetid://" .. robloxAssetId
		local actual = inst and safePropertyValue(inst, property) or nil
		local exact = inst ~= nil and inst.ClassName == expectedClassName and actual == expected
		addCheck("asset_reference", target, exact, {
			key = property,
			property = property,
			className = inst and inst.ClassName or nil,
			expected = expected,
			actual = actual,
			robloxAssetId = robloxAssetId,
			reason = inst == nil and "missing" or (not exact and "asset_reference_mismatch" or nil),
		})
		evidence.assetReference = {
			path = target,
			className = inst and inst.ClassName or nil,
			property = property,
			robloxAssetId = robloxAssetId,
			expected = expected,
			actual = actual,
		}
	elseif commandType == "update_properties" then
		local target = result.path or payload.path
		local inst = resolvePath(target)
		if checkProperties(inst, target, payload.properties, "property", false, nil) == 0 then
			addCheck("property", target, false, { reason = "no_requested_properties" })
		end
	elseif commandType == "update_attributes" then
		local target = result.path or payload.path
		local inst = resolvePath(target)
		if checkAttributes(inst, target, payload.attributes or payload.values, "attribute", nil) == 0 then
			addCheck("attribute", target, false, { reason = "no_requested_attributes" })
		end
	elseif commandType == "update_tags" then
		local target = result.path or payload.path
		local inst = resolvePath(target)
		if payload.set ~= nil then
			local ok, actual = tagSetMatches(inst, payload.set)
			addCheck("tag_set", target, ok, { expected = payload.set or {}, actual = actual })
		else
			local count = 0
			for _, tag in ipairs(payload.add or {}) do
				count = count + 1
				addCheck("tag", target, inst ~= nil and CollectionService:HasTag(inst, tostring(tag)), {
					tag = tostring(tag),
					expectedPresent = true,
				})
			end
			for _, tag in ipairs(payload.remove or {}) do
				count = count + 1
				addCheck("tag", target, inst ~= nil and not CollectionService:HasTag(inst, tostring(tag)), {
					tag = tostring(tag),
					expectedPresent = false,
				})
			end
			if count == 0 then
				addCheck("tag", target, false, { reason = "no_requested_tags" })
			end
		end
	elseif commandType == "create_instance" then
		local target = result.path or payload.path
		local inst = resolvePath(target)
		addCheck("instance_identity", target, inst ~= nil and inst.ClassName == tostring(payload.className or "Folder"), {
			expectedClassName = tostring(payload.className or "Folder"),
			actualClassName = inst and inst.ClassName or nil,
		})
		checkProperties(inst, target, payload.properties, "property", false, nil)
		checkAttributes(inst, target, payload.attributes, "attribute", nil)
		for _, tag in ipairs(payload.tags or {}) do
			addCheck("tag", target, inst ~= nil and CollectionService:HasTag(inst, tostring(tag)), {
				tag = tostring(tag),
				expectedPresent = true,
			})
		end
	elseif commandType == "apply_artifact" then
		local files = result.managedFiles or {}
		for _, file in ipairs(files) do
			if type(file) == "table" then
				local p = file.lastResolvedStudioPath or file.canonicalPath or file.path
				if type(p) == "string" and p ~= "" then
					local inst = resolvePath(p)
					local expected = file.lastAppliedSourceHash or file.resultingHash or file.sourceHash
					local currentHash = inst and SCRIPT_CLASSES[inst.ClassName] and scriptHash(inst) or nil
					addCheck("artifact_file", p, inst ~= nil and expected ~= nil and currentHash == expected, {
						fileId = file.fileId,
						expectedHash = expected,
						actualHash = currentHash,
					})
				end
			end
		end
		for _, op in ipairs(payload.operations or {}) do
			if op.type == "delete" then
				local path = tostring(op.path or "")
				addCheck("artifact_delete", path, path ~= "" and resolvePath(path) == nil, { fileId = op.id })
			elseif op.type == "rename" then
				local fromPath = tostring(op.fromPath or "")
				local toPath = tostring(op.toPath or "")
				addCheck("path_transition", toPath, toPath ~= "" and resolvePath(toPath) ~= nil and (fromPath == toPath or resolvePath(fromPath) == nil), {
					previousPath = fromPath,
				})
			end
		end
		-- Legacy artifacts return one row per changed script rather than the
		-- managed-file manifest used by schema v2.
		if #checks == 0 then
			for _, file in ipairs(result.files or {}) do
				local path = file.path
				local inst, currentHash = currentScriptHashAt(path)
				local expected = file.sourceHash or file.resultingHash
				addCheck("artifact_file", path, inst ~= nil and expected ~= nil and currentHash == expected, {
					expectedHash = expected,
					actualHash = currentHash,
				})
			end
		end
		if #checks == 0 then
			addCheck("artifact_file", "", false, { reason = "no_artifact_readback_targets" })
		end
	elseif commandType == "replace_in_files" then
		for _, file in ipairs(result.files or {}) do
			local inst, currentHash = currentScriptHashAt(file.path)
			addCheck("replace_file", file.path, inst ~= nil and file.sourceHash ~= nil and currentHash == file.sourceHash, {
				expectedHash = file.sourceHash,
				actualHash = currentHash,
			})
		end
		if #checks == 0 then
			addCheck("replace_file", "", false, { reason = "no_changed_files_to_verify" })
		end
	elseif commandType == "rename_script" or commandType == "move_script"
		or commandType == "rename_instance" or commandType == "move_instance" then
		local target = result.path
		local previous = result.previousPath or payload.path
		addCheck("path_transition", target, type(target) == "string" and target ~= "" and resolvePath(target) ~= nil
			and (previous == target or resolvePath(previous) == nil), { previousPath = previous })
	elseif commandType == "duplicate_script" or commandType == "duplicate_instance" then
		local target = result.path or payload.newPath
		local sourcePath = result.sourcePath or payload.path
		local targetInst = resolvePath(target)
		local sourceInst = resolvePath(sourcePath)
		addCheck("instance_identity", target, targetInst ~= nil and sourceInst ~= nil and targetInst ~= sourceInst
			and targetInst.ClassName == sourceInst.ClassName, {
			sourcePath = sourcePath,
			expectedClassName = sourceInst and sourceInst.ClassName or nil,
			actualClassName = targetInst and targetInst.ClassName or nil,
		})
	elseif commandType == "insert_creator_store_asset" or commandType == "insert_uploaded_roblox_model" then
		local target = result.insertedRootPath or result.insertedPath
		local inst = resolvePath(target)
		addCheck("imported_asset", target, inst ~= nil and tostring(inst.ClassName) == tostring(result.insertedRootClass or ""), {
			assetId = tostring(result.assetId or payload.assetId or ""),
			expectedClassName = result.insertedRootClass,
			actualClassName = inst and inst.ClassName or nil,
		})
	elseif commandType == "build_native_model" then
		local target = result.insertedRootPath
		local modelId = payload.spec and payload.spec.modelId or result.modelId
		local _, revision = verifyNativeModelIdentity(resolvePath(target), target, modelId, nil)
		evidence.readbackRevision = revision
	elseif commandType == "apply_native_model_patch" then
		local target = result.rootPath or payload.modelPath
		local root = resolvePath(target)
		local identityOk, revision = verifyNativeModelIdentity(root, target, payload.modelId or result.modelId, result.newRevision)
		evidence.readbackRevision = revision
		local idMap = identityOk and nativeTargetMap(root) or {}
		for index, op in ipairs((payload.patch or {}).operations or {}) do
			local kind = tostring(op.op or op.type or "")
			local inst = idMap[tostring(op.targetId or "")]
			local operationOk = identityOk
			local details = {
				operationIndex = index,
				operationType = kind,
				targetId = op.targetId,
				modelId = tostring(payload.modelId or result.modelId or ""),
			}
			if kind == "set_properties" then
				local before = #checks
				checkProperties(inst, target, op.properties, "native_operation", true, index)
				operationOk = inst ~= nil and #checks > before
			elseif kind == "set_attributes" then
				local before = #checks
				checkAttributes(inst, target, op.attributes, "native_operation", index)
				operationOk = inst ~= nil and #checks > before
			elseif kind == "rename" then
				operationOk = inst ~= nil and inst.Name == tostring(op.name or "")
				details.expectedName = op.name
				details.actualName = inst and inst.Name or nil
			elseif kind == "resize" then
				local actual = inst and nativeTypedValue(inst.Size) or nil
				local expected = op.size
				if type(expected) == "table" and expected["$type"] == nil and expected.type == nil then
					expected = { ["$type"] = "Vector3", x = expected.x, y = expected.y, z = expected.z }
				end
				operationOk = inst ~= nil and valuesMatch(expected, actual)
				details.expected = expected
				details.actual = actual
			elseif kind == "add_instance" then
				local spec = op.instance or {}
				inst = idMap[tostring(spec.id or "")]
				operationOk = inst ~= nil and inst.ClassName == tostring(spec.className or "") and inst.Name == tostring(spec.name or inst.Name)
				details.targetId = spec.id
				details.expectedClassName = spec.className
				details.actualClassName = inst and inst.ClassName or nil
			elseif kind == "move_instance" then
				local parentInst = idMap[tostring(op.newParentId or "")]
				operationOk = inst ~= nil and parentInst ~= nil and inst.Parent == parentInst
				details.newParentId = op.newParentId
			elseif kind == "duplicate_instance" then
				inst = idMap[tostring(op.newIdPrefix or "")]
				operationOk = inst ~= nil
				details.targetId = op.newIdPrefix
			elseif kind == "remove_instance" then
				operationOk = idMap[tostring(op.targetId or "")] == nil
			elseif kind == "set_tags" then
				operationOk = inst ~= nil
				for _, tag in ipairs(op.add or {}) do
					operationOk = operationOk and CollectionService:HasTag(inst, tostring(tag))
				end
				for _, tag in ipairs(op.remove or {}) do
					operationOk = operationOk and not CollectionService:HasTag(inst, tostring(tag))
				end
			elseif kind == "transform" then
				operationOk = inst ~= nil and revision == result.newRevision
			elseif kind == "transform_model" then
				operationOk = root ~= nil and revision == result.newRevision
			else
				operationOk = false
				details.reason = "unsupported_verification_operation"
			end
			-- Property/attribute operations already emitted one exact semantic check
			-- per requested key. Emit a failure if they had no keys; other operation
			-- kinds receive one command-bound check here.
			if kind == "set_properties" or kind == "set_attributes" then
				if not operationOk then
					addCheck("native_operation", target, false, details)
				end
			else
				addCheck("native_operation", target, operationOk, details)
			end
		end
	elseif commandType == "restore_snapshot" or commandType == "undo_last_batch" then
		local snapshots = commandType == "undo_last_batch" and lastBatchSnapshots or (payload.snapshots or localSnapshots)
		for _, snap in ipairs(snapshots or {}) do
			local inst = resolvePath(snap.path)
			local actualHash = snapshotStateHash(inst)
			local ok = snap.existed == false and inst == nil
				or snap.existed ~= false and inst ~= nil and (not snap.preHash or actualHash == snap.preHash)
			addCheck("snapshot_restore", snap.path, ok, {
				expectedHash = snap.preHash,
				actualHash = actualHash,
				expectedPresent = snap.existed ~= false,
			})
		end
		if #checks == 0 then
			addCheck("snapshot_restore", "", false, { reason = "no_snapshots_to_verify" })
		end
	elseif commandType == "batch_operations" then
		for index, op in ipairs(payload.operations or {}) do
			local row = (result.results or {})[index]
			local childResult = row and row.result or nil
			local childVerified, childChecks = false, nil
			if row and row.ok == true and type(childResult) == "table" then
				childVerified, childChecks = verifyCommandOutcome({ type = op.type }, op.payload or {}, childResult)
			end
			addCheck("batch_operation", "", childVerified == true, {
				operationIndex = index,
				operationType = op.type,
				checks = childChecks,
			})
		end
		if #checks == 0 then
			addCheck("batch_operation", "", false, { reason = "empty_batch" })
		end
	else
		addCheck("instance_identity", result.path or payload.path or "", false, {
			reason = "missing_command_specific_verifier",
			commandType = commandType,
		})
	end

	local verified = true
	for _, check in ipairs(checks) do
		if not check.ok then
			verified = false
			break
		end
	end
	return verified, checks, evidence
end

local function executeCommand(command)
	local commandType = command.type or "apply_artifact"
	local handler = TOOL_HANDLERS[commandType]
	if type(handler) ~= "function" then
		error(string.format(
			"Unsupported Studio command: %s (plugin %s). Reinstall the latest NexusRBXStudioBridge.plugin.lua via Plugins > Manage Plugins.",
			tostring(commandType),
			PLUGIN_VERSION
		))
	end
	executedCommandCount = executedCommandCount + 1
	setProgress({
		runId = command.runId,
		stepId = command.stepId,
		executedCount = executedCommandCount,
	})
	setActive((command.label or commandType) .. " (" .. commandType .. ")")
	if string.find(commandType, "read") or string.find(commandType, "inspect") or string.find(commandType, "manifest") or string.find(commandType, "search") or string.find(commandType, "get_") then
		setAgentPhase("reading")
	elseif isMutatingCommand(commandType) then
		setAgentPhase("writing")
	else
		setAgentPhase("thinking")
	end
	local payload = command.payload or {}
	local started = commandStartedMs()
	-- This is the final mutation boundary. Re-read live game identity immediately
	-- before invoking a write handler; approval-time checks are not sufficient
	-- because the user can switch places while the prompt is open.
	if isMutatingCommand(commandType) then
		local targetOk, targetResult = validateCommandStudioTarget(command, "before_mutation", command._approvedStudioAttestation)
		if not targetOk then
			return targetResult
		end
	end
	local result = handler(payload, command)
	if type(result) ~= "table" then
		result = { output = result }
	end
	local affected = {}
	if result.path then
		table.insert(affected, result.path)
	end
	if result.previousPath then
		table.insert(affected, result.previousPath)
	end
	if result.files then
		for _, file in ipairs(result.files) do
			if type(file) == "table" and file.path then
				table.insert(affected, file.path)
			end
		end
	end
	if result.managedFiles then
		for _, file in ipairs(result.managedFiles) do
			if type(file) == "table" and file.canonicalPath then
				table.insert(affected, file.canonicalPath)
			end
		end
	end
	local snapshots = result.snapshots
	local snapshotIds = {}
	if type(snapshots) == "table" then
		for _, snap in ipairs(snapshots) do
			if type(snap) == "table" and snap.id then
				table.insert(snapshotIds, snap.id)
			end
		end
	end
	result.success = result.ok ~= false
	result.ok = result.ok ~= false
	result.commandId = command.id
	result.runId = command.runId
	result.stepId = command.stepId
	result.operation = commandType
	result.operationId = command.operationId
	result.idempotencyKey = command.idempotencyKey
	result.affectedPaths = result.affectedPaths or affected
	result.previousHashes = result.previousHashes or {}
	result.resultingHashes = result.resultingHashes or {}
	result.warnings = result.warnings or {}
	result.diagnostics = result.diagnostics or {}
	result.output = result.output or {}
	result.duration = math.max(0, commandStartedMs() - started)
	result.snapshotIds = result.snapshotIds or snapshotIds
	result.retryable = result.retryable == true
	result.targetAttestation = currentStudioTargetAttestation(true)

	if (commandType == "get_project_manifest" or commandType == "inspect_place") and result.ok ~= false then
		setManifestInfo({
			revision = result.revision,
			itemCount = result.totalInstances or result.count,
			indexedAt = os.time(),
			staleAfter = 300,
		})
	end

	if result.ok ~= false and isMutatingCommand(commandType) then
		setAgentPhase("verifying")
	end

	if result.ok ~= false then
		local okVerify, verified, checks, verificationEvidence = pcall(verifyCommandOutcome, command, payload, result)
		if okVerify then
			result.verified = verified
			if checks then
				result.verificationChecks = checks
			end
			if isMutatingCommand(commandType) then
				verificationEvidence = type(verificationEvidence) == "table" and verificationEvidence or {}
				verificationEvidence.commandType = commandType
				verificationEvidence.checks = checks or {}
				verificationEvidence.affectedPaths = result.affectedPaths
				verificationEvidence.snapshotIds = result.snapshotIds
				result.verification = {
					verified = verified == true,
					source = "studio_readback",
					evidence = verificationEvidence,
				}
			end
			if verified == false then
				local failedPath
				for _, check in ipairs(checks or {}) do
					if not check.ok then
						failedPath = check.path
						break
					end
				end
				result.ok = false
				result.success = false
				result.retryable = true
				result.code = "apply_unverified"
				if type(result.verification) == "table" then
					result.verification.code = "STUDIO_READBACK_CHECK_FAILED"
					result.verification.message = "At least one Studio post-state check failed."
				end
				result.error = {
					code = "apply_unverified",
					message = "Command reported success but the change could not be verified in Studio"
						.. (failedPath and (" (" .. tostring(failedPath) .. ")") or ""),
					retryable = true,
				}
			end
		else
			-- A verifier exception makes the mutation outcome ambiguous. Fail closed
			-- so the backend cannot persist an apparent success without read-back.
			local verificationMessage = tostring(verified)
			local failedCheck = {
				kind = "instance_identity",
				path = result.path or payload.path or "",
				ok = false,
				reason = "verification_error",
			}
			result.verified = false
			result.verificationChecks = { failedCheck }
			result.verificationError = verificationMessage
			result.verification = {
				verified = false,
				source = "studio_readback",
				evidence = {
					commandType = commandType,
					checks = { failedCheck },
					affectedPaths = result.affectedPaths,
					snapshotIds = result.snapshotIds,
				},
				code = "STUDIO_READBACK_VERIFIER_FAILED",
				message = verificationMessage,
			}
			result.ok = false
			result.success = false
			result.retryable = true
			result.code = "apply_unverified"
			result.error = {
				code = "apply_unverified",
				message = "Command applied but Studio post-state verification failed: " .. verificationMessage,
				retryable = true,
			}
		end
	end

	-- Stamp the post-write fingerprint on each snapshot this command produced so a
	-- later restore can tell whether the user edited the instance since the agent
	-- wrote it (see restoreSnapshots' keep-my-edits logic).
	if result.ok ~= false and isMutatingCommand(commandType) and type(result.snapshots) == "table" then
		for _, snap in ipairs(result.snapshots) do
			if type(snap) == "table" and snap.path then
				local okHash, hashValue = pcall(function()
					return snapshotStateHash(resolvePath(snap.path))
				end)
				if okHash then
					snap.postHash = hashValue
				end
			end
		end
	end

	if result.ok == false and type(result.error) ~= "table" then
		result.error = {
			code = tostring(result.code or "studio_command_failed"),
			message = tostring(result.error or "Studio command failed"),
			retryable = result.retryable,
		}
	end
	return result
end

local function finalizeCommandOutcome(command, applyOk, resultOrError)
	local commandType = command.type or "command"
	local snapshotCount = (type(resultOrError) == "table" and #(resultOrError.snapshots or {})) or 0
	local duration = type(resultOrError) == "table" and resultOrError.duration or nil

	if applyOk and type(resultOrError) == "table" and resultOrError.ok == false then
		local rawError = resultOrError.error
		local message
		if type(rawError) == "table" then
			message = tostring(rawError.message or rawError.code or "Studio command failed")
		else
			message = tostring(rawError or "Studio command failed")
		end
		if not ack(command, "failed", resultOrError, message) then
			resultOrError.outcome = isMutatingCommand(commandType) and "studio_state_uncertain" or "failed_unconfirmed"
			resultOrError.receiptPending = true
			setBridgeState("reconciling", "result confirmation pending")
			setLast(commandType .. " finished locally; website confirmation is pending")
			pushActivity({ commandType = commandType, status = "uncertain", duration = duration, snapshotCount = snapshotCount, detail = message })
			showToast("Confirming " .. commandType .. " result", "info")
			return "uncertain"
		end
		setLast(commandType .. " failed: " .. message)
		pushActivity({
			commandType = commandType,
			status = "failed",
			duration = duration,
			snapshotCount = snapshotCount,
			detail = message,
		})
		showToast(commandType .. " failed", "error")
		return "failed"
	end

	if applyOk then
		if not ack(command, "succeeded", resultOrError, nil) then
			if type(resultOrError) == "table" then
				resultOrError.outcome = "applied_unconfirmed"
				resultOrError.receiptPending = true
			end
			setBridgeState("reconciling", "applied; result confirmation pending")
			setLast(commandType .. " applied in Studio; website confirmation is pending")
			pushActivity({ commandType = commandType, status = "uncertain", duration = duration, snapshotCount = snapshotCount, detail = "Applied in Studio; result confirmation pending" })
			showToast("Confirming " .. commandType .. " result", "info")
			return "uncertain"
		end
		local extra = ""
		if type(resultOrError) == "table" and resultOrError.validation then
			local v = resultOrError.validation
			if (v.failures or 0) > 0 then
				extra = (" - %d/%d file(s) flagged"):format(v.failures, v.total or 0)
			end
		end
		if snapshotCount > 0 then
			extra = extra .. (" (" .. snapshotCount .. " snapshot(s))")
		end
		setLast(("%s succeeded%s"):format(commandType, extra))
		pushActivity({
			commandType = commandType,
			status = "succeeded",
			duration = duration,
			snapshotCount = snapshotCount,
			detail = extra ~= "" and extra or nil,
			verified = type(resultOrError) == "table" and resultOrError.verified,
			affectedPaths = type(resultOrError) == "table" and resultOrError.affectedPaths or nil,
		})
		setAgentPhase("done")
		showToast(commandType .. " succeeded", "success")
		return "succeeded"
	end

	local message = tostring(resultOrError)
	if not ack(command, "failed", {
		outcome = isMutatingCommand(commandType) and "studio_state_uncertain" or "failed",
		operationId = command.operationId,
		idempotencyKey = command.idempotencyKey,
	}, message) then
		setBridgeState("reconciling", "result confirmation pending")
		setLast(commandType .. " stopped with an uncertain Studio result; website confirmation is pending")
		pushActivity({ commandType = commandType, status = "uncertain", duration = duration, detail = message })
		showToast("Confirming " .. commandType .. " result", "info")
		return "uncertain"
	end
	setLast(commandType .. " failed: " .. message)
	pushActivity({
		commandType = commandType,
		status = "failed",
		duration = duration,
		detail = message,
	})
	showToast(commandType .. " failed", "error")
	return "failed"
end

-- Queue of commands claimed by the poll loop but not yet executed. Polling
-- (which keeps the backend session alive) is decoupled from execution so a long
-- apply or an approval prompt can never stall the connection.
local commandQueue, queuedCommandIds, activeCommandId = {}, {}, nil
local executorBusy, executorStartedAt, EXECUTOR_WATCHDOG_MS = false, 0, 30 * 60 * 1000

function pendingCommandCount()
	return #commandQueue
end

function isExecutorBusy()
	return executorBusy == true
end

-- Poll the backend exactly once and enqueue any claimed command. This never
-- executes work itself, so it returns quickly and the session heartbeat implicit
-- in every poll stays fresh even while the executor is busy.
function pullOnce(waitMs)
	local token = getToken()
	if not token then
		setBridgeState("unpaired")
		return { authFailed = false, idle = true, hadCommand = false, error = false }
	end

	local pollWait = math.clamp(tonumber(waitMs) or 2000, 500, 24000)
	setPollingPulse(true)
	local ok, data, statusCode = request(
		"GET",
		"/api/studio/commands/next?waitMs=" .. tostring(pollWait),
		nil,
		token
	)
	setPollingPulse(false)

	if statusCode == 401 or statusCode == 403 then
		recordStudioFreshness("poll", false, "authentication expired", getLastLatencyMs())
		handleSessionExpired()
		return { authFailed = true, idle = false, hadCommand = false, error = true }
	end

	if not ok then
		recordStudioFreshness("poll", false, tostring(data), getLastLatencyMs())
		setBridgeState("degraded", "poll failed")
		setLast(tostring(data))
		return { authFailed = false, idle = false, hadCommand = false, error = true }
	end
	recordStudioFreshness("poll", true, nil, getLastLatencyMs())

	if statusCode == 204 or not data or not data.command then
		if not executorBusy and #commandQueue == 0 then
			local compatibility, detail = getStudioCompatibilityStatus()
			if compatibility == "degraded" then
				setBridgeState("degraded", detail and ("Unavailable: " .. tostring(detail)) or "Some Studio features are unavailable")
			else
				local targetReady, targetDetail = getStudioTargetReadiness()
				if targetReady == false then
					setBridgeState("target_changed", targetDetail)
				else
					setBridgeState("live")
				end
			end
			setActive("none")
			setAgentPhase("idle")
		end
		return { authFailed = false, idle = true, hadCommand = false, error = false }
	end

	local command = data.command
	command.id = command.id or command.commandId
	if not command.id then
		setBridgeState("degraded", "invalid command envelope")
		setLast("Studio command envelope did not include a command ID")
		return { authFailed = false, idle = false, hadCommand = false, error = true }
	end
	if tonumber(command.lifecycleVersion) == 2 then
		local fence = type(command.lease) == "table" and tonumber(command.lease.fence) or tonumber(command.leaseFence)
		if not fence or fence < 1 then
			setBridgeState("degraded", "invalid command lease")
			setLast("Reliable Studio command did not include a valid lease fence")
			return { authFailed = false, idle = false, hadCommand = false, error = true }
		end
		if queuedCommandIds[command.id] or activeCommandId == command.id then
			ack(command, "received", { duplicate = true }, nil)
			return { authFailed = false, idle = false, hadCommand = true, error = false }
		end
		if isMutatingCommand(command.type) then
			local reconciled, confirmed = reconcileStoredCommandReceipt(command)
			if reconciled then
				return { authFailed = false, idle = false, hadCommand = true, error = confirmed ~= true }
			end
		end
		-- A durable received receipt is the acceptance boundary. Never execute a
		-- reliable command when that receipt could not be persisted server-side.
		if not ack(command, "received", { stage = "received" }, nil) then
			setBridgeState("degraded", "receipt failed")
			setLast("Command receipt could not be saved; execution was deferred safely")
			return { authFailed = false, idle = false, hadCommand = false, error = true }
		end
	end
	queuedCommandIds[command.id] = true
	table.insert(commandQueue, command)
	setBridgeState("working", "queued " .. tostring(command.type or "command"))
	return { authFailed = false, idle = false, hadCommand = true, error = false }
end

-- Execute a single command from the queue (approval gate + run + ack). Called on
-- its own loop so it can block for as long as needed without pausing polling.
function processNextCommand()
	if executorBusy then
		if executorStartedAt > 0 and (commandStartedMs() - executorStartedAt) > EXECUTOR_WATCHDOG_MS then
			-- Safety net: the executor is a synchronous pcall, so this should be
			-- unreachable, but never let a wedged flag permanently block work.
			executorBusy = false
			executorStartedAt = 0
		else
			return false
		end
	end
	if #commandQueue == 0 then
		return false
	end

	local command = table.remove(commandQueue, 1)
	queuedCommandIds[command.id] = nil
	activeCommandId = command.id
	executorBusy = true
	executorStartedAt = commandStartedMs()
	setBusy(true)
	setBridgeState("working", command.label or command.type)

	local finished, outcome = pcall(function()
		if isMutatingCommand(command.type) then
			local targetOk, approvalAttestation = validateCommandStudioTarget(command, "before_approval", nil)
			if not targetOk then
				return finalizeCommandOutcome(command, true, approvalAttestation)
			end
			command._approvedStudioAttestation = approvalAttestation
		end
		if getApprovalModeEnabledExport() and isMutatingCommand(command.type) then
			setBridgeState("working", "awaiting approval")
			local approved = waitForApproval(command)
			if not approved then
				return finalizeCommandOutcome(command, true, {
					ok = false,
					success = false,
					code = "STUDIO_APPROVAL_DECLINED",
					operationId = command.operationId,
					idempotencyKey = command.idempotencyKey,
					error = { code = "STUDIO_APPROVAL_DECLINED", message = "declined in Studio", retryable = false },
				})
			end
		end
		if tonumber(command.lifecycleVersion) == 2 then
			if not ack(command, "started", { stage = "started" }, nil) then
				setLast("Command start receipt could not be saved; execution was deferred safely")
				setBridgeState("degraded", "start receipt failed")
				return "deferred"
			end
			if isMutatingCommand(command.type) and not storeCommandReceipt(command, "started", {
				outcome = "execution_started",
				operationId = command.operationId,
				idempotencyKey = command.idempotencyKey,
			}) then
				setLast("The local operation journal could not be saved; execution was deferred safely")
				setBridgeState("degraded", "operation journal unavailable")
				return "deferred"
			end
		end

		local recording = beginRecording("NexusRBX " .. tostring(command.type or "command"))
		local applyOk, resultOrError = pcall(function()
			return executeCommand(command)
		end)
		if applyOk then
			finishRecording(recording, type(resultOrError) == "table" and resultOrError.ok ~= false)
		else
			finishRecording(recording, false)
		end
		return finalizeCommandOutcome(command, applyOk, resultOrError)
	end)

	executorBusy = false
	executorStartedAt = 0
	activeCommandId = nil
	setActive("none")
	setBusy(false)
	if #commandQueue == 0 and outcome ~= "uncertain" and outcome ~= "deferred" then
		local compatibility, detail = getStudioCompatibilityStatus()
		if compatibility == "degraded" then
			setBridgeState("degraded", detail and ("Unavailable: " .. tostring(detail)) or "Some Studio features are unavailable")
		else
			local targetReady, targetDetail = getStudioTargetReadiness()
			if targetReady == false then
				setBridgeState("target_changed", targetDetail)
			else
				setBridgeState("live")
			end
		end
	end
	return finished ~= false
end
