do
	local override = plugin:GetSetting("nexusrbxBackendUrl")
	if type(override) == "string" and string.find(string.lower(override), "railway%.app", 1, true) then
		plugin:SetSetting("nexusrbxBackendUrl", nil)
	end
end

-- Command delivery stays closed until the backend has acknowledged this exact
-- bundle. Network failures are treated as a connection repair, never as proof
-- that the plugin is obsolete.
local compatibilityHandshakeReady = false
local compatibilityStatus = "unknown"
local compatibilityDetail = nil

local function studioAttestationPayload()
	local attestation = getPluginAttestation()
	local payload = {
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
		universeId = tostring(game.GameId),
		pluginVersion = attestation.pluginVersion,
		protocolVersion = attestation.protocolVersion,
		buildId = attestation.buildId,
		supportedCommands = attestation.supportedCommands,
		capabilities = attestation.capabilities,
	}

	local enabledCapabilities = {}
	for capability, enabled in pairs(attestation.capabilities or {}) do
		if enabled == true then
			table.insert(enabledCapabilities, tostring(capability))
		end
	end
	table.sort(enabledCapabilities)
	local commands = table.clone(attestation.supportedCommands or {})
	table.sort(commands)
	local fingerprintInput = table.concat({
		payload.pluginVersion,
		payload.protocolVersion,
		payload.buildId,
		table.concat(commands, ","),
		table.concat(enabledCapabilities, ","),
	}, "|")
	local hash = 2166136261
	for index = 1, #fingerprintInput do
		hash = bit32.bxor(hash, string.byte(fingerprintInput, index))
		hash = (hash * 16777619) % 4294967296
	end
	payload.attestationFingerprint = string.format("%08x", hash)
	return payload
end

local function resetCompatibilityHandshake()
	compatibilityHandshakeReady = false
	compatibilityStatus = "unknown"
	compatibilityDetail = nil
end

function getStudioCompatibilityStatus()
	return compatibilityStatus, compatibilityDetail
end

local function compatibilityFromHeartbeat(heartbeat)
	if type(heartbeat) ~= "table" then
		return nil
	end
	if type(heartbeat.compatibility) == "table" then
		return heartbeat.compatibility
	end
	if type(heartbeat.details) == "table" and type(heartbeat.details.compatibility) == "table" then
		return heartbeat.details.compatibility
	end
	return nil
end

local function applyCompatibility(heartbeat)
	local compatibility = compatibilityFromHeartbeat(heartbeat)
	if not compatibility then
		return false
	end
	compatibilityStatus = tostring(compatibility.status or "unknown")
	local missingCommand = type(compatibility.missingCommands) == "table" and compatibility.missingCommands[1] or nil
	local missingCapability = type(compatibility.missingCapabilities) == "table" and compatibility.missingCapabilities[1] or nil
	local reasonCode = type(compatibility.reasonCodes) == "table" and compatibility.reasonCodes[1] or nil
	compatibilityDetail = missingCommand or missingCapability or reasonCode

	if compatibilityStatus == "compatible" or compatibilityStatus == "degraded" then
		compatibilityHandshakeReady = true
		if compatibilityStatus == "degraded" then
			setBridgeState("degraded", compatibilityDetail and ("Unavailable: " .. tostring(compatibilityDetail)) or "Some Studio features are unavailable")
			setLast(compatibilityDetail and ("Connected with limited features: " .. tostring(compatibilityDetail)) or "Connected with limited Studio features")
		else
			-- Compatible must leave CONNECTING. Previously only degraded/live
			-- poll paths updated the pill, so a healthy handshake could stick on
			-- "CONNECTING" / "Restoring Studio connection" forever.
			setBridgeState("live")
			setLast("Studio connection ready")
		end
		return true
	end

	compatibilityHandshakeReady = false
	if compatibilityStatus == "update_required" then
		setBridgeState("error")
		setLast("This Studio plugin release is no longer supported. Reinstall NexusRBXStudioBridge.plugin.lua.")
	else
		setBridgeState("connecting")
		local reason = compatibilityDetail and tostring(compatibilityDetail) or compatibilityStatus
		setLast("Restoring Studio connection (" .. reason .. ")")
	end
	return true
end

