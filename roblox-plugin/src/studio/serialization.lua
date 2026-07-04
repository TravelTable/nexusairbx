
local SERVICE_ROOTS = {
	ReplicatedStorage = ReplicatedStorage,
	ServerScriptService = ServerScriptService,
	ServerStorage = ServerStorage,
	StarterGui = StarterGui,
	StarterPlayer = StarterPlayer,
	Workspace = Workspace,
	Lighting = Lighting,
}

local NATIVE_MODEL_LIMITS = {
	maxInstances = 750,
	maxBaseParts = 400,
	maxConstraints = 150,
	maxAttachments = 300,
	maxLights = 50,
	maxParticleEmitters = 30,
	maxTreeDepth = 32,
	maxTagsPerInstance = 20,
	maxAttributesPerInstance = 30,
	maxModelExtent = 4096,
}

local NATIVE_ALLOWED_ROOTS = {
	Workspace = Workspace,
	ReplicatedStorage = ReplicatedStorage,
	ServerStorage = ServerStorage,
}

local NATIVE_CLASSES = {
	Model = true,
	Folder = true,
	Part = true,
	WedgePart = true,
	CornerWedgePart = true,
	TrussPart = true,
	Seat = true,
	VehicleSeat = true,
	SpawnLocation = true,
	Decal = true,
	Texture = true,
	PointLight = true,
	SurfaceLight = true,
	SpotLight = true,
	Highlight = true,
	ParticleEmitter = true,
	Attachment = true,
	ObjectValue = true,
	StringValue = true,
	BoolValue = true,
	NumberValue = true,
	IntValue = true,
	Configuration = true,
	WeldConstraint = true,
	HingeConstraint = true,
	BallSocketConstraint = true,
	RopeConstraint = true,
	RodConstraint = true,
	SpringConstraint = true,
	PrismaticConstraint = true,
	CylindricalConstraint = true,
	AlignPosition = true,
	AlignOrientation = true,
}

local NATIVE_BASE_PART_CLASSES = {
	Part = true,
	WedgePart = true,
	CornerWedgePart = true,
	TrussPart = true,
	Seat = true,
	VehicleSeat = true,
	SpawnLocation = true,
}

local NATIVE_CONSTRAINT_CLASSES = {
	WeldConstraint = true,
	HingeConstraint = true,
	BallSocketConstraint = true,
	RopeConstraint = true,
	RodConstraint = true,
	SpringConstraint = true,
	PrismaticConstraint = true,
	CylindricalConstraint = true,
	AlignPosition = true,
	AlignOrientation = true,
}

local NATIVE_LIGHT_CLASSES = {
	PointLight = true,
	SurfaceLight = true,
	SpotLight = true,
}

