local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local root = script.Parent
local source = root:WaitForChild("_NexusSource")
local Responsive = require(source.Runtime.Responsive)
local ButtonEffects = require(source.Runtime.ButtonEffects)

Responsive.bind(root)

for _, warning in ipairs({
	"Required artwork unmet: cmp_action_close_settings component_surface unavailable; using native Roblox close button surface.",
	"Required artwork unmet: cmp_corner_ornaments ornament unavailable; omitted custom corner artwork and used restrained native decoration.",
	"Required artwork unmet: cmp_toggle_music on/off/thumb artwork unavailable; using functional native toggle pieces.",
	"Required artwork unmet: cmp_action_close_settings icon unavailable; using coherent procedural fallback icon family.",
	"Required artwork unmet: cmp_action_play icon unavailable; using coherent procedural fallback icon family.",
	"Required artwork unmet: cmp_title_plate ornament unavailable; using native title plate composition.",
	"Required artwork unmet: cmp_action_credits icon unavailable; using coherent info glyph fallback beside readable label.",
	"Required artwork unmet: cmp_slider_volume track/fill/handle artwork unavailable; using functional native slider pieces.",
}) do
	warn(warning)
end

local tweens = setmetatable({}, { __mode = "k" })
local cleaners = {}

local function playTween(instance, info, goal)
	local existing = tweens[instance]
	if existing then
		existing:Cancel()
	end
	local tween = TweenService:Create(instance, info, goal)
	tweens[instance] = tween
	tween:Play()
	return tween
end

local function getBranch(name)
	local nodes = {}
	for _, node in ipairs(root:GetDescendants()) do
		if node.Name == name then
			table.insert(nodes, node)
		end
	end
	return nodes
end

local function animateModal(host, show)
	local shell = host:FindFirstChildWhichIsA("Frame")
	if not shell then
		host.Visible = show
		return
	end

	local targetScale = shell:FindFirstChild("OpenScale") or Instance.new("UIScale")
	targetScale.Name = "OpenScale"
	targetScale.Parent = shell

	if show then
		host.Visible = true
		targetScale.Scale = 0.97
		shell.GroupTransparency = shell:IsA("CanvasGroup") and 1 or nil
		playTween(targetScale, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Scale = 1 })
		for _, gui in ipairs(shell:GetDescendants()) do
			if gui:IsA("GuiObject") then
				gui.Visible = true
			end
		end
	else
		local tween = playTween(targetScale, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Scale = 0.98 })
		tween.Completed:Connect(function()
			if targetScale.Parent then
				targetScale.Scale = 1
			end
			if host.Parent then
				host.Visible = false
			end
		end)
	end
end

local function bindSlider(slider)
	local valueObject = slider:FindFirstChild("Value")
	local trackButton = slider:FindFirstChild("TrackButton")
	local valueLabel = slider:FindFirstChild("ValueLabel")

	if not valueObject or not trackButton or not valueLabel then
		return
	end

	local visual = trackButton:FindFirstChild("Visual")
	local track = visual and visual:FindFirstChild("SliderTrack")
	local clip = track and track:FindFirstChild("FillClip")
	local handle = visual and visual:FindFirstChild("SliderHandle")
	if not (track and clip and handle) then
		return
	end

	local dragging = false

	local function applyValue(v)
		v = math.clamp(v, 0, 1)
		valueObject.Value = v
		clip.Size = UDim2.new(v, 0, 1, 0)
		handle.Position = UDim2.new(v, 0, 0.5, 0)
		valueLabel.Text = tostring(math.floor(v * 100 + 0.5)) .. "%"
	end

	local function setFromX(screenX)
		local absPos = trackButton.AbsolutePosition.X
		local absSize = trackButton.AbsoluteSize.X
		if absSize <= 0 then
			return
		end
		applyValue((screenX - absPos) / absSize)
	end

	trackButton.Activated:Connect(function()
		local pos = UserInputService:GetMouseLocation()
		setFromX(pos.X)
	end)

	trackButton.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
			dragging = true
			setFromX(input.Position.X)
			playTween(handle, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(handle.AbsoluteSize.X > 32 and 32 or 28, handle.AbsoluteSize.Y > 32 and 32 or 28) })
		end
	end)

	trackButton.InputChanged:Connect(function(input)
		if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
			setFromX(input.Position.X)
		end
	end)

	trackButton.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
			dragging = false
			local isMobile = handle.AbsoluteSize.X > 32
			playTween(handle, TweenInfo.new(0.1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = isMobile and UDim2.fromOffset(34, 34) or UDim2.fromOffset(30, 30) })
		end
	end)

	applyValue(valueObject.Value)
end

local function bindToggle(toggle)
	local visual = toggle:FindFirstChild("Visual")
	local onState = visual and visual:FindFirstChild("ToggleOn")
	local offState = visual and visual:FindFirstChild("ToggleOff")
	local thumb = visual and visual:FindFirstChild("ToggleThumb")
	local stateLabel = visual and visual:FindFirstChild("StateLabel")
	if not (onState and offState and thumb and stateLabel) then
		return
	end

	local isOn = true
	local onX = 1 - (thumb.Size.X.Offset + 4) / math.max(1, toggle.AbsoluteSize.X)

	local function refresh(animated)
		onState.Visible = isOn
		offState.Visible = not isOn
		stateLabel.Text = isOn and "ON" or "OFF"
		local goal = isOn and UDim2.new(onX, 0, 0.5, 0) or UDim2.new(0, 4, 0.5, 0)
		if animated then
			playTween(thumb, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = goal })
		else
			thumb.Position = goal
		end
	end

	toggle.Activated:Connect(function()
		isOn = not isOn
		refresh(true)
	end)

	refresh(false)
