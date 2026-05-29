# Infer Local Photo MIME Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve local wardrobe photos when the browser provides an empty `File.type` but the image filename has a recognizable extension.

**Architecture:** `AddClothingScreen` converts selected files to data URLs before saving wardrobe items. Add a small MIME inference helper near `fileToDataUrl`, mirroring the recognition API behavior for common image extensions, so `createWardrobeItem` receives a valid `data:image/...;base64,` URL.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Dropped Local Photo

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`

- [x] **Step 1: Add empty-MIME photo save test**

Add a test that selects a `.jpg` file with an empty MIME type, saves a manual item, and verifies the stored local wardrobe photo has an inferred JPEG data URL:

```ts
it("infers a local photo mime type from filename when saving manual input", async () => {
  render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} />);

  const input = document.querySelector<HTMLInputElement>('input[type="file"]:not([multiple])');
  expect(input).not.toBeNull();
  fireEvent.change(input!, { target: { files: [new File(["photo"], "shirt.jpg", { type: "" })] } });
  fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "photo tee" } });
  fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

  expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem("washmate.localWardrobe") ?? "[]");
  expect(saved[0].photo_data_url).toMatch(/^data:image\/jpeg;base64,/);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- AddClothingScreen.test.tsx --run
```

Expected: the new test fails because the saved item does not retain `photo_data_url`.

### Task 2: Infer MIME for Local Photo Data URLs

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.tsx`

- [x] **Step 1: Add MIME inference helper**

Add a helper near `fileToDataUrl`:

```ts
function imageDataUrlMimeType(file: File): string {
  const explicitType = file.type.trim().toLowerCase();
  if (explicitType.startsWith("image/")) return explicitType;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}
```

- [x] **Step 2: Use the helper in data URL generation**

Update `fileToDataUrl`:

```ts
return `data:${imageDataUrlMimeType(file)};base64,${btoa(binary)}`;
```

- [x] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
npm test -- AddClothingScreen.test.tsx --run
```

Expected: all `AddClothingScreen` tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/screens/AddClothingScreen.tsx`
- Verify: `frontend/src/screens/AddClothingScreen.test.tsx`

- [x] **Step 1: Run complete frontend tests**

Run:

```bash
npm test -- --run
```

Expected: all frontend test files pass.

- [x] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build exits with code 0.

- [x] **Step 3: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [x] **Step 4: Commit locally without pushing**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-infer-local-photo-mime.md frontend/src/screens/AddClothingScreen.tsx frontend/src/screens/AddClothingScreen.test.tsx
git commit -m "fix: infer local photo mime"
```

Expected: local commit is created. Do not push or upload.
