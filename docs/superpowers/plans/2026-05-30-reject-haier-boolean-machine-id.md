# Reject Haier Boolean Machine Id Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent HaiLe/Haier machine payloads from turning boolean IDs into string machine identifiers.

**Architecture:** Keep the parsing boundary strict inside `backend/campus/machine_api.py`. Add one regression test at the API client boundary, then adjust the shared identifier helper so existing Haier position and machine parsing both reject booleans.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `LaundryMachineClient` parsing helpers.

---

### Task 1: Reject Boolean Haier Machine IDs

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing test**

Add a test next to the existing Haier machine parsing tests:

```python
def test_list_machines_rejects_boolean_haier_machine_id(self) -> None:
    with tempfile.TemporaryDirectory() as tmp_dir:
        rules_path = _write_rules(tmp_dir)
        transport = FakeCleverSchoolTransport(
            {
                "tower": {"success": True, "data": []},
                "status": {"success": True, "data": []},
                "haier_positions": {"code": 0, "data": {"items": []}},
                "haier_detail_00": {
                    "code": 0,
                    "data": {
                        "items": [
                            {
                                "id": True,
                                "name": "washer 1",
                                "state": 1,
                            }
                        ]
                    },
                },
                "haier_detail_01": {"code": 0, "data": {"items": []}},
                "haier_detail_02": {"code": 0, "data": {"items": []}},
            }
        )
        client = LaundryMachineClient(
            transport=transport,
            machine_rules_path=rules_path,
        )

        with self.assertRaisesRegex(ValueError, "haier_machine\\[0\\]\\.id"):
            client.list_machines("516", provider="haier")
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_list_machines_rejects_boolean_haier_machine_id -v`

Expected: FAIL because the current helper returns `"True"` instead of rejecting the payload.

- [ ] **Step 3: Write the minimal implementation**

Update `_required_identifier` in `backend/campus/machine_api.py`:

```python
def _required_identifier(item: dict[str, Any], key: str, context: str) -> str:
    value = item.get(key)
    if isinstance(value, bool):
        raise ValueError(f"Missing required {context}.{key}")
    if isinstance(value, (str, int)) and str(value).strip():
        return str(value).strip()
    raise ValueError(f"Missing required {context}.{key}")
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
git add docs/superpowers/plans/2026-05-30-reject-haier-boolean-machine-id.md backend/campus/machine_api.py tests/test_campus_machine_api.py
git commit -m "fix: reject haier boolean machine ids"
```
