// server.js
const express = require("express");
const fetch = require("node-fetch");
const app = express();

// Root test
app.get("/", (req, res) => {
  res.send("Roblox Proxy is running!");
});

// ✅ 1. Get servers by PlaceId
app.get("/servers/:placeId", async (req, res) => {
  const placeId = req.params.placeId;
  const cursor = req.query.cursor || "";

  const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&cursor=${cursor}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ✅ 2. Username → UserId
app.get("/userid/:username", async (req, res) => {
  const username = req.params.username;
  const url = `https://api.roblox.com/users/get-by-username?username=${username}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data); // contains Id
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ✅ 3. UserId → Presence (online/offline + placeId + serverId)
app.get("/presence/:userId", async (req, res) => {
  const userId = req.params.userId;

  const url = `https://presence.roblox.com/v1/presence/users`;
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

// ✅ 4. Avatar thumbnail (headshot)
app.get("/avatar/:userId", async (req, res) => {
  const userId = req.params.userId;
  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Proxy running on port " + port));
