# Agent instructions

These instructions apply to the whole repository. Inspect the current code before making changes; some older notes in `AGENT_README.md` describe a previous architecture and are not authoritative.

## Project facts

- The app is JavaScript: React 18, Vite 5, Tailwind CSS 3, and Capacitor 6. Do not migrate to TypeScript, a different state/router library, SQLite, or another UI stack without explicit owner approval.
- The app is local-first. `src/native/gasShim.js` routes the legacy `google.script.run` API shape to `src/native/localDb.js`; it does not connect to Google Apps Script or Google Sheets. The Google Sheet Sync Settings UI and stored URL/token are legacy and do not enable sync.
- Android stores the payload in Capacitor's private data directory; browser runs use `localStorage`. Full-backup restore replaces the current payload. Preserve and test these data-safety behaviors.
- The Android project is generated during CI and is not committed. The current workflow builds a debug APK; release signing and a signed Play App Bundle are not configured.
- The package ID is `com.bharatrasve.bwiselibrary`. Changing it affects app identity and requires explicit approval.

See the repository's `docs/` guides for architecture, data format, backup/restore, builds, testing, and Google Play preparation.

## Change boundaries

- Make small, focused changes and preserve existing UI, wording, and business rules unless the owner asks otherwise.
- Never commit secrets, signing keys, OAuth/service-account credentials, tokens, or private user data.
- Ask the owner before changing the package ID, adding an SDK or permission, collecting/transmitting new personal data, adding authentication or cloud sync, changing signing configuration, or choosing billing products/prices.
- Do not add Google Sign-In, Firebase, analytics, ads, or Play Billing by inference. These change privacy, architecture, or product behavior and require an approved design. Billing is not currently implemented.
- Do not claim that Play requirements are met or a release is ready based only on a debug build. Verify current requirements against official Google documentation and the account's Play Console before release work.
- Keep secrets out of logs and client bundles. Keep Android-generated files, `dist/`, and `node_modules/` out of commits.

## Development and verification

- `npm run build` is the repository's current automated project check. There are no configured test, lint, or type-check scripts in `package.json`; report that limitation rather than claiming those checks passed.
- For native changes, sync the generated Android project and run the available debug build when the Android toolchain is present. The GitHub Actions workflow is the reference build pipeline.
- Do not weaken permission checks, error handling, or data safeguards to make a build pass. Report unavailable tooling and failing checks explicitly.
- Change app versioning only for an explicitly requested release/build task; CI currently derives Android version values from the GitHub run number.

## Platform and privacy checks

- Before adding a plugin, permission, remote service, or purchase flow, check current official Android/Google Play documentation and the plugin's maintenance and compatibility. Do not copy version numbers or policy deadlines from old notes without verification.
- Review the generated merged manifest and dependency behavior for release-sensitive changes. Test native permissions and data flows on a device where possible.
- Keep privacy policy, in-app disclosures, Play Console declarations, and actual app behavior consistent. Do not add account, analytics, billing, or network data collection without owner approval.
- The developer account owner controls Play Console settings, products, declarations, and submissions. Do not access or modify the account or publish a release unless explicitly asked.
