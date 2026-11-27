# Architecture

```text
React UI (src/) -> google.script.run compatibility shim -> localDb.js
                                                       -> app-private JSON file (Android)
                                                       -> localStorage (browser)

Capacitor plugins: contacts, local notifications, filesystem, share sheet,
                   status bar, splash screen, app/back handling, browser
```

## Runtime

- `src/main.jsx` loads the bundled fonts and styles, installs the compatibility shim, initializes native services, and mounts `App`.
- UI components retain the legacy `google.script.run` call style. `src/native/gasShim.js` routes those calls to `src/native/localDb.js`; it does not send requests to Google Apps Script or a Google Sheet.
- `localDb.js` serializes mutations and persists the complete payload as `bwise-library-data.json` in Capacitor's private `Directory.Data` on Android. Browser runs use the same filename as a `localStorage` key.
- On a native install without that file, the loader attempts to migrate the old `bwise_payload_cache_v1` Preferences value. New installs start with empty data and default configuration.
- `src/native/files.js` downloads files in the browser. On Android it writes to the app cache and opens the system share sheet. PDF generation uses `html2pdf.js`.
- `src/native/dueNotifications.js` schedules local due-date notifications; it does not require a remote notification service.

The Android project is generated during CI by Capacitor and is ignored by Git. The repository contains the web app, Capacitor configuration, source assets, and scripts that prepare the generated Android project.

## Legacy integration caveat

The repository still contains `backend/ApiBridge.gs`, `native/config.js`, and a Google Sheet Sync Settings screen. The current shim handles app calls locally, so entering an Apps Script URL and token does not enable cloud storage or synchronization. Do not treat those settings as proof that a remote connection is configured.

## Related documents

- [Data model](DATA_MODEL.md)
- [Build and release](BUILD_AND_RELEASE.md)
- [Google Drive backup](GOOGLE_DRIVE_SETUP.md)
