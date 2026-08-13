-- Script: ServerScriptService/MM2ValuesRemote.server
-- Exposes a narrow server-controlled RemoteFunction to clients.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local MM2ValuesCache = require(script.Parent.MM2ValuesCache)

local remote = ReplicatedStorage:FindFirstChild("GetMM2Value")
if not remote then
	remote = Instance.new("RemoteFunction")
	remote.Name = "GetMM2Value"
	remote.Parent = ReplicatedStorage
end

local lastRequestByUserId = {}
local REQUEST_COOLDOWN_SECONDS = 0.5

remote.OnServerInvoke = function(player, itemNameOrId)
	if type(itemNameOrId) ~= "string" or #itemNameOrId < 1 or #itemNameOrId > 100 then
		return { ok = false, error = "invalid item name" }
	end

	local now = os.clock()
	local previous = lastRequestByUserId[player.UserId]
	if previous and now - previous < REQUEST_COOLDOWN_SECONDS then
		return { ok = false, error = "request cooldown" }
	end
	lastRequestByUserId[player.UserId] = now

	local ok, item, itemError = pcall(MM2ValuesCache.GetItem, itemNameOrId)
	if not ok then
		warn("MM2 value lookup failed:", item)
		return { ok = false, error = "values temporarily unavailable" }
	end
	if not item then
		return { ok = false, error = itemError }
	end

	return { ok = true, item = item }
end

Players.PlayerRemoving:Connect(function(player)
	lastRequestByUserId[player.UserId] = nil
end)

-- Warm the server cache without delaying the rest of game startup.
task.spawn(function()
	local ok, result = pcall(MM2ValuesCache.Refresh)
	if not ok then
		warn("Initial MM2 values warm-up failed:", result)
	end
end)
