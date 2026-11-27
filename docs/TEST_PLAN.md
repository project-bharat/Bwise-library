# Test plan

## Automated checks currently available

`npm test` runs focused Node tests for backup validation, reading-goal calculations, and localization parity. `npm run build` validates the production Vite bundle. No lint or type-check script is configured. The GitHub Actions workflow builds a debug APK; a successful APK build does not verify all app behavior or release readiness.

Run the web build:

```sh
npm ci
npm test
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
- [ ] Before restore, verify the confirmation lists book, reader, and wishlist counts; restore must keep a local pre-restore snapshot.
- [ ] Corrupt the primary local data file; verify it is preserved as a recovery copy and the app uses the last valid local backup or refuses writes with an explicit error.
- [ ] Finish a book and verify annual progress updates immediately; existing books already marked FINISHED earn lifetime credit only when no completion date exists.
- [ ] Set and change the annual reading goal; verify it persists after restart and the progress bar never exceeds 100%.
- [ ] Verify each milestone badge unlocks at 1, 5, 10, 25, 50, 100, 250, and 500 unique finished books; locked art is used below each threshold.
- [ ] Set device time to shortly after midnight in India and verify newly saved dates use the local calendar day.
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
