-- Immutable Studio target identity and transport-freshness tracking.
-- Connector identity is stable across sessions; target generation advances
-- whenever this Studio process observes a different place identity.

local studioFreshness, serverTarget = {
	heartbeat = { ok = false },
	poll = { ok = false },
	attestation = { ok = false },
}, {}
local TargetPrivate = {}

function TargetPrivate.stringValue(value)
	if value == nil then return nil end
	local result = tostring(value)
	return result ~= "" and result or nil
end

function getStudioConnectorId()
	local connectorId = TargetPrivate.stringValue(plugin:GetSetting("nexusrbxStudioConnectorId"))
	if connectorId then return connectorId end
	connectorId = HttpService:GenerateGUID(false)
	plugin:SetSetting("nexusrbxStudioConnectorId", connectorId)
	return connectorId
end

function TargetPrivate.currentPlaceKey()
	local placeId, universeId = tostring(game.PlaceId), tostring(game.GameId)
	local unpublished = placeId == "0" and universeId == "0" and (":" .. tostring(game.Name)) or ""
	return universeId .. ":" .. placeId .. unpublished
end

function refreshStudioPlaceGeneration()
	local key = TargetPrivate.currentPlaceKey()
	local previous = TargetPrivate.stringValue(plugin:GetSetting("nexusrbxStudioPlaceIdentity"))
	local generation = math.max(0, tonumber(plugin:GetSetting("nexusrbxStudioTargetGeneration")) or 0)
	if previous ~= key then
		generation = generation + 1
		plugin:SetSetting("nexusrbxStudioPlaceIdentity", key)
		plugin:SetSetting("nexusrbxStudioTargetGeneration", generation)
	end
	return generation, previous ~= nil and previous ~= key
end

function TargetPrivate.targetSummary(attestation)
	local expectedPlaceId = TargetPrivate.stringValue(serverTarget.expectedPlaceId or serverTarget.placeId)
	local expectedUniverseId = TargetPrivate.stringValue(serverTarget.expectedUniverseId or serverTarget.universeId)
	local mismatch = (expectedPlaceId and expectedPlaceId ~= attestation.placeId)
		or (expectedUniverseId and expectedUniverseId ~= attestation.universeId)
	return {
		targetId = TargetPrivate.stringValue(serverTarget.targetId),
		placeName = attestation.placeName,
		placeId = attestation.placeId,
		universeId = attestation.universeId,
		targetGeneration = attestation.targetGeneration,
		targetBound = expectedPlaceId ~= nil or expectedUniverseId ~= nil or serverTarget.targetId ~= nil,
		targetReady = mismatch ~= true,
		detail = mismatch and "Website target does not match this open place" or nil,
	}
end

function publishStudioConnectionDiagnostics(attestation)
	if type(setConnectionDiagnostics) ~= "function" then return end
	attestation = attestation or currentStudioTargetAttestation(false)
	setConnectionDiagnostics({
		target = TargetPrivate.targetSummary(attestation),
		freshness = studioFreshness,
	})
end

function currentStudioTargetAttestation(recordFreshness)
	local generation, changed = refreshStudioPlaceGeneration()
	local signatureOk, signature = pcall(computePlaceSignature)
	local attestation = {
		connectorId = getStudioConnectorId(),
		sessionId = TargetPrivate.stringValue(plugin:GetSetting("nexusrbxStudioSessionId")),
		targetId = TargetPrivate.stringValue(serverTarget.targetId),
		placeName = tostring(game.Name),
		placeId = tostring(game.PlaceId),
		universeId = tostring(game.GameId),
		placeSignature = signatureOk and TargetPrivate.stringValue(signature) or nil,
		targetGeneration = generation,
		placeChanged = changed == true,
		attestedAt = os.time(),
	}
	if recordFreshness ~= false then
		studioFreshness.attestation = {
			ok = signatureOk,
			at = os.time(),
			detail = signatureOk and nil or tostring(signature),
		}
		publishStudioConnectionDiagnostics(attestation)
	end
	return attestation
end

function recordStudioFreshness(channel, ok, detail, latencyMs)
	if studioFreshness[channel] == nil then return end
	studioFreshness[channel] = {
		ok = ok == true,
		at = os.time(),
		detail = detail and tostring(detail) or nil,
		latencyMs = tonumber(latencyMs),
	}
	publishStudioConnectionDiagnostics()
end

function updateStudioServerTarget(response)
	if type(response) ~= "table" then return end
	local target = type(response.studioTarget) == "table" and response.studioTarget
		or (type(response.target) == "table" and response.target)
		or (type(response.targeting) == "table" and response.targeting)
		or ((response.targetId ~= nil or response.expectedPlaceId ~= nil
			or response.expectedUniverseId ~= nil) and response)
		or nil
	if not target then return end
	serverTarget = {
		targetId = target.targetId,
		expectedPlaceId = target.expectedPlaceId or target.placeId,
		expectedUniverseId = target.expectedUniverseId or target.universeId,
	}
	publishStudioConnectionDiagnostics()
