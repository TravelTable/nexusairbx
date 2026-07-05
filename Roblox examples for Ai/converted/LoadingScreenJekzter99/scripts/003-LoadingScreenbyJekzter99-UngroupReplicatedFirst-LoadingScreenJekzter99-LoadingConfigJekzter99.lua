--[[
    LoadingScreen by Jekzter99 - Crackline Studio
    This is freemodel! Dont sell it.
    Discord: https://discord.com/invite/YRvY8xuvKs
    Note: Jangan ganti nama file - Dont change file name
]]

local Config = {}

Config.BackgroundImage = "rbxassetid://133017525711743" -- Ganti background kamu. Ukuran disarankan 16:9
Config.LoadingDuration = 10 -- Durasi loading dalam detik.

Config.LoadingTexts = { --loading text, urut
	"Preparing to load data",
	"Checking resources",
	"Loading assets",
	"Preparing world",
	"Synchronizing data",
	"Almost ready"
}

Config.LoadCompleteText = "Load complete" --text load complete
Config.Welcome = {
	Enabled = true,
	TextTemplate = "Welcome, {DisplayName} to Crackline Studio", --text welcome section.

	TextSize = 23,
	TextFont = Enum.Font.GothamBold,
	TextTransparency = 0,
	TextStrokeColor = Color3.fromRGB(0, 0, 0),
	TextStrokeTransparency = 0.76,

	Duration = 5, --durasi welcome section

	TextStartOffsetY = 0,
	TextStartScale = 1,
	FadeInTime = 0.45,

	FadeOutTime = 0.85,
	FadeOutOffsetY = 0,

	TypewriterEnabled = true,
	TypewriterStartDelay = 0.12,
	TypewriterTime = 1.45,
}

Config.Skip = {
	Enabled = true,
	Text = "SKIP",
	
	ShowAtSecond = 5, --muncul dalam detik (mengikuti setting loading duration)

	HideAtProgress = 0.99, --hilang dalam persen loading bar (1 = 100%, 0.99 = 99%)

	FadeTime = 0.25,

	TextSize = 22,
	TextTransparency = 0.28,
	HoverTextTransparency = 0,

	LineWidth = 58,
	LineHeight = 2,
	LineTransparency = 0.62,
	HoverLineTransparency = 0.05,

	RightPadding = 28,
	BottomPadding = 22,

	Width = 180,
	Height = 32,
}

Config.SoundEffects = {
	Enabled = true,
	ButtonClickSoundId = "rbxassetid://101912825265215", -- ganti dengan asset id sound effect kamu
	Volume = 1,
	PlaybackSpeed = 1,
}


Config.PlayText = "PLAY" --Text play scene
Config.ShowPlayButtonAfterLoading = true

Config.ClickAnywhereToPlay = true -- ini untuk mengatur tombol play, true = semua layar bisa dipencet, false = hanya di area button play

Config.EnableIntroCamera = true -- Enable or Disable intro camera movement.
Config.CameraMode = "TopReveal" -- Setting camera mode. List ada di camera mode list dibawah

Config.CameraModeList = {
	"OrbitBehind",
	"SoftDolly",
	"SideSweep",
	"LowReveal",
	"TopReveal",
	"BackOnly"
}

Config.CameraWaitTime = 4
Config.CameraLookAtOffset = Vector3.new(0, 1.65, 0)

Config.HideCameraHandoffWithFade = false
Config.HandoffFadeInTime = 0.12
Config.HandoffHoldTime = 0.05
Config.HandoffFadeOutTime = 0.35

Config.SmoothCameraHandoff = true
Config.SmoothCameraHandoffTime = 0.8

Config.LockCameraZoomAfterIntro = true
Config.RestoreZoomLimitsAfterIntro = true
Config.CameraZoomRestoreDelay = 1.2

Config.MaxPreloadAssets = 300
Config.PreloadBatchSize = 20

Config.HideCoreGuiDuringLoading = true

Config.UIReferenceSize = Vector2.new(1280, 720)
Config.MinUIScale = 0.52
Config.MaxUIScale = 1
Config.MobileUIScaleMultiplier = 0.78
Config.TabletUIScaleMultiplier = 0.88

