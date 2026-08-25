-- Canonical Nexus conversation transport for the Studio plugin.
-- The backend owns chat persistence and run routing; this client only adapts
-- those contracts to Roblox's finite RequestAsync model.

local function studioChatEncoded(value)
	return HttpService:UrlEncode(tostring(value or ""))
end

function studioChatBootstrap(token, preferredChatId)
	local path = "/api/studio/chat/bootstrap"
	if preferredChatId and preferredChatId ~= "" then
		path = path .. "?chatId=" .. studioChatEncoded(preferredChatId)
	end
	return request("GET", path, nil, token, { maxAttempts = 2 })
end

function studioChatCreateConversation(token, mode)
	return request("POST", "/api/studio/chat/conversations", {
		mode = mode or "agent",
		title = "New chat",
		placeScoped = true,
	}, token, { idempotent = true })
end

function studioChatLoadMessages(token, chatId, limit)
	local path = "/api/studio/chat/conversations/" .. studioChatEncoded(chatId)
		.. "/messages?limit=" .. tostring(math.clamp(tonumber(limit) or 40, 1, 80))
	return request("GET", path, nil, token, { maxAttempts = 2 })
end

function studioChatSendMessage(token, chatId, text, mode, selectionHint, requestId)
	local path = "/api/studio/chat/conversations/" .. studioChatEncoded(chatId) .. "/messages"
	return request("POST", path, {
		text = text,
		mode = mode,
		selectionHint = selectionHint,
		requestId = requestId,
	}, token, {
		idempotent = true,
		idempotencyKey = requestId,
		maxAttempts = 2,
	})
end

function studioChatReadEvents(token, runId, chatId, afterSeq, afterCursor, waitMs)
	local path = "/api/studio/chat/runs/" .. studioChatEncoded(runId) .. "/events"
		.. "?chatId=" .. studioChatEncoded(chatId)
		.. "&afterSeq=" .. tostring(math.max(0, tonumber(afterSeq) or 0))
		.. "&afterCursor=" .. studioChatEncoded(afterCursor or "")
		.. "&waitMs=" .. tostring(math.clamp(tonumber(waitMs) or 12000, 0, 20000))
	return request("GET", path, nil, token, { maxAttempts = 1 })
end

function studioChatCancelRun(token, runId, chatId)
	return request("POST", "/api/studio/chat/runs/" .. studioChatEncoded(runId) .. "/cancel", {
		chatId = chatId,
	}, token, { idempotent = true, maxAttempts = 2 })
end

function studioChatApproveRun(token, runId, chatId, stepId, decision)
	return request("POST", "/api/studio/chat/runs/" .. studioChatEncoded(runId) .. "/approval", {
		chatId = chatId,
		stepId = stepId,
		decision = decision,
	}, token, { idempotent = true, maxAttempts = 2 })
end

function studioChatUndoRun(token, runId, chatId, requestId)
	return request("POST", "/api/studio/chat/runs/" .. studioChatEncoded(runId) .. "/undo", {
		chatId = chatId,
	}, token, {
		idempotent = true,
		idempotencyKey = requestId or HttpService:GenerateGUID(false),
		maxAttempts = 2,
	})
end
