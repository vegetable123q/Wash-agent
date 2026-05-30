# Validate Frequency Unique Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject duplicate wardrobe `item_id` values before producing batch frequency advice, matching the uniqueness guarantees already enforced by the store, planner, and report generator.

**Architecture:** Keep single-item `advise_frequency()` unchanged. Add duplicate validation to the batch frequency path on both backend and frontend before mapping items to advice.

**Tech Stack:** Python `unittest`, TypeScript, Vitest, `uv`, `npm`.

---

### Task 1: Add unique item-id validation to batch frequency advice

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-validate-frequency-unique-item-ids.md`
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [x] **Step 1: Add backend failing test**

Add a test near existing `advise_all_frequencies()` validation coverage:

```python
def test_advise_all_rejects_duplicate_item_ids(self) -> None:
    items = self.store.list_items()
    items[1].profile.item_id = items[0].profile.item_id

    with self.assertRaisesRegex(ValueError, "duplicate.*item_id"):
        advise_all_frequencies(items, LaundryConstraints())
```

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_advise_all_rejects_duplicate_item_ids -v`

Expected: FAIL because duplicate IDs currently produce duplicate advice.

- [x] **Step 2: Add frontend failing test**

Import `adviseAllFrequencies`, allow `planItem()` to accept an optional `itemId`, and add:

```ts
it("rejects duplicate item ids before advising all frequencies", () => {
  expect(() =>
    adviseAllFrequencies(
      [
        planItem({ itemId: "item-1", name: "white cotton tee", wearCount: 2 }),
        planItem({ itemId: "item-1", name: "duplicate cotton tee", wearCount: 0 }),
      ],
      constraints,
    ),
  ).toThrow(/duplicate.*item-1/);
});
```

Run from `frontend`: `npm test -- src/api/frequencyAdvisor.test.ts`

Expected: FAIL because duplicate IDs currently produce duplicate advice.

- [x] **Step 3: Implement backend validation**

In `_validate_items()`:

```python
seen_item_ids: set[str] = set()
duplicates: list[str] = []
for index, item in enumerate(value):
    if not isinstance(item, WardrobeItem):
        raise ValueError(f"items[{index}] must be a WardrobeItem")
    _validate_item(item)
    item_id = item.profile.item_id
    if item_id in seen_item_ids:
        duplicates.append(item_id)
    else:
        seen_item_ids.add(item_id)
if duplicates:
    raise ValueError(f"items duplicate item_id: {', '.join(dedupe(duplicates))}")
```

- [x] **Step 4: Implement frontend validation**

Before mapping in `adviseAllFrequencies()`:

```ts
validateUniqueItemIds(items);
```

Add:

```ts
function validateUniqueItemIds(items: WardrobeItemForPlan[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of items) {
    const itemId = item.profile.item_id;
    if (seen.has(itemId)) duplicates.push(itemId);
    else seen.add(itemId);
  }
  if (duplicates.length) {
    throw new Error(`items duplicate item_id: ${dedupe(duplicates).join(", ")}`);
  }
}
```

- [x] **Step 5: Run targeted verification**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_advise_all_rejects_duplicate_item_ids -v
uv run python -m unittest tests.test_c_module -v
```

From `frontend`:

```bash
npm test -- src/api/frequencyAdvisor.test.ts
```

Expected: all PASS.

- [x] **Step 6: Run broader verification**

Run:

```bash
uv run python -m unittest discover -v
```

From `frontend`:

```bash
npm test
npm run build
```

Run:

```bash
git diff --check
```

Expected: all commands pass, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-frequency-unique-item-ids.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py frontend/src/api/frequencyAdvisor.test.ts frontend/src/api/frequencyAdvisor.ts
git commit -m "fix: validate frequency unique item ids"
```

Expected: one local commit. Do not push or upload.
