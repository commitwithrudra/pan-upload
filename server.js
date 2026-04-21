const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");
const mime = require("mime-types");

const app = express();
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// Download file from ERPNext
async function downloadFile(file_url, fileName) {
  const fullUrl = "https://lvsmd.m.frappe.cloud" + file_url;

  const response = await axios({
    url: fullUrl,
    method: "GET",
    responseType: "stream",
  });

  const path = "./uploads/" + fileName;
  const writer = fs.createWriteStream(path);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(path));
    writer.on("error", reject);
  });
}

// Upload to Drive
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

// API
app.post("/upload-to-drive", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { file_url, file_name } = req.body;

    if (!file_name.toLowerCase().includes("pan")) {
      return res.status(400).send("Not PAN file");
    }

    const filePath = await downloadFile(file_url, file_name);

    const result = await uploadToDrive(filePath, file_name);

    fs.unlinkSync(filePath);

    res.send("Uploaded to Drive");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => console.log("Server running"));
