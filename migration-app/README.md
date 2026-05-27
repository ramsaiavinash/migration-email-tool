# Migration Auto-Email Tool
### CHSPSC LLC — IT Migration Team
**Stack:** React (GitHub Pages) + Node.js/Express (Render) + Power Automate (M365)
**Cost: $0** — uses only existing M365 licence

---

## Architecture

```
IT Admin uploads ZIP
        ↓
  React Frontend (GitHub Pages)
        ↓  POST /api/process-migration
  Node.js Backend (Render — free)
    • Extracts ProjectError.csv from ZIP
    • Groups errors by user email
    • Builds professional HTML email body
    • Builds CSV attachment with errors + solutions
        ↓  HTTP POST (per user)
  Power Automate HTTP Trigger (FREE — M365 included)
    • Receives: userEmail, subject, emailBody, csvAttachment
    • Sends email via Outlook with CSV attached
    • Logs result to SharePoint list
        ↓
  User receives email + CSV report
```

---

## Project Structure

```
migration-app/
├── frontend/               ← React app → deploy to GitHub Pages
│   ├── public/index.html
│   └── src/
│       ├── index.js
│       └── App.js
│
├── backend/                ← Node.js API → deploy to Render
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js         (Express server)
│       ├── zipParser.js     (Extract + parse CSV from ZIP)
│       ├── csvBuilder.js    (Build per-user CSV report)
│       ├── emailBuilder.js  (Build HTML email body)
│       └── errorSolutions.js (Error code → solution mapping)
│
├── power-automate/
│   └── FLOW_SETUP.md       (Step-by-step Power Automate setup)
│
└── README.md
```

---

## STEP 1 — Set up Power Automate (do this first)

### 1a. Create the flow

1. Go to https://make.powerautomate.com (logged in as Surya Pammi)
2. Click **+ Create → Instant cloud flow**
3. Name: `Migration Email Sender`
4. Trigger: **When an HTTP request is received**
5. Click **Create**

### 1b. Configure the HTTP trigger

In the trigger card, click **"Use sample payload to generate schema"** and paste:

```json
{
  "userEmail": "user@example.com",
  "subject": "[Migration Update] 5 items need attention",
  "emailBody": "<html>...</html>",
  "csvAttachment": "base64encodedstring",
  "csvFileName": "user_migration_errors.csv",
  "errorCount": 5,
  "sourceFile": "Migration_summary_report.zip",
  "itAdminEmail": "it-admin@chs.net",
  "timestamp": "2026-05-21T12:00:00Z"
}
```

Click **Done** — Power Automate generates the JSON schema automatically.

### 1c. Add: Send email via Outlook

Click **+ New step** → search **Send an email (V2)** → **Office 365 Outlook**

Fill in:
- **To:** `@{triggerBody()?['userEmail']}`
- **Subject:** `@{triggerBody()?['subject']}`
- **Body:** `@{triggerBody()?['emailBody']}`
- **CC:** `@{triggerBody()?['itAdminEmail']}`

Click **Show advanced options:**
- **Is HTML:** Yes
- **Attachments Name:** `@{triggerBody()?['csvFileName']}`
- **Attachments Content:** `@{triggerBody()?['csvAttachment']}`

### 1d. Add: Log to SharePoint

Click **+ New step** → **SharePoint → Create item**

- **Site Address:** your SharePoint URL
- **List Name:** `Migration Email Log`
- **Title:** `@{triggerBody()?['userEmail']}`
- **UserEmail:** `@{triggerBody()?['userEmail']}`
- **ErrorCount:** `@{triggerBody()?['errorCount']}`
- **SourceFile:** `@{triggerBody()?['sourceFile']}`
- **EmailSentAt:** `@{utcNow()}`
- **Status:** `Sent`

### 1e. Save and copy the URL

1. Click **Save**
2. Click on the **HTTP trigger** card to expand it
3. Copy the **HTTP POST URL** — it looks like:
   ```
   https://prod-xx.westus.logic.azure.com/workflows/abc123.../triggers/manual/paths/invoke?api-version=...
   ```
