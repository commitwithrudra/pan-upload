const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const mime = require("mime-types");
const { Readable } = require("stream");

const app = express();
app.use(express.json());

// 🔐 ENV CONFIG
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REDIRECT_URI = process.env.REDIRECT_URI;

// 📁 Google Drive Folder ID (ONLY ONCE)
const FOLDER_ID = process.env.FOLDER_ID;

// 🔑 OAuth Client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

// 📂 Drive Instance
const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

// 🚀 Upload API
app.post("/upload-to-drive", async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    if (!file_url || !file_name) {
      return res.status(400).json({ error: "Missing file_url or file_name" });
    }

    const fullUrl = `https://lvsmd.m.frappe.cloud${file_url}`;
    console.log("⬇️ Downloading:", fullUrl);

    // ✅ Stream download (better than buffer)
    const response = await axios({
      method: "GET",
      url: fullUrl,
      responseType: "stream",
    });

    const mimeType =
      mime.lookup(file_name) || response.headers["content-type"] || "application/octet-stream";

    console.log("📦 MIME:", mimeType);

    // ⬆️ Upload to Drive
    const result = await drive.files.create({
      requestBody: {
        name: file_name,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType,
        body: response.data,
      },
      supportsAllDrives: true, // important for shared drives
    });

    const fileId = result.data.id;

    console.log("✅ Uploaded:", fileId);

    return res.json({
      message: "Uploaded successfully ✅",
      fileId,
      link: `https://drive.google.com/file/d/${fileId}/view`,
    });
  } catch (err) {
    console.error("❌ Upload Error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Upload failed",
      details: err.message,
    });
  }
});

// 🟢 Health check
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// 🌐 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
