const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
app.use(express.json());

// ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

app.post("/upload-to-drive", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    res.send("Webhook received ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