4. Paste this URL into your backend `.env` file as `POWER_AUTOMATE_URL`

---

## STEP 2 — Deploy the Backend to Render (free)

### 2a. Push backend to GitHub

```bash
cd migration-app/backend
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/migration-email-backend.git
git push -u origin main
```

### 2b. Deploy on Render

1. Go to https://render.com → Sign up free with GitHub
2. Click **New → Web Service**
3. Connect your `migration-email-backend` repo
4. Settings:
   - **Name:** `migration-email-backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Add environment variables (click **Environment**):
   ```
   POWER_AUTOMATE_URL = (paste your Power Automate HTTP URL)
   IT_ADMIN_EMAIL     = it-admin@chs.net
   FRONTEND_URL       = https://YOUR_GITHUB_USERNAME.github.io
   PORT               = 3001
   ```
6. Click **Deploy**
7. After deploy, copy your Render URL: `https://migration-email-backend.onrender.com`

---

## STEP 3 — Deploy the Frontend to GitHub Pages

### 3a. Set your backend URL

Create `frontend/.env`:
```
REACT_APP_BACKEND_URL=https://migration-email-backend.onrender.com
```

### 3b. Update package.json homepage

In `frontend/package.json`, replace:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/migration-email-tool"
```
with your actual GitHub username.

### 3c. Push frontend to GitHub

```bash
cd migration-app/frontend
npm install
git init
git add .
git commit -m "Initial frontend"
git remote add origin https://github.com/YOUR_USERNAME/migration-email-tool.git
git push -u origin main
```

### 3d. Deploy to GitHub Pages

```bash
npm run deploy
```

Your app is now live at: `https://YOUR_USERNAME.github.io/migration-email-tool`

---

## STEP 4 — Create SharePoint list

In your SharePoint site, create a list named **Migration Email Log** with these columns:

| Column      | Type              |
|-------------|-------------------|
| Title       | Single line       |
| UserEmail   | Single line       |
| ErrorCount  | Number            |
| SourceFile  | Single line       |
| EmailSentAt | Date and Time     |
| Status      | Single line       |

---

## How to use

1. Go to your GitHub Pages URL
2. Upload the migration ZIP from Microsoft 365 Admin Center
3. Click **Preview errors** — see all affected users and error summary
4. Click **Send all emails** — each user gets a professional email + CSV attachment
5. Check SharePoint **Migration Email Log** list for audit trail

---

## CSV attachment format

Each user receives a CSV file named `username_migration_errors.csv` containing:

- **Section 1:** Report header (user, date, source file)
- **Section 2:** Migration summary (files migrated, failed count)
- **Section 3:** Full error table (file name, path, error code, explanation, solution, action required, IT retry)
- **Section 4:** Next steps (user action items + IT retry items)
- **Section 5:** IT contact details

Open in Excel for best formatting — columns auto-fit.

---

## Adding new error codes

When a new error code appears, add it to `backend/src/errorSolutions.js`:

```js
MNEW_ERROR_CODE: {
  title: "Short title",
  explanation: "What happened in plain language",
  solution: "What the user should do",
  actionRequired: "Yes — user action needed",  // or "No — IT will retry"
  retryByIT: "No",                              // or "Yes — within 48 hours"
  severity: "Error",                            // or "Warning"
},
```

Re-deploy backend on Render (auto-deploys on git push). Done.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Check `FRONTEND_URL` in Render env matches your GitHub Pages URL exactly |
| Power Automate not triggered | Verify `POWER_AUTOMATE_URL` in Render env is correct and not expired |
| CSV not found in ZIP | Confirm ZIP contains `ProjectError.csv` (case-insensitive) |
| Email not received | Check Outlook connector in Power Automate is signed in with correct M365 account |
| Render service sleeping | Free tier sleeps after 15 min inactivity — first request takes ~30s to wake up |
| SharePoint log fails | Verify list column names match exactly (case-sensitive) |
