# Requirements checklist

This checklist records behavior visible in the repository. “Present in source” does not mean independently tested on every supported device or approved by Google Play.

## App functionality

| Requirement | Repository evidence | Status |
|---|---|---|
| Book collection, status, filters, and summary views | `src/App.jsx` and book components | Present in source |
| Reader profiles and lending details | Person and status modals; local payload | Present in source |
| Wishlist and promotion into the collection | `localDb.js` | Present in source |
| Local-first persistence | Capacitor private JSON file; browser `localStorage` | Present in source |
| Full backup and restore | Versioned full-data CSV; restore replaces the payload | Present in source |
| PDF export and Android share sheet | `html2pdf.js`, `native/files.js` | Present in source |
| Device contacts | Capacitor contacts plugin; Android permissions added by build script | Present in source; device test required |
| Due-date reminders | Capacitor local notifications | Present in source; device and permission tests required |
| English, Hindi, and Marathi UI translations | `src/i18n/` | Present in source |
| Google Drive account sync | No Drive OAuth or sync implementation | Not implemented |
| Google Play Billing | No Billing library or purchase implementation | Not implemented |

## Release readiness

- [ ] Build and install the generated Android app from a clean checkout.
- [ ] Configure protected release signing and produce a signed AAB.
- [ ] Confirm the current Play target API requirement and inspect the generated release manifest.
- [ ] Complete an Android device test pass, including backup/restore and notification permission behavior.
- [ ] Publish and link a privacy policy that matches the actual app and SDK behavior.
- [ ] Complete Play Console app content, Data safety, target audience, and listing requirements.
- [ ] Decide whether billing is in scope. If so, implement and test it before configuring products or declaring paid features.
- [ ] Have the developer account owner review and submit the release.

See [Google Play release guide](GOOGLE_PLAY_RELEASE_GUIDE.md) and [Test plan](TEST_PLAN.md).
