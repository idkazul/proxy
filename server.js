const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

async function resolveUsernameToId(username) {
  try {
    const r = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    const d = await r.json();
    if (d && d.data && d.data[0] && d.data[0].id) return d.data[0].id;
    return null;
  } catch (e) {
    return null;
  }
}

app.get("/", (req, res) => {
  res.send("Roblox Proxy is running!");
});

app.get("/servers/:placeId", async (req, res) => {
  const placeId = req.params.placeId;
  const cursor = req.query.cursor || "";
  const url = `https://games.roblox.com/v1/games/${encodeURIComponent(placeId)}/servers/Public?limit=100&cursor=${encodeURIComponent(cursor)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.get("/userid/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const response = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    const data = await response.json();
    if (data.data && data.data[0]) {
      res.json({ Id: data.data[0].id, Name: data.data[0].name });
    } else {
      res.status(404).json({ error: "User not found" });
    }
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
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.get("/avatar/:userId", async (req, res) => {
  let idParam = req.params.userId;
  let userId = idParam;
  if (!/^\d+$/.test(String(idParam))) {
    const resolved = await resolveUsernameToId(idParam);
    if (!resolved) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    userId = resolved;
  }
  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userId)}&size=150x150&format=Png&isCircular=false`;
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
  const idParam = req.params.userId;
  const maxPages = parseInt(req.query.maxPages) || 1000;
  const waitMs = parseFloat(req.query.delay) || 0.12;
  let userId = idParam;
  if (!/^\d+$/.test(String(idParam))) {
    const resolved = await resolveUsernameToId(idParam);
    if (!resolved) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    userId = resolved;
  }

  try {
    const avatarUrlResp = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userId)}&size=150x150&format=Png&isCircular=false`);
    const avatarData = await avatarUrlResp.json();
    if (!avatarData.data || !avatarData.data[0] || !avatarData.data[0].imageUrl) {
      res.status(500).json({ error: "Failed to fetch target avatar" });
      return;
    }
    const targetImage = avatarData.data[0].imageUrl;

    let cursor = "";
    let pages = 0;
    while (true) {
      let url = `https://games.roblox.com/v1/games/${encodeURIComponent(placeId)}/servers/Public?limit=100`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
      const serverResp = await fetch(url);
      const serverData = await serverResp.json();
      if (!serverData || !serverData.data) {
        res.status(500).json({ error: "Failed to fetch servers" });
        return;
      }

      for (const server of serverData.data) {
        if (!server.playerTokens || server.playerTokens.length === 0) continue;
        const payload = server.playerTokens.map(token => ({
          requestId: "0:" + token + ":AvatarHeadshot:150x150:png:regular",
          type: "AvatarHeadShot",
          token: token,
          format: "png",
          size: "150x150"
        }));

        const batchResp = await fetch("https://thumbnails.roblox.com/v1/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const batchData = await batchResp.json();
        if (batchData && batchData.data) {
          for (let i = 0; i < batchData.data.length; i++) {
            if (batchData.data[i] && batchData.data[i].imageUrl && batchData.data[i].imageUrl === targetImage) {
              res.json({ found: true, placeId: placeId, serverId: server.id });
              return;
            }
          }
        }
        await new Promise(r => setTimeout(r, waitMs * 1000));
      }

      pages++;
      if (!serverData.nextPageCursor || pages >= maxPages) break;
      cursor = serverData.nextPageCursor;
      await new Promise(r => setTimeout(r, waitMs * 1000));
    }

    res.json({ found: false });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Proxy running on port " + port));
