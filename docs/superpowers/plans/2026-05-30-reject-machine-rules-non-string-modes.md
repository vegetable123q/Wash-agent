# Reject Machine Rules Non String Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject invalid `machine_rules` mode entries instead of converting booleans, numbers, or empty strings into wash program names.

**Architecture:** The machine rule parser already has a shared `_string_list` helper. Add a focused regression test through `LaundryMachineClient.list_machines`, then tighten `_string_list` so rule modes must be non-empty strings.

**Tech Stack:** Python 3, `unittest`, `uv`, existing campus machine rule parsing.

---

### Task 1: Reject Invalid Rule Mode Entries

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing test**

Add a test near the existing machine rule validation tests:

```python
def test_machine_rules_reject_non_string_modes(self) -> None:
    invalid_modes: list[object] = [True, 123, ""]
    for mode in invalid_modes:
        with self.subTest(mode=mode):
            with tempfile.TemporaryDirectory() as tmp_dir:
                rules_path = _write_rules(tmp_dir)
                rules = json.loads(rules_path.read_text(encoding="utf-8"))
                rules["washer_types"]["standard_washer"]["modes"] = ["quick", mode]
                rules_path.write_text(
                    json.dumps(rules, ensure_ascii=False),
                    encoding="utf-8",
                )
                transport = FakeCleverSchoolTransport(
                    {
                        "tower": {"success": True, "data": []},
                        "status": {
                            "success": True,
                            "data": [
                                {
                                    "tower": "紫荆1号楼",
                                    "towerKey": "ncrkiz1",
                                    "macUnionCode": "洗衣机 he10000177",
                                    "floorName": "一层",
                                    "status": "状态: 待机中 更新时间:2026-05-28 13:26:28",
                                }
                            ],
                        },
                    }
                )
                client = LaundryMachineClient(
                    transport=transport,
                    machine_rules_path=rules_path,
                )

                with self.assertRaisesRegex(ValueError, "modes"):
                    client.list_machines("ncrkiz1", provider="cleverschool")
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_machine_rules_reject_non_string_modes -v`

Expected: FAIL because `_string_list` currently stringifies invalid entries.

- [ ] **Step 3: Write the minimal implementation**

Update `_string_list`:

```python
def _string_list(value: Any, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"machine_rules {field_name} must be a list")
    result: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(
                f"machine_rules {field_name} entries must be non-empty strings"
            )
        result.append(item.strip())
    return result
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
git add docs/superpowers/plans/2026-05-30-reject-machine-rules-non-string-modes.md backend/campus/machine_api.py tests/test_campus_machine_api.py
git commit -m "fix: reject non-string machine rule modes"
```