local function pairStudio()
	if pairButton:GetAttribute("NexusEnabled") ~= true then
		return
	end
	local code = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	if code == "" then
		setStatus("enter pairing code")
		codeBox:CaptureFocus()
		return
	end

	setBusy(true)
	setStatus("pairing...")
	local ok, dataOrError = request("POST", "/api/studio/pair/claim", {
		code = code,
		studio = studioAttestationPayload(),
	}, nil)

	setBusy(false)
	if not ok then
		local message = tostring(dataOrError)
		local parsed = string.match(message, '"error"%s*:%s*"([^"]+)"')
			or string.match(message, '"message"%s*:%s*"([^"]+)"')
		if parsed then
			message = parsed
		end
		setStatus("pair failed")
		setLast(message)
		showToast(message, "error")
		codeBox:CaptureFocus()
		return
	end

	setToken(dataOrError.token)
	plugin:SetSetting("nexusrbxStudioSessionId", dataOrError.sessionId)
	resetCompatibilityHandshake()
	-- Pairing already returns the authoritative compatibility contract. Apply it
	-- immediately so reconnect does not wait on a later ping that can leave the
	-- UI stuck in CONNECTING while the session is actually usable.
	if not applyCompatibility(dataOrError) then
		setBridgeState("connecting")
		setLast("paired session " .. tostring(dataOrError.sessionId) .. " · finishing handshake")
	else
		setLast("paired session " .. tostring(dataOrError.sessionId))
	end
	codeBox.Text = ""
	setStatus("connected")
	pushActivity({
		commandType = "pair",
		status = "succeeded",
		detail = tostring(dataOrError.sessionId),
	})
	showToast("Studio paired", "success")
	refreshControls()
end

pairButton.MouseButton1Click:Connect(pairStudio)

codeBox.FocusLost:Connect(function(enterPressed)
	if enterPressed then
		pairStudio()
	end
end)

pullButton.MouseButton1Click:Connect(function()
	if pullButton:GetAttribute("NexusEnabled") == true then
		if not compatibilityHandshakeReady then
			setLast("Restoring Studio connection")
			showToast("Restoring Studio connection", "info")
			return
		end
		local result = pullOnce(2000)
		setHealth(os.time(), getLastLatencyMs())
		if result and result.error and not result.authFailed then
			showToast("Pull failed", "error")
		elseif result and result.idle then
			showToast("Up to date", "info")
		end
	end
end)

restoreButton.MouseButton1Click:Connect(function()
	if restoreButton:GetAttribute("NexusEnabled") == true then
		showRestoreConfirmation()
	end
end)

cancelRestoreButton.MouseButton1Click:Connect(hideRestoreConfirmation)