end

function clearStudioServerTarget()
	serverTarget = {}
	publishStudioConnectionDiagnostics()
end

function getStudioTargetReadiness()
	local summary = TargetPrivate.targetSummary(currentStudioTargetAttestation(false))
	return summary.targetReady, summary.detail
end

function TargetPrivate.commandTargetExpectation(command)
	local nested = type(command.studioTarget) == "table" and command.studioTarget
		or (type(command.target) == "table" and command.target)
		or (type(command.routing) == "table" and command.routing)
		or (type(command.payload) == "table" and type(command.payload.studioTarget) == "table" and command.payload.studioTarget)
		or {}
	local function field(name)
		if command[name] ~= nil then return command[name] end
		return nested[name]
	end
	local expectation = {
		targetId = TargetPrivate.stringValue(field("targetId")),
		sessionId = TargetPrivate.stringValue(field("sessionId")),
		expectedPlaceId = TargetPrivate.stringValue(field("expectedPlaceId")),
		expectedUniverseId = TargetPrivate.stringValue(field("expectedUniverseId")),
		expectedPlaceSignature = TargetPrivate.stringValue(field("expectedPlaceSignature")),
		targetGeneration = TargetPrivate.stringValue(field("targetGeneration")),
		operationId = TargetPrivate.stringValue(field("operationId")),
		idempotencyKey = TargetPrivate.stringValue(field("idempotencyKey")),
	}
	expectation.bound = expectation.targetId ~= nil or expectation.sessionId ~= nil
		or expectation.expectedPlaceId ~= nil or expectation.expectedUniverseId ~= nil
		or expectation.expectedPlaceSignature ~= nil or expectation.targetGeneration ~= nil
	return expectation
end

function TargetPrivate.targetError(code, message, stage, expected, actual, command, missingFields)
	local details = { stage = stage, expected = expected, actual = actual }
	if missingFields then details.missingFields = missingFields end
	return {
		ok = false,
		success = false,
		verified = false,
		code = code,
		retryable = false,
		commandId = command.id or command.commandId,
		runId = command.runId,
		stepId = command.stepId,
		operation = command.type,
		operationId = command.operationId,
		idempotencyKey = command.idempotencyKey,
		targetIntegrity = details,
		error = { code = code, message = message, retryable = false, details = details },
	}
end

function validateCommandStudioTarget(command, stage, approvedAttestation)
	local expected = command._immutableStudioTarget or TargetPrivate.commandTargetExpectation(command)
	command._immutableStudioTarget = expected
	local actual = currentStudioTargetAttestation(true)
	local code, message
	if tonumber(command.lifecycleVersion) == 2 then
		local missing = {}
		for _, fieldName in ipairs({
			"targetId",
			"sessionId",
			"expectedPlaceId",
			"expectedUniverseId",
			"expectedPlaceSignature",
			"targetGeneration",
			"operationId",
			"idempotencyKey",
		}) do
			if expected[fieldName] == nil then table.insert(missing, fieldName) end
		end
		if #missing > 0 then
			message = "Reliable Studio mutation is missing immutable target fields: " .. table.concat(missing, ", ")
			setBridgeState("target_stale", message)
			return false, TargetPrivate.targetError(
				"INVALID_TARGET_ENVELOPE",
				message,
				stage,
				expected,
				actual,
				command,
				missing
			)
		end
	end
	if expected.sessionId and expected.sessionId ~= actual.sessionId then
		code, message = "TARGET_STALE", "The Studio session changed after this command was targeted"
	elseif expected.targetId and expected.targetId ~= actual.targetId then
		code, message = "TARGET_STALE", "The website target is no longer attached to this Studio connector"
	elseif expected.targetGeneration and expected.targetGeneration ~= tostring(actual.targetGeneration) then
		code, message = "TARGET_STALE", "The Studio place generation changed before this command could run"
	elseif expected.expectedPlaceId and expected.expectedPlaceId ~= actual.placeId then
		code, message = "TARGET_CHANGED", "The open Studio place does not match the command's place"
	elseif expected.expectedUniverseId and expected.expectedUniverseId ~= actual.universeId then
		code, message = "TARGET_CHANGED", "The open Studio universe does not match the command's universe"
	elseif expected.expectedPlaceSignature and expected.expectedPlaceSignature ~= actual.placeSignature then
		code, message = "TARGET_CHANGED", "The Studio place changed after the command was prepared"
	elseif approvedAttestation and (approvedAttestation.placeId ~= actual.placeId
		or approvedAttestation.universeId ~= actual.universeId
		or tostring(approvedAttestation.targetGeneration) ~= tostring(actual.targetGeneration)
		or approvedAttestation.placeSignature ~= actual.placeSignature) then
		code, message = "TARGET_CHANGED", "The open Studio place changed after approval"
	end
	if code then
		setBridgeState(code == "TARGET_STALE" and "target_stale" or "target_changed", message)
		return false, TargetPrivate.targetError(code, message, stage, expected, actual, command)
	end
	return true, actual, expected.bound
end