end

local activeModalByRoot = {}

local function setupGroup(group)
	local playButton = group:FindFirstChild("PlayButton", true)
	local settingsButton = group:FindFirstChild("SettingsButton", true)
	local creditsButton = group:FindFirstChild("CreditsButton", true)
	local settingsHost = group:FindFirstChild("SettingsModalHost", true)
	local creditsHost = group:FindFirstChild("CreditsModalHost", true)
	local overlay = group:FindFirstChild("ModalOverlay", true)
	local dismiss = overlay and overlay:FindFirstChild("Dismiss")
	local hook = group:FindFirstChild("OnPlayRequestedHook", true)

	local function hideAll()
		activeModalByRoot[group] = nil
		if overlay then
			overlay.Visible = false
		end
		if dismiss then
			dismiss.Visible = false
		end
		if settingsHost and settingsHost.Visible then
			animateModal(settingsHost, false)
		end
		if creditsHost and creditsHost.Visible then
			animateModal(creditsHost, false)
		end
	end

	local function showModal(which)
		activeModalByRoot[group] = which
		if overlay then
			overlay.Visible = true
		end
		if dismiss then
			dismiss.Visible = true
		end
		if which == "Settings" then
			if creditsHost then
				creditsHost.Visible = false
			end
			if settingsHost then
				animateModal(settingsHost, true)
			end
		elseif which == "Credits" then
			if settingsHost then
				settingsHost.Visible = false
			end
			if creditsHost then
				animateModal(creditsHost, true)
			end
		end
	end

	if playButton then
		table.insert(cleaners, ButtonEffects.bind(playButton, {
			visual = playButton:FindFirstChild("Visual") or playButton,
			hoverScale = 1.035,
			pressScale = 0.965,
			duration = 0.12,
			sounds = false,
		}))
		playButton.Activated:Connect(function()
			hideAll()
			root.Enabled = false
			root:SetAttribute("PlayRequested", true)
			if hook and hook:IsA("BindableEvent") then
				hook:Fire()
			end
		end)
	end

	if settingsButton then
		table.insert(cleaners, ButtonEffects.bind(settingsButton, {
			visual = settingsButton:FindFirstChild("Visual") or settingsButton,
			hoverScale = 1.025,
			pressScale = 0.972,
			duration = 0.12,
			sounds = false,
		}))
		settingsButton.Activated:Connect(function()
			if activeModalByRoot[group] == "Settings" then
				hideAll()
			else
				showModal("Settings")
			end
		end)
	end

	if creditsButton then
		table.insert(cleaners, ButtonEffects.bind(creditsButton, {
			visual = creditsButton:FindFirstChild("Visual") or creditsButton,
			hoverScale = 1.025,
			pressScale = 0.972,
			duration = 0.12,
			sounds = false,
		}))
		creditsButton.Activated:Connect(function()
			if activeModalByRoot[group] == "Credits" then
				hideAll()
			else
				showModal("Credits")
			end
		end)
	end

	if dismiss then
		dismiss.Activated:Connect(hideAll)
	end

	if settingsHost then
		local closeButton = settingsHost:FindFirstChild("SettingsCloseButton", true)
		if closeButton and closeButton:IsA("GuiButton") then
			table.insert(cleaners, ButtonEffects.bind(closeButton, {
				visual = closeButton:FindFirstChild("Visual") or closeButton,
				hoverScale = 1.02,
				pressScale = 0.96,
				duration = 0.1,
				sounds = false,
			}))
			closeButton.Activated:Connect(hideAll)
		end

		local toggle = settingsHost:FindFirstChild("MusicToggle", true)
		if toggle then
			bindToggle(toggle)
			table.insert(cleaners, ButtonEffects.bind(toggle, {
				visual = toggle:FindFirstChild("Visual") or toggle,
				hoverScale = 1.015,
				pressScale = 0.98,
				duration = 0.1,
				sounds = false,
			}))
		end

		local slider = settingsHost:FindFirstChild("VolumeSlider", true)
		if slider then
			bindSlider(slider)
		end
	end

	if creditsHost then
		local closeButton = creditsHost:FindFirstChild("CreditsCloseButton", true)
		if closeButton and closeButton:IsA("GuiButton") then
			table.insert(cleaners, ButtonEffects.bind(closeButton, {
				visual = closeButton:FindFirstChild("Visual") or closeButton,
				hoverScale = 1.02,
				pressScale = 0.96,
				duration = 0.1,
				sounds = false,
			}))
			closeButton.Activated:Connect(hideAll)
		end
	end
end

for _, groupName in ipairs({ "_NexusDesktop", "_NexusMobile" }) do
	for _, group in ipairs(getBranch(groupName)) do
		setupGroup(group)
	end
end

root.Destroying:Connect(function()
	for _, cleaner in ipairs(cleaners) do
		if cleaner and cleaner.Destroy then
			cleaner:Destroy()
		end
	end
end)