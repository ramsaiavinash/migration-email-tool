// excelBuilder.js — Generates colored Excel using HTML table (works in Excel + Google Sheets)

function buildUserExcelBase64(userEmail, errors, summary = {}) {
  const SOLUTIONS = {
    MEXPORTFILEUNSUPPORTEDMIMETYPE: { title: "Google Drive Shortcut", explanation: "This is a shortcut link, not an actual file. Cannot be transferred to OneDrive.", solution: "Access the original file in Google Drive or manually upload a copy to OneDrive.", action: "Yes — user action needed", retry: "No", severity: "Warning" },
    MVERSIONDOWNLOAD: { title: "Version download failed", explanation: "File version failed to download during migration.", solution: "No action needed — IT will retry within 48 hours.", action: "No — IT will retry", retry: "Yes — 48 hrs", severity: "Warning" },
    MFOLDERPATHTOLONG: { title: "Path too long", explanation: "File path exceeds OneDrive 260-character limit.", solution: "Shorten folder/file name and re-upload manually.", action: "Yes — user action needed", retry: "No", severity: "Error" },
    MEXPORTFILERATELIMIT: { title: "Google rate limit", explanation: "Google temporarily blocked the export.", solution: "No action needed — IT will retry.", action: "No — IT will retry", retry: "Yes — 48 hrs", severity: "Warning" },
    MPERMISSION: { title: "Permission error", explanation: "Cannot access file due to permissions.", solution: "Check sharing settings in Google Drive and contact IT.", action: "Yes — check permissions", retry: "After fix", severity: "Error" },
  };
  function getSol(code) { return SOLUTIONS[code] || { title: `Unknown: ${code}`, explanation: "Unexpected error.", solution: "Contact it-support@chs.net.", action: "Yes — contact IT", retry: "IT will investigate", severity: "Error" }; }

  const now = new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const fm = summary.filesMigrated && summary.filesMigrated !== "N/A" ? Number(summary.filesMigrated).toLocaleString() : "N/A";
  const ec = errors.filter(e => getSol(e.ResultCode).severity === "Error").length;
  const wc = errors.filter(e => getSol(e.ResultCode).severity === "Warning").length;
  const ua = errors.filter(e => getSol(e.ResultCode).action.startsWith("Yes"));
  const ir = errors.filter(e => getSol(e.ResultCode).retry.startsWith("Yes"));

  const td = (v, style="") => `<td style="border:1px solid #E2E8F0;padding:6px 10px;font-size:12px;vertical-align:top;${style}">${v}</td>`;
  const th = (v, style="") => `<td style="border:1px solid #1E3A5F;padding:8px 10px;font-size:12px;font-weight:bold;color:#FFFFFF;background:#1E3A5F;${style}">${v}</td>`;

  const errorRows = errors.map((err, i) => {
    const sol = getSol(err.ResultCode);
    const isW = sol.severity === "Warning";
    const bg = i % 2 === 0 ? (isW ? "#FFFDF0" : "#FFF5F5") : (isW ? "#FEFCE8" : "#FEF2F2");
    const codeBg = isW ? "#FEF3C7" : "#FFE4E6";
    const codeColor = isW ? "#92400E" : "#9F1239";
    const actionColor = sol.action.startsWith("Yes") ? "#C00000" : "#166534";
    const retryColor = sol.retry.startsWith("Yes") ? "#166534" : "#6B7280";
    let fn = err.FullPath ? err.FullPath.split("/").pop() || err.FullPath : "Unknown";
    if (/^[=+\-@]/.test(fn)) fn = "'" + fn;
    return `<tr>
      ${td(i+1, `background:${bg};text-align:center;font-weight:bold;`)}
      ${td(fn, `background:${bg};font-weight:bold;`)}
      ${td(err.FullPath||"", `background:${bg};color:#6B7280;font-size:12px;`)}
      ${td(err.ResultCode||"", `background:${codeBg};color:${codeColor};font-weight:bold;font-size:12px;`)}
      ${td(sol.title, `background:${bg};font-weight:bold;`)}
      ${td(sol.explanation, `background:${bg};`)}
      ${td(sol.solution, `background:${bg};`)}
      ${td(sol.action, `background:${bg};color:${actionColor};font-weight:bold;`)}
      ${td(sol.retry, `background:${bg};color:${retryColor};`)}
      ${td(sol.severity, `background:${codeBg};color:${codeColor};font-weight:bold;text-align:center;`)}
    </tr>`;
  }).join("");

  const nextStepsRows = ua.length > 0 ? `
    <tr><td colspan="10" style="background:#FEF3C7;color:#92400E;font-weight:bold;font-size:12px;padding:8px 10px;border:1px solid #E2E8F0;">&#9888; ${ua.length} item(s) require YOUR action:</td></tr>
    ${ua.map((e,i) => { const sol=getSol(e.ResultCode); const nm=e.FullPath?e.FullPath.split("/").pop():"Unknown"; return `<tr><td style="background:#FFFDF0;padding:6px 10px;border:1px solid #E2E8F0;text-align:center;font-weight:bold;">${i+1}.</td><td style="background:#FFFDF0;padding:6px 10px;border:1px solid #E2E8F0;font-weight:bold;">${nm}</td><td colspan="8" style="background:#FFFDF0;padding:6px 10px;border:1px solid #E2E8F0;">${sol.solution}</td></tr>`; }).join("")}
  ` : "";

  const itRows = ir.length > 0 ? `
    <tr><td colspan="10" style="background:#DCFCE7;color:#166534;font-weight:bold;font-size:12px;padding:8px 10px;border:1px solid #E2E8F0;">&#10003; ${ir.length} item(s) IT will retry automatically — no action needed:</td></tr>
    ${ir.map((e,i) => { const nm=e.FullPath?e.FullPath.split("/").pop():"Unknown"; return `<tr><td style="background:#F0FFF4;padding:6px 10px;border:1px solid #E2E8F0;text-align:center;font-weight:bold;">${i+1}.</td><td style="background:#F0FFF4;padding:6px 10px;border:1px solid #E2E8F0;">${nm}</td><td colspan="8" style="background:#F0FFF4;padding:6px 10px;border:1px solid #E2E8F0;color:#166534;">IT will retry within 48 hours — no action needed from you.</td></tr>`; }).join("")}
  ` : "";

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Migration Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body>
<table style="font-family:Arial,sans-serif;font-size:12px;border-collapse:collapse;font-family:Arial,sans-serif;width:100%;">

  <tr><td colspan="10" style="background:#0078D4;color:#FFFFFF;font-size:18px;font-weight:bold;padding:14px 16px;font-family:Arial,sans-serif;letter-spacing:0.5px;border:1px solid #0078D4;">MIGRATION ERROR REPORT</td></tr>
  <tr><td colspan="10" style="background:#005A9E;color:#BFE0F5;font-size:13px;font-weight:bold;padding:8px 16px;font-family:Arial,sans-serif;border:1px solid #005A9E;">CHSPSC LLC — IT Migration Team &nbsp;|&nbsp; Google My Drive to Microsoft OneDrive</td></tr>
  <tr><td colspan="10" style="padding:4px;background:#FFFFFF;border:none;"></td></tr>

  <tr>
    <td colspan="2" style="background:#EFF6FF;font-weight:bold;font-size:12px;color:#374151;padding:6px 10px;border:1px solid #E2E8F0;">Generated on:</td>
    <td colspan="8" style="background:#FFFFFF;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;">${now}</td>
  </tr>
  <tr>
    <td colspan="2" style="background:#EFF6FF;font-weight:bold;font-size:12px;color:#374151;padding:6px 10px;border:1px solid #E2E8F0;">User:</td>
    <td colspan="8" style="background:#FFFFFF;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;">${userEmail}</td>
  </tr>
  <tr>
    <td colspan="2" style="background:#EFF6FF;font-weight:bold;font-size:12px;color:#374151;padding:6px 10px;border:1px solid #E2E8F0;">Source file:</td>
    <td colspan="8" style="background:#FFFFFF;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;">${summary.sourceFile||"Migration_summary_report.zip"}</td>
  </tr>

  <tr><td colspan="10" style="padding:4px;background:#FFFFFF;border:none;"></td></tr>
  <tr><td colspan="10" style="background:#EFF6FF;color:#0078D4;font-weight:bold;font-size:14px;padding:8px 16px;border-bottom:2px solid #0078D4;font-family:Arial,sans-serif;letter-spacing:0.3px;">MIGRATION SUMMARY</td></tr>

  <tr>
    <td colspan="2" style="background:#DCFCE7;color:#166534;font-weight:bold;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;text-align:center;">Files migrated successfully</td>
    <td colspan="2" style="background:#FFE4E6;color:#9F1239;font-weight:bold;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;text-align:center;">Items failed</td>
    <td colspan="2" style="background:#FEF3C7;color:#92400E;font-weight:bold;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;text-align:center;">Need your action</td>
    <td colspan="2" style="background:#DBEAFE;color:#1E40AF;font-weight:bold;font-size:12px;padding:6px 10px;border:1px solid #E2E8F0;text-align:center;">IT will handle</td>
    <td colspan="2" style="background:#FFFFFF;border:none;"></td>
  </tr>
  <tr>
    <td colspan="2" style="background:#DCFCE7;color:#166534;font-weight:bold;font-size:12px;padding:10px;border:1px solid #E2E8F0;text-align:center;">${fm}</td>
    <td colspan="2" style="background:#FFE4E6;color:#C00000;font-weight:bold;font-size:12px;padding:10px;border:1px solid #E2E8F0;text-align:center;">${errors.length}</td>
    <td colspan="2" style="background:#FEF3C7;color:#B45309;font-weight:bold;font-size:12px;padding:10px;border:1px solid #E2E8F0;text-align:center;">${ec}</td>
    <td colspan="2" style="background:#DBEAFE;color:#1D4ED8;font-weight:bold;font-size:12px;padding:10px;border:1px solid #E2E8F0;text-align:center;">${wc}</td>
    <td colspan="2" style="background:#FFFFFF;border:none;"></td>
  </tr>

  <tr><td colspan="10" style="padding:4px;background:#FFFFFF;border:none;"></td></tr>
  <tr><td colspan="10" style="background:#EFF6FF;color:#0078D4;font-weight:bold;font-size:14px;padding:8px 16px;border-bottom:2px solid #0078D4;font-family:Arial,sans-serif;letter-spacing:0.3px;">ERROR DETAILS &amp; SOLUTIONS</td></tr>
  <tr>${th("No.")}${th("File / Folder Name")}${th("Full Path")}${th("Error Code")}${th("Error Title")}${th("Explanation")}${th("Solution")}${th("Action Required")}${th("IT Retry?")}${th("Severity")}</tr>
  ${errorRows}

  <tr><td colspan="10" style="padding:4px;background:#FFFFFF;border:none;"></td></tr>
  <tr><td colspan="10" style="background:#EFF6FF;color:#0078D4;font-weight:bold;font-size:14px;padding:8px 16px;border-bottom:2px solid #0078D4;font-family:Arial,sans-serif;letter-spacing:0.3px;">YOUR NEXT STEPS</td></tr>
  ${nextStepsRows}
  ${itRows}

  <tr><td colspan="10" style="padding:4px;background:#FFFFFF;border:none;"></td></tr>
  <tr><td colspan="10" style="background:#F8FAFC;color:#6B7280;font-size:12px;padding:8px 16px;border:1px solid #E2E8F0;">For assistance: it-support@chs.net &nbsp;|&nbsp; IT Migration Team — CHSPSC, LLC</td></tr>
  <tr><td colspan="10" style="background:#F8FAFC;color:#9CA3AF;font-size:12px;font-style:italic;padding:6px 16px;">Auto-generated by the CHSPSC IT Migration System.</td></tr>
</table>
</body></html>`;

  return Buffer.from("\uFEFF" + html, "utf8").toString("base64");
}

module.exports = { buildUserExcelBase64 };
