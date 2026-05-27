require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const axios    = require("axios");
const { parseZip }       = require("./zipParser");
const { buildUserExcelBase64 } = require("./excelBuilder");
const { buildEmailBody } = require("./emailBuilder");

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/process-migration", upload.single("migrationZip"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No ZIP file uploaded" });
    if (!req.file.originalname.endsWith(".zip")) return res.status(400).json({ success: false, error: "File must be a .zip" });
    const powerAutomateUrl = process.env.POWER_AUTOMATE_URL;
    if (!powerAutomateUrl || powerAutomateUrl.includes("REPLACE_AFTER_PA_SETUP")) return res.status(500).json({ success: false, error: "Power Automate URL not configured" });
    console.log(`Processing: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
    const { userMap, summaryMap, sourceFile, affectedUsers } = parseZip(req.file.buffer, req.file.originalname);
    if (affectedUsers === 0) return res.status(400).json({ success: false, error: "No user errors found in ZIP" });
    const results = [];
    for (const [userEmail, errors] of Object.entries(userMap)) {
      const summary = summaryMap[userEmail] || { sourceFile };
      summary.sourceFile = sourceFile;
      console.log(`  → Processing ${userEmail} (${errors.length} errors)`);
      const csvBase64 = buildUserExcelBase64(userEmail, errors, summary);
      const csvName    = `${userEmail.split("@")[0]}_migration_errors.xls`;
      const emailHtml  = buildEmailBody(userEmail, errors, summary);
      const subject    = `[Migration Update] ${errors.length} item(s) from your Google Drive migration need attention`;
      try {
        const payload = { userEmail, subject, emailBody: emailHtml, csvAttachment: csvBase64, csvFileName: csvName, errorCount: errors.length, sourceFile, itAdminEmail: process.env.IT_ADMIN_EMAIL || "it-admin@chs.net", timestamp: new Date().toISOString() };
        const paResponse = await axios.post(powerAutomateUrl, payload, { headers: { "Content-Type": "application/json" }, timeout: 30000 });
        results.push({ userEmail, errorCount: errors.length, csvFileName: csvName, status: "triggered", paStatus: paResponse.status });
        console.log(`  ✓ Triggered for ${userEmail} — PA status: ${paResponse.status}`);
      } catch (paError) {
        console.error(`  ✗ Power Automate failed for ${userEmail}:`, paError.message);
        results.push({ userEmail, errorCount: errors.length, csvFileName: csvName, status: "failed", error: paError.message });
      }
      await new Promise(r => setTimeout(r, 300));
    }
    const successCount = results.filter(r => r.status === "triggered").length;
    const failedCount  = results.filter(r => r.status === "failed").length;
    return res.json({ success: true, message: `Processed ${affectedUsers} user(s). ${successCount} triggered, ${failedCount} failed.`, sourceFile, affectedUsers, successCount, failedCount, results });
  } catch (err) {
    console.error("Processing error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

app.post("/api/preview-migration", upload.single("migrationZip"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { userMap, sourceFile, affectedUsers, totalErrors } = parseZip(req.file.buffer, req.file.originalname);
    const preview = Object.entries(userMap).map(([email, errors]) => ({
      userEmail: email, errorCount: errors.length,
      errorCodes: [...new Set(errors.map(e => e.ResultCode))],
      preview: errors.slice(0, 3).map(e => ({ file: e.FullPath ? e.FullPath.split("/").pop() : "Unknown", code: e.ResultCode, reason: e.FailureReason })),
    }));
    return res.json({ success: true, sourceFile, affectedUsers, totalErrors, users: preview });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Migration Email Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Process: POST http://localhost:${PORT}/api/process-migration`);
  console.log(`   Preview: POST http://localhost:${PORT}/api/preview-migration\n`);
});
