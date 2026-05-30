# Normalize Drying Context Source Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `drying_context` alias handling deterministic when both `balcony_available` and legacy `has_balcony` appear.

**Architecture:** Normalize rule defaults and user-provided drying context separately before merging them. Within one source, canonical `balcony_available` wins over legacy `has_balcony`; across sources, user-provided values still override rule defaults.

**Tech Stack:** Python dict normalization, `unittest`, `uv`.

---

### Task 1: Preserve canonical field priority within one source

**Files:**
- Modify: `tests/test_campus_context.py`
- Modify: `backend/campus/context.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_build_campus_context_prefers_balcony_available_over_alias(self) -> None:
    client = FakeMachineClient([])
    with tempfile.TemporaryDirectory() as tmp_dir:
        context = build_campus_context(
            client,
            {
                "tower_key": "ncrkiz1",
                "tower_provider": "cleverschool",
                "drying_context": {
                    "balcony_available": True,
                    "has_balcony": False,
                },
            },
            machine_rules_path=_write_rules(tmp_dir),
        )

    self.assertEqual(context.drying_context["balcony_available"], True)
    self.assertEqual(context.drying_context["has_balcony"], False)
```

- [x] **Step 2: Add the rule-default override regression test**

Add:

```python
def test_build_campus_context_legacy_balcony_alias_overrides_rule_default(self) -> None:
    client = FakeMachineClient([])
    with tempfile.TemporaryDirectory() as tmp_dir:
        rules_path = _write_rules(tmp_dir)
        rules = json.loads(rules_path.read_text(encoding="utf-8"))
        rules["drying_context"] = {"balcony_available": True}
        rules_path.write_text(json.dumps(rules, ensure_ascii=False), encoding="utf-8")

        context = build_campus_context(
            client,
            {
                "tower_key": "ncrkiz1",
                "tower_provider": "cleverschool",
                "drying_context": {"has_balcony": False},
            },
            machine_rules_path=rules_path,
        )

    self.assertEqual(context.drying_context["balcony_available"], False)
    self.assertEqual(context.drying_context["has_balcony"], False)
```

- [x] **Step 3: Run the failing target test**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_prefers_balcony_available_over_alias -v`

Expected: FAIL because `has_balcony` currently overwrites `balcony_available`.

- [x] **Step 4: Write minimal implementation**

In `build_campus_context`, normalize both sources separately:

```python
rules_drying_context = _normalize_drying_context(_rules_drying_context(rules_path))
input_drying_context = _normalize_drying_context(_optional_object(inputs, "drying_context"))
drying_context = {**rules_drying_context, **input_drying_context}
```

Update `_normalize_drying_context`:

```python
if "has_balcony" in normalized and "balcony_available" not in normalized:
    normalized["balcony_available"] = normalized["has_balcony"]
```

- [x] **Step 5: Run target tests to verify they pass**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_prefers_balcony_available_over_alias tests.test_campus_context.CampusContextTests.test_build_campus_context_legacy_balcony_alias_overrides_rule_default -v`

Expected: PASS.

- [x] **Step 6: Run focused module tests**

Run: `uv run python -m unittest tests.test_campus_context -v`

Expected: PASS.

- [x] **Step 7: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 8: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-normalize-drying-context-source-priority.md tests/test_campus_context.py backend/campus/context.py
git commit -m "fix: preserve drying context field priority"
```

Expected: one local commit. Do not push or upload.
