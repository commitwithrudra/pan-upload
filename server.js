const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const mime = require("mime-types");

const app = express();
app.use(express.json());

// 🔐 ENV CONFIG
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FOLDER_ID = process.env.FOLDER_ID;
const OTHER_FOLDER_ID = process.env.OTHER_FOLDER_ID;

// 🔑 OAuth Client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// ✅ Use only refresh token (recommended way)
oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

// 🔄 Token refresh handler (IMPORTANT)
oauth2Client.on("tokens", (tokens) => {
  if (tokens.access_token) {
    console.log("🔑 New access token generated");
  }
  if (tokens.refresh_token) {
    console.log("🔄 New refresh token received (save it!)");
  }
});

// 📂 Google Drive instance
const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

// 🚀 Upload API
app.post("/upload-to-drive", async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    if (!file_url || !file_name) {
      return res.status(400).json({
        error: "Missing file_url or file_name",
      });
    }

    const fullUrl = `https://lvsmd.m.frappe.cloud${file_url}`;
    console.log("⬇️ Downloading:", fullUrl);

    // 📥 Download file as stream
    const response = await axios({
      method: "GET",
      url: fullUrl,
      responseType: "stream",
    });

    // ❌ Stream error handler
    response.data.on("error", (err) => {
      console.error("❌ Stream error:", err.message);
    });

    const mimeType =
      mime.lookup(file_name) ||
      response.headers["content-type"] ||
      "application/octet-stream";

    console.log("📦 MIME type:", mimeType);


    let targetFolderId = OTHER_FOLDER_ID; // default fallback
    
    const name = file_name.toUpperCase();
    
    if (
      name.startsWith("PAN_") ||
      name.startsWith("AADHAR_") ||
      name.startsWith("BANK_")
    ) {
      targetFolderId = FOLDER_ID; // main folder
    }
    
    // ⬆️ Upload to Google Drive
    const result = await drive.files.create({
      requestBody: {
        name: file_name,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: response.data,
      },
    });

    const fileId = result.data.id;
    
    // 2. MAKE FILE PUBLIC (IMPORTANT FIX)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
    
    // 3. Generate link
    const link = `https://drive.google.com/file/d/${fileId}/view`;

    console.log("✅ Uploaded successfully:", fileId);

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
