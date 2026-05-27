// zipParser.js — Extracts and parses migration ZIP files

const AdmZip = require("adm-zip");

/**
 * Parses a migration ZIP buffer and returns structured data
 * @param {Buffer} zipBuffer
 * @returns {{ errors: Array, summary: Object, sourceFile: string }}
 */
function parseZip(zipBuffer, originalFileName = "migration.zip") {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  let projectErrorCSV = null;
  let migrationSummaryCSV = null;

  // Find the CSV files inside the ZIP (handle nested folders)
  for (const entry of entries) {
    const name = entry.entryName.split("/").pop().toLowerCase();
    if (name === "projecterror.csv") {
      projectErrorCSV = entry.getData().toString("utf8").replace(/^\uFEFF/, ""); // strip BOM
    }
    if (name === "migrationsummary.csv") {
      migrationSummaryCSV = entry.getData().toString("utf8").replace(/^\uFEFF/, "");
    }
  }

  if (!projectErrorCSV) {
    throw new Error("ProjectError.csv not found in the ZIP file. Please upload the correct migration ZIP.");
  }

  const errors = parseCSV(projectErrorCSV);
  const summaryRows = migrationSummaryCSV ? parseCSV(migrationSummaryCSV) : [];

  // Build summary map by SourcePath (user email)
  const summaryMap = {};
  for (const row of summaryRows) {
    const email = row.SourcePath || row.sourcepath || "";
    if (email) {
      summaryMap[email] = {
        filesMigrated: row.FilesTotalCopied || row.fileslatestcopied || "N/A",
        filesFailed: row.FilesFailed || "N/A",
        sourceFile: originalFileName,
      };
    }
  }

  // Group errors by user email
  const userMap = {};
  for (const row of errors) {
    const email = (row.SourcePath || "").trim();
    if (!email || !email.includes("@")) continue;
    if (!userMap[email]) userMap[email] = [];
    userMap[email].push(row);
  }

  return {
    userMap,
    summaryMap,
    sourceFile: originalFileName,
    totalErrors: errors.length,
    affectedUsers: Object.keys(userMap).length,
  };
}

/**
 * Parses a CSV string into array of objects using header row as keys
 */
function parseCSV(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    if (values.length === 0) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(obj);
  }

  return rows;
}

/**
 * Parses a single CSV row handling quoted fields
 */
function parseCSVRow(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

module.exports = { parseZip };
