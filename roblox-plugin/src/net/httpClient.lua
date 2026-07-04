local function jsonEncode(value)
	return HttpService:JSONEncode(value)
end

local function jsonDecode(value)
	return HttpService:JSONDecode(value)
end

local function request(method, path, body, token)
	local headers = {
		["Content-Type"] = "application/json",
		["Accept"] = "application/json",
	}
	if token then
		headers["Authorization"] = "Bearer " .. token
	end

	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = BACKEND_URL .. path,
			Method = method,
			Headers = headers,
			Body = body and jsonEncode(body) or nil,
		})
	end)

	if not ok then
		return false, tostring(response)
	end
	if response.StatusCode == 204 then
		return true, nil, response.StatusCode
	end
	if not response.Success then
		return false, response.Body ~= "" and response.Body or ("HTTP " .. tostring(response.StatusCode)), response.StatusCode
	end
	if response.Body == nil or response.Body == "" then
		return true, nil, response.StatusCode
	end

	local decodedOk, decoded = pcall(jsonDecode, response.Body)
	if not decodedOk then
		return false, "Invalid JSON response: " .. tostring(decoded)
	end
	return true, decoded, response.StatusCode
end

function getToken()
	return plugin:GetSetting("nexusrbxStudioToken")
end

function setToken(token)
	plugin:SetSetting("nexusrbxStudioToken", token)
end
