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
		studio = {
			placeName = game.Name,
			placeId = tostring(game.PlaceId),
			pluginVersion = PLUGIN_VERSION,
			protocolVersion = STUDIO_PROTOCOL_VERSION,
		},
	}, nil)

	setBusy(false)
	if not ok then
		setStatus("pair failed")
		setLast(tostring(dataOrError))
		codeBox:CaptureFocus()
		return
	end

	setToken(dataOrError.token)
	plugin:SetSetting("nexusrbxStudioSessionId", dataOrError.sessionId)
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
	hideRestoreConfirmation()
	if #localSnapshots == 0 then
		setLast("no local snapshots to restore")
		return
	end
	local recording = beginRecording("NexusRBX restore local snapshots")
	local ok, resultOrError = pcall(function()
		return restoreSnapshots({ snapshots = localSnapshots })
	end)
	if ok then
		finishRecording(recording, true)
		setLast(("local restore complete: %d restored, %d removed"):format(resultOrError.restored or 0, resultOrError.removed or 0))
		pushActivity({
			commandType = "restore_all",
			status = "succeeded",
			detail = tostring(#localSnapshots) .. " snapshots",
		})
		showToast("Snapshots restored", "success")
	else
		finishRecording(recording, false)
		setLast("local restore failed: " .. tostring(resultOrError))
		showToast("Restore failed", "error")
	end
	updateSnapshotLabel()
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

		local result = pullOnce(idleWaitMs)
		setHealth(os.time(), getLastLatencyMs())

		if result.skipped then
			task.wait(0.5)
			continue
		end

		if result.authFailed then
			idleWaitMs = 2000
			failureBackoff = 0
			task.wait(2)
		elseif result.error then
			failureBackoff = math.min(failureBackoff > 0 and (failureBackoff * 2) or 2, 30)
			idleWaitMs = 2000
			task.wait(failureBackoff)
		elseif result.hadCommand then
			idleWaitMs = 2000
			failureBackoff = 0
			task.wait(0.35)
		elseif result.idle then
			failureBackoff = 0
			idleWaitMs = math.min(idleWaitMs + 2000, 24000)
			task.wait(0.25)
		else
			task.wait(1)
		end
	end
end)

task.spawn(function()
	while true do
		task.wait(60)
		if getToken() then
			local ok, latency = pingHealth()
			if ok then
				setHealth(os.time(), latency)
			end
		end
	end
end)

updateSnapshotLabel()
if getToken() then
	setStatus("connected")
else
	setStatus("not paired")
end
