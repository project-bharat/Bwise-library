# Test plan

## Automated checks currently available

`package.json` defines `npm run build`, but no test, lint, or type-check script is configured. The GitHub Actions workflow builds a debug APK; a successful APK build does not verify all app behavior or release readiness.

Run the web build:

```sh
npm install
npm run build
```

For Android, use the workflow or generate the Capacitor project and build the debug variant as described in [Build and release](BUILD_AND_RELEASE.md).

## Manual functional checks

- [ ] Start with an empty library; add, edit, and delete books and reader profiles.
- [ ] Update a book's status, location, reader, and return date; verify displayed status and journey details.
- [ ] Add and edit wishlist items; promote one to the collection and verify no duplicate book is created for a matching title.
- [ ] Close and reopen the app; verify local data persists without a network connection.
- [ ] Export a full-data CSV; verify the file exists and includes the versioned backup header.
- [ ] Restore a backup only after exporting the current library; confirm that restore replaces the payload.
- [ ] Try an invalid/non-backup CSV and verify the app reports the error without treating it as a valid backup.
- [ ] Export a PDF and CSV on web and Android; on Android, test the system share sheet and file destination.
- [ ] Test English, Hindi, and Marathi text, including Devanagari in lists and exported PDFs.
- [ ] Test contact selection with permission granted and denied; confirm the rest of the library remains usable.
- [ ] Schedule due-date notifications on a real device; test permission denied/granted, due today, future, and removed/returned book cases.
- [ ] Test app restart, Android Back behavior, links, and screen layout on representative device sizes.

## Release-candidate checks

- [ ] Test a fresh install and an upgrade from the previous release, preserving a verified backup.
- [ ] Test the exact signed release AAB on an internal track and review crashes and the Play pre-launch report.
- [ ] Audit the merged manifest, permissions, bundled SDKs, network behavior, data retention, and privacy disclosures.
- [ ] If billing is introduced, test purchase, acknowledgement, restore, pending, cancellation, refund, and error paths with Play test accounts.

Record device model, Android version, app version, steps, expected/actual results, and any defects. Do not use real private library backups or payment details as test fixtures.
