-- ModuleScript example for a client environment that provides an HTTP request function.
local HttpService = game:GetService("HttpService")

local BASE_URL = "https://hoochiem486.github.io/supreme-values-mm2-api"
local requestFunction = request or http_request or (syn and syn.request)

assert(requestFunction, "This environment does not expose an HTTP request function")

local MM2Values = {}
local dataset
local itemsById = {}
local itemsBySlug = {}
local itemsByName = {}

local function fetchJson(url)
	local response = requestFunction({
		Url = url,
		Method = "GET",
		Headers = { Accept = "application/json" },
	})

	local statusCode = response.StatusCode or response.Status or 0
	local body = response.Body or response.body
	assert(statusCode >= 200 and statusCode < 300, "HTTP request failed: " .. tostring(statusCode))
	assert(type(body) == "string", "HTTP response had no body")
	return HttpService:JSONDecode(body)
end

function MM2Values.Refresh()
	local fresh = fetchJson(BASE_URL .. "/values.json")
	assert(type(fresh.items) == "table", "Values response had no items array")

	local nextById = {}
	local nextBySlug = {}
	local nextByName = {}
	for _, item in ipairs(fresh.items) do
		nextById[string.lower(item.id)] = item
		nextBySlug[string.lower(item.slug)] = item
		nextByName[string.lower(item.name)] = item
	end

	dataset = fresh
	itemsById = nextById
	itemsBySlug = nextBySlug
	itemsByName = nextByName
	return dataset
end

function MM2Values.GetItem(nameSlugOrId)
	if not dataset then
		MM2Values.Refresh()
	end

	local key = string.lower(tostring(nameSlugOrId))
	return itemsById[key] or itemsBySlug[key] or itemsByName[key]
end

function MM2Values.GetDataset()
	if not dataset then
		MM2Values.Refresh()
	end
	return dataset
end

return MM2Values

