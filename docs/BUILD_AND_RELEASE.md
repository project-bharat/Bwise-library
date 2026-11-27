# Build and release

## Local web build

The project uses React 18, Vite 5, and Node.js. Install dependencies and build the web assets:

```sh
npm install
npm run build
```

For browser development, run `npm run dev`. The project has no `test`, lint, or type-check script in `package.json`; see [Test plan](TEST_PLAN.md).

## Android debug APK

The Android project is generated rather than committed. CI runs on Ubuntu with Node.js 20, JDK 17, Python 3.12, and Pillow, then:

1. Installs npm dependencies and Pillow.
2. Generates the in-app icon and builds the Vite assets.
3. Runs `npx cap add android` and `npx cap sync android`.
4. Generates Android icons and applies manifest/version setup with the scripts in `scripts/`.
5. Runs `./gradlew assembleDebug` and uploads a debug APK and ZIP.

The workflow is `.github/workflows/build-apk.yml`; it runs on pushes to `main` and on manual dispatch. The artifact is for testing, not Play Store distribution.

To generate an Android project locally, use `npx cap add android` once, then `npx cap sync android` after web or plugin changes. Build with the Android Gradle wrapper from the generated `android/` directory. On Windows, use `.\gradlew.bat assembleDebug`.

## Release status

- The checked-in workflow builds only a debug APK. It does not produce a signed release App Bundle (`.aab`).
- No release-signing configuration is present in the repository. Do not commit keystores, passwords, API tokens, or other credentials.
- `scripts/android-post-setup.py` stamps version code/name from CI inputs and adds runtime permissions, shortcuts, deep-link metadata, and portrait orientation to the generated project.
- The generated Android Gradle files are not checked in, so inspect their resolved SDK versions, manifest, and dependencies from the exact release build before publishing.

Before a store release, establish a protected signing process, build and test a signed AAB, and complete the checks in [Google Play release guide](GOOGLE_PLAY_RELEASE_GUIDE.md). Do not describe a debug APK as release-ready.
