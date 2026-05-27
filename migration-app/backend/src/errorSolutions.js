// errorSolutions.js — Maps Migration Manager error codes to plain-language solutions

const ERROR_SOLUTIONS = {
  MEXPORTFILEUNSUPPORTEDMIMETYPE: {
    title: "Google Drive Shortcut — cannot be migrated",
    explanation:
      "This item is a Google Drive Shortcut (a link/pointer to another file). Shortcuts are not actual files and cannot be transferred to OneDrive.",
    solution:
      "Access the original file directly in Google Drive. To add it to OneDrive, open the original file in Google Drive and upload a copy manually to OneDrive.",
    actionRequired: "Yes — user action needed",
    retryByIT: "No",
    severity: "Warning",
  },
  MVERSIONDOWNLOAD: {
    title: "File version download failed",
    explanation:
      "The file could not be downloaded from Google Drive during the migration export due to a temporary version download error.",
    solution:
      "No action needed from you. The IT team will automatically retry migrating this file within 48 hours.",
    actionRequired: "No — IT will retry",
    retryByIT: "Yes — within 48 hours",
    severity: "Warning",
  },
  MFOLDERPATHTOLONG: {
    title: "File path too long for OneDrive",
    explanation:
      "The full folder path and file name combined exceed OneDrive's 260-character limit.",
    solution:
      "Shorten the folder name or file name so the total path length is under 260 characters, then re-upload to OneDrive manually.",
    actionRequired: "Yes — user action needed",
    retryByIT: "No",
    severity: "Error",
  },
  MEXPORTFILERATELIMIT: {
    title: "Export rate limited by Google",
    explanation:
      "Google temporarily blocked the export of this file due to rate limiting.",
    solution:
      "No action needed from you. The IT team will automatically retry this file.",
    actionRequired: "No — IT will retry",
    retryByIT: "Yes — within 48 hours",
    severity: "Warning",
  },
  MPERMISSION: {
    title: "Permission error — file not accessible",
    explanation:
      "The migration tool could not access this file due to a permission restriction in Google Drive.",
    solution:
      "Check the sharing settings of this file in Google Drive. Ensure the migration service account has at least Viewer access, then contact IT to retry.",
    actionRequired: "Yes — check permissions in Google Drive",
    retryByIT: "After user fixes permissions",
    severity: "Error",
  },
  MDUPLICATEFILE: {
    title: "Duplicate file conflict",
    explanation:
      "A file with the same name already exists at the destination path in OneDrive.",
    solution:
      "Check if the file already exists in your OneDrive. If it does and is up to date, no action is needed. If not, rename one of the files and re-upload.",
    actionRequired: "Yes — check OneDrive for duplicates",
    retryByIT: "No",
    severity: "Warning",
  },
  MUNKNOWN: {
    title: "Unknown migration error",
    explanation:
      "An unexpected error occurred during migration of this item.",
    solution:
      "Please contact IT at it-support@chs.net with the file name and error details. The IT team will investigate and resolve this manually.",
    actionRequired: "Yes — contact IT support",
    retryByIT: "IT will investigate",
    severity: "Error",
  },
};

// Returns solution for a given error code — falls back to MUNKNOWN for new/unknown codes
function getSolution(resultCode) {
  return ERROR_SOLUTIONS[resultCode] || {
    ...ERROR_SOLUTIONS.MUNKNOWN,
    title: `Unknown error: ${resultCode}`,
  };
}

module.exports = { ERROR_SOLUTIONS, getSolution };
