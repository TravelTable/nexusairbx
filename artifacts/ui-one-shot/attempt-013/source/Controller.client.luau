local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local root = script.Parent
local source = root:WaitForChild("_NexusSource")
local Responsive = require(source.Runtime.Responsive)
local ButtonEffects = require(source.Runtime.ButtonEffects)

Responsive.bind(root)

local cleanup = {}

local function addCleanup(item)
	cleanup[#cleanup + 1] = item
	return item
end

local function onDestroy()
	for _, item in ipairs(cleanup) do
		if typeof(item) == "RBXScriptConnection" then
			item:Disconnect()
		elseif type(item) == "table" and item.Destroy then
			item:Destroy()
		elseif typeof(item) == "Instance" then
			item:Destroy()
		end
	end
	table.clear(cleanup)
end

addCleanup(root.Destroying:Connect(onDestroy))

local function forEachNamedDescendant(containerName, nodeName, callback)
	for _, container in ipairs(root:GetDescendants()) do
		if container:IsA("GuiObject") and container.Name == containerName then
			for _, node in ipairs(container:GetDescendants()) do
				if node.Name == nodeName then
					callback(node, container)
				end
			end
		end
	end
end

local allModals = {}
local allMenuContainers = {}
local allButtons = {}
local allSliders = {}
local allToggles = {}

local function getVisual(button)
	return button:FindFirstChild("Visual") or button
end

forEachNamedDescendant("_NexusDesktop", "PlayButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusDesktop", "SettingsButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusDesktop", "CreditsButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusDesktop", "SettingsCloseButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusDesktop", "CreditsCloseButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "PlayButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "SettingsButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "CreditsButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "SettingsCloseButton", function(node)
	allButtons[#allButtons + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "CreditsCloseButton", function(node)
	allButtons[#allButtons + 1] = node
end)

for _, button in ipairs(allButtons) do
	local shadow = button:FindFirstChild("ShadowPlate")
	local ok, binding = pcall(function()
		return ButtonEffects.bind(button, {
			visual = getVisual(button),
			hoverScale = button.Name == "PlayButton" and 1.04 or 1.03,
			pressScale = 0.97,
			duration = 0.11,
			sounds = false,
			shadow = shadow,
		})
	end)
	if ok and binding then
		addCleanup(binding)
	end
end

forEachNamedDescendant("_NexusDesktop", "SettingsModal", function(node)
	allModals[#allModals + 1] = node
end)
forEachNamedDescendant("_NexusDesktop", "CreditsModal", function(node)
	allModals[#allModals + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "SettingsModal", function(node)
	allModals[#allModals + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "CreditsModal", function(node)
	allModals[#allModals + 1] = node
end)

forEachNamedDescendant("_NexusDesktop", "MainMenuDock", function(node, container)
	allMenuContainers[#allMenuContainers + 1] = container
end)
forEachNamedDescendant("_NexusMobile", "MainMenuDock", function(node, container)
	allMenuContainers[#allMenuContainers + 1] = container
end)

forEachNamedDescendant("_NexusDesktop", "MusicToggle", function(node)
	allToggles[#allToggles + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "MusicToggle", function(node)
	allToggles[#allToggles + 1] = node
end)

forEachNamedDescendant("_NexusDesktop", "VolumeSlider", function(node)
	allSliders[#allSliders + 1] = node
end)
forEachNamedDescendant("_NexusMobile", "VolumeSlider", function(node)
	allSliders[#allSliders + 1] = node
end)

local modalTweens = {}
local state = {
	musicEnabled = true,
	volume = 0.75,
}

local function cancelModalTween(modal)
	if modalTweens[modal] then
		modalTweens[modal]:Cancel()
		modalTweens[modal] = nil
	end
end

local function getPanel(modal)
	return modal:FindFirstChild("Panel")
end

local function ensurePanelScale(panel)
	local scale = panel:FindFirstChild("ModalScale")
	if not scale then
		scale = Instance.new("UIScale")
		scale.Name = "ModalScale"
		scale.Scale = 1
		scale.Parent = panel
	end
	return scale
end

local function setModalVisible(modal, visible)
	local panel = getPanel(modal)
	if not panel then
		modal.Visible = visible
		if modal:IsA("CanvasGroup") then
			modal.GroupTransparency = visible and 0 or 1
		end
		return
	end

	cancelModalTween(modal)
	local scale = ensurePanelScale(panel)

	if visible then
		modal.Visible = true
		if modal:IsA("CanvasGroup") then
			modal.GroupTransparency = 1
		end
		scale.Scale = 0.96

		local tween = TweenService:Create(
			modal,
			TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{ GroupTransparency = 0 }
		)
		local scaleTween = TweenService:Create(
			scale,
			TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
			{ Scale = 1 }
		)
		modalTweens[modal] = tween
		tween:Play()
		scaleTween:Play()
	else
		local tween = TweenService:Create(
			modal,
			TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
			{ GroupTransparency = 1 }
		)
		local scaleTween = TweenService:Create(
			scale,
			TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
			{ Scale = 0.96 }
		)
		modalTweens[modal] = tween
		tween:Play()
		scaleTween:Play()
		addCleanup(tween.Completed:Connect(function()
			if modal.GroupTransparency >= 0.99 then
				modal.Visible = false
			end
		end))
	end
end

local function closeAllModals()
	for _, modal in ipairs(allModals) do
		setModalVisible(modal, false)
	end
end

local function openNamedModal(name)
	for _, modal in ipairs(allModals) do
		if modal.Name == name then
			setModalVisible(modal, true)
		else
			setModalVisible(modal, false)
		end
	end
end

local function hideEntireMenu()
	closeAllModals()
	root.Enabled = false
end

local playHook = nil
for _, descendant in ipairs(root:GetDescendants()) do
	if descendant.Name == "OnPlayRequestedHook" and descendant:IsA("BindableEvent") then
		playHook = descendant
		break
	end
end

local function firePlayHook()
	hideEntireMenu()
	if playHook then
		playHook:Fire()
	end
end

local function bindActionByName(name, callback)
	for _, descendant in ipairs(root:GetDescendants()) do
		if descendant.Name == name and descendant:IsA("GuiButton") then
			addCleanup(descendant.Activated:Connect(function()
				callback(descendant)
			end))
		end
	end
end

bindActionByName("PlayButton", firePlayHook)
bindActionByName("SettingsButton", function()
	openNamedModal("SettingsModal")
end)
bindActionByName("CreditsButton", function()
	openNamedModal("CreditsModal")
end)
bindActionByName("SettingsCloseButton", function(button)
	local modal = button:FindFirstAncestor("SettingsModal")
	if modal then
		setModalVisible(modal, false)
	end
end)
bindActionByName("CreditsCloseButton", function(button)
	local modal = button:FindFirstAncestor("CreditsModal")
	if modal then
		setModalVisible(modal, false)
	end
end)
bindActionByName("Blocker", function(button)
	local modal = button.Parent
	if modal and (modal.Name == "SettingsModal" or modal.Name == "CreditsModal") then
		setModalVisible(modal, false)
	end
end)

local function applyToggleVisual(toggle, enabled)
	local visual = toggle:FindFirstChild("Visual")
	if not visual then
		return
	end
	local fill = visual:FindFirstChild("ToggleFill")
	local thumb = visual:FindFirstChild("ToggleThumb")
	local accent = visual:FindFirstChild("ToggleAccent")
	local stateLabel = visual:FindFirstChild("StateLabel")

	if stateLabel and stateLabel:IsA("TextLabel") then
		stateLabel.Text = enabled and "ON" or "OFF"
		stateLabel.TextColor3 = enabled and Color3.fromRGB(244, 251, 255) or Color3.fromRGB(184, 212, 232)
	end

	if fill and fill:IsA("Frame") then
		fill.BackgroundColor3 = enabled and Color3.fromRGB(57, 213, 255) or Color3.fromRGB(39, 87, 186)
	end

	if accent and accent:IsA("Frame") then
		accent.Position = enabled and UDim2.new(0.2, 0, 0.5, 0) or UDim2.new(0.8, 0, 0.5, 0)
		accent.BackgroundTransparency = enabled and 0.35 or 0.6
	end

	if thumb and thumb:IsA("Frame") then
		local target = enabled and UDim2.new(1, -(thumb.AbsoluteSize.X + 4), 0.5, 0) or UDim2.new(0, 4, 0.5, 0)
		local tween = TweenService:Create(thumb, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Position = target,
			Size = thumb.Size,
		})
		tween:Play()
	end
end

for _, toggle in ipairs(allToggles) do
	applyToggleVisual(toggle, state.musicEnabled)
	addCleanup(toggle.Activated:Connect(function()
		state.musicEnabled = not state.musicEnabled
		for _, other in ipairs(allToggles) do
			applyToggleVisual(other, state.musicEnabled)
		end
	end))
end

local activeDrag = nil

local function updateSlider(slider, alpha)
	alpha = math.clamp(alpha, 0, 1)
	local fill = slider:FindFirstChild("Track") and slider.Track:FindFirstChild("Fill")
	local handle = slider:FindFirstChild("Handle")
	local row = slider.Parent
	local valueLabel = row and row:FindFirstChild("VolumeValue")

	if fill and fill:IsA("Frame") then
		fill.Size = UDim2.new(alpha, 0, 1, 0)
	end
	if handle and handle:IsA("Frame") then
		handle.Position = UDim2.new(alpha, 0, 0.5, 0)
	end
	if valueLabel and valueLabel:IsA("TextLabel") then
		valueLabel.Text = tostring(math.floor(alpha * 100 + 0.5)) .. "%"
	end
end

local function updateAllSliders(alpha)
	state.volume = alpha
	for _, slider in ipairs(allSliders) do
		updateSlider(slider, alpha)
	end
end

updateAllSliders(state.volume)

local function sliderAlphaFromInput(slider, inputPositionX)
	local absolutePosition = slider.AbsolutePosition.X
	local absoluteSize = slider.AbsoluteSize.X
	if absoluteSize <= 0 then
		return state.volume
	end
	return (inputPositionX - absolutePosition) / absoluteSize
end

for _, slider in ipairs(allSliders) do
	local hit = slider:FindFirstChild("DragHitTarget")
	if hit and hit:IsA("GuiButton") then
		addCleanup(hit.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
				activeDrag = slider
				updateAllSliders(math.clamp(sliderAlphaFromInput(slider, input.Position.X), 0, 1))
				local handle = slider:FindFirstChild("Handle")
				if handle and handle:IsA("Frame") then
					handle.Size = UDim2.fromOffset(32, 32)
				end
			end
		end))

		addCleanup(hit.Activated:Connect(function()
			local position = UserInputService:GetMouseLocation()
			updateAllSliders(math.clamp(sliderAlphaFromInput(slider, position.X), 0, 1))
		end))
	end
end

addCleanup(UserInputService.InputChanged:Connect(function(input)
	if not activeDrag then
		return
	end
	if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
		updateAllSliders(math.clamp(sliderAlphaFromInput(activeDrag, input.Position.X), 0, 1))
	end
end))

addCleanup(UserInputService.InputEnded:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
		if activeDrag then
			local handle = activeDrag:FindFirstChild("Handle")
			if handle and handle:IsA("Frame") then
				handle.Size = UDim2.fromOffset(26, 26)
				if math.min(activeDrag.AbsoluteSize.X, activeDrag.AbsoluteSize.Y) > 40 then
					if handle.AbsoluteSize.X > 26 then
						handle.Size = UDim2.fromOffset(30, 30)
					end
				end
			end
		end
		activeDrag = nil
	end
end))