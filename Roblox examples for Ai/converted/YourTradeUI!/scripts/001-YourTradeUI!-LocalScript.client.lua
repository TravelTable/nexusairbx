local TweenService = game:GetService("TweenService")

local screenGui = script.Parent
local holderFrame = screenGui:WaitForChild("HolderFrame")

local buttonFrame = holderFrame:WaitForChild("Button")
local openButton = buttonFrame:WaitForChild("Button1")

local tradeFrame = holderFrame:WaitForChild("Trade")
local closeButton = tradeFrame:WaitForChild("Header"):WaitForChild("CloseBtn")

local isOpen = false
local isAnimating = false

local originalTradePosition = tradeFrame.Position
local originalTradeRotation = tradeFrame.Rotation

local originalButtonRotation = buttonFrame.Rotation
local originalButtonPosition = buttonFrame.Position

local function getOrCreateScale(guiObject)
	local scale = guiObject:FindFirstChildOfClass("UIScale")

	if not scale then
		scale = Instance.new("UIScale")
		scale.Scale = 1
		scale.Parent = guiObject
	end

	return scale
end

local tradeScale = getOrCreateScale(tradeFrame)
local buttonScale = getOrCreateScale(buttonFrame)
local closeScale = getOrCreateScale(closeButton)

tradeFrame.Visible = false
tradeScale.Scale = 0.75
tradeFrame.Position = originalTradePosition
tradeFrame.Rotation = originalTradeRotation

local tweens = {}

local function cancelTween(name)
	if tweens[name] then
		tweens[name]:Cancel()
		tweens[name] = nil
	end
end

local function playTween(name, object, tweenInfo, goal)
	cancelTween(name)

	local tween = TweenService:Create(object, tweenInfo, goal)
	tweens[name] = tween
	tween:Play()

	return tween
end

local hoverInfo = TweenInfo.new(
	0.18,
	Enum.EasingStyle.Quad,
	Enum.EasingDirection.Out
)

local pressInfo = TweenInfo.new(
	0.07,
	Enum.EasingStyle.Quad,
	Enum.EasingDirection.Out
)

local releaseInfo = TweenInfo.new(
	0.22,
	Enum.EasingStyle.Back,
	Enum.EasingDirection.Out
)

local openStartInfo = TweenInfo.new(
	0.18,
	Enum.EasingStyle.Quad,
	Enum.EasingDirection.Out
)

local openFinishInfo = TweenInfo.new(
	0.34,
	Enum.EasingStyle.Back,
	Enum.EasingDirection.Out
)

local closeInfo = TweenInfo.new(
	0.22,
	Enum.EasingStyle.Quad,
	Enum.EasingDirection.In
)

local function playOpenButtonClick()
	playTween("buttonPressScale", buttonScale, pressInfo, {
		Scale = 0.86
	})

	playTween("buttonPressRotation", buttonFrame, pressInfo, {
		Rotation = originalButtonRotation - 2
	})

	task.delay(0.07, function()
		playTween("buttonReleaseScale", buttonScale, releaseInfo, {
			Scale = 1.06
		})

		playTween("buttonReleaseRotation", buttonFrame, releaseInfo, {
			Rotation = originalButtonRotation
		})
	end)

	task.delay(0.22, function()
		playTween("buttonSettleScale", buttonScale, TweenInfo.new(
			0.16,
			Enum.EasingStyle.Quad,
			Enum.EasingDirection.Out
			), {
				Scale = 1
			})
	end)
end

local function playCloseButtonClick()
	playTween("closePressScale", closeScale, pressInfo, {
		Scale = 0.78
	})

	task.delay(0.07, function()
		playTween("closeReleaseScale", closeScale, releaseInfo, {
			Scale = 1
		})
	end)
end

local function openTrade()
	if isAnimating or isOpen then
		return
	end

	isAnimating = true
	isOpen = true

	tradeFrame.Visible = true
	tradeScale.Scale = 0.62
	tradeFrame.Position = originalTradePosition + UDim2.fromOffset(0, 42)
	tradeFrame.Rotation = originalTradeRotation - 7

	playTween("tradeOpenScaleStart", tradeScale, openStartInfo, {
		Scale = 1.08
	})

	playTween("tradeOpenFrameStart", tradeFrame, openStartInfo, {
		Position = originalTradePosition + UDim2.fromOffset(0, -8),
		Rotation = originalTradeRotation + 2
	})

	task.delay(0.16, function()
		local finalTween = playTween("tradeOpenScaleFinish", tradeScale, openFinishInfo, {
			Scale = 1
		})

		playTween("tradeOpenFrameFinish", tradeFrame, openFinishInfo, {
			Position = originalTradePosition,
			Rotation = originalTradeRotation
		})

		finalTween.Completed:Once(function()
			isAnimating = false
		end)
	end)
end

local function closeTrade()
	if isAnimating or not isOpen then
		return
	end

	isAnimating = true
	isOpen = false

	playCloseButtonClick()

	local scaleTween = playTween("tradeCloseScale", tradeScale, closeInfo, {
		Scale = 0.68
	})

	playTween("tradeCloseFrame", tradeFrame, closeInfo, {
		Position = originalTradePosition + UDim2.fromOffset(0, 36),
		Rotation = originalTradeRotation + 5
	})

	scaleTween.Completed:Once(function()
		tradeFrame.Visible = false
		tradeFrame.Position = originalTradePosition
		tradeFrame.Rotation = originalTradeRotation
		tradeScale.Scale = 1
		isAnimating = false
	end)
end

local function toggleTrade()
	playOpenButtonClick()

	if isOpen then
		closeTrade()
	else
		openTrade()
	end
end

openButton.MouseButton1Click:Connect(toggleTrade)

closeButton.MouseButton1Click:Connect(function()
	if isOpen then
		closeTrade()
	end
end)

openButton.MouseEnter:Connect(function()
	if isAnimating then
		return
	end

	playTween("buttonHoverScale", buttonScale, hoverInfo, {
		Scale = 1.045
	})

	playTween("buttonHoverMove", buttonFrame, hoverInfo, {
		Position = originalButtonPosition + UDim2.fromOffset(0, -3)
	})
end)

openButton.MouseLeave:Connect(function()
	playTween("buttonLeaveScale", buttonScale, hoverInfo, {
		Scale = 1
	})

	playTween("buttonLeaveMove", buttonFrame, hoverInfo, {
		Position = originalButtonPosition
	})
end)

closeButton.MouseEnter:Connect(function()
	playTween("closeHoverScale", closeScale, hoverInfo, {
		Scale = 1.12
	})
end)

closeButton.MouseLeave:Connect(function()
	playTween("closeLeaveScale", closeScale, hoverInfo, {
		Scale = 1
	})
end)