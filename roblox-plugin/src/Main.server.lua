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
		pullOnce()
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
	else
		finishRecording(recording, false)
		setLast("local restore failed: " .. tostring(resultOrError))
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
	setRun(nil)
	setActive("none")
	setStatus("not paired")
	setLast("disconnected")
	refreshControls()
end)

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

task.spawn(function()
	while true do
		task.wait(2)
		if getToken() then
			pullOnce()
		end
	end
end)

updateSnapshotLabel()
if getToken() then
	setStatus("connected")
else
	setStatus("not paired")
end
