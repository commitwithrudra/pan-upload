const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const mime = require("mime-types");
const { Readable } = require("stream");
const https = require("https");

const app = express();
app.use(express.json({ limit: "10mb" }));

// ================== ENV CONFIG ==================
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID; // Google Drive folder

// ================== GOOGLE AUTH ==================
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

// ================== HEALTH CHECK ==================
app.get("/", (req, res) => {
  res.send("🚀 Server is running...");
});

// ================== UPLOAD API ==================
app.post("/upload-to-drive", async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    if (!file_url) {
      return res.status(400).json({ error: "file_url is required" });
    }

    console.log("📥 Fetching file from:", file_url);

    // Fetch file from ERPNext
    const response = await axios.get(file_url, {
      responseType: "arraybuffer",
    });

    const mimeType = mime.lookup(file_name) || "application/octet-stream";

    const bufferStream = new Readable();
    bufferStream.push(response.data);
    bufferStream.push(null);

    // Upload to Google Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: file_name || `file_${Date.now()}`,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: mimeType,
        body: bufferStream,
      },
    });

    const fileId = driveRes.data.id;

    // Make file public
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const publicUrl = `https://drive.google.com/file/d/${fileId}/view`;

    console.log("✅ Uploaded:", publicUrl);

    return res.json({
      message: "Uploaded successfully ✅",
      fileId: fileId,
      link: publicUrl,
    });
  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    return res.status(500).json({
      error: "Upload failed",
      details: error.message,
    });
  }
});

// ================== SELF PING (KEEP ALIVE) ==================
const SELF_URL = process.env.SELF_URL;

function pingServer() {
  if (!SELF_URL) return;

  https
    .get(SELF_URL, (res) => {
      console.log(`🔁 Self ping: ${res.statusCode}`);
    })
    .on("error", (err) => {
      console.error("❌ Ping failed:", err.message);
    });
}

// Ping every 5 minutes
setInterval(pingServer, 5 * 60 * 1000);

// ================== START SERVER ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