Config.BackgroundZoomTime = 10
Config.PlayTransitionHoldTime = 0.08
Config.PlayTransitionFadeOutTime = 1.05

-- Config Style, kalau mau mengubah atau menyesuaaikan warna
Config.Style = {
	BackgroundColor = Color3.fromRGB(0, 0, 0),
	GradientTop = Color3.fromRGB(10, 10, 10),
	GradientMiddle = Color3.fromRGB(3, 3, 3),
	GradientBottom = Color3.fromRGB(0, 0, 0),

	TextColor = Color3.fromRGB(255, 255, 255),

	-- Overlay
	OverlayTransparency = 0.52,
	BottomFadeHeight = 0.42,

	-- Text setting
	LoadingTextSize = 23,
	PercentTextSize = 19,
	PlayTextSize = 38,

	LoadingTextStrokeTransparency = 0.76,
	PercentTextStrokeTransparency = 0.8,
	PlayTextStrokeTransparency = 0.8,

	-- Loading bar
	BarWidth = 430,
	BarHeight = 10,
	BarCapSize = 13,

	BarBackgroundTransparency = 0.9,
	BarFillTransparency = 0,
	BarStrokeTransparency = 0.12,
	BarShineTransparency = 0.45,
	BarCapTransparency = 0,

	PlayLineDefaultTransparency = 0.28,
	PlayLineHoverTransparency = 0.08,

	TextChangeDelay = 1.35,
	LoadingFadeTime = 0.32,
	PlayFadeTime = 0.35,
}

-- Camera preset dari list tadi.
Config.CameraPresets = {
	OrbitBehind = {
		Name = "Orbit Behind",
		Type = "OrbitBehind",

		OrbitTime = 4.6,
		BehindTime = 2.2,

		OrbitRadius = 20,
		OrbitHeight = 6.2,
		OrbitStartAngle = -150,
		OrbitEndAngle = 205,

		EndOffset = Vector3.new(0, 3.3, 10),

		FOVStart = 48,
		FOVEnd = 70,
		RestoreZoomDistance = 10
	},

	SoftDolly = {
		Name = "Soft Dolly",
		Type = "SoftDolly",

		MoveTime = 5.8,

		StartOffset = Vector3.new(0, 7, 30),
		MidOffset = Vector3.new(0, 5.2, 18),
		EndOffset = Vector3.new(0, 3.3, 10),

		FOVStart = 45,
		FOVEnd = 70,
		RestoreZoomDistance = 10
	},

	SideSweep = {
		Name = "Side Sweep",
		Type = "SideSweep",

		MoveTime = 6.0,

		StartOffset = Vector3.new(-24, 5.5, 18),
		MidOffset = Vector3.new(-10, 4.6, 14),
		EndOffset = Vector3.new(0, 3.3, 10),

		FOVStart = 50,
		FOVEnd = 70,
		RestoreZoomDistance = 10
	},

	LowReveal = {
		Name = "Low Reveal",
		Type = "LowReveal",

		MoveTime = 5.6,

		StartOffset = Vector3.new(0, 1.8, 26),
		MidOffset = Vector3.new(0, 2.4, 16),
		EndOffset = Vector3.new(0, 3.3, 10),

		FOVStart = 42,
		FOVEnd = 70,
		RestoreZoomDistance = 10
	},

	TopReveal = {
		Name = "Top Reveal",
		Type = "TopReveal",

		MoveTime = 6.0,

		StartOffset = Vector3.new(0, 18, 22),
		MidOffset = Vector3.new(0, 9, 15),
		EndOffset = Vector3.new(0, 3.3, 10),

		FOVStart = 50,
		FOVEnd = 70,
		RestoreZoomDistance = 10
	},

	BackOnly = {
		Name = "Back Only",
		Type = "BackOnly",

		MoveTime = 4.4,

		StartOffset = Vector3.new(0, 4.5, 18),
		MidOffset = Vector3.new(0, 4.0, 13),
		EndOffset = Vector3.new(0, 3.3, 10),

		FOVStart = 55,
		FOVEnd = 70,
		RestoreZoomDistance = 10
	}
}

return Config
