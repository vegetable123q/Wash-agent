# Bound Care Label Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent English care-label aliases from matching inside unrelated longer words.

**Architecture:** Keep the existing `CARE_LABEL_ALIASES` table and extraction pipeline. Add one boundary-aware alias matching helper so ASCII aliases match as standalone tokens or phrases, while non-ASCII aliases keep the current substring behavior.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Create: `frontend/src/api/clothingExtractor.test.ts`
  - Add regression coverage for raw text profile creation so unrelated words such as `gentleman` and `bleachable` do not create care labels.
- Modify: `frontend/src/api/clothingExtractor.ts`
  - Replace bare `String.includes` in `extractCareHints` with a boundary-aware helper and add a small regex escape helper.

---

### Task 1: Add Regression Coverage

**Files:**
- Create: `frontend/src/api/clothingExtractor.test.ts`

- [ ] **Step 1: Write the failing test**

Create this test file:

```ts
import { describe, expect, it } from "vitest";
import { buildProfileFromInput } from "./clothingExtractor";

describe("clothingExtractor", () => {
  it("does not match care aliases inside unrelated English words", () => {
    const profile = buildProfileFromInput({
      item_id: "item-1",
      name: "gentleman cotton shirt",
      material_text: "cotton",
      colors_text: "white",
      user_note: "bleachable fabric",
    });

    expect(profile.care_recommendations).not.toContain("gentle_cycle");
    expect(profile.care_warnings).not.toContain("do_not_bleach");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- clothingExtractor.test.ts --run`

Expected: FAIL because the current substring matcher finds `gentle` inside `gentleman` and `bleach` inside `bleachable`.

---

### Task 2: Bound ASCII Care Alias Matching

**Files:**
- Modify: `frontend/src/api/clothingExtractor.ts`
- Test: `frontend/src/api/clothingExtractor.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change `extractCareHints` to call a helper:

```ts
function extractCareHints(name: string, material: string, note: string): string[] {
  const combined = [name, material, note].join(" ").toLowerCase();
  const labels: string[] = [];
  for (const [alias, canonical] of Object.entries(CARE_LABEL_ALIASES)) {
    if (aliasMatches(combined, alias.toLowerCase())) {
      labels.push(canonical);
    }
  }
  return [...new Set(labels)];
}
```

Add helpers near `extractCareHints`:

```ts
function aliasMatches(text: string, alias: string): boolean {
  if (/^[a-z0-9 _-]+$/i.test(alias)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(alias);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- clothingExtractor.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-bound-care-label-aliases.md`
- Create: `frontend/src/api/clothingExtractor.test.ts`
- Modify: `frontend/src/api/clothingExtractor.ts`

- [ ] **Step 1: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS with all frontend test files green.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS with TypeScript and Vite build completing successfully.

- [ ] **Step 3: Check whitespace**

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-bound-care-label-aliases.md frontend/src/api/clothingExtractor.ts frontend/src/api/clothingExtractor.test.ts
git commit -m "fix: bound care label alias matches"
```

Expected: a local-only commit. Do not push or upload.
