const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const mime = require("mime-types");

const app = express();
app.use(express.json());

// 🔐 Google Drive Auth
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// 🧠 PAN validation
function isPanFile(fileName) {
  return fileName.toLowerCase().includes("pan");
}

// 📤 Upload to Drive
async function uploadToDrive(filePath, fileName) {
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: ["YOUR_FOLDER_ID"],
    },
    media: {
      mimeType: mime.lookup(filePath),
      body: fs.createReadStream(filePath),
    },
  });
  return response.data;
}

// 🚀 API (ERPNext webhook)
app.post("/upload-to-drive", async (req, res) => {
  try {
    let file_url = req.body.pan_card;

    if (!file_url) {
      return res.status(400).json({ error: "No file URL received" });
    }

    // 🔥 Fix for ERPNext private URL
    if (file_url.startsWith("/")) {
      file_url = "https://lvsmd.m.frappe.cloud" + file_url;
    }

    const fileName = file_url.split("/").pop();

    // ✅ PAN validation
    if (!isPanFile(fileName)) {
      return res.status(400).json({ error: "Not a PAN file" });
    }

    const filePath = path.join(__dirname, fileName);

    // 📥 Download file
    const response = await axios({
      url: file_url,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", async () => {
      const result = await uploadToDrive(filePath, fileName);

      fs.unlinkSync(filePath);

      res.json({
        message: "Uploaded successfully",
        fileId: result.id,
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Start server
app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);