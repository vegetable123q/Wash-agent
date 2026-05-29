# In-APK Backend Design

## Goal

The Android APK must not require a separately started backend service. Core wardrobe, campus machine, laundry plan, and report behavior runs inside the React/Capacitor app. Image recognition uses ModelHub/Gemini directly from the APK only after the user enters ModelHub settings.

## Architecture

The mobile frontend uses a TypeScript local service under `frontend/src/api/` instead of an HTTP mobile backend. The service owns the mobile `MobileSummary` shape, local wardrobe CRUD, campus machine mock context, simple plan/report summaries, and explicit errors for missing required local inputs.

VLM settings are separate from the old local backend connection settings. The UI accepts `baseUrl`, `apikey`, and `model_name`, where `model_name` is a select control with only `gemini-3.1-pro-preview`. The `apikey` remains in React memory only and is never written to `localStorage`.

## Data Flow

On app startup, `App.tsx` loads the local mobile summary immediately from the in-app service. Non-VLM screens do not wait for ModelHub configuration and do not call a mobile HTTP summary endpoint.

Adding a wardrobe item with text fields saves through the local service and refreshes the local summary. Deleting a wardrobe item removes it from the local service and refreshes the summary.

When a user chooses image recognition, the app checks that the ModelHub settings are complete. The browser-side Gemini client posts to `{baseUrl}/models/gemini-3.1-pro-preview:generateContent` with `x-goog-api-key`. Missing settings, unsupported model names, or failed VLM responses are shown explicitly.

## Error Handling

No backend URL fallback is added. The local service produces deterministic in-app results from packaged/static data and user-created wardrobe records.

The app does not save the ModelHub API key. Clearing the model settings removes the in-memory values. Reloading or reopening the APK requires the user to re-enter the key for image recognition.

## Testing

Frontend tests cover that startup uses the in-app backend without fetch, manual wardrobe CRUD uses local functions, ModelHub settings are not persisted, the model select only exposes `gemini-3.1-pro-preview`, and image recognition calls ModelHub only when settings are present.
