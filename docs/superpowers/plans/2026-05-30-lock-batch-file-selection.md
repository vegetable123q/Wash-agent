# Lock Batch File Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from changing the batch image selection while batch recognition or batch saving is in progress.

**Architecture:** `AddClothingScreen` already tracks `recognitionStatus` and `status` and passes both into `BatchEntry`. Use those existing states inside `BatchEntry` to disable the batch file input during in-flight work, so stale async recognition results cannot be mixed with a newer file selection.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Editable Batch Input During Recognition

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`

- [x] **Step 1: Add pending batch recognition test**

Add a test that starts a slow batch recognition and asserts the multiple file input is disabled while recognition is pending, then enabled again after recognition finishes:

```ts
it("locks the batch file input while batch recognition is pending", async () => {
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

  fireEvent.click(screen.getByRole("button", { name: "批量录入" }));
  const input = container.querySelector<HTMLInputElement>('input[type="file"][multiple]');
  expect(input).not.toBeNull();
  fireEvent.change(input!, { target: { files: [new File(["tee"], "tee.png", { type: "image/png" })] } });
  fireEvent.click(screen.getByRole("button", { name: /批量识别/ }));

  expect(await screen.findByRole("dialog", { name: "批量识别进度" })).toBeInTheDocument();
  expect(input).toBeDisabled();

  resolveRecognition({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "白色棉 T 恤" }) }] } }],
    }),
  });

  expect(await screen.findByText("已识别 1 件衣物，可统一保存。")).toBeInTheDocument();
  expect(input).not.toBeDisabled();
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- AddClothingScreen.test.tsx --run
```

Expected: the new test fails because the batch file input remains enabled while recognition is pending.

### Task 2: Disable Batch File Input During In-Flight Work

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.tsx`

- [x] **Step 1: Add disabled condition to the batch file input**

Inside `BatchEntry`, disable the multiple file input while recognition or saving is active:

```tsx
<input
  className="file-input"
  type="file"
  accept="image/*"
  multiple
  aria-label="批量上传衣物图片"
  disabled={recognitionStatus === "recognizing" || status === "saving"}
  onChange={(event) => onFilesChange(Array.from(event.currentTarget.files ?? []))}
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
git add docs/superpowers/plans/2026-05-30-lock-batch-file-selection.md frontend/src/screens/AddClothingScreen.tsx frontend/src/screens/AddClothingScreen.test.tsx
git commit -m "fix: lock batch file selection"
```

Expected: local commit is created. Do not push or upload.
