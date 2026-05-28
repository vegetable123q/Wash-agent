# WashMate Campus Mobile Frontend

This folder contains the mobile-only frontend visual design for WashMate Campus.

## Scope

- Mobile frontend design with an optional local backend API connection.
- The app calls `/api/mobile/summary` when the backend API is running.
- If the backend API is unavailable, the UI marks itself as a frontend preview state.
- No secrets, analytics, telemetry, or binary image uploads. The current image picker stores only the selected file name in local wardrobe records.
- Capacitor is configured so the web build can be wrapped as an Android app.

## Local Preview

Start the backend API in one terminal:

```powershell
cd ..
uv sync
cd frontend
npm run dev:api
```

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

This local machine has the Android build toolchain configured:

- JDK 21: `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot`
- Android SDK: `C:\Users\Wuzh\Android\Sdk`
- Android platform: `android-35`
- Android build tools: `35.0.0`

The debug APK is generated at:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

The Android project also sets `android.overridePathCheck=true` because this workspace path contains non-ASCII characters.
