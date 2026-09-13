local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")

local root = script.Parent
local Responsive = require(root._NexusSource.Runtime.Responsive)
local ButtonEffects = require(root._NexusSource.Runtime.ButtonEffects)

Responsive.bind(root)

local bindings = {}
local activeTweens = {}

local function stopTween(key)
	local tween = activeTweens[key]
	if tween then
		tween:Cancel()
		activeTweens[key] = nil
	end
end

local function tween(key, object, info, goal)
	stopTween(key)
	local t = TweenService:Create(object, info, goal)
	activeTweens[key] = t
	t:Play()
	t.Completed:Connect(function()
		if activeTweens[key] == t then
			activeTweens[key] = nil
		end
	end)
	return t
end

local function allNamed(name)
	local results = {}
	for _, descendant in ipairs(root:GetDescendants()) do
		if descendant.Name == name then
			table.insert(results, descendant)
		end
	end
	return results
end

local function isMobileMode()
	local camera = workspace.CurrentCamera
	if not camera then
		return false
	end
	local size = camera.ViewportSize
	return math.min(size.X, size.Y) < 600
end

local function visibleBranch()
	return isMobileMode() and root:FindFirstChild("_NexusMobile") or root:FindFirstChild("_NexusDesktop")
end

local function currentNode(name)
	local branch = visibleBranch()
	if not branch then
		return nil
	end
	return branch:FindFirstChild(name, true)
end

local menuOpen = true
local settingsOpen = false
local creditsOpen = false

local openInfo = TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
local closeInfo = TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut)
local fadeInfo = TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

local function setModalVisibility(modalName, visible)
	for _, modal in ipairs(allNamed(modalName)) do
		if modal:IsA("CanvasGroup") then
			if visible then
				modal.Visible = true
				modal.GroupTransparency = GuiService.ReducedMotionEnabled and 0 or 1
				modal.Position = modal.Position + (GuiService.ReducedMotionEnabled and UDim2.new() or UDim2.fromOffset(0, 6))
				if GuiService.ReducedMotionEnabled then
					modal.GroupTransparency = 0
				else
					tween(modal:GetDebugId() .. "_openFade", modal, fadeInfo, { GroupTransparency = 0 })
					tween(modal:GetDebugId() .. "_openPos", modal, openInfo, { Position = modal.Position - UDim2.fromOffset(0, 6) })
				end
			else
				if GuiService.ReducedMotionEnabled then
					modal.Visible = false
					modal.GroupTransparency = 1
				else
					local original = modal.Position
					local fadeTween = tween(modal:GetDebugId() .. "_closeFade", modal, closeInfo, { GroupTransparency = 1 })
					tween(modal:GetDebugId() .. "_closePos", modal, closeInfo, { Position = original + UDim2.fromOffset(0, 6) })
					fadeTween.Completed:Connect(function(state)
						if state == Enum.PlaybackState.Completed then
							modal.Visible = false
							modal.Position = original
						end
					end)
				end
			end
		end
	end
end

local function refreshDim()
	local anyOpen = settingsOpen or creditsOpen
	for _, dim in ipairs(allNamed("ModalDim")) do
		if dim:IsA("Frame") then
			dim.Visible = anyOpen
			dim.Active = anyOpen
		end
	end
end

local function closeAllPanels()
	settingsOpen = false
	creditsOpen = false
	setModalVisibility("SettingsPanel", false)
	setModalVisibility("CreditsPanel", false)
	refreshDim()
end

local function openSettings()
	creditsOpen = false
	settingsOpen = true
	setModalVisibility("CreditsPanel", false)
	setModalVisibility("SettingsPanel", true)
	refreshDim()
end

local function openCredits()
	settingsOpen = false
	creditsOpen = true
	setModalVisibility("SettingsPanel", false)
	setModalVisibility("CreditsPanel", true)
	refreshDim()
end

local function setMenuVisible(visible)
	menuOpen = visible
	for _, branchName in ipairs({ "_NexusDesktop", "_NexusMobile" }) do
		local branch = root:FindFirstChild(branchName)
		if branch then
			branch.Visible = visible and ((branchName == "_NexusMobile") == isMobileMode())
		end
	end
	if not visible then
		closeAllPanels()
	end
end

local playHookFolder = root:FindFirstChild("PlayIntegrationHook")
local playRequestedEvent = playHookFolder and playHookFolder:FindFirstChild("PlayRequested")

local function firePlayRequestedHook()
	if playRequestedEvent and playRequestedEvent:IsA("BindableEvent") then
		playRequestedEvent:Fire()
	end
end

local musicEnabled = true
local volumeValue = 0.72
local sliderDrag = nil

local function updateMusicToggle(toggle)
	local onNode = toggle:FindFirstChild("Visual") and toggle.Visual:FindFirstChild("MusicToggleOn")
	local thumb = toggle:FindFirstChild("Visual") and toggle.Visual:FindFirstChild("MusicToggleThumb")
	if onNode and thumb then
		onNode.Visible = musicEnabled
		local targetPos = musicEnabled and UDim2.new(1, -(thumb.AbsoluteSize.X + 4), 0.5, 0) or UDim2.new(0, 4, 0.5, 0)
		if GuiService.ReducedMotionEnabled then
			thumb.Position = targetPos
		else
			tween(toggle:GetFullName() .. "_thumb", thumb, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Position = targetPos,
			})
		end
	end
