# Lock Single Image Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from changing the single image upload while a single-image recognition request is pending.

**Architecture:** `AddClothingScreen` already tracks `recognitionStatus`. Disable the single image input while `recognitionStatus === "recognizing"` so the selected image and async recognition result cannot drift apart.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Editable Single Image Input During Recognition

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`

- [x] **Step 1: Add pending single recognition test**

Add a test that starts a slow single-image recognition and asserts the single file input is disabled while recognition is pending, then enabled again after recognition finishes:

```ts
it("locks the single image input while image recognition is pending", async () => {
  let resolveRecognition: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
          resolveRecognition = resolve;
        }),
    ),
  );

  const { container } = render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

  const input = container.querySelector<HTMLInputElement>('input[type="file"]:not([multiple])');
  expect(input).not.toBeNull();
  fireEvent.change(input!, { target: { files: [new File(["tee"], "tee.png", { type: "image/png" })] } });
  fireEvent.click(screen.getByRole("button", { name: /拍照识别/ }));

  expect(await screen.findByRole("button", { name: /识别中/ })).toBeDisabled();
  expect(input).toBeDisabled();

  resolveRecognition({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "Test tee" }) }] } }],
    }),
  });

  expect(await screen.findByDisplayValue("Test tee")).toBeInTheDocument();
  expect(input).not.toBeDisabled();
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- AddClothingScreen.test.tsx --run
```

Expected: the new test fails because the single file input remains enabled while recognition is pending.

### Task 2: Disable Single Image Input During Recognition

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.tsx`

- [x] **Step 1: Add disabled condition to the single file input**

Inside the single mode upload input, disable the input while recognition is active:

```tsx
<input
  className="file-input"
  type="file"
  accept="image/*"
  aria-label="上传衣物图片"
  disabled={recognitionStatus === "recognizing"}
  onChange={...}
/>
```

- [x] **Step 2: Run the focused test and verify GREEN**

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
git add docs/superpowers/plans/2026-05-30-lock-single-image-selection.md frontend/src/screens/AddClothingScreen.tsx frontend/src/screens/AddClothingScreen.test.tsx
git commit -m "fix: lock single image selection"
```

Expected: local commit is created. Do not push or upload.