local NATIVE_PROPERTY_ALLOWLIST = {
	Model = {},
	Folder = {},
	Configuration = {},
	Part = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, Shape = true, CollisionGroup = true, Massless = true, Locked = true },
	WedgePart = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, CollisionGroup = true, Massless = true, Locked = true },
	CornerWedgePart = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, CollisionGroup = true, Massless = true, Locked = true },
	TrussPart = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, CollisionGroup = true, Massless = true, Locked = true },
	Seat = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, CollisionGroup = true, Massless = true, Locked = true, Disabled = true },
	VehicleSeat = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, CollisionGroup = true, Massless = true, Locked = true, Disabled = true },
	SpawnLocation = { Anchored = true, CanCollide = true, CanTouch = true, CanQuery = true, CastShadow = true, Transparency = true, Reflectance = true, Material = true, Color = true, Size = true, CFrame = true, CollisionGroup = true, Massless = true, Locked = true, Enabled = true, Duration = true, Neutral = true },
	Decal = { Color3 = true, Transparency = true, Face = true, Texture = true },
	Texture = { Color3 = true, Transparency = true, Face = true, Texture = true, StudsPerTileU = true, StudsPerTileV = true },
	PointLight = { Brightness = true, Color = true, Enabled = true, Range = true, Shadows = true },
	SurfaceLight = { Brightness = true, Color = true, Enabled = true, Range = true, Shadows = true, Angle = true, Face = true },
	SpotLight = { Brightness = true, Color = true, Enabled = true, Range = true, Shadows = true, Angle = true, Face = true },
	Highlight = { Enabled = true, FillColor = true, OutlineColor = true, FillTransparency = true, OutlineTransparency = true, DepthMode = true },
	ParticleEmitter = { Enabled = true, LightEmission = true, LightInfluence = true, Rate = true, Lifetime = true, Speed = true, Size = true, Transparency = true },
	Attachment = { Position = true, Orientation = true, CFrame = true, Axis = true, SecondaryAxis = true, Visible = true },
	ObjectValue = { Value = true },
	StringValue = { Value = true },
	BoolValue = { Value = true },
	NumberValue = { Value = true },
	IntValue = { Value = true },
	WeldConstraint = { Enabled = true },
	HingeConstraint = { Enabled = true, LimitsEnabled = true, ActuatorType = true, AngularSpeed = true, AngularVelocity = true, MaxTorque = true, Restitution = true, Visible = true },
	BallSocketConstraint = { Enabled = true, LimitsEnabled = true, MaxFrictionTorque = true, Restitution = true, Visible = true },
	RopeConstraint = { Enabled = true, Length = true, Thickness = true, Visible = true },
	RodConstraint = { Enabled = true, Length = true, Thickness = true, Visible = true },
	SpringConstraint = { Enabled = true, FreeLength = true, MaxForce = true, Stiffness = true, Damping = true, Visible = true },
	PrismaticConstraint = { Enabled = true, LimitsEnabled = true, ActuatorType = true, MaxForce = true, Restitution = true, Visible = true },
	CylindricalConstraint = { Enabled = true, LimitsEnabled = true, ActuatorType = true, AngularSpeed = true, MaxTorque = true, MaxForce = true, Restitution = true, Visible = true },
	AlignPosition = { Enabled = true, MaxForce = true, Responsiveness = true, RigidityEnabled = true, Visible = true },
	AlignOrientation = { Enabled = true, MaxTorque = true, Responsiveness = true, RigidityEnabled = true, Visible = true },
}

local NATIVE_REFERENCE_FIELDS = {
	WeldConstraint = { part0Id = "Part0", part1Id = "Part1" },
	HingeConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	BallSocketConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	RopeConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	RodConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	SpringConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	PrismaticConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	CylindricalConstraint = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	AlignPosition = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
	AlignOrientation = { attachment0Id = "Attachment0", attachment1Id = "Attachment1" },
}

local SCRIPT_CLASSES = {
	Script = true,
	LocalScript = true,
	ModuleScript = true,
}

local NETWORKING_CLASSES = {
	RemoteEvent = true,
	RemoteFunction = true,
	UnreliableRemoteEvent = true,
	BindableEvent = true,
	BindableFunction = true,
}

local CREATABLE_CLASSES = {
	Folder = true,
	RemoteEvent = true,
	RemoteFunction = true,
	BindableEvent = true,
	BindableFunction = true,
	ScreenGui = true,
	Frame = true,
	TextLabel = true,
	TextButton = true,
	TextBox = true,
	ImageLabel = true,
	ImageButton = true,
	ScrollingFrame = true,
	UIListLayout = true,
	UIGridLayout = true,
	UIPadding = true,
	UICorner = true,
	UIStroke = true,
	StringValue = true,
	BoolValue = true,
	NumberValue = true,
	IntValue = true,
	ObjectValue = true,
	Configuration = true,
	Script = true,
	LocalScript = true,
	ModuleScript = true,
}

local AGENT_ARTIFACT_ID_ATTRIBUTE = "AgentArtifactId"
local AGENT_FILE_ID_ATTRIBUTE = "AgentFileId"
local NEXUS_MANAGED_ID_ATTRIBUTE = "NexusManagedId"
local lastBatchSnapshots = {}

