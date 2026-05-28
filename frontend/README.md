# WashMate Campus Mobile Frontend

This folder contains the mobile-only frontend visual design for WashMate Campus.

## Scope

- Mobile frontend design with an optional local backend API connection.
- The app calls `/api/mobile/summary` only after the user enters an API base URL and API token in the Profile screen, then saves or tests that connection.
- Release builds do not embed a real API URL or token. Runtime requests use `Authorization: Bearer <token>`.
- If the backend API is not configured, the UI marks itself as waiting for API configuration. If a configured API is unavailable, the UI marks itself as a frontend preview state.
- No analytics, telemetry, or binary image uploads. The current image picker stores only the selected file name in wardrobe records and the UI says so explicitly.
- Wardrobe records can be added and deleted through the local backend API.
- Dorm selection uses backend `MachineTower` choices from `/api/mobile/summary`.
- Clothing and machine detail screens show the selected backend or preview record; missing records render an explicit missing state.
- Capacitor is configured so the web build can be wrapped as an Android app.

## Local Preview

Start the backend API in one terminal:

```powershell
cd ..
uv sync
cd frontend
npm run dev:api
```

For Android emulator validation, bind the API to all interfaces so the emulator can reach it through `10.0.2.2`:

```powershell
cd frontend
npm run dev:api:emulator
```

Set `WASH_API_TOKEN` before starting the local API:

```powershell
$env:WASH_API_TOKEN="<local-token>"
npm run dev:api
```

In the app, open `我的`, set:

```text
API 地址: http://127.0.0.1:8000
API token: <local-token>
```

Tap `测试连接` on the same screen. A connected state means the same runtime API settings will be used for summary, plan, report, wardrobe add, and wardrobe delete requests.

For the Android emulator, use:

```text
API 地址: http://10.0.2.2:8000
API token: <local-token>
```

For any non-demo deployment, run the backend with an operator-controlled token:

```powershell
WASH_API_TOKEN=<shared-secret> uv run python -m backend.api.server --host 0.0.0.0 --port 8000
```

Do not put the production token in `package.json`, source files, or APK build variables.

Start the mobile frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
npm test
```

Open the printed localhost URL in a browser. Vite proxies `/api` to `http://127.0.0.1:8000`.

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

To build a debug APK that connects from the Android emulator to the local API:

```powershell
cd frontend
npm run apk:debug:emulator
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
Debug APKs allow cleartext traffic so the local emulator can call `http://10.0.2.2:8000` during development validation. Release APKs set `usesCleartextTraffic=false`; production API URLs should use HTTPS.

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
