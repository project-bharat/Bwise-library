# B-wise Library — Native Android App

Pixel-identical Android version of the B-wise Library web app (Book Library & Reader Lending Management).

* **UI**: the exact same React + Tailwind screens, bundled locally (no CDN), fonts & Font Awesome included offline.
* **Data**: your Google Sheet stays the database. The app talks to it through the Apps Script Web App (`backend/ApiBridge.gs`).
* **Native extras**: PDF / CSV exports open the Android share sheet, hardware Back button navigates, status bar themed, WhatsApp / call links open the real apps, last data cached for offline viewing.
* **Build**: GitHub Actions builds the APK. Nothing to install locally.

## Icons
Source artwork lives in `resources/icons/`:

* `ic_launcher_foreground.png` (1024×1024, transparent, art inside the central ~60 %)
* `ic_launcher_background.png` (1024×1024)

Replace both files with your own artwork (same names) and push – CI regenerates:
launcher icons (all densities, adaptive + round), the in-app brand icon shown in **every page footer, the side drawer and the PDF slip footer**.
(Placeholders are included: forest→teal gradient + open book.)

## Backend setup (once)
1. Open the Google Sheet → Extensions → Apps Script. Keep `Code.gs` and `SetupDatabase.gs`.
2. Add a new file **ApiBridge.gs** with the contents of `backend/ApiBridge.gs`.
3. Run `generateApiToken` once → open *Executions / Logs* and copy the printed token.
4. Deploy → **New deployment** → type *Web app* → Execute as **Me**, Who has access **Anyone** → copy the `/exec` URL.
5. After any later `.gs` change: Deploy → Manage deployments → ✏️ → Version: *New version* → Deploy (the URL stays the same).

## Build the APK
1. Push this folder to your GitHub repo (`main` branch).
2. Actions → **Build APK** (runs automatically on push, or *Run workflow*).
3. Download artifact **bwise-library-debug-apk** → unzip → install `app-debug.apk`.

Optional: set repo variable `GAS_URL` and secret `GAS_TOKEN` (Settings → Secrets and variables → Actions) to pre-fill the connection in the build. Otherwise enter them in the app on first launch (the Sync Settings dialog opens automatically; later via menu → Sync Settings).

## Local development (optional)
```bash
npm install
npm run dev        # browser preview at http://localhost:5173 (uses the same Sync Settings dialog)
npm run build
```

## What changed vs. the web version (only these)
| Area | Change |
|------|--------|
| `google.script.run` | replaced by `src/native/gasShim.js` (same call style, HTTPS to the Web App) – UI code untouched |
| PDF / CSV backup | browser blob-download → Android share sheet (`src/native/files.js`) |
| Back button | closes dialogs → previous screen → Home → exits |
| Drawer | + "Sync Settings" entry |
| Branding | app icon added above the developer footer, in the drawer, and in PDF slip footers |
| Fonts/CSS/icons | bundled with npm instead of CDN links |
