do
	local override = plugin:GetSetting("nexusrbxBackendUrl")
	if type(override) == "string" and string.find(string.lower(override), "railway%.app", 1, true) then
		plugin:SetSetting("nexusrbxBackendUrl", nil)
	end
end

-- A Studio reinstall retains plugin settings, including the existing session
-- token. Refresh the server-side build proof automatically so a new bundle is
-- accepted without asking the creator to disconnect and pair again.
local attestationRefreshed = false
local nextAttestationRefreshAt = 0

local function studioAttestationPayload()
	local attestation = getPluginAttestation()
	return {
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
		pluginVersion = attestation.pluginVersion,
		protocolVersion = attestation.protocolVersion,
		buildId = attestation.buildId,
		supportedCommands = attestation.supportedCommands,
		capabilities = attestation.capabilities,
	}
end

local function refreshSessionAttestation()
	if attestationRefreshed or not getToken() or os.clock() < nextAttestationRefreshAt then
		return false, false
	end
	local ok, _data, statusCode = request("POST", "/api/studio/session/attestation", {
		studio = studioAttestationPayload(),
	}, getToken(), { maxAttempts = 1 })
	if ok then
		attestationRefreshed = true
		return true, false
	end
	nextAttestationRefreshAt = os.clock() + 60
	return false, statusCode == 401 or statusCode == 403
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
	attestationRefreshed = true
	codeBox.Text = ""
	setStatus("connected")
	setLast("paired session " .. tostring(dataOrError.sessionId))
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
	attestationRefreshed = false
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
		if getToken() and pendingCommandCount() > 0 then
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
	local _refreshed, authExpired = refreshSessionAttestation()
	if authExpired then
		handleSessionExpired()
	end

	while true do
		task.wait(15)
		if getToken() then
			local _attested, attestationAuthExpired = refreshSessionAttestation()
			if attestationAuthExpired then
				handleSessionExpired()
				continue
			end
			local signatureOk, signature = pcall(computePlaceSignature)
			local ok, latency, authExpired, heartbeat = pingSession(getToken(), signatureOk and signature or nil)
			if ok then
				setHealth(os.time(), latency)
				if type(heartbeat) == "table" then
					updateCollaborators(heartbeat.collaborators)
					if type(heartbeat.mcp) == "table" then
						setMcpCompanionStatus(heartbeat.mcp)
					end
				end
			elseif authExpired then
				handleSessionExpired()
			else
				local healthOk, healthLatency = pingHealth()
				if healthOk then
					setHealth(os.time(), healthLatency)
				end
			end
		end
	end
end)

updateSnapshotLabel()
if getToken() then
	setBridgeState("connecting")
else
	setBridgeState("unpaired")
end
