const express = require("express");
const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");
const mime = require("mime-types");

const app = express();
app.use(express.json());

// ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// Download file
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
      parents: ["YOUR_FOLDER_ID"], // 🔥 put your folder ID
    },
    media: {
      mimeType: mime.lookup(filePath),
      body: fs.createReadStream(filePath),
    },
  });

  return response.data;
}


app.post("/upload-to-drive", async (req, res) => {
    try {
        const { file_url, file_name } = req.body;

        // 🔥 Convert to full URL
        const fullUrl = `https://lvsmd.m.frappe.cloud${file_url}`;

        console.log("Downloading from:", fullUrl);

        // Download file
        const response = await axios.get(fullUrl, {
            responseType: "arraybuffer"
        });

        const fileBuffer = response.data;

        // 👉 Now upload this buffer to Google Drive
        // (your existing drive code here)

        res.send("Uploaded successfully ✅");

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Upload failed ❌");
    }
});

// API
// app.post("/upload-to-drive", async (req, res) => {
//   try {
//     console.log("BODY:", req.body);

//     const { file_url, file_name } = req.body;

//     const fullUrl = `https://lvsmd.m.frappe.cloud${file_url}`;

//     console.log("Downloading from:", fullUrl);

//     const filePath = await downloadFile(file_url, file_name);
//     console.log("Downloaded:", filePath);

//     const result = await uploadToDrive(filePath, file_name);
//     console.log("Uploaded to Drive:", result.id);

//     fs.unlinkSync(filePath);

//     res.send("Uploaded to Drive ✅");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send(err.message);
//   }
// });

app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
