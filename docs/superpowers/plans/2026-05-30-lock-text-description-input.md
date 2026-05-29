# Lock Text Description Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from editing the text-description input while a text recognition request is pending.

**Architecture:** `AddClothingScreen` already uses `recognitionStatus` for text extraction. Disable the text-mode textarea while `recognitionStatus === "recognizing"` so an in-flight extraction cannot apply to text the user has already changed.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Editable Text Input During Extraction

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`

- [x] **Step 1: Add pending text extraction test**

Add a test that starts a slow text extraction and asserts the text-description textarea is disabled while extraction is pending, then enabled again after extraction finishes:

```ts
it("locks the text description input while text recognition is pending", async () => {
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

  const modeButtons = Array.from(container.querySelectorAll<HTMLButtonElement>(".segmented button"));
  fireEvent.click(modeButtons[2]);
  const textarea = container.querySelector<HTMLTextAreaElement>(".text-extraction-box");
  expect(textarea).not.toBeNull();
  fireEvent.change(textarea!, { target: { value: "gray hoodie" } });
  const extractButton = container.querySelector<HTMLButtonElement>(".secondary-button");
  expect(extractButton).not.toBeNull();
  fireEvent.click(extractButton!);

  await waitFor(() => expect(extractButton).toBeDisabled());
  expect(textarea).toBeDisabled();

  resolveRecognition({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "Test hoodie" }) }] } }],
    }),
  });

  expect(await screen.findByDisplayValue("Test hoodie")).toBeInTheDocument();
  expect(textarea).not.toBeDisabled();
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- AddClothingScreen.test.tsx --run
```

Expected: the new test fails because the text-description textarea remains enabled while extraction is pending.

### Task 2: Disable Textarea During Text Recognition

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.tsx`

- [x] **Step 1: Add disabled condition to the text-mode textarea**

Inside the text mode textarea, disable it while recognition is active:

```tsx
<textarea
  className="input-like textarea-like text-extraction-box"
  value={textDescription}
  disabled={recognitionStatus === "recognizing"}
  ...
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
git add docs/superpowers/plans/2026-05-30-lock-text-description-input.md frontend/src/screens/AddClothingScreen.tsx frontend/src/screens/AddClothingScreen.test.tsx
git commit -m "fix: lock text recognition input"
```

Expected: local commit is created. Do not push or upload.