confirmRestoreButton.MouseButton1Click:Connect(function()
	local force = confirmRestoreButton:GetAttribute("ForceRestore") == true
	hideRestoreConfirmation()
	if #localSnapshots == 0 then
		setLast("no local snapshots to restore")
		return
	end
	local recording = beginRecording("NexusRBX restore local snapshots")
	local ok, resultOrError = pcall(function()
		return restoreSnapshots({ snapshots = localSnapshots, force = force })
	end)
	if ok then
		finishRecording(recording, true)
		local keptText = (resultOrError.kept or 0) > 0 and (", %d kept (you edited them)"):format(resultOrError.kept) or ""
		setLast(("local restore complete: %d restored, %d removed%s"):format(resultOrError.restored or 0, resultOrError.removed or 0, keptText))
		pushActivity({
			commandType = "restore_all",
			status = "succeeded",
			detail = tostring(#localSnapshots) .. " snapshots" .. keptText,
		})
		showToast((resultOrError.kept or 0) > 0 and ("Restored; kept %d of your edits"):format(resultOrError.kept) or "Snapshots restored", "success")
	else
		finishRecording(recording, false)
		setLast("local restore failed: " .. tostring(resultOrError))
		showToast("Restore failed", "error")
	end
	updateSnapshotLabel()
end)

playtestLogsButton.MouseButton1Click:Connect(function()
	if playtestLogsButton:GetAttribute("NexusEnabled") == false then
		return
	end
	setButtonEnabled(playtestLogsButton, false, "Reading output...")
	local ok, result = pcall(function()
		return collectOutput({ maxMessages = 200 })
	end)
	setButtonEnabled(playtestLogsButton, true, "Check playtest output")
	if not ok or type(result) ~= "table" then
		playtestStrip.Visible = true
		playtestStrip.Text = "Could not read output logs."
		return
	end
	local summary = result.summary or {}
	local errors = tonumber(summary.errors) or 0
	local warnings = tonumber(summary.warnings) or 0
	local total = tonumber(summary.total) or 0
	local lines = {}
	if errors > 0 or warnings > 0 then
		table.insert(lines, ("<b>%d error(s), %d warning(s)</b> of %d message(s)"):format(errors, warnings, total))
	else
		table.insert(lines, ("No errors or warnings in %d message(s)."):format(total))
	end
	-- Show the last few error/warning lines for quick triage.
	local shown = 0
	local messages = result.output or {}
	for i = #messages, 1, -1 do
		local entry = messages[i]
		if entry and (entry.level == "error" or entry.level == "warning") then
			local prefix = entry.level == "error" and '<font color="#D64550">ERR</font> ' or '<font color="#D39127">WARN</font> '
			table.insert(lines, prefix .. tostring(entry.message):sub(1, 160))
			shown = shown + 1
			if shown >= 5 then
				break
			end
		end
	end
	playtestStrip.Visible = true
	playtestStrip.Text = table.concat(lines, "\n")
	pushActivity({
		commandType = "get_output_logs",
		status = errors > 0 and "failed" or "succeeded",
		detail = ("%d errors, %d warnings"):format(errors, warnings),
	})
end)

disconnectButton.MouseButton1Click:Connect(function()
	if disconnectButton:GetAttribute("NexusEnabled") ~= true then
		return
	end
	local token = getToken()
	if not token then
		setStatus("not paired")
		setLast("already disconnected")
		return
	end
	setStatus("disconnecting...")
	pcall(function()
		request("POST", "/api/studio/session/disconnect", {}, token)
	end)
	plugin:SetSetting("nexusrbxStudioToken", nil)
	plugin:SetSetting("nexusrbxStudioSessionId", nil)
	resetCompatibilityHandshake()
	codeBox.Text = ""
	setProgress({})
	setActive("none")
	setStatus("not paired")
	setLast("disconnected")
	showToast("Studio disconnected", "info")
	refreshControls()
end)

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

local function shouldAutoPull()
	local setting = plugin:GetSetting("nexusrbxAutoPull")
	return setting ~= false
end

-- Poll loop: continuously long-polls for commands and enqueues them. Polling is
-- read-only for session credentials; the heartbeat loop owns liveness touches.
task.spawn(function()
	local idleWaitMs = 2000
	local failureBackoff = 0

	while true do
		if not getToken() then
			task.wait(2)
			continue
		end
		if not shouldAutoPull() then
			task.wait(2)
			continue
		end
		if not compatibilityHandshakeReady then
			task.wait(0.5)
			continue
		end
		-- Only claim one command at a time. While the executor is busy the ping
		-- loop keeps the session alive, so we don't over-claim commands that could
		-- be stranded as "delivered" if Studio closes mid-queue.
		if isExecutorBusy() or pendingCommandCount() > 0 then
			task.wait(0.25)
			continue
		end

		local result = pullOnce(idleWaitMs)
		setHealth(os.time(), getLastLatencyMs())

		if result.authFailed then
			idleWaitMs = 2000
			failureBackoff = 0
			task.wait(2)
		elseif result.error then
			failureBackoff = math.min(failureBackoff > 0 and (failureBackoff * 2) or 2, 30)
			idleWaitMs = 2000
			task.wait(failureBackoff)
		elseif result.hadCommand then
			-- More work likely waiting; poll again quickly to pipeline.
			idleWaitMs = 2000
			failureBackoff = 0
			task.wait(0.2)
		elseif result.idle then
			failureBackoff = 0
			idleWaitMs = math.min(idleWaitMs + 2000, 24000)
			task.wait(0.25)
		else
			task.wait(1)
		end
	end
end)

-- Executor loop: drains the command queue one command at a time. Runs
-- independently of polling so long applies / approval prompts can never freeze
-- the connection.
task.spawn(function()
	while true do
		if getToken() and compatibilityHandshakeReady and pendingCommandCount() > 0 then
			local ok = pcall(processNextCommand)
			if ok then
				task.wait(0.1)
			else
				task.wait(0.5)
			end
		else
			task.wait(0.2)
		end
	end
end)

-- Heartbeat loop: one request keeps the session live and returns collaborator
-- plus companion health summaries. The backend throttles persistence.
task.spawn(function()
	local failureCount = 0
	while true do
		if getToken() then
			local signatureOk, signature = pcall(computePlaceSignature)
			local ok, latency, authExpired, heartbeat = pingSession(
				getToken(),
				signatureOk and signature or nil,
				studioAttestationPayload()
			)
			local hadCompatibility = applyCompatibility(heartbeat)
			if ok then
				failureCount = 0
				setHealth(os.time(), latency)
				if type(heartbeat) == "table" then
					updateCollaborators(heartbeat.collaborators)
					if type(heartbeat.mcp) == "table" then
						setMcpCompanionStatus(heartbeat.mcp)
					end
				end
			elseif authExpired then
				failureCount = 0
				resetCompatibilityHandshake()
				handleSessionExpired()
			else
				failureCount = math.min(failureCount + 1, 8)
				if not compatibilityHandshakeReady and not hadCompatibility then
					compatibilityStatus = "repairing"
					setBridgeState("connecting")
					setLast("Restoring Studio connection")
				end
				local healthOk, healthLatency = pingHealth()
				if healthOk then
					setHealth(os.time(), healthLatency)
				end
			end
			if failureCount > 0 then
				local delay = math.min(0.75 * (2 ^ (failureCount - 1)), 30) + (math.random() * 0.35)
				task.wait(delay)
			else
				task.wait(compatibilityHandshakeReady and 15 or 1)
			end
		else
			failureCount = 0
			task.wait(1)
		end
	end
end)

updateSnapshotLabel()
if getToken() then
	setBridgeState("connecting")
else
	setBridgeState("unpaired")
end