local function stableHash(value)
	local hash = 2166136261
	local text = tostring(value or "")
	for i = 1, #text do
		hash = bit32.bxor(hash, string.byte(text, i))
		hash = (hash * 16777619) % 4294967296
	end
	return string.format("%08x", hash)
end

local function nowMs()
	return math.floor(os.clock() * 1000)
end

local function ensureManagedId(inst)
	if not inst or inst == game then
		return nil
	end
	local existing = inst:GetAttribute(NEXUS_MANAGED_ID_ATTRIBUTE)
	if existing and tostring(existing) ~= "" then
		return tostring(existing)
	end
	local nextId = HttpService:GenerateGUID(false)
	local ok = pcall(function()
		inst:SetAttribute(NEXUS_MANAGED_ID_ATTRIBUTE, nextId)
	end)
	return ok and nextId or nil
end

local function readManagedId(inst)
	if not inst or inst == game then
		return nil
	end
	local existing = inst:GetAttribute(NEXUS_MANAGED_ID_ATTRIBUTE)
	return existing and tostring(existing) or nil
end

local function attributesOf(inst)
	local ok, attrs = pcall(function()
		return inst:GetAttributes()
	end)
	return ok and attrs or {}
end

local function safePropertyValue(inst, key)
	local ok, value = pcall(function()
		return inst[key]
	end)
	if not ok then
		return nil
	end
	local valueType = typeof(value)
	if valueType == "string" or valueType == "number" or valueType == "boolean" then
		return value
	elseif valueType == "Color3" then
		return { r = value.R, g = value.G, b = value.B, type = "Color3" }
	elseif valueType == "UDim2" then
		return {
			type = "UDim2",
			xScale = value.X.Scale,
			xOffset = value.X.Offset,
			yScale = value.Y.Scale,
			yOffset = value.Y.Offset,
		}
	elseif valueType == "UDim" then
		return { type = "UDim", scale = value.Scale, offset = value.Offset }
	elseif valueType == "Vector2" then
		return { type = "Vector2", x = value.X, y = value.Y }
	elseif valueType == "Vector3" then
		return { type = "Vector3", x = value.X, y = value.Y, z = value.Z }
	elseif valueType == "EnumItem" then
		return tostring(value)
	end
	return nil
end

local function propertiesOf(inst)
	local props = {
		Name = inst.Name,
		ClassName = inst.ClassName,
	}
	local candidates = {
		"Value",
		"Enabled",
		"ResetOnSpawn",
		"IgnoreGuiInset",
		"Text",
		"Visible",
		"Size",
		"Position",
		"AnchorPoint",
		"BackgroundTransparency",
		"TextTransparency",
		"ImageTransparency",
		"ZIndex",
		"LayoutOrder",
		"SortOrder",
		"Padding",
		"CornerRadius",
		"Thickness",
	}
	for _, key in ipairs(candidates) do
		local value = safePropertyValue(inst, key)
		if value ~= nil then
			props[key] = value
		end
	end
	return props
end

local function propertyHash(inst)
	return stableHash(jsonEncode(propertiesOf(inst)) .. jsonEncode(attributesOf(inst)) .. table.concat(CollectionService:GetTags(inst), ","))
end

local function scriptHash(inst)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return nil
	end
	if type(readScriptSource) ~= "function" then
		return nil
	end
	local ok, source = readScriptSource(inst)
	return ok and stableHash(source) or nil
end

local function structuredUnsupported(operation, message)
	return {
		ok = false,
		success = false,
		operation = operation,
		error = {
			code = "unsupported_in_studio_plugin",
			message = message or (operation .. " is not supported by this Studio plugin runtime"),
			retryable = false,
		},
		warnings = {},
		diagnostics = {},
		affectedPaths = {},
	}
end

local function escapePattern(text)
	return tostring(text or ""):gsub("([^%w])", "%%%1")
end

local function escapeReplacement(text)
	return tostring(text or ""):gsub("%%", "%%%%")
end
