local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")

local root = script.Parent
local source = root:WaitForChild("_NexusSource")
local Responsive = require(source.Runtime.Responsive)
local ButtonEffects = require(source.Runtime.ButtonEffects)

Responsive.bind(root)

local connections = {}
local feedbackControllers = {}
local dragging = nil

local function connect(signal, fn)
	local c = signal:Connect(fn)
	table.insert(connections, c)
	return c
end

local function registerFeedback(button)
	if feedbackControllers[button] then
		return
	end

	local visual = button:FindFirstChild("Visual") or button
	local shadow = button:FindFirstChild("Shadow")
	local ok, controller = pcall(function()
		return ButtonEffects.bind(button, {
			visual = visual,
			shadow = shadow,
			hoverScale = button.Name == "PlayButton" and 1.03 or 1.025,
			pressScale = button.Name == "PlayButton" and 0.97 or 0.965,
			duration = 0.12,
			sounds = false,
			hoverEnabled = true,
			animations = true,
		})
	end)
	if ok and controller then
		feedbackControllers[button] = controller
	end
end

local function descendantsByName(name)
	local list = {}
	for _, descendant in ipairs(root:GetDescendants()) do
		if descendant.Name == name then
			table.insert(list, descendant)
		end
	end
	return list
end

local function firstDescendantOf(instance, name)
	for _, descendant in ipairs(instance:GetDescendants()) do
		if descendant.Name == name then
			return descendant
		end
	end
	return nil
end

local function tween(instance, info, goal)
	local t = TweenService:Create(instance, info, goal)
	t:Play()
	return t
end

local openInfo = TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
local closeInfo = TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut)
local fadeInfo = TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

local activeModalName = nil

local function getVisibleGroup()
	local desktop = firstDescendantOf(root, "_NexusDesktop")
	local mobile = firstDescendantOf(root, "_NexusMobile")
	if mobile and mobile.Visible then
		return mobile
	end
	return desktop
end

local function setBackdropVisible(group, visible)
	if not group then
		return
	end
	local backdrop = firstDescendantOf(group, "ModalBackdrop")
	if not backdrop then
		return
	end
	if visible then
		backdrop.Visible = true
		backdrop.BackgroundTransparency = 1
		tween(backdrop, fadeInfo, { BackgroundTransparency = 0.42 })
	else
		local t = tween(backdrop, closeInfo, { BackgroundTransparency = 1 })
		connect(t.Completed, function()
			if activeModalName == nil then
				backdrop.Visible = false
			end
		end)
	end
end

local function openModal(name)
	local group = getVisibleGroup()
	if not group then
		return
	end

	for _, modalName in ipairs({ "SettingsModalHost", "CreditsModalHost" }) do
		local host = firstDescendantOf(group, modalName)
		if host then
			if modalName == name then
				host.Visible = true
				host.GroupTransparency = nil
				local scale = host:FindFirstChild("OpenScale")
				if scale then
					scale.Scale = GuiService.ReducedMotionEnabled and 1 or 0.96
					tween(scale, openInfo, { Scale = 1 })
				end
				host.BackgroundTransparency = 1
				tween(host, fadeInfo, { BackgroundTransparency = 1 })
			else
				host.Visible = false
			end
		end
	end

	activeModalName = name
	setBackdropVisible(group, true)
end

local function closeModal(name)
	local group = getVisibleGroup()
	if not group then
		return
	end

	local host = firstDescendantOf(group, name)
	if not host then
		return
	end

	local scale = host:FindFirstChild("OpenScale")
	if scale and not GuiService.ReducedMotionEnabled then
		tween(scale, closeInfo, { Scale = 0.97 })
	end

	local done = tween(host, closeInfo, {})
	connect(done.Completed, function()
		host.Visible = false
	end)

	if activeModalName == name then
		activeModalName = nil
		setBackdropVisible(group, false)
	end
end

local function closeAllModals()
	for _, groupName in ipairs({ "_NexusDesktop", "_NexusMobile" }) do
		for _, descendant in ipairs(descendantsByName(groupName)) do
			local backdrop = firstDescendantOf(descendant, "ModalBackdrop")
			if backdrop then
				backdrop.Visible = false
				backdrop.BackgroundTransparency = 1
			end
			local settings = firstDescendantOf(descendant, "SettingsModalHost")
			if settings then
				settings.Visible = false
			end
			local credits = firstDescendantOf(descendant, "CreditsModalHost")
			if credits then
				credits.Visible = false
			end
		end
	end
	activeModalName = nil
end

local function updateToggle(toggle)
	local state = toggle:FindFirstChild("State")
	local visual = toggle:FindFirstChild("Visual")
	if not state or not visual then
		return
	end
	local onNode = visual:FindFirstChild("MusicToggleOn")
	local offNode = visual:FindFirstChild("MusicToggleOff")
	if onNode then
		onNode.Visible = state.Value
	end
	if offNode then
		offNode.Visible = not state.Value
	end
