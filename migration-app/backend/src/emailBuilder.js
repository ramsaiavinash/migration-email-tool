// emailBuilder.js — Builds professional HTML email body per user

const { getSolution } = require("./errorSolutions");

function buildEmailBody(userEmail, errors, summary = {}) {
  const userActionItems = errors.filter(
    e => getSolution(e.ResultCode).actionRequired.startsWith("Yes")
  );
  const itRetryItems = errors.filter(
    e => getSolution(e.ResultCode).retryByIT.startsWith("Yes")
  );

  const errorGroups = groupByCode(errors);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Calibri,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">

  <!-- Header -->
  <tr>
    <td style="background:#0078D4;padding:24px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold">Google My Drive Migration</p>
            <p style="margin:4px 0 0;color:#cce4f7;font-size:13px">Action required — migration notification</p>
          </td>
          <td align="right">
            <span style="font-size:36px">📁</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:28px 32px">

      <p style="margin:0 0 16px;font-size:15px;color:#222">Dear <strong>${userEmail}</strong>,</p>

      <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.7">
        Your Google My Drive has been successfully migrated to <strong>Microsoft OneDrive</strong>.
        ${summary.filesMigrated && summary.filesMigrated !== "N/A"
          ? `<strong>${Number(summary.filesMigrated).toLocaleString()}</strong> files were transferred successfully.`
          : "The majority of your files were transferred successfully."
        }
        However, <strong style="color:#C00000">${errors.length} item(s)</strong> could not be migrated automatically and require attention — details are in the attached CSV report.
      </p>

      <!-- Summary boxes -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="48%" style="background:#FEF3F2;border-left:4px solid #C00000;border-radius:0 6px 6px 0;padding:12px 16px">
            <p style="margin:0;font-size:22px;font-weight:bold;color:#C00000">${errors.length}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#7A0000">Items failed to migrate</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:#F0FDF4;border-left:4px solid #16A34A;border-radius:0 6px 6px 0;padding:12px 16px">
            <p style="margin:0;font-size:22px;font-weight:bold;color:#16A34A">${summary.filesMigrated && summary.filesMigrated !== "N/A" ? Number(summary.filesMigrated).toLocaleString() : "—"}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#14532D">Files migrated successfully</p>
          </td>
        </tr>
      </table>

      ${buildErrorSections(errorGroups)}

      <!-- CSV Attachment notice -->
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:14px 18px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1E40AF">📎 Detailed report attached</p>
        <p style="margin:0;font-size:13px;color:#1E40AF">
          A full error report is attached as a CSV file (<strong>${userEmail.split("@")[0]}_migration_errors.csv</strong>).
          It contains every failed item with the exact error, explanation, and step-by-step solution.
          Open it in Excel for the best experience.
        </p>
      </div>

      ${userActionItems.length > 0 ? `
      <!-- User action needed -->
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:14px 18px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#92400E">⚠ Your action is needed for ${userActionItems.length} item(s)</p>
        <p style="margin:0 0 8px;font-size:13px;color:#78350F">Please refer to the attached CSV for full details. Summary:</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350F;line-height:2">
          ${userActionItems.map(e => {
            const sol = getSolution(e.ResultCode);
            const name = e.FullPath ? e.FullPath.split("/").pop() : "Unknown";
            return `<li><strong>${name}</strong> — ${sol.solution}</li>`;
          }).join("")}
        </ul>
      </div>` : ""}

      ${itRetryItems.length > 0 ? `
      <!-- IT will retry -->
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:14px 18px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1E40AF">↻ IT will retry ${itRetryItems.length} item(s) automatically</p>
        <p style="margin:0;font-size:13px;color:#1E40AF">No action needed from you for these items — IT will retry within <strong>48 hours</strong>.</p>
      </div>` : ""}

      <!-- Contact -->
      <div style="background:#F9FAFB;border-radius:6px;padding:14px 18px;margin:20px 0">
        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#111">Need help?</p>
        <p style="margin:0;font-size:13px;color:#444">
          Contact the IT Migration Team: <a href="mailto:it-support@chs.net" style="color:#0078D4">it-support@chs.net</a>
        </p>
      </div>

      <p style="margin:20px 0 4px;font-size:14px;color:#222">Best regards,</p>
      <p style="margin:0;font-size:14px;color:#222"><strong>IT Migration Team</strong><br/>CHSPSC, LLC<br/>
        <a href="mailto:it-support@chs.net" style="color:#0078D4">it-support@chs.net</a>
      </p>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F3F4F6;padding:16px 32px;border-top:1px solid #E5E7EB">
      <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6">
        This is an automated notification from the CHSPSC IT Migration System. Do not reply to this email directly.<br/>
        For assistance contact <a href="mailto:it-support@chs.net" style="color:#6B7280">it-support@chs.net</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function groupByCode(errors) {
  const groups = {};
  for (const err of errors) {
    const code = err.ResultCode || "MUNKNOWN";
    if (!groups[code]) groups[code] = [];
    groups[code].push(err);
  }
  return groups;
}

function buildErrorSections(groups) {
  const sections = [];
  for (const [code, items] of Object.entries(groups)) {
    const sol = require("./errorSolutions").getSolution(code);
    const isWarning = sol.severity === "Warning";
    const bg    = isWarning ? "#FFFBEB" : "#FEF2F2";
    const border= isWarning ? "#F59E0B" : "#EF4444";
    const titleColor = isWarning ? "#92400E" : "#7F1D1D";
    const textColor  = isWarning ? "#78350F" : "#991B1B";
    const icon  = isWarning ? "⚠" : "✕";

    const fileList = items
      .map(e => `<li>${e.FullPath ? e.FullPath.split("/").pop() : "Unknown"}</li>`)
      .join("");

    sections.push(`
    <div style="background:${bg};border-left:4px solid ${border};border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:14px">
      <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:${titleColor}">${icon} ${sol.title} (${items.length} item${items.length > 1 ? "s" : ""})</p>
      <p style="margin:0 0 8px;font-size:13px;color:${textColor}">${sol.explanation}</p>
      <ul style="margin:0 0 8px;padding-left:18px;font-size:13px;color:${textColor};line-height:1.9">${fileList}</ul>
      <p style="margin:0;font-size:13px;color:${textColor}"><strong>What to do:</strong> ${sol.solution}</p>
    </div>`);
  }
  return sections.join("");
}

module.exports = { buildEmailBody };
