# Validate Wash Record Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stored wash record `issues` from being silently converted from strings or mixed-type lists.

**Architecture:** Reuse the storage-layer string-list validator in `backend/wardrobe/store.py`. Add a regression test that mutates a sample wash record, then route `WashRecord.issues` through the helper instead of `list(...)`.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` tests.

---

### Task 1: Validate Stored Wash Record Issues

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add a test near the existing store validation tests:

```python
def test_store_rejects_invalid_wash_record_issues(self) -> None:
    invalid_issues: list[object] = ["pilling", [True], [123]]
    for issues in invalid_issues:
        with self.subTest(issues=issues):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][2]["wash_history"][0]["issues"] = issues
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "issues"):
                self.store.list_items()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wash_record_issues -v`

Expected: FAIL because current code coerces strings and mixed lists with `list(...)`.

- [ ] **Step 3: Write the minimal implementation**

Update `_wash_record_from_dict`:

```python
issues=_string_list(data["issues"], "issues"),
```

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: all C module tests pass.

- [ ] **Step 5: Run full backend verification**

Run: `uv run python -m unittest discover -v`

Expected: all backend tests pass.

- [ ] **Step 6: Run whitespace check**

Run: `git diff --check`

Expected: exit code 0, ignoring harmless CRLF warnings if present.

- [ ] **Step 7: Commit local-only version**

```bash
git add docs/superpowers/plans/2026-05-30-validate-wash-record-issues.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wash record issues"
```
