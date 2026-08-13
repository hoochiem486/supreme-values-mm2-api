-- LocalScript: StarterPlayer/StarterPlayerScripts/MM2ValuesClientExample.client
-- The client calls your Roblox server; it never calls the web API.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local getMM2Value = ReplicatedStorage:WaitForChild("GetMM2Value")
local result = getMM2Value:InvokeServer("Darkshot")

if result.ok then
	print(string.format(
		"%s is worth %s (demand %s/10)",
		result.item.name,
		tostring(result.item.valueDisplay),
		tostring(result.item.demand)
	))
else
	warn("Value lookup failed:", result.error)
end
