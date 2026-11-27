# Data migration and backup restore

## Where data lives

- Android: `bwise-library-data.json` in the app's private Capacitor data directory.
- Browser: the `bwise-library-data.json` key in that browser profile's local storage.
- Legacy native cache: if the Android data file is absent, startup attempts to read `bwise_payload_cache_v1` from Capacitor Preferences and persist it as the new file.

Android app-private data is isolated from other apps. Uninstalling the app or clearing its storage can remove the library. Browser data is tied to the browser profile and device.

## Full backup and restore

1. In the app menu, choose **Backup to Drive / Export CSV** or **Export Full Data (CSV)**.
2. On Android, choose a destination in the system share sheet, such as Google Drive or Files. In a browser, the CSV downloads.
3. Keep a separate copy of the backup before restoring.
4. Choose **Restore Full Backup (CSV)** and select a backup exported in this app's full-backup format.
5. Confirm the restore only after verifying the selected file.

The file contains a `BWISE_FULL_BACKUP_V1,1` header and a JSON payload row. Restore replaces the current books, people, configuration, and wishlist; it is not a merge. CSV reports such as a books export are not full backups and cannot be restored by this flow.

The loader currently normalizes missing payload fields to defaults. If the library unexpectedly appears empty after an update or restore, stop using the app and preserve the original device data and backup files; further writes may persist the empty payload.

## Legacy limits

The native loader migrates the old `bwise_payload_cache_v1` cache when no native data file exists. It does not import arbitrary Google Sheets exports or contact lists. The current importer accepts the versioned full-backup format only. Compatibility with older exports should be verified against a copy before relying on them.

For the file-sharing behavior, see [Google Drive backup](GOOGLE_DRIVE_SETUP.md).