end

local function setSliderValue(slider, alpha)
	alpha = math.clamp(alpha, 0, 1)
	local valueObject = slider:FindFirstChild("Value")
	if valueObject then
		valueObject.Value = alpha
	end

	local clip = slider:FindFirstChild("TrackFillClip")
	local handle = slider:FindFirstChild("Handle")
	if clip then
		clip.Size = UDim2.new(alpha, 0, clip.Size.Y.Scale, clip.Size.Y.Offset)
	end
	if handle then
		handle.Position = UDim2.new(alpha, 0, 0.5, 0)
	end

	local volumeRow = slider.Parent
	if volumeRow then
		local volumeValue = volumeRow:FindFirstChild("VolumeValue")
		if volumeValue and volumeValue:IsA("TextLabel") then
			volumeValue.Text = tostring(math.floor(alpha * 100 + 0.5)) .. "%"
		end
	end
end

local function sliderAlphaFromInput(slider, inputPositionX)
	local absolutePosition = slider.AbsolutePosition
	local absoluteSize = slider.AbsoluteSize
	if absoluteSize.X <= 0 then
		return 0
	end
	return math.clamp((inputPositionX - absolutePosition.X) / absoluteSize.X, 0, 1)
end

for _, buttonName in ipairs({
	"PlayButton",
	"SettingsButton",
	"CreditsButton",
	"SettingsCloseButton",
	"CreditsCloseButton",
}) do
	for _, button in ipairs(descendantsByName(buttonName)) do
		if button:IsA("GuiButton") then
			registerFeedback(button)
		end
	end
end

for _, toggle in ipairs(descendantsByName("MusicToggle")) do
	if toggle:IsA("GuiButton") then
		updateToggle(toggle)
		connect(toggle.Activated, function()
			local state = toggle:FindFirstChild("State")
			if state then
				state.Value = not state.Value
				updateToggle(toggle)
			end
		end)
		registerFeedback(toggle)
	end
end

for _, slider in ipairs(descendantsByName("VolumeSlider")) do
	local valueObject = slider:FindFirstChild("Value")
	if valueObject then
		setSliderValue(slider, valueObject.Value)
	end

	local hitArea = slider:FindFirstChild("HitArea")
	local handle = slider:FindFirstChild("Handle")

	local function beginDrag(x)
		dragging = slider
		setSliderValue(slider, sliderAlphaFromInput(slider, x))
	end

	if hitArea and hitArea:IsA("GuiButton") then
		connect(hitArea.InputBegan, function(input)
			if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
				beginDrag(input.Position.X)
			end
		end)
	end

	if handle and handle:IsA("GuiButton") then
		registerFeedback(handle)
		connect(handle.InputBegan, function(input)
			if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
				beginDrag(input.Position.X)
			end
		end)
	end
end

connect(UserInputService.InputChanged, function(input)
	if not dragging then
		return
	end
	if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
		setSliderValue(dragging, sliderAlphaFromInput(dragging, input.Position.X))
	end
end)

connect(UserInputService.InputEnded, function(input)
	if not dragging then
		return
	end
	if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
		dragging = nil
	end
end)

for _, button in ipairs(descendantsByName("SettingsButton")) do
	if button:IsA("GuiButton") then
		connect(button.Activated, function()
			openModal("SettingsModalHost")
		end)
	end
end

for _, button in ipairs(descendantsByName("CreditsButton")) do
	if button:IsA("GuiButton") then
		connect(button.Activated, function()
			openModal("CreditsModalHost")
		end)
	end
end

for _, button in ipairs(descendantsByName("SettingsCloseButton")) do
	if button:IsA("GuiButton") then
		connect(button.Activated, function()
			closeModal("SettingsModalHost")
		end)
	end
end

for _, button in ipairs(descendantsByName("CreditsCloseButton")) do
	if button:IsA("GuiButton") then
		connect(button.Activated, function()
			closeModal("CreditsModalHost")
		end)
	end
end

for _, backdrop in ipairs(descendantsByName("ModalBackdrop")) do
	if backdrop:IsA("GuiButton") then
		connect(backdrop.Activated, function()
			if activeModalName then
				closeModal(activeModalName)
			end
		end)
	end
end

for _, button in ipairs(descendantsByName("PlayButton")) do
	if button:IsA("GuiButton") then
		connect(button.Activated, function()
			closeAllModals()
			root.Enabled = false
			local hook = root:FindFirstChild("OnPlayRequestedHook")
			if hook and hook:IsA("BindableEvent") then
				hook:Fire()
			end
		end)
	end
end

connect(root.Destroying, function()
	for _, controller in pairs(feedbackControllers) do
		pcall(function()
			controller:Destroy()
		end)
	end
	for _, c in ipairs(connections) do
		c:Disconnect()
	end
	table.clear(connections)
	table.clear(feedbackControllers)
end)