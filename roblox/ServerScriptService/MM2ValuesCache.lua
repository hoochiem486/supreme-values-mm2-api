-- ModuleScript: ServerScriptService/MM2ValuesCache
-- This module is server-only. Roblox clients never receive the upstream URL.
local MM2ValuesApi = require(script.Parent.MM2ValuesApi)

local CACHE_SECONDS = 300

local MM2ValuesCache = {}
local dataset = nil
local lookup = {}
local refreshedAt = 0
local refreshInProgress = false

local function addLookup(key, item)
	if type(key) ~= "string" then
		return
	end

	key = string.lower(key)
	if lookup[key] == nil then
		lookup[key] = item
	elseif lookup[key] ~= item then
		-- Duplicate names/slugs stay ambiguous; callers can use the unique item id.
		lookup[key] = false
	end
end

local function rebuildLookup(items)
	lookup = {}
	for _, item in ipairs(items) do
		addLookup(item.id, item)
		addLookup(item.slug, item)
		addLookup(item.name, item)
	end
end

function MM2ValuesCache.Refresh()
	while refreshInProgress do
		task.wait()
	end

	refreshInProgress = true
	local ok, result = pcall(MM2ValuesApi.GetValues)
	refreshInProgress = false

	if ok and type(result) == "table" and type(result.items) == "table" then
		dataset = result
		refreshedAt = os.clock()
		rebuildLookup(result.items)
		return dataset
	end

	-- Retain the last successful server cache when a refresh fails.
	if dataset then
		refreshedAt = os.clock() -- Back off before the next retry.
		warn("MM2 values refresh failed; using cached data:", result)
		return dataset
	end

	error("Initial MM2 values refresh failed: " .. tostring(result))
end

function MM2ValuesCache.GetValues()
	if not dataset or os.clock() - refreshedAt >= CACHE_SECONDS then
		return MM2ValuesCache.Refresh()
	end
	return dataset
end

function MM2ValuesCache.GetItem(itemNameOrId)
	MM2ValuesCache.GetValues()
	local item = lookup[string.lower(itemNameOrId)]
	if item == false then
		return nil, "ambiguous item name; use category:item-slug"
	end
	if item == nil then
		return nil, "item not found"
	end
	return item
end

return MM2ValuesCache
