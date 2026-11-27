# Google Drive backup

## Current behavior

There is no Google Drive OAuth integration or automatic cloud synchronization in the current app. A full-data backup is generated locally as a CSV file. On Android, the app opens the system share sheet and the user may choose Google Drive, Files, or another installed destination. The app does not sign in to Drive or select a Drive folder itself.

The Google Sheet Sync Settings screen and saved URL/token are legacy UI. The current `google.script.run` compatibility shim routes operations to the local JSON store; entering settings does not make the app sync with Apps Script.

## Save a backup to Drive

1. Open the app menu and select **Backup to Drive / Export CSV** or **Export Full Data (CSV)**.
2. Choose Google Drive in the Android share sheet and save the generated file. If Drive is unavailable, choose Files or another destination.
3. Confirm the backup appears in the destination before relying on it.

In a browser, export downloads a CSV; upload it to Drive yourself if desired.

## Restore

Download or otherwise make the full-backup CSV available on the device, then use **Restore Full Backup (CSV)** in the app. Restore replaces the current library; export the current data first.

Backups include the library payload, including reader contact details where present. Store and share them carefully. For the format and migration limits, see [Data migration](DATA_MIGRATION.md).
