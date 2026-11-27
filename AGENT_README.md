# B-wise Library — project notes

This file summarizes the current repository. The root [AGENTS.md](AGENTS.md) contains the rules for making changes.

## Current architecture

```text
React UI (src/) -> src/native/libraryApi.js -> src/native/localDb.js
                                            -> app-private JSON file (Android)
                                            -> localStorage (browser)
```

- Stack: React 18, Vite 5, Tailwind CSS 3, Capacitor 8, JavaScript.
- The local library is the primary copy. Mutations are serialized and saved to `bwise-library-data.json`; browser development uses the same payload format in local storage. The payload includes unique book completion history and a year-scoped annual reading goal for the Progress screen.
- Full backup export/restore remains a versioned CSV envelope. Restore replaces the current local library; malformed data is preserved for recovery, and a rolling backup is kept before writes or restore. Preserve and test these safeguards when changing persistence.
- Contacts and local notifications are optional native features. Denied permissions must not prevent core library use.
- Google sign-in, hidden Drive `appDataFolder` sync, and Google Play billing are approved future integrations but are not operational yet.

## Approved product requirements

- Free: maximum 50 books and 20 people.
- Pro: unlimited books and people, plus on-demand Drive sync.
- Intended price points: ₹29/month, ₹265/year, and ₹2,049 lifetime. Product IDs are pending; never invent them.
- After Pro expires, retain all data and permit read/export. Block additions only above Free caps and pause Drive sync; never delete data.
- Drive sync is two-way, merges non-conflicting edits, and asks the user to resolve same-record conflicts. The target is hidden `appDataFolder`, not a visible Drive folder.
- Firebase Auth identifies the app account. Drive authorization is separate; purchase tokens are verified by a trusted backend.

## Key files

```text
src/App.jsx                         Main screens, navigation, backup/restore
src/components/ProgressPage.jsx     Annual reading goal and reader milestone badges
src/native/libraryApi.js            Local data-operation facade
src/native/localDb.js               Serialized persistence, completion history, and recovery
src/native/storage.js               Browser/native storage helpers
src/native/backupFormat.js           Full-backup validation and restore preview
src/native/files.js                 Native share sheet and browser downloads
src/native/contacts.js              Optional contacts permission and picker
src/native/dueNotifications.js       Local due-date notifications
scripts/android-post-setup.py       Patches generated Android project
.github/workflows/build-apk.yml     Debug APK CI workflow
docs/                               Architecture, data, build, Drive, and Play guides
```

Capacitor 8 requires Node.js 22+ and Android SDK 36. The Android project is generated in CI and is ignored by Git. Never commit generated `android/`, `dist/`, `node_modules/`, user library data, credentials, or signing materials.

## Validation

- Run `npm test` for backup validation, reading progress calculations, and localization parity; run `npm run build` for the production bundle.
- There are no configured lint or type-check scripts. Add focused tests for new quota, migration, sync-merge, and entitlement rules when those features are implemented.
- For native changes, sync and build the generated Android project when the Android toolchain is available. Verify the merged manifest and permissions.
- Owner-controlled Firebase, OAuth, and Play Console setup/deployment is outside repository-only validation.
