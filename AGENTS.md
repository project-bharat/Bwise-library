# Agent instructions

These instructions apply to the whole repository. Inspect the current code before making changes; see `AGENT_README.md` for the maintained project summary.

## Project facts

- The app is JavaScript: React 18, Vite 5, Tailwind CSS 3, and Capacitor 8. The owner approved Firebase Google sign-in, on-demand Google Drive `appDataFolder` sync, and Google Play Pro billing.
- The app is local-first. `src/native/libraryApi.js` exposes local operations backed by `src/native/localDb.js`. Firebase-backed Google account sign-in is implemented but requires Firebase/OAuth configuration. Drive sync and billing remain unimplemented; never represent them as operational until implemented and tested.
- Approved product behavior: Free allows up to 50 books and 20 people; Pro allows unlimited books/people and is required for Drive sync. Pro intent is ₹29 monthly, ₹265 annual, or ₹2,049 lifetime. Product IDs are pending and must remain configurable, not invented. Expiry preserves all data, permits reading/export, blocks additions beyond Free limits, and pauses Drive sync.
- Drive target is the hidden app-only `appDataFolder`, using a separate Drive authorization flow and two-way conflict-aware sync. Keep the local copy authoritative and never delete data on sync failure, account loss, or entitlement expiry.
- Android stores the payload in Capacitor's private data directory; browser runs use `localStorage`. The local payload also stores dated reading-completion history and the annual reading goal. Legacy finished books are retained in lifetime progress without being assigned a completion date. Full-backup restore replaces the current payload; preserve the rolling backup and recovery safeguards.
- The Android project is generated during CI and is not committed. The current workflow builds a debug APK; release signing and a signed Play App Bundle are not configured.
- The package ID is `com.bharatrasve.bwiselibrary`. Changing it affects app identity and requires explicit approval.

See the repository's `docs/` guides for architecture, data format, backup/restore, builds, testing, and Google Play preparation.

## Change boundaries

- Make small, focused changes and preserve existing UI, wording, and business rules unless the owner asks otherwise.
- Never commit secrets, signing keys, OAuth/service-account credentials, tokens, or private user data.
- Ask the owner before changing the package ID, changing signing configuration, or accessing/modifying Google/Firebase/Play Console accounts. The approved auth, Drive, and billing scope above does not authorize deploying cloud resources or publishing a release.
- Do not add analytics or ads. Keep Firebase Auth identity separate from Drive authorization, request only the required Drive app-data scope, and verify Play purchases on a trusted backend; never trust a client purchase callback or bundle service-account credentials.
- Do not claim that Play requirements are met or a release is ready based only on a debug build. Verify current requirements against official Google documentation and the account's Play Console before release work.
- Keep secrets out of logs and client bundles. Keep Android-generated files, `dist/`, and `node_modules/` out of commits.

## Development and verification

- Run `npm test` for the focused Node test suite and `npm run build` for the production bundle. There are no configured lint or type-check scripts in `package.json`; report that limitation rather than claiming those checks passed.
- Capacitor 8 requires Node.js 22+ and Android SDK 36. For native changes, sync the generated Android project and run the available debug build when the Android toolchain is present. The GitHub Actions workflow is the reference build pipeline.
- Do not weaken permission checks, error handling, or data safeguards to make a build pass. Report unavailable tooling and failing checks explicitly.
- Change app versioning only for an explicitly requested release/build task; CI currently derives Android version values from the GitHub run number.

## Platform and privacy checks

- Before adding a plugin, permission, remote service, or purchase flow, check current official Android/Google Play documentation and the plugin's maintenance and compatibility. Do not copy version numbers or policy deadlines from old notes without verification.
- Review the generated merged manifest and dependency behavior for release-sensitive changes. Test native permissions and data flows on a device where possible.
- Keep privacy policy, in-app disclosures, Play Console declarations, and actual app behavior consistent. Do not add account, analytics, billing, or network data collection without owner approval.
- The developer account owner controls Play Console settings, products, declarations, and submissions. Do not access or modify the account or publish a release unless explicitly asked.
