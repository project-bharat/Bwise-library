# Google Drive sync

## Approved design and current status

Google Drive sync is approved as an on-demand Pro feature, but it is not implemented yet. The app currently keeps data on-device and supports manual full-data export/restore only. Google account sign-in is implemented, but requires project configuration. Do not show a Drive-connected/synced state until a real Drive operation succeeds.

The target is Drive's hidden `appDataFolder`, not a user-visible folder. Sign-in to the app with Firebase Auth and authorization to Drive are separate flows. Request only the narrow Drive `appData` scope; do not treat a Firebase Google sign-in token as Drive authorization.

## Configure Google sign-in

The app reads the following Vite variables from a local `.env.local` file or GitHub Actions repository variables. `.env.example` lists the names; Firebase web config and OAuth client IDs are public identifiers, not service-account credentials.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GOOGLE_WEB_CLIENT_ID`

In Firebase Console, create/register the web app, enable Google as an Authentication provider, and add the app's sign-in domains. In Google Cloud, create a web OAuth client and an Android OAuth client for package `com.bharatrasve.bwiselibrary`; register the debug signing SHA-1 for debug testing and the Play app-signing SHA-1 for store builds. The native plugin uses the web client ID at runtime. Do not commit generated secrets or service-account files.

Two-way sync should merge non-conflicting changes and surface same-record conflicts for the user to choose. The on-device library remains available if Drive is offline, access is revoked, or Pro expires. Never delete local data because a sync failed or a remote file is missing.

## Data-model prerequisites

- Current book records have IDs, but people are currently identified by name; introduce stable person IDs with a migration that preserves existing associations.
- Sync must represent edits and deletions so changes made on an offline device can be merged safely.
- Keep a recoverable local copy and preserve the existing versioned CSV backup/restore flow.

## Manual backup remains available

Use **Export Full Data (CSV)** to create a local backup. On Android, choose Files or another destination in the system share sheet. Restore replaces the current library, so export the current data first.

Backups include the library payload, including reader contact details where present. Store and share them carefully. For the format and migration limits, see [Data migration](DATA_MIGRATION.md).
