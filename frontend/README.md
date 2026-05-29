# WashMate Campus Mobile Frontend

This folder contains the mobile-only frontend visual design for WashMate Campus.

## Scope

- Mobile frontend design with an in-APK TypeScript backend service.
- The app no longer requires a separately started HTTP backend for summary, plan, report, wardrobe add, or wardrobe delete behavior.
- Release builds do not embed or persist the ModelHub `apikey`; it is kept only in React memory for the current app session.
- Image recognition calls ModelHub directly only after the user enters `baseUrl`, `apikey`, and selects `gemini-3.1-pro-preview`.
- No analytics or telemetry. Binary image data is sent only to the user-configured ModelHub endpoint when the user taps image recognition.
- Wardrobe records can be added and deleted through the in-APK local service.
- Dorm selection uses packaged in-APK campus tower choices.
- Clothing and machine detail screens show the selected backend or preview record; missing records render an explicit missing state.
- Capacitor is configured so the web build can be wrapped as an Android app.

## Local Preview

Install dependencies and start the mobile frontend:

```powershell
cd frontend
npm install
npm run dev
npm test
```

Open the printed localhost URL in a browser. No backend API process is required for the mobile frontend.

For image recognition, open `我的`, set:

```text
ModelHub baseUrl: https://modelhub.ailemac.com/v1beta
apikey: sk-your-api-key-here
model_name: gemini-3.1-pro-preview
```

Tap `应用识图配置`. The key is not persisted; reloading the app requires entering it again.

## Build

```powershell
cd frontend
npm run build
```

The production web build is written to `frontend/dist/`.

## Android / APK Path

The project is configured for Capacitor Android packaging.

```powershell
cd frontend
npm run build
npm run cap:sync
npm run apk:debug
```

APK generation requires a local Android build toolchain:

- JDK 21
- Android SDK with `android-35`
- Android build tools `35.0.0`
- `android/local.properties` with `sdk.dir=<your Android SDK path>`
- Android platform: `android-35`

The debug APK is generated at:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

The Android project also sets `android.overridePathCheck=true` because this workspace path contains non-ASCII characters.

## Branch and Release Workflow

- `preview`: push here for development validation. `.github/workflows/preview.yml` runs Python tests, frontend tests, and frontend build. It does not publish APKs.
- `main`: push here only when ready to publish. `.github/workflows/release-apk.yml` runs the same tests, syncs Capacitor, builds a signed release APK, uploads it as an artifact, and creates a GitHub Release.

Configure these GitHub Secrets before the first `main` release:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

`ANDROID_KEYSTORE_BASE64` is the base64-encoded release keystore file. The workflow decodes it only inside GitHub Actions; keystore files are ignored by git.
If these secrets are missing, CI generates an explicit temporary keystore so the APK can still be built and published. That fallback is installable, but it is not suitable for long-term app updates because the signing key changes between runs.
