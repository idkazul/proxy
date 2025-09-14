const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Roblox Proxy is running!");
});

app.get("/servers/:placeId", async (req, res) => {
  const placeId = req.params.placeId;
  const cursor = req.query.cursor || "";
  const url = `https://games.roblox.com/v1/games/${encodeURIComponent(
    placeId
  )}/servers/Public?limit=100&cursor=${encodeURIComponent(cursor)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.get("/presence/:userId", async (req, res) => {
  const userId = req.params.userId;
  const url = "https://presence.roblox.com/v1/presence/users";
  const payload = { userIds: [parseInt(userId)] };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.get("/avatar/:userId", async (req, res) => {
  const userId = req.params.userId;
  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(
    userId
  )}&size=150x150&format=Png&isCircular=false`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.data && data.data[0] && data.data[0].imageUrl) {
      res.json({ imageUrl: data.data[0].imageUrl });
    } else {
      res.status(404).json({ error: "Failed to fetch avatar" });
    }
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.get("/scan/:placeId/:userId", async (req, res) => {
  const placeId = req.params.placeId;
  const userId = req.params.userId;
  const maxPages = parseInt(req.query.maxPages) || 1000;
  const waitMs = parseFloat(req.query.delay) || 0.12;

  try {
    const avatarUrlResp = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(
        userId
      )}&size=150x150&format=Png&isCircular=false`
    );
    const avatarData = await avatarUrlResp.json();
    if (!avatarData.data || !avatarData.data[0] || !avatarData.data[0].imageUrl) {
      return res.status(500).json({ error: "Failed to fetch target avatar" });
    }
    const targetImage = avatarData.data[0].imageUrl;

    let cursor = "";
    let pages = 0;

    while (true) {
      let url = `https://games.roblox.com/v1/games/${encodeURIComponent(
        placeId
      )}/servers/Public?limit=100`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const serverResp = await fetch(url);
      const serverData = await serverResp.json();
      if (!serverData || !serverData.data) {
        return res.status(500).json({ error: "Failed to fetch servers" });
      }

      let tokens = [];
      let serverMap = {};
      for (const server of serverData.data) {
        if (server.playerTokens && server.playerTokens.length > 0) {
          serverMap[server.id] = server.playerTokens;
          tokens.push(...server.playerTokens);
        }
      }

      if (tokens.length > 0) {
        const payload = tokens.map((token) => ({
          requestId: "0:" + token + ":AvatarHeadshot:150x150:png:regular",
          type: "AvatarHeadShot",
          token: token,
          format: "png",
          size: "150x150",
        }));

        const batchResp = await fetch("https://thumbnails.roblox.com/v1/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const batchData = await batchResp.json();

        if (batchData && batchData.data) {
          for (const entry of batchData.data) {
            if (entry && entry.imageUrl === targetImage) {
              for (const [serverId, serverTokens] of Object.entries(serverMap)) {
                if (serverTokens.includes(entry.requestId.split(":")[1])) {
                  return res.json({
                    found: true,
                    placeId: placeId,
                    serverId: serverId,
                  });
                }
              }
            }
          }
        }
      }

      pages++;
      if (!serverData.nextPageCursor || pages >= maxPages) break;
      cursor = serverData.nextPageCursor;

      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs * 1000));
    }

    return res.json({ found: false });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Proxy running on port " + port));
