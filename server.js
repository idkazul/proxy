// server.js
const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.get("/", (req, res) => {
  res.send("Roblox Proxy is running!");
});

// Get servers by PlaceId
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Proxy running on port " + port));
