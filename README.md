# B-wise Library — Local-first Android app

B-wise Library is a React + Capacitor Android app for managing a personal book collection, readers, lending history and wishlist.

## Data storage and privacy

- **Phone storage is the primary database.** The native app saves its library to a persistent JSON file in the app's private data directory. Local reading and writing do not require internet access or an account.
- The app migrates the previous offline-viewing cache into the local database when available.
- App data stays in the app's private storage. Uninstalling the app or clearing its data may remove the local copy, so export backups regularly.
- Browser development uses local browser storage instead of the Android data file.

## Back up and restore

1. Open the app menu and select **Export Full Data (CSV)**.
2. On Android, the system share sheet opens. Choose a destination such as Files or Google Drive.
3. To restore, put the backup CSV on the phone, select **Restore Full Backup (CSV)**, and choose that file.
4. Restore replaces the app's current local library with the backup contents. Keep a separate copy before restoring.

The exported CSV contains a versioned full-data payload so the app can restore books, reader profiles, wishlist and configuration. This is a user-initiated file backup, not Drive sync. Google sign-in code requires Firebase/OAuth configuration; hidden `appDataFolder` sync and Pro billing are not yet available. See the guides in `docs/`.

## Branding assets

The full supplied brand kit, including Android launcher resources, Play listing media, web/social logos, and eight earned/locked reader milestone badges, is kept in `resources/brand/Bwise_Brand_Assets/`. The build scripts use the official mark, logos, favicon, web icons, Android density/adaptive resources, and splash mark. The milestone artwork is used on the new Progress screen. See [Brand assets](docs/BRAND_ASSETS.md) for the full inventory and use guidance.

## Build the APK

1. Push changes to the `main` branch.
2. Open **Actions → Build Android APK**. The workflow runs on push or can be started with **Run workflow**.
3. Wait for a successful run, open it, then download the `bwise-library-debug-apk` artifact.
4. Extract the artifact ZIP and install `app-debug.apk` on an Android device.

This is a debug APK for testing/personal installation. A signed release build is a separate step.

## Local development

```bash
npm ci
npm test
npm run dev
npm run build
```

## Native features

- Local-first book, reader, lending, wishlist and configuration data.
- Full-data CSV backup and restore through the Android file/share sheet.
- Annual reading goals with local progress tracking and earned/locked finished-book milestone badges.
- PDF exports, Android share sheet, hardware Back button and native external links.
- Reader profiles can be populated from device contacts when the user chooses contact import; permission is requested at that point. The app remains usable if permission is denied.
- Local due-date notifications are scheduled for books marked as lent/holding with a promise-return date. Notification permission is requested only when notifications are first scheduled. Overdue loans also appear in the in-app reminder list.
- Fonts and icons bundled locally for offline UI rendering.
