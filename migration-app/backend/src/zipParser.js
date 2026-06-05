// zipParser.js — Supports both Summary ZIP (ProjectError.csv) and Detailed ZIP (TransactionItem.csv)

const JSZip = require("jszip");

async function parseZip(buffer, originalName) {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files);

  console.log(`  ZIP contents: ${files.join(", ")}`);

  // ── Try Summary ZIP first (ProjectError.csv) ──────────────────────────────
  const projectErrorFile = files.find(f =>
    f.toLowerCase().includes("projecterror") && f.endsWith(".csv")
  );

  // ── Try Detailed ZIP (TransactionItem.csv) ────────────────────────────────
  const transactionFile = files.find(f =>
    f.toLowerCase().includes("transactionitem") && f.endsWith(".csv")
  );

  // ── Try MigrationSummary.csv ──────────────────────────────────────────────
  const summaryFile = files.find(f =>
    f.toLowerCase().includes("migrationsummary") && f.endsWith(".csv")
  );

  if (!projectErrorFile && !transactionFile) {
    throw new Error(
      "No supported CSV found in the ZIP file. Expected ProjectError.csv (Summary ZIP) or TransactionItem.csv (Detailed ZIP). Please upload the correct migration ZIP."
    );
  }

  let userMap = {};
  let summaryMap = {};
  let totalErrors = 0;

  if (projectErrorFile) {
    // ── Parse ProjectError.csv (Summary ZIP format) ─────────────────────────
    console.log(`  Using ProjectError.csv (Summary ZIP)`);
    const csvText = await zip.files[projectErrorFile].async("string");
    const rows = parseCSV(csvText);

    for (const row of rows) {
      if (!row.ResultCode || row.ResultCode === "None" || row.ResultCode === "Null") continue;

      // SourcePath is the user email in Summary ZIP
      const userEmail = extractEmail(row.SourcePath || row.Name || "");
      if (!userEmail) continue;

      if (!userMap[userEmail]) userMap[userEmail] = [];
      userMap[userEmail].push({
        FullPath:      row.FullPath      || row.FullPath || "",
        ResultCode:    row.ResultCode    || "",
        FailureReason: row.FailureReason || "",
        Action:        row.Action        || "",
      });
      totalErrors++;
    }

  } else if (transactionFile) {
    // ── Parse TransactionItem.csv (Detailed ZIP format) ──────────────────────
    console.log(`  Using TransactionItem.csv (Detailed ZIP)`);
    const csvText = await zip.files[transactionFile].async("string");
    const rows = parseCSV(csvText);

    for (const row of rows) {
      // Only include failed items
      if (!row.ResultCode || row.ResultCode === "None" || row.ResultCode === "Null") continue;
      if (row.Status && row.Status.toLowerCase() === "success") continue;

      // SourcePath is the user email in Detailed ZIP
      const userEmail = extractEmail(row.SourcePath || row.Name || "");
      if (!userEmail) continue;

      if (!userMap[userEmail]) userMap[userEmail] = [];
      userMap[userEmail].push({
        FullPath:      row.FullPath      || "",
        ResultCode:    row.ResultCode    || "",
        FailureReason: row.FailureReason || "",
        Action:        row.OperationStep || "",
        Status:        row.Status        || "",
        DestinationPath: row.DestinationPath || "",
      });
      totalErrors++;
    }
  }

  // ── Parse MigrationSummary.csv if present ─────────────────────────────────
  if (summaryFile) {
    const summaryText = await zip.files[summaryFile].async("string");
    const summaryRows = parseCSV(summaryText);
    for (const row of summaryRows) {
      const userEmail = extractEmail(row.SourcePath || row.Name || "");
      if (userEmail) {
        summaryMap[userEmail] = {
          filesMigrated: row.FilesLatestCopied || row.FilesTotalCopied || "N/A",
          sourceFile: originalName,
        };
      }
    }
  }

  // Also check Migration Summary.csv (with space)
  const migSummaryFile = files.find(f =>
    f.toLowerCase().includes("migration summary") && f.endsWith(".csv")
  );
  if (migSummaryFile) {
    const summaryText = await zip.files[migSummaryFile].async("string");
    const summaryRows = parseCSV(summaryText);
    for (const row of summaryRows) {
      const userEmail = extractEmail(row.SourcePath || row.Name || "");
      if (userEmail) {
        summaryMap[userEmail] = {
          filesMigrated: row.FilesLatestCopied || row.FilesTotalCopied || "N/A",
          sourceFile: originalName,
        };
      }
    }
  }

  const affectedUsers = Object.keys(userMap).length;
  console.log(`  Found ${affectedUsers} affected user(s) with ${totalErrors} total errors`);

  return {
    userMap,
    summaryMap,
    sourceFile: originalName,
    affectedUsers,
    totalErrors,
  };
}

/**
 * Extracts email address from a SourcePath string like:
 * "/user@domain.com/folder/file.txt" or "user@domain.com"
 */
function extractEmail(sourcePath) {
  if (!sourcePath) return null;

  // Try to extract email from path like /email@domain.com/...
  const pathMatch = sourcePath.match(/\/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\//);
  if (pathMatch) return pathMatch[1].toLowerCase();

  // Try direct email match
  const emailMatch = sourcePath.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) return emailMatch[0].toLowerCase();

  return null;
}

/**
 * Parses CSV text into array of objects using header row
 * Handles quoted fields with commas inside them
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVRow(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim().replace(/^"|"$/g, "")] = (values[idx] || "").trim().replace(/^"|"$/g, "");
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Splits a CSV row respecting quoted fields
 */
function splitCSVRow(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

module.exports = { parseZip };
