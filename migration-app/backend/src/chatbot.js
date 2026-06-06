const axios = require("axios");

let ctx = null;

function updateContext(data) {
  const codeFiles = {};
  if (data.userMap) {
    Object.entries(data.userMap).forEach(([email, errors]) => {
      errors.forEach(e => {
        if (!e.ResultCode) return;
        if (!codeFiles[e.ResultCode]) codeFiles[e.ResultCode] = [];
        codeFiles[e.ResultCode].push({ file: e.FullPath ? e.FullPath.split("/").pop() : "Unknown", user: email });
      });
    });
  }
  ctx = { updatedAt: new Date().toLocaleString(), sourceFile: data.sourceFile, affectedUsers: data.affectedUsers, totalErrors: data.totalErrors || 0, users: data.users || [], codeFiles };
}

async function handleChat(msg, history = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { message: "GROQ_API_KEY not set in .env", error: true };

  let migrationCtx = "No migration ZIP previewed yet.";
  if (ctx) {
    const userLines = ctx.users.map(u => `  - ${u.userEmail}: ${u.errorCount} error(s) — ${u.errorCodes.join(", ")}`).join("\n");
    let codeBreakdown = "";
    if (Object.keys(ctx.codeFiles).length > 0) {
      const sorted = Object.entries(ctx.codeFiles).sort((a, b) => b[1].length - a[1].length);
      codeBreakdown = "\nERROR CODE FILE COUNTS:\n" + sorted.map(([code, files]) => `  - ${code}: ${files.length} file(s)`).join("\n");
    }
    migrationCtx = `File: ${ctx.sourceFile} | Users: ${ctx.affectedUsers} | Errors: ${ctx.totalErrors}\nUSERS:\n${userLines}${codeBreakdown}`;
  }

  const systemPrompt = `You are MigraPulse AI — a friendly expert assistant for the MigraPulse tool and Microsoft 365 migrations.

ABOUT MIGRAPULSE:
MigraPulse automates migration error notifications for Microsoft 365 Migration Manager. IT admins upload a ZIP report, preview errors per user, then send personalized emails via Power Automate + Outlook. Each user gets an HTML email + Excel report with only their errors.

PAGES: Dashboard (KPIs, charts, history), Process ZIP (upload/preview/send), History (export/import JSON), Error Codes (81 live MS codes), Activity Logs (real-time), Settings (6 tabs: Organization, Connections, Notifications, Appearance, Setup Guide, System Status).

THEMES: 6 themes x day/night = 12 combinations. Indigo, Ocean Blue, Emerald, Slate Pro, Rose, Amber. Change in sidebar or Settings > Appearance.

HISTORY: Saved in browser localStorage. Export as JSON before closing. Import to restore. Buttons on History page — green Export, purple Import (always visible).

SETTINGS TABS:
- Organization: set org name + project name (updates sidebar live)
- Connections: change backend URL, test connection
- Notifications: IT admin CC email
- Appearance: themes + day/night
- Setup Guide: 7-step deployment guide
- System Status: live health check

EMAIL: No file names in body. Amber section = user action needed. Blue section = IT handles. Excel attachment has all file details.

BACKEND API: /health, /api/error-codes, /api/preview-migration, /api/process-migration, /api/chat, /api/logs

CURRENT SESSION:
${migrationCtx}

ERROR CODES (key ones):
- MEXPORTFILEUNSUPPORTEDMIMETYPE: Google Shortcut — user manually copies to OneDrive
- MVERSIONDOWNLOAD: Download failed — IT retries 48hrs
- MFOLDERPATHTOLONG: Path > 260 chars — user shortens names
- MEXPORTFILERATELIMIT: Rate limit — IT retries 60 mins
- MPERMISSION: Permission denied — user fixes Google Drive sharing
- MJOBERROR: Job error — IT checks Migration Manager logs
- MABUSIVEFILE: Flagged by Google — cannot migrate
- MDUPLICATEFILE: Already in OneDrive — resolve duplicate
- MUKNOWNERRORREASON: Unknown — IT investigates

RULES:
- Greetings: respond warmly, introduce yourself briefly
- Tool questions: answer confidently from knowledge above
- Migration data: use exact numbers from session
- Use **bold** for codes and numbers
- Use bullet points for lists
- Never say you don't know about MigraPulse features`;

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: msg },
    ];
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      { model: "llama-3.3-70b-versatile", max_tokens: 600, temperature: 0.3, messages },
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, timeout: 25000 }
    );
    return { message: res.data?.choices?.[0]?.message?.content || "No response.", error: false };
  } catch(err) {
    console.error("[Chat] Groq error:", err.response?.data || err.message);
    return { message: `AI error: ${err.response?.data?.error?.message || err.message}`, error: true };
  }
}

module.exports = { handleChat, updateContext };
