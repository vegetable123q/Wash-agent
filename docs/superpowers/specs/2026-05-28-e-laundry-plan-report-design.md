# E Module Laundry Planning and Report Design

Date: 2026-05-28

## Scope

The E module implements deterministic laundry planning and user-facing report generation. It consumes already-built shared contracts from the wardrobe and campus modules. It does not call LLMs, read Streamlit state, fetch machine data, or invent missing machine, price, time, material, or risk values.

## Planner

`backend.laundry.planner.plan_laundry()` accepts `WardrobeItem`, `LaundryConstraints`, and `CampusContext`.

It validates that selected item IDs exist, that available washer data exists for machine-wash buckets, and that pricing rules contain explicit program and dryer entries before calculating cost or duration. Missing required data raises `ValueError`.

The first version creates clear deterministic buckets:

- hand-wash, dry-clean, and do-not-wash items are isolated from shared machine buckets.
- bedding uses a large-wash program.
- dark or high color-bleed-risk items use a dark/standard bucket.
- remaining machine-washable light items use a light/standard bucket.

Drying is conservative: user dryer permission, explicit care warnings, wool content, and high shrink/deform/dryer risk determine whether a bucket may use a dryer. Disallowed drying becomes air dry with a warning.

## Report Generator

`backend.reports.generator.generate_report()` converts the final `LaundryPlan` into a `WashReport`. It does not change the plan or make new planning decisions.

Report sections cover bucket actions, cost/time, risk notes, and savings notes. Savings text is derived from plan facts such as air drying, separated high-risk items, and fewer rewash risks.

## Tests

`tests/test_e_module.py` constructs explicit wardrobe items, machines, and pricing rules. Tests cover bucket splitting, hand-wash handling, dryer limits, cost and duration calculation, missing-data errors, and readable report generation.
