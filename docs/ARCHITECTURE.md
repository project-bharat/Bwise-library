# Architecture

```text
React UI (src/) -> src/native/libraryApi.js -> localDb.js
                                            -> app-private JSON file (Android)
                                            -> localStorage (browser)

Capacitor plugins: contacts, local notifications, filesystem, share sheet,
                   status bar, splash screen, app/back handling, browser
```

## Current behavior

- `src/main.jsx` initializes native services and mounts the React application.
- `src/native/libraryApi.js` provides explicit operations for the UI and currently delegates to `src/native/localDb.js`.
- `localDb.js` serializes mutations and persists the complete payload as `bwise-library-data.json` in Capacitor's private `Directory.Data` on Android. Browser runs use the same filename as a `localStorage` key.
- The payload carries a schema version and unique finished-book records for lifetime milestones and annual reading goals; legacy books already marked FINISHED receive lifetime credit without an invented completion date.
- Writes keep a rolling `.bak`; malformed data is preserved, recovered from the last valid backup when possible, and never silently replaced with an empty library.
- On a native install without that file, the loader attempts to migrate the old `bwise_payload_cache_v1` Preferences value.
- Full-data backup/restore retains the existing `BWISE_FULL_BACKUP_V1` CSV envelope, validates shape and previews record counts before restore.
- `src/native/files.js` downloads files in the browser. On Android it writes to the app cache and opens the system share sheet. PDF generation uses `html2pdf.js`.
- Due-date reminders are local notifications and do not require a remote notification service.

## Account, Drive, and Pro status

- Google sign-in is implemented through the Capawesome Google Sign-In plugin and Firebase Authentication. Runtime configuration is supplied with `VITE_FIREBASE_*` and `VITE_GOOGLE_WEB_CLIENT_ID`; without it, sign-in stays unavailable and local library use continues.
- Separate Google Drive authorization limited to the `drive.appdata` scope and on-demand two-way sync in hidden `appDataFolder` are approved but not implemented. The current people model uses names as identities, so stable person IDs and safe deletion/merge metadata are prerequisites.
- Pro entitlements for unlimited books/people and Drive sync are approved but not implemented. A trusted Cloud Function should verify Play purchase tokens using the Google Play Developer API; never trust client-only purchase state.

Do not claim a completed Drive sync or purchased Pro status until the corresponding flow is implemented and verified.

## Android build

The Android project is generated during CI by Capacitor and is ignored by Git. The repository contains the web app, Capacitor configuration, source assets, and scripts that prepare the generated Android project.

## Related documents

- [Data model](DATA_MODEL.md)
- [Data migration](DATA_MIGRATION.md)
- [Build and release](BUILD_AND_RELEASE.md)
- [Google Drive sync](GOOGLE_DRIVE_SETUP.md)
- [Google Play billing](GOOGLE_PLAY_BILLING.md)
