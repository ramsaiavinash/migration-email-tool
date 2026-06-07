const { getSolution } = require("./errorSolutions");

const EMAIL_THEMES = {
  blue:   { header:"#0078D4", headerEnd:"#1a56db", actionHeader:"#D97706", itHeader:"#0369A1", btn:"#0078D4" },
  indigo: { header:"#4F46E5", headerEnd:"#7C3AED", actionHeader:"#D97706", itHeader:"#4338CA", btn:"#4F46E5" },
  green:  { header:"#065F46", headerEnd:"#059669", actionHeader:"#D97706", itHeader:"#047857", btn:"#059669" },
  slate:  { header:"#1E293B", headerEnd:"#334155", actionHeader:"#D97706", itHeader:"#1E3A5F", btn:"#475569" },
  purple: { header:"#5B21B6", headerEnd:"#7C3AED", actionHeader:"#D97706", itHeader:"#5B21B6", btn:"#7C3AED" },
  teal:   { header:"#0F766E", headerEnd:"#0D9488", actionHeader:"#D97706", itHeader:"#0F766E", btn:"#0F766E" },
  red:    { header:"#991B1B", headerEnd:"#DC2626", actionHeader:"#D97706", itHeader:"#991B1B", btn:"#B91C1C" },
  amber:  { header:"#B45309", headerEnd:"#D97706", actionHeader:"#92400E", itHeader:"#0369A1", btn:"#B45309" },
};

function buildEmailBody(userEmail, errors, summary = {}) {
  const groups       = groupByCode(errors);
  const userName     = userEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const userActions  = Object.entries(groups).filter(([c]) => getSolution(c).actionRequired.startsWith("Yes"));
  const itActions    = Object.entries(groups).filter(([c]) => !getSolution(c).actionRequired.startsWith("Yes"));
  const totalFiles   = errors.length;
  const orgName      = summary.orgName || "IT Migration Team";
  const themeKey     = summary.emailTheme || process.env.EMAIL_THEME || "blue";
  const theme        = EMAIL_THEMES[themeKey] || EMAIL_THEMES.blue;
  const supportEmail = summary.supportEmail || process.env.IT_ADMIN_EMAIL || "it-support@yourorg.com";
  const projectName  = summary.projectName || "Google My Drive to OneDrive Migration";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Migration Update</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Calibri,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

<tr><td style="background:linear-gradient(90deg,${theme.header},${theme.headerEnd});height:5px;font-size:0">&nbsp;</td></tr>

<tr><td style="padding:28px 40px 20px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td>
      <table cellpadding="0" cellspacing="0" style="display:inline-table;vertical-align:middle;margin-right:8px">
        <tr><td width="9" height="9" style="background:#F25022;font-size:0">&nbsp;</td><td width="1"></td><td width="9" height="9" style="background:#7FBA00;font-size:0">&nbsp;</td></tr>
        <tr><td height="1"></td><td></td><td></td></tr>
        <tr><td width="9" height="9" style="background:#00A4EF;font-size:0">&nbsp;</td><td width="1"></td><td width="9" height="9" style="background:#FFB900;font-size:0">&nbsp;</td></tr>
      </table>
      <span style="font-size:12px;color:#6B7280;font-weight:600;vertical-align:middle;letter-spacing:0.05em">MICROSOFT 365 MIGRATION</span>
    </td>
    <td align="right"><span style="background:#FEF2F2;color:#DC2626;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid #FECACA;letter-spacing:0.05em">ACTION REQUIRED</span></td>
  </tr></table>
</td></tr>

<tr><td style="padding:0 40px 20px">
  <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827">${projectName}</h1>
  <p style="margin:0;font-size:14px;color:#6B7280">${totalFiles} item${totalFiles!==1?"s":""} could not be migrated automatically</p>
</td></tr>

<tr><td style="padding:0 40px"><div style="border-top:1px solid #E5E7EB"></div></td></tr>

<tr><td style="padding:20px 40px 0">
  <p style="margin:0 0 10px;font-size:15px;color:#111827">Dear <strong>${userName}</strong>,</p>
  <p style="margin:0;font-size:14px;color:#374151;line-height:1.7">Your files have been reviewed as part of the <strong>${projectName}</strong>. While most files migrated successfully, <strong style="color:#DC2626">${totalFiles} item${totalFiles!==1?"s":""}</strong> require${totalFiles===1?"s":""} your attention.</p>
</td></tr>

<tr><td style="padding:16px 40px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="31%" style="background:#FEF2F2;border-radius:8px;padding:16px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:800;color:#DC2626;line-height:1">${totalFiles}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#9B1C1C;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Items Failed</p>
    </td>
    <td width="4%"></td>
    <td width="31%" style="background:#FFFBEB;border-radius:8px;padding:16px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:800;color:#D97706;line-height:1">${userActions.reduce((a,[,v])=>a+v.length,0)}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#92400E;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Your Action</p>
    </td>
    <td width="4%"></td>
    <td width="31%" style="background:#EFF6FF;border-radius:8px;padding:16px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:800;color:#1D4ED8;line-height:1">${itActions.reduce((a,[,v])=>a+v.length,0)}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#1E40AF;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">IT Handles</p>
    </td>
  </tr></table>
</td></tr>

${userActions.length > 0 ? `
<tr><td style="padding:4px 40px 0">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;border:1px solid #FDE68A;overflow:hidden">
    <tr><td style="background:${theme.actionHeader};padding:11px 18px"><p style="margin:0;font-size:13px;font-weight:700;color:#fff">⚠ YOUR ACTION REQUIRED — ${userActions.reduce((a,[,v])=>a+v.length,0)} item${userActions.reduce((a,[,v])=>a+v.length,0)!==1?"s":""}</p></td></tr>
    <tr><td style="padding:14px 18px;background:#FFFBEB">
      <p style="margin:0 0 12px;font-size:13px;color:#78350F">These items need your attention. Full file list is in the <strong>attached Excel report</strong>.</p>
      ${userActions.map(([code, items]) => {
        const sol = getSolution(code);
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px"><tr><td style="padding:12px 14px;background:#fff;border-radius:6px;border:1px solid #FDE68A">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400E">${sol.title} <span style="background:#FEF3C7;color:#92400E;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600">${items.length} file${items.length!==1?"s":""}</span></p>
          <p style="margin:0 0 6px;font-size:12px;color:#78350F">${sol.explanation}</p>
          <p style="margin:0;font-size:12px;color:#451A03"><strong>Action:</strong> ${sol.solution}</p>
        </td></tr></table>`;
      }).join("")}
    </td></tr>
  </table>
