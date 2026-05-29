# Disable Concurrent Wardrobe Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from starting multiple wardrobe delete operations before the first delete finishes.

**Architecture:** `WardrobeScreen` already tracks a `deletingId` while one delete is pending. Reuse that state to disable every delete button during the pending operation, avoiding concurrent calls and racing status messages.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Concurrent Delete Risk

**Files:**
- Modify: `frontend/src/screens/WardrobeScreen.test.tsx`

- [x] **Step 1: Add async delete test**

Add a test that starts a never-immediately-resolving delete, verifies all delete buttons are disabled while it is pending, and verifies clicking another delete button does not call `onDeleteItem` again:

```ts
it("disables every delete button while a delete is pending", async () => {
  let resolveDelete: () => void = () => undefined;
  const onDeleteItem = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
  );

  const { container } = render(
    <WardrobeScreen
      mobileSummary={selectableSummary}
      onNavigate={vi.fn()}
      onDeleteItem={onDeleteItem}
    />,
  );

  const deleteButtons = Array.from(container.querySelectorAll<HTMLButtonElement>(".danger-icon-button"));
  expect(deleteButtons.length).toBeGreaterThan(1);

  fireEvent.click(deleteButtons[0]);

  await waitFor(() => expect(deleteButtons[0]).toBeDisabled());
  expect(deleteButtons[1]).toBeDisabled();

  fireEvent.click(deleteButtons[1]);
  expect(onDeleteItem).toHaveBeenCalledTimes(1);

  resolveDelete();
  await waitFor(() => expect(deleteButtons[0]).not.toBeDisabled());
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- WardrobeScreen.test.tsx --run
```

Expected: the new test fails because only the clicked item delete button is disabled.

### Task 2: Disable All Deletes While Pending

**Files:**
- Modify: `frontend/src/screens/WardrobeScreen.tsx`

- [x] **Step 1: Reuse deleting state for all delete buttons**

Change the delete button disabled condition:

```tsx
disabled={Boolean(deletingId)}
```

- [x] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
npm test -- WardrobeScreen.test.tsx --run
```

Expected: all `WardrobeScreen` tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/screens/WardrobeScreen.tsx`
- Verify: `frontend/src/screens/WardrobeScreen.test.tsx`

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
git add docs/superpowers/plans/2026-05-30-disable-concurrent-wardrobe-delete.md frontend/src/screens/WardrobeScreen.tsx frontend/src/screens/WardrobeScreen.test.tsx
git commit -m "fix: prevent concurrent wardrobe deletes"
```

Expected: local commit is created. Do not push or upload.
