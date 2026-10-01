# backend/

The Google Sheet + Apps Script backend. Source of truth for all library data.

| File | What to do |
|------|-----------|
| `ApiBridge.gs` | **NEW** – paste into the Apps Script project as a new file. Exposes `doPost` (JSON API used by the Android app). |
| `Code.gs` | Your existing core engine. **Keep unchanged.** (Optionally copy it here for version control.) |
| `SetupDatabase.gs` | Your existing one-time seeder. **Keep unchanged.** (Optionally copy it here.) |
| `Index.html` + `tailwindcss.html` | Old web UI. Not used by the Android app; can stay for the browser version. |

Setup: see "Backend setup" in the root `README.md`.