end

local function updateSlider(slider)
	local clip = slider:FindFirstChild("Visual") and slider.Visual:FindFirstChild("VolumeSliderFillClip")
	local handle = slider:FindFirstChild("Visual") and slider.Visual:FindFirstChild("VolumeSliderHandle")
	local row = slider.Parent
	local valueLabel = row and row:FindFirstChild("VolumeValue")
	if clip then
		clip.Size = UDim2.fromScale(volumeValue, 1)
	end
	if handle then
		handle.Position = UDim2.fromScale(volumeValue, 0.5)
	end
	if valueLabel and valueLabel:IsA("TextLabel") then
		valueLabel.Text = tostring(math.floor(volumeValue * 100 + 0.5)) .. "%"
	end
end

local function applyStateToAll()
	for _, toggle in ipairs(allNamed("MusicToggle")) do
		if toggle:IsA("GuiButton") then
			updateMusicToggle(toggle)
		end
	end
	for _, slider in ipairs(allNamed("VolumeSlider")) do
		if slider:IsA("GuiButton") then
			updateSlider(slider)
		end
	end
	refreshDim()
end

local function bindActionButtons()
	for _, buttonName in ipairs({ "PlayButton", "SettingsButton", "CreditsButton", "SettingsCloseButton", "CreditsCloseButton" }) do
		for _, button in ipairs(allNamed(buttonName)) do
			if button:IsA("GuiButton") and not bindings[button] then
				local visual = button:FindFirstChild("Visual") or button
				local shadow = button:FindFirstChild("Shadow")
				bindings[button] = ButtonEffects.bind(button, {
					visual = visual,
					shadow = shadow,
					hoverScale = buttonName == "PlayButton" and 1.04 or 1.03,
					pressScale = 0.97,
					duration = 0.12,
					sounds = false,
				})

				if buttonName == "PlayButton" then
					button.Activated:Connect(function()
						setMenuVisible(false)
						firePlayRequestedHook()
					end)
				elseif buttonName == "SettingsButton" then
					button.Activated:Connect(openSettings)
				elseif buttonName == "CreditsButton" then
					button.Activated:Connect(openCredits)
				elseif buttonName == "SettingsCloseButton" then
					button.Activated:Connect(function()
						settingsOpen = false
						setModalVisibility("SettingsPanel", false)
						refreshDim()
					end)
				elseif buttonName == "CreditsCloseButton" then
					button.Activated:Connect(function()
						creditsOpen = false
						setModalVisibility("CreditsPanel", false)
						refreshDim()
					end)
				end
			end
		end
	end
end

local function bindToggles()
	for _, toggle in ipairs(allNamed("MusicToggle")) do
		if toggle:IsA("GuiButton") and not bindings[toggle] then
			local visual = toggle:FindFirstChild("Visual") or toggle
			bindings[toggle] = ButtonEffects.bind(toggle, {
				visual = visual,
				hoverScale = 1.02,
				pressScale = 0.98,
				duration = 0.1,
				sounds = false,
			})
			toggle.Activated:Connect(function()
				musicEnabled = not musicEnabled
				applyStateToAll()
			end)
		end
	end
end

local function sliderValueFromPosition(slider, x)
	local absPos = slider.AbsolutePosition.X
	local absSize = slider.AbsoluteSize.X
	if absSize <= 0 then
		return volumeValue
	end
	return math.clamp((x - absPos) / absSize, 0, 1)
end

local function bindSliders()
	for _, slider in ipairs(allNamed("VolumeSlider")) do
		if slider:IsA("GuiButton") and not bindings[slider] then
			local visual = slider:FindFirstChild("Visual") or slider
			bindings[slider] = ButtonEffects.bind(slider, {
				visual = visual,
				hoverScale = 1.0,
				pressScale = 1.0,
				duration = 0.08,
				sounds = false,
			})

			slider.InputBegan:Connect(function(input)
				if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
					sliderDrag = {
						source = input,
						slider = slider,
					}
					volumeValue = sliderValueFromPosition(slider, input.Position.X)
					applyStateToAll()
				end
			end)

			slider.InputEnded:Connect(function(input)
				if sliderDrag and sliderDrag.source == input then
					sliderDrag = nil
				end
			end)

			slider.Activated:Connect(function()
				local mouseX = UserInputService:GetMouseLocation().X
				volumeValue = sliderValueFromPosition(slider, mouseX)
				applyStateToAll()
			end)
		end
	end
end

UserInputService.InputChanged:Connect(function(input)
	if sliderDrag and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
		volumeValue = sliderValueFromPosition(sliderDrag.slider, input.Position.X)
		applyStateToAll()
	end
end)

UserInputService.InputEnded:Connect(function(input)
	if sliderDrag and sliderDrag.source == input then
		sliderDrag = nil
	end
end)

root:GetPropertyChangedSignal("Enabled"):Connect(function()
	if not root.Enabled then
		sliderDrag = nil
	end
end)

bindActionButtons()
bindToggles()
bindSliders()
applyStateToAll()
refreshDim()

for _, dim in ipairs(allNamed("ModalDim")) do
	if dim:IsA("GuiObject") then
		dim.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
				closeAllPanels()
			end
		end)
	end
end