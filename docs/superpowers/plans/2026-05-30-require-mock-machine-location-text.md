# Require Mock Machine Location Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject invalid mock machine locations instead of silently stringifying them into user-visible reports.

**Architecture:** Reuse the existing mock text validation helper in `backend/campus/machine_api.py`. Add a focused regression test for the mock parser, then route `location` through the helper just like `machine_id`.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `LaundryMachineClient` mock parsing flow.

---

### Task 1: Require Mock Machine Locations to Be Text

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing test**

Add a test near the mock machine validation tests:

```python
def test_mock_machine_requires_string_location(self) -> None:
    invalid_locations: list[object] = [True, 123, ""]
    for location in invalid_locations:
        with self.subTest(location=location):
            with tempfile.TemporaryDirectory() as tmp_dir:
                mock_path = Path(tmp_dir) / "machines.json"
                mock_path.write_text(
                    json.dumps(
                        {
                            "machines": [
                                {
                                    "machine_id": "washer-1",
                                    "location": location,
                                    "machine_type": "standard_washer",
                                    "status": "available",
                                }
                            ]
                        }
                    ),
                    encoding="utf-8",
                )
                client = LaundryMachineClient(mock_path=mock_path)

                with self.assertRaisesRegex(ValueError, "location"):
                    client.list_machines()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_mock_machine_requires_string_location -v`

Expected: FAIL because current code converts invalid locations with `str(...)`.

- [ ] **Step 3: Write the minimal implementation**

Update `MachineInfo(location=...)` in `_machine_from_mock_dict`:

```python
location=_required_mock_text(data, "location"),
```

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
git add docs/superpowers/plans/2026-05-30-require-mock-machine-location-text.md backend/campus/machine_api.py tests/test_campus_machine_api.py
git commit -m "fix: require mock machine locations as text"
```
