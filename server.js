local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local sniperRemote = ReplicatedStorage:FindFirstChild("SniperRemote")
if sniperRemote then
	if not sniperRemote:IsA("RemoteFunction") then
		sniperRemote:Destroy()
		sniperRemote = Instance.new("RemoteFunction")
		sniperRemote.Name = "SniperRemote"
		sniperRemote.Parent = ReplicatedStorage
	end
else
	sniperRemote = Instance.new("RemoteFunction")
	sniperRemote.Name = "SniperRemote"
	sniperRemote.Parent = ReplicatedStorage
end

local sniperEvent = ReplicatedStorage:FindFirstChild("SniperEvent")
if not sniperEvent then
	sniperEvent = Instance.new("RemoteEvent")
	sniperEvent.Name = "SniperEvent"
	sniperEvent.Parent = ReplicatedStorage
end

local PROXY_URL = "https://proxy-wtgw.onrender.com"

local function proxyGet(url)
	local ok, res = pcall(function()
		return HttpService:GetAsync(url, true)
	end)
	if not ok then
		return { error = tostring(res) }
	end

	local ok2, decoded = pcall(function()
		return HttpService:JSONDecode(res)
	end)
	if not ok2 then
		return { error = tostring(decoded) }
	end

	return decoded
end

sniperRemote.OnServerInvoke = function(player, action, data)
	if action == "scanForPlayer" then
		local placeId = tostring(data.placeId or "")
		local userId = tostring(data.userId or "")
		local maxPages = tonumber(data.maxPages) or 200
		local delay = tonumber(data.delay) or 0.12

		local endpoint = string.format("%s/scan/%s/%s?maxPages=%d&delay=%s", PROXY_URL, placeId, userId, maxPages, tostring(delay))
		local result = proxyGet(endpoint)

		if result and result.progress then
			sniperEvent:FireClient(player, tonumber(result.progress) or 0)
		end

		return result
	end

	return nil
end
