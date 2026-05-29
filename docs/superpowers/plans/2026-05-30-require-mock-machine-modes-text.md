# Require Mock Machine Modes Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject invalid mock machine mode entries instead of silently stringifying them into wash program names.

**Architecture:** Keep mock validation separate from machine rule validation inside `backend/campus/machine_api.py`. Add one regression test for invalid mode list entries, then replace the current `str(mode)` conversion with an explicit non-empty string list parser.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `LaundryMachineClient` mock parsing flow.

---

### Task 1: Require Mock Machine Modes to Be Text

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing test**

Add a test near the mock machine validation tests:

```python
def test_mock_machine_requires_string_modes(self) -> None:
    invalid_modes: list[object] = [True, 123, ""]
    for mode in invalid_modes:
        with self.subTest(mode=mode):
            with tempfile.TemporaryDirectory() as tmp_dir:
                mock_path = Path(tmp_dir) / "machines.json"
                mock_path.write_text(
                    json.dumps(
                        {
                            "machines": [
                                {
                                    "machine_id": "washer-1",
                                    "location": "1F",
                                    "machine_type": "standard_washer",
                                    "status": "available",
                                    "modes": ["standard", mode],
                                }
                            ]
                        }
                    ),
                    encoding="utf-8",
                )
                client = LaundryMachineClient(mock_path=mock_path)

                with self.assertRaisesRegex(ValueError, "modes"):
                    client.list_machines()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_mock_machine_requires_string_modes -v`

Expected: FAIL because current code converts invalid mode entries with `str(...)`.

- [ ] **Step 3: Write the minimal implementation**

Add a helper:

```python
def _mock_string_list(value: object, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"machine {field_name} must be a list")
    result: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"machine {field_name} entries must be non-empty strings")
        result.append(item.strip())
    return result
```

Use it for `modes` in `_machine_from_mock_dict`.

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
git add docs/superpowers/plans/2026-05-30-require-mock-machine-modes-text.md backend/campus/machine_api.py tests/test_campus_machine_api.py
git commit -m "fix: require mock machine modes as text"
```
