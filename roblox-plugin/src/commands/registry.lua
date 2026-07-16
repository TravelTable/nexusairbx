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
			if opType == "apply_artifact" or opType == "batch_operations" then
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

local function ack(commandId, status, result, errorMessage)
	local token = getToken()
	if not token then
		return
	end
	request("POST", "/api/studio/commands/" .. HttpService:UrlEncode(commandId) .. "/ack", {
		status = status,
		result = result,
		error = errorMessage,
	}, token, { idempotent = true })
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

-- Commands that manage their own state (snapshots/batches) where a naive
-- path re-check would produce false negatives. These are trusted as-is.
local VERIFY_SKIP_COMMANDS = {
	restore_snapshot = true,
	undo_last_batch = true,
	create_snapshot = true,
	batch_operations = true,
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

-- Re-inspect the place after a mutating command to confirm the change is
-- actually present. Returns verified(boolean), checks(table). This is what
-- stops the plugin from reporting "succeeded" when nothing really changed.
local function verifyCommandOutcome(command, payload, result)
	local commandType = command.type or ""
	if not isMutatingCommand(commandType) or VERIFY_SKIP_COMMANDS[commandType] then
		return true, nil
	end

	local checks = {}
	local function pass(path)
		table.insert(checks, { path = path, ok = true })
	end
	local function fail(path, reason)
		table.insert(checks, { path = path, ok = false, reason = reason })
	end

	if DELETE_COMMANDS[commandType] then
		local target = result.path or payload.path
		if type(target) == "string" and target ~= "" and resolvePath(target) then
			fail(target, "still_present")
		else
			pass(target or "")
		end
	elseif SCRIPT_WRITE_COMMANDS[commandType] then
		local target = result.path or payload.path
		local inst, currentHash = currentScriptHashAt(target)
		if not inst then
			fail(target, "missing")
		elseif result.sourceHash and currentHash and currentHash ~= result.sourceHash then
			fail(target, "hash_mismatch")
		else
			pass(target)
		end
	elseif commandType == "apply_artifact" then
		local files = result.managedFiles or result.files or {}
		for _, file in ipairs(files) do
			if type(file) == "table" then
				local p = file.canonicalPath or file.path
				if type(p) == "string" and p ~= "" then
					local inst = resolvePath(p)
					if not inst then
						fail(p, "missing")
					else
						local expected = file.resultingHash or file.sourceHash
						if expected and SCRIPT_CLASSES and SCRIPT_CLASSES[inst.ClassName] then
							local currentHash = scriptHash(inst)
							if currentHash and currentHash ~= expected then
								fail(p, "hash_mismatch")
							else
								pass(p)
							end
						else
							pass(p)
						end
					end
				end
			end
		end
	else
		-- Instance/property/native/import mutations: the resulting path must exist.
		-- previousPath (from rename/move) is intentionally not checked.
		local target = result.path
		if type(target) == "string" and target ~= "" then
			if resolvePath(target) then
				pass(target)
			else
				fail(target, "missing")
			end
		end
	end

	local verified = true
	for _, check in ipairs(checks) do
		if not check.ok then
			verified = false
			break
		end
	end
	return verified, checks
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
	result.affectedPaths = result.affectedPaths or affected
	result.previousHashes = result.previousHashes or {}
	result.resultingHashes = result.resultingHashes or {}
	result.warnings = result.warnings or {}
	result.diagnostics = result.diagnostics or {}
	result.output = result.output or {}
	result.duration = math.max(0, commandStartedMs() - started)
	result.snapshotIds = result.snapshotIds or snapshotIds
	result.retryable = result.retryable == true

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
		local okVerify, verified, checks = pcall(verifyCommandOutcome, command, payload, result)
		if okVerify then
			result.verified = verified
			if checks then
				result.verificationChecks = checks
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
				result.error = {
					code = "apply_unverified",
					message = "Command reported success but the change could not be verified in Studio"
						.. (failedPath and (" (" .. tostring(failedPath) .. ")") or ""),
					retryable = true,
				}
			end
		else
			-- Verification itself errored; don't mask a real success, just flag it.
			result.verified = nil
			result.verificationError = tostring(verified)
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
		ack(command.id, "failed", resultOrError, message)
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
		ack(command.id, "succeeded", resultOrError, nil)
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
	ack(command.id, "failed", nil, message)
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
local commandQueue, executorBusy, executorStartedAt, EXECUTOR_WATCHDOG_MS = {}, false, 0, 30 * 60 * 1000

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
		handleSessionExpired()
		return { authFailed = true, idle = false, hadCommand = false, error = true }
	end

	if not ok then
		setBridgeState("degraded", "poll failed")
		setLast(tostring(data))
		return { authFailed = false, idle = false, hadCommand = false, error = true }
	end

	if statusCode == 204 or not data or not data.command then
		if not executorBusy and #commandQueue == 0 then
			setBridgeState("live")
			setActive("none")
			setAgentPhase("idle")
		end
		return { authFailed = false, idle = true, hadCommand = false, error = false }
	end

	table.insert(commandQueue, data.command)
	setBridgeState("working", "queued " .. tostring(data.command.type or "command"))
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
	executorBusy = true
	executorStartedAt = commandStartedMs()
	setBusy(true)
	setBridgeState("working", command.label or command.type)

	local finished = pcall(function()
		if getApprovalModeEnabledExport() and isMutatingCommand(command.type) then
			setBridgeState("working", "awaiting approval")
			local approved = waitForApproval(command)
			if not approved then
				ack(command.id, "failed", nil, "declined in Studio")
				setLast((command.type or "command") .. " declined in Studio")
				pushActivity({
					commandType = command.type or "command",
					status = "failed",
					detail = "declined in Studio",
				})
				showToast("Command declined", "error")
				return
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
		finalizeCommandOutcome(command, applyOk, resultOrError)
	end)

	executorBusy = false
	executorStartedAt = 0
	setActive("none")
	setBusy(false)
	if #commandQueue == 0 then
		setBridgeState("live")
	end
	return finished ~= false
end
