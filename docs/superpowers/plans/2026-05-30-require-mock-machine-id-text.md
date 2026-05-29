# Require Mock Machine Id Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject invalid mock machine IDs instead of silently stringifying them.

**Architecture:** Keep validation inside the mock machine parsing boundary in `backend/campus/machine_api.py`. Add a focused `unittest` that proves `machine_id` must be a non-empty string, then replace the current `str(...)` coercion for that field with explicit validation.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `LaundryMachineClient` mock parsing flow.

---

### Task 1: Require Mock Machine IDs to Be Text

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing test**

Add a test near the existing mock machine validation tests:

```python
def test_mock_machine_requires_string_machine_id(self) -> None:
    invalid_ids: list[object] = [True, 123, ""]
    for machine_id in invalid_ids:
        with self.subTest(machine_id=machine_id):
            with tempfile.TemporaryDirectory() as tmp_dir:
                mock_path = Path(tmp_dir) / "machines.json"
                mock_path.write_text(
                    json.dumps(
                        {
                            "machines": [
                                {
                                    "machine_id": machine_id,
                                    "location": "1F",
                                    "machine_type": "standard_washer",
                                    "status": "available",
                                }
                            ]
                        }
                    ),
                    encoding="utf-8",
                )
                client = LaundryMachineClient(mock_path=mock_path)

                with self.assertRaisesRegex(ValueError, "machine_id"):
                    client.list_machines()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_mock_machine_requires_string_machine_id -v`

Expected: FAIL because current code converts invalid IDs with `str(...)`.

- [ ] **Step 3: Write the minimal implementation**

Add a helper and use it for `machine_id`:

```python
def _required_mock_text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"machine {key} must be a non-empty string")
    return value.strip()
```

Then update `MachineInfo(machine_id=...)` to call `_required_mock_text(data, "machine_id")`.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `uv run python -m unittest tests.test_campus_machine_api -v`

Expected: all campus machine API tests pass.

- [ ] **Step 5: Run full backend verification**

Run: `uv run python -m unittest discover -v`

Expected: all backend tests pass.

- [ ] **Step 6: Run whitespace check**

Run: `git diff --check`

Expected: exit code 0, ignoring harmless CRLF warnings if present.

- [ ] **Step 7: Commit local-only version**

```bash
git add docs/superpowers/plans/2026-05-30-require-mock-machine-id-text.md backend/campus/machine_api.py tests/test_campus_machine_api.py
git commit -m "fix: require mock machine ids as text"
```
