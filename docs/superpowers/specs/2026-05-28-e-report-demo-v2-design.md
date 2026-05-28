# E Report Demo V2 Design

Date: 2026-05-28

## Scope

This pass improves the E module's planner output, user-facing report, and demo readiness after the mobile frontend and local API were merged. It keeps the existing `LaundryPlan`, `LaundryBucket`, and `WashReport` dataclasses and does not change shared models, mobile API response shape, or frontend code.

## Planner Enhancements

`backend.laundry.planner.plan_laundry()` will keep the same public signature. It will add more useful data and warnings through existing fields:

- fill `LaundryBucket.detergent_ml` for hand-wash and machine-wash buckets using deterministic bucket rules.
- add recommended machine ID/location warnings for machine-wash and dryer-safe buckets by reusing `CampusContext.available_machines`.
- add drying-context warnings when air drying is chosen but balcony or ventilation data indicates weaker drying conditions.
- add budget guidance when estimated cost exceeds `LaundryConstraints.budget_yuan`, without automatically removing selected items.

The planner still raises explicit errors when required selected items, machines, prices, or durations are missing.

## Report Content

`backend.reports.generator.generate_report()` will keep the same section keys used by the mobile frontend:

- `洗衣步骤`
- `费用和时间`
- `机器环境`
- `风险提醒`

The content will become more demo-ready:

- each laundry step names the bucket reason, wash method, program, laundry-bag choice, drying method, and bucket warnings.
- cost/time text includes the charged machine batches and dryer batches that contribute to the total.
- machine context summarizes available machine locations/types and queue estimates already present in `CampusContext`.
- savings and risk notes stay derived from the final `LaundryPlan`; report generation still does not change decisions.

## Demo Script

Add `docs/e_demo_script.md` as a 3-5 minute recording guide for the E owner. It should explain how to present the wardrobe selection, campus machines, bucket plan, risk controls, cost/time, and environmental value.

## Tests

Update focused E tests and full integration tests to assert the richer report text. Run the full Python suite with `uv run python -m unittest discover -v`.
