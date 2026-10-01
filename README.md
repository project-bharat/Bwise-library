# B-wise Library — Local-first Android app

B-wise Library is a React + Capacitor Android app for managing a personal book collection, readers, lending history and wishlist.

## Data storage and privacy

- **Phone storage is the primary database.** The native app saves its library to a persistent JSON file in the app's private data directory. It does not require a Google Sheet, internet access, a Google login, or an Apps Script URL to read and write entries.
- The app migrates the previous offline-viewing cache into the local database when available.
- App data stays in the app's private storage. Uninstalling the app or clearing its data may remove the local copy, so export backups regularly.
- Browser development uses local browser storage instead of the Android data file.

## Back up and restore

1. Open the app menu and select **Backup to Drive / Export CSV**.
2. On Android, the system share sheet opens. Select **Google Drive** (or another file/storage app) and save the backup. If Drive is not listed, install/update Google Drive and sign in to it, or save the CSV to Files.
3. To restore, put the backup CSV on the phone, select **Restore Full Backup (CSV)**, and choose that file.
4. Restore replaces the app's current local library with the backup contents. Keep a separate copy before restoring.

The exported CSV contains a versioned full-data payload so the app can restore books, reader profiles, wishlist and configuration. This is a user-initiated file backup, not automatic background synchronisation. The user chooses Google Drive in Android's share sheet; the app does not request Google Drive OAuth access.

## Branding assets

### Android launcher icon

Source artwork is in `resources/icons/`:

- `ic_launcher_foreground.png` — 1024 × 1024 transparent PNG with the white mark. Replace this source with the centered foreground asset when updating launcher artwork.
- `ic_launcher_background.png` — 1024 × 1024 background artwork.

The icon-generation script trims transparent padding and centers the visible logo inside Android's adaptive-icon safe area. CI regenerates launcher icons for all Android densities.

### Horizontal logo

Upload the white horizontal logo as:

- `public/horizontal-logo.png`

Use a transparent PNG with the white wordmark/app name, preferably around 1200 × 300 px. It is used on the custom in-app startup screen and the page footer. Keep the filename exactly `horizontal-logo.png`; no source-code edit is required after upload.

### Favicon and generated brand icon

- `public/favicon.png` — web favicon.
- `src/assets/brand-icon.png` — generated from the launcher artwork for PDF branding and the side drawer.

## Build the APK

1. Push changes to the `main` branch.
2. Open **Actions → Build Android APK**. The workflow runs on push or can be started with **Run workflow**.
3. Wait for a successful run, open it, then download the `bwise-library-debug-apk` artifact.
4. Extract the artifact ZIP and install `app-debug.apk` on an Android device.

This is a debug APK for testing/personal installation. A signed release build is a separate step.

## Local development

```bash
npm install
npm run dev
npm run build
```

## Native features

- Local-first book, reader, lending, wishlist and configuration data.
- Full-data CSV backup and restore through the Android file/share sheet.
- PDF exports, Android share sheet, hardware Back button and native external links.
- Fonts and icons bundled locally for offline UI rendering.
