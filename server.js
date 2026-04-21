const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const mime = require("mime-types");
const { Readable } = require("stream");

const app = express();
app.use(express.json());

// 🔐 Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json", // make sure this file exists on Render
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// 📌 Replace with your actual folder ID
const FOLDER_ID = "YOUR_FOLDER_ID";

// 🚀 Main API
app.post("/upload-to-drive", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { file_url, file_name } = req.body;

    if (!file_url || !file_name) {
      return res.status(400).send("Missing file data ❌");
    }

    // 🔗 Build full ERPNext file URL
    const fullUrl = `https://lvsmd.m.frappe.cloud${file_url}`;
    console.log("Downloading from:", fullUrl);

    // ⬇️ Download file as buffer
    const response = await axios.get(fullUrl, {
      responseType: "arraybuffer",
    });

    if (response.status !== 200) {
      throw new Error("Failed to download file");
    }

    const buffer = Buffer.from(response.data);
    console.log("Buffer size:", buffer.length);

    // 🧠 Detect MIME type
    const mimeType = mime.lookup(file_name) || "application/octet-stream";

    // ⬆️ Upload to Google Drive
    const result = await drive.files.create({
      requestBody: {
        name: file_name,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: mimeType,
        body: Readable.from(buffer),
      },
    });

    console.log("✅ Uploaded to Drive");
    console.log("File ID:", result.data.id);

    // 🔗 Optional: return file link
    const fileLink = `https://drive.google.com/file/d/${result.data.id}/view`;

    res.send({
      message: "Uploaded to Drive ✅",
      fileId: result.data.id,
      link: fileLink,
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).send("Upload failed ❌");
  }
});

// 🟢 Health check
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// 🌐 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
