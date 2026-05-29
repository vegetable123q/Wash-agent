# ModelHub Cache Storage Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `loadModelHubConfig` respect localStorage when it is available, even if an in-memory config exists.

**Architecture:** Keep the in-memory cache only as a fallback for environments without `localStorage`. When `localStorage` exists, `loadModelHubConfig` reads from storage, updates the cache from valid data, and clears the cache when storage is missing or malformed.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Cache/Storage Sync Regression Coverage

**Files:**
- Modify: `frontend/src/api/modelHubConfig.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test:

```ts
  it("does not return a stale in-memory config after localStorage is cleared externally", () => {
    saveModelHubConfig({
      baseUrl: "https://modelhub.ailemac.com/v1beta",
      apikey: "sk-local-test-key",
      model_name: "gemini-3.1-pro-preview",
    });

    localStorage.clear();

    expect(loadModelHubConfig().apikey).toBe("");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modelHubConfig.test.ts --run`

Expected: FAIL because `loadModelHubConfig` currently returns `inMemoryModelHubConfig` before checking localStorage.

### Task 2: Prefer Storage When Available

**Files:**
- Modify: `frontend/src/api/modelHubConfig.ts`

- [ ] **Step 1: Write minimal implementation**

Change `loadModelHubConfig` to:

```ts
export function loadModelHubConfig(): ModelHubConfig {
  if (typeof localStorage === "undefined") {
    return inMemoryModelHubConfig ?? emptyModelHubConfig;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    inMemoryModelHubConfig = null;
    return emptyModelHubConfig;
  }
  try {
    const normalized = normalizeModelHubConfig(JSON.parse(raw));
    inMemoryModelHubConfig = normalized;
    return normalized;
  } catch {
    inMemoryModelHubConfig = null;
    return emptyModelHubConfig;
  }
}
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- modelHubConfig.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-modelhub-cache-storage-sync.md`
- Modify: `frontend/src/api/modelHubConfig.ts`
- Modify: `frontend/src/api/modelHubConfig.test.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- modelHubConfig.test.ts ProfileScreen.test.tsx App.integration.test.tsx --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend checks**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Inspect diff**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 4: Commit locally without uploading**

```bash
git add docs/superpowers/plans/2026-05-30-modelhub-cache-storage-sync.md frontend/src/api/modelHubConfig.ts frontend/src/api/modelHubConfig.test.ts
git commit -m "fix: sync modelhub cache with storage"
```