</td></tr>` : ""}

${itActions.length > 0 ? `
<tr><td style="padding:12px 40px 0">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;border:1px solid #BAE6FD;overflow:hidden">
    <tr><td style="background:${theme.itHeader};padding:11px 18px"><p style="margin:0;font-size:13px;font-weight:700;color:#fff">↻ IT WILL HANDLE — ${itActions.reduce((a,[,v])=>a+v.length,0)} item${itActions.reduce((a,[,v])=>a+v.length,0)!==1?"s":""} — No action needed from you</p></td></tr>
    <tr><td style="padding:14px 18px;background:#F0F9FF">
      <p style="margin:0 0 10px;font-size:13px;color:#0C4A6E">The IT team will retry these items automatically within <strong>48 hours</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${itActions.map(([code, items]) => {
          const sol = getSolution(code);
          return `<tr><td style="padding:8px 0;border-bottom:1px solid #BAE6FD">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><p style="margin:0;font-size:13px;font-weight:600;color:#0C4A6E">${sol.title}</p><p style="margin:2px 0 0;font-size:11px;color:#0369A1">${sol.retryByIT}</p></td>
              <td align="right"><span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px">${items.length} file${items.length!==1?"s":""}</span></td>
            </tr></table>
          </td></tr>`;
        }).join("")}
      </table>
    </td></tr>
  </table>
</td></tr>` : ""}

<tr><td style="padding:14px 40px 0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0"><tr><td style="padding:14px 18px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="36" style="vertical-align:middle"><div style="width:32px;height:32px;background:#217346;border-radius:6px;text-align:center;line-height:32px;font-size:16px">📊</div></td>
      <td style="padding-left:12px">
        <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111827">Full report attached — ${userEmail.split("@")[0]}_migration_errors.xls</p>
        <p style="margin:0;font-size:12px;color:#6B7280">Contains every failed file with error code, explanation, solution and action status.</p>
      </td>
    </tr></table>
  </td></tr></table>
</td></tr>

<tr><td style="padding:16px 40px 0">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.06em">Next Steps</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${[
      userActions.length>0?["1","Review and complete the action items in the section above","#FEF9C3","#D97706"]:null,
      ["2","Open the attached Excel report for the full file-by-file breakdown","#EFF6FF","#1D4ED8"],
      itActions.length>0?["3","IT will retry the remaining items within 48 hours — nothing needed from you","#F0FDF4","#16A34A"]:null,
    ].filter(Boolean).map(([n,text,bg,col])=>`
    <tr><td style="padding:5px 0">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-top:1px"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${bg};color:${col};font-size:11px;font-weight:800;text-align:center;line-height:20px">${n}</span></td>
        <td style="padding-left:10px;font-size:13px;color:#374151;line-height:1.5">${text}</td>
      </tr></table>
    </td></tr>`).join("")}
  </table>
</td></tr>

<tr><td style="padding:16px 40px 0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB"><tr><td style="padding:14px 18px">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827">Questions? We are here to help.</p>
    <p style="margin:0;font-size:13px;color:#6B7280">Contact: <a href="mailto:${supportEmail}" style="color:${theme.header};font-weight:600;text-decoration:none">${supportEmail}</a></p>
  </td></tr></table>
</td></tr>

<tr><td style="padding:20px 40px 28px">
  <p style="margin:0 0 2px;font-size:14px;color:#374151">Best regards,</p>
  <p style="margin:0 0 1px;font-size:14px;font-weight:700;color:#111827">${orgName}</p>
  <p style="margin:0;font-size:13px;color:#6B7280">Microsoft 365 Migration Team · Automated by MigraPulse</p>
</td></tr>

<tr><td style="background:#F3F4F6;padding:12px 40px;border-top:1px solid #E5E7EB">
  <p style="margin:0;font-size:11px;color:#9CA3AF">This is an automated notification from MigraPulse. For support: <a href="mailto:${supportEmail}" style="color:#9CA3AF">${supportEmail}</a></p>
</td></tr>
<tr><td style="background:linear-gradient(90deg,${theme.header},${theme.headerEnd});height:3px;font-size:0">&nbsp;</td></tr>

</table>
</td></tr></table>
</body></html>`;
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

module.exports = { buildEmailBody };
