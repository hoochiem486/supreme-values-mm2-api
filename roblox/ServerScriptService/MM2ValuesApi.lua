-- ModuleScript: ServerScriptService/MM2ValuesApi
-- Replace this with the public HTTPS address used by your deployed API.
local API_BASE_URL = "https://values-api.example.com"

local HttpService = game:GetService("HttpService")

local MM2ValuesApi = {}

local function getJson(path)
	local lastError = "request was not attempted"

	for attempt = 1, 2 do
		local ok, response = pcall(function()
			return HttpService:RequestAsync({
				Url = API_BASE_URL .. path,
				Method = "GET",
				Headers = { Accept = "application/json" },
			})
		end)

		if ok and response.Success then
			return HttpService:JSONDecode(response.Body)
		end

		if ok then
			lastError = string.format("HTTP %d: %s", response.StatusCode, response.StatusMessage)
		else
			lastError = tostring(response)
		end

		if attempt < 2 then
			task.wait(1)
		end
	end

	error("MM2 values API request failed: " .. lastError)
end

function MM2ValuesApi.GetValues()
	return getJson("/values")
end

function MM2ValuesApi.GetItem(itemNameOrId)
	return getJson("/values/" .. HttpService:UrlEncode(itemNameOrId))
end

function MM2ValuesApi.GetHealth()
	return getJson("/health")
end

return MM2ValuesApi
