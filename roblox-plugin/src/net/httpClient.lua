local lastLatencyMs = 0
local etagCache = {}

local function jsonEncode(value)
	return HttpService:JSONEncode(value)
end

local function jsonDecode(value)
	return HttpService:JSONDecode(value)
end

local function getBackendUrl()
	if plugin:GetSetting("nexusrbxDevMode") == true then
		local override = plugin:GetSetting("nexusrbxBackendUrl")
		if type(override) == "string" and override ~= "" then
			return override:gsub("/+$", "")
		end
	end
	return BACKEND_URL
end

local function classifyStatus(statusCode, networkError)
	if networkError then
		return "network", true
	end
	if statusCode == 401 or statusCode == 403 then
		return "auth", false
	end
	if statusCode == 304 then
		return "ok", false
	end
	if statusCode == 429 then
		return "rate_limited", true
	end
	if statusCode >= 500 then
		return "server", true
	end
	if statusCode >= 400 then
		return "client", false
	end
	return "ok", false
end

local function parseRetryAfter(headers)
	if type(headers) ~= "table" then
		return nil
	end
	local value = headers["Retry-After"] or headers["retry-after"]
	if value == nil then
		return nil
	end
	local seconds = tonumber(value)
	if seconds then
		return math.clamp(seconds, 0, 60)
	end
	return nil
end

local function requestOnce(method, path, body, token, opts)
	opts = opts or {}
	local started = os.clock()
	local headers = {
		["Content-Type"] = "application/json",
		["Accept"] = "application/json",
	}
	if token then
		headers["Authorization"] = "Bearer " .. token
	end
	if opts.idempotent then
		headers["Idempotency-Key"] = HttpService:GenerateGUID(false)
	end
	if opts.useEtag and etagCache[path] then
		headers["If-None-Match"] = etagCache[path]
	end

	local requestBody = body and jsonEncode(body) or nil
	local useGzip = opts.compress == true or (requestBody and #requestBody > 4096)

	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = getBackendUrl() .. path,
			Method = method,
			Headers = headers,
			Body = requestBody,
			Compress = useGzip and Enum.HttpCompression.Gzip or nil,
		})
	end)

	lastLatencyMs = math.floor((os.clock() - started) * 1000 + 0.5)

	if not ok then
		return {
			ok = false,
			kind = "network",
			retryable = true,
			status = 0,
			data = tostring(response),
			latencyMs = lastLatencyMs,
		}
	end

	if type(response.Headers) == "table" then
		local etag = response.Headers["ETag"] or response.Headers["etag"]
		if etag and opts.useEtag then
			etagCache[path] = etag
		end
	end

	if response.StatusCode == 204 then
		return {
			ok = true,
			kind = "ok",
			retryable = false,
			status = 204,
			data = nil,
			latencyMs = lastLatencyMs,
		}
	end

	if response.StatusCode == 304 then
		return {
			ok = true,
			kind = "ok",
			retryable = false,
			status = 304,
			data = { unchanged = true },
			latencyMs = lastLatencyMs,
		}
	end

	local kind, retryable = classifyStatus(response.StatusCode, false)
	if not response.Success then
		return {
			ok = false,
			kind = kind,
			retryable = retryable,
			status = response.StatusCode,
			data = response.Body ~= "" and response.Body or ("HTTP " .. tostring(response.StatusCode)),
			retryAfter = parseRetryAfter(response.Headers),
			latencyMs = lastLatencyMs,
		}
	end

	if response.Body == nil or response.Body == "" then
		return {
			ok = true,
			kind = "ok",
			retryable = false,
			status = response.StatusCode,
			data = nil,
			latencyMs = lastLatencyMs,
		}
	end

	local decodedOk, decoded = pcall(jsonDecode, response.Body)
	if not decodedOk then
		return {
			ok = false,
			kind = "decode",
			retryable = false,
			status = response.StatusCode,
			data = "Invalid JSON response: " .. tostring(decoded),
			latencyMs = lastLatencyMs,
		}
	end

	return {
		ok = true,
		kind = "ok",
		retryable = false,
		status = response.StatusCode,
		data = decoded,
		latencyMs = lastLatencyMs,
	}
end

local function requestWithRetry(method, path, body, token, opts)
	opts = opts or {}
	local maxAttempts = math.clamp(tonumber(opts.maxAttempts) or 3, 1, 5)
	local baseDelay = tonumber(opts.baseDelay) or 0.5
	local attempt = 0
	local lastResult

	while attempt < maxAttempts do
		attempt = attempt + 1
		lastResult = requestOnce(method, path, body, token, opts)
		if lastResult.ok or not lastResult.retryable or attempt >= maxAttempts then
			return lastResult
		end
		local delay = lastResult.retryAfter
		if not delay then
			delay = math.min(baseDelay * (2 ^ (attempt - 1)), 8) + (math.random() * 0.25)
		end
		task.wait(delay)
	end

	return lastResult
end

local function request(method, path, body, token, opts)
	local result = requestWithRetry(method, path, body, token, opts)
	if result.ok then
		return true, result.data, result.status
	end
	return false, result.data, result.status
end

function getLastLatencyMs()
	return lastLatencyMs
end

function pingHealth()
	local result = requestOnce("GET", "/health", nil, nil, { maxAttempts = 1 })
	return result.ok == true, result.latencyMs or lastLatencyMs
end

-- Authenticated heartbeat. It never claims a command and the backend throttles
-- its single session write while returning collaborator and MCP summaries.
function pingSession(token, placeSignature)
	if not token then
		return false, lastLatencyMs, false
	end
	local body = {}
	if type(placeSignature) == "string" and placeSignature ~= "" then
		body.placeSignature = placeSignature
	end
	local result = requestOnce("POST", "/api/studio/session/ping", body, token, { maxAttempts = 1 })
	if result.status == 401 or result.status == 403 then
		return false, result.latencyMs or lastLatencyMs, true, nil
	end
	return result.ok == true, result.latencyMs or lastLatencyMs, false, result.data
end

function getToken()
	return plugin:GetSetting("nexusrbxStudioToken")
end

function setToken(token)
	plugin:SetSetting("nexusrbxStudioToken", token)
end
