const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.get("/", (req, res) => {
  res.send("Roblox Proxy is running!");
});

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

app.get("/userid/:username", async (req, res) => {
  const username = req.params.username;
  const url = `https://users.roblox.com/v1/usernames/users`;
  const payload = { usernames: [username], excludeBannedUsers: true };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
