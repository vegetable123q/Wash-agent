from __future__ import annotations

import unittest

from backend.laundry.planner import plan_laundry
from backend.reports.generator import generate_report
from backend.shared.models import (
    CampusContext,
    ClothingProfile,
    DryMethod,
    LaundryBucket,
    LaundryChargeLine,
    LaundryConstraints,
    LaundryPlan,
    MachineInfo,
    MachineQueueEstimate,
    MachineStatus,
    MachineType,
    RiskLevel,
    WardrobeItem,
    WashMethod,
)


def _item(
    item_id: str,
    name: str,
    *,
    colors: list[str],
    materials: dict[str, float],
    risks: dict[str, RiskLevel] | None = None,
    warnings: list[str] | None = None,
    recommendations: list[str] | None = None,
    preferred_method: WashMethod = WashMethod.MACHINE_WASH,
) -> WardrobeItem:
    return WardrobeItem(
        profile=ClothingProfile(
            item_id=item_id,
            name=name,
            material_ratios=materials,
            colors=colors,
            care_warnings=list(warnings or []),
            care_recommendations=list(recommendations or []),
            care_forbidden=list(warnings or []) + list(recommendations or []),
            risks=dict(risks or {}),
            confidence=0.9,
        ),
        preferred_method=preferred_method,
    )


def _campus_context() -> CampusContext:
    machines = [
        MachineInfo(
            machine_id="washer-1",
            location="Dorm A",
            machine_type=MachineType.STANDARD_WASHER,
            status=MachineStatus.AVAILABLE,
            modes=["standard", "gentle"],
        ),
        MachineInfo(
            machine_id="washer-large-1",
            location="Dorm A",
            machine_type=MachineType.STANDARD_WASHER,
            status=MachineStatus.AVAILABLE,
            modes=["large"],
        ),
        MachineInfo(
            machine_id="dryer-1",
            location="Dorm A",
            machine_type=MachineType.DRYER,
            status=MachineStatus.AVAILABLE,
            modes=["low"],
        ),
    ]
    return CampusContext(
        all_machines=machines,
        available_machines=machines,
        queue_estimates=[
            MachineQueueEstimate(
                machine_type=MachineType.STANDARD_WASHER,
                total_count=1,
                available_count=1,
                running_count=0,
                out_of_service_count=0,
                unknown_count=0,
                estimated_wait_minutes=0,
            ),
            MachineQueueEstimate(
                machine_type=MachineType.STANDARD_WASHER,
                total_count=2,
                available_count=2,
                running_count=0,
                out_of_service_count=0,
                unknown_count=0,
                estimated_wait_minutes=0,
            ),
        ],
        drying_context={"balcony_available": True, "ventilation": "normal"},
        pricing_rules={
            "wash_programs": {
                "standard": {"price_yuan": 4.0, "duration_minutes": 35},
                "large": {"price_yuan": 6.0, "duration_minutes": 45},
                "gentle": {"price_yuan": 4.0, "duration_minutes": 30},
            },
            "dryer_programs": {
                "low": {"price_yuan": 2.0, "duration_minutes": 25},
            },
        },
    )


class EModuleTests(unittest.TestCase):
    def test_plan_splits_light_dark_bedding_and_hand_wash_buckets(self) -> None:
        items = [
            _item("white-tee", "白色纯棉 T 恤", colors=["white", "light"], materials={"cotton": 1.0}),
            _item(
                "black-jeans",
                "黑色牛仔裤",
                colors=["black", "dark"],
                materials={"denim": 1.0},
                risks={"color_bleed": RiskLevel.HIGH},
                recommendations=["wash_separately"],
            ),
            _item("bedding", "床单被套", colors=["white", "light"], materials={"cotton": 1.0}),
            _item(
                "wool-sweater",
                "浅灰色羊毛衫",
                colors=["gray", "light"],
                materials={"wool": 0.9, "nylon": 0.1},
                risks={"shrink": RiskLevel.HIGH, "deform": RiskLevel.HIGH},
                warnings=["hand_wash_only", "do_not_tumble_dry"],
                preferred_method=WashMethod.HAND_WASH,
            ),
        ]

        plan = plan_laundry(
            items,
            LaundryConstraints(
                selected_item_ids=["white-tee", "black-jeans", "bedding", "wool-sweater"],
                allow_dryer=False,
            ),
            _campus_context(),
        )

        buckets_by_id = {bucket.bucket_id: bucket for bucket in plan.buckets}
        self.assertEqual(buckets_by_id["light-standard"].item_ids, ["white-tee"])
        self.assertEqual(buckets_by_id["dark-standard"].item_ids, ["black-jeans"])
        self.assertEqual(buckets_by_id["large-bedding"].item_ids, ["bedding"])
        self.assertEqual(buckets_by_id["hand-wash"].item_ids, ["wool-sweater"])
        self.assertEqual(buckets_by_id["large-bedding"].program, "large")
        self.assertEqual(buckets_by_id["hand-wash"].wash_method, WashMethod.HAND_WASH)
        self.assertEqual(buckets_by_id["light-standard"].machine_id, "washer-1")
        self.assertEqual(buckets_by_id["large-bedding"].machine_id, "washer-large-1")
        self.assertEqual(buckets_by_id["light-standard"].estimated_cost_yuan, 4.0)
        self.assertEqual(buckets_by_id["large-bedding"].estimated_duration_minutes, 45)
        self.assertEqual(buckets_by_id["light-standard"].detergent_ml, 24.0)
        self.assertEqual(buckets_by_id["dark-standard"].detergent_ml, 24.0)
        self.assertEqual(buckets_by_id["large-bedding"].detergent_ml, 40.0)
        self.assertEqual(buckets_by_id["hand-wash"].detergent_ml, 8.0)
        self.assertTrue(buckets_by_id["light-standard"].use_laundry_bag)
        self.assertTrue(buckets_by_id["dark-standard"].use_laundry_bag)
        self.assertIn("推荐使用 washer-1", " ".join(buckets_by_id["light-standard"].warnings))
        self.assertIn("推荐使用 washer-large-1", " ".join(buckets_by_id["large-bedding"].warnings))
        self.assertTrue(all(bucket.dry_method == DryMethod.AIR_DRY for bucket in plan.buckets))
        self.assertEqual(plan.estimated_cost_yuan, 14.0)
        self.assertEqual(plan.estimated_duration_minutes, 115)
        self.assertEqual([line.label for line in plan.cost_breakdown], [
            "large-bedding large 洗",
            "dark-standard standard 洗",
            "light-standard standard 洗",
        ])

    def test_dryer_is_used_only_when_allowed_and_safe(self) -> None:
        items = [
            _item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0}),
            _item(
                "wool-sweater",
                "羊毛衫",
                colors=["gray"],
                materials={"wool": 1.0},
                risks={"shrink": RiskLevel.HIGH},
                warnings=["do_not_tumble_dry"],
            ),
        ]

        plan = plan_laundry(
            items,
            LaundryConstraints(selected_item_ids=["white-tee", "wool-sweater"], allow_dryer=True),
            _campus_context(),
        )

        buckets_by_id = {bucket.bucket_id: bucket for bucket in plan.buckets}
        self.assertEqual(buckets_by_id["light-standard"].dry_method, DryMethod.LOW_HEAT_DRYER)
        self.assertEqual(buckets_by_id["hand-wash"].dry_method, DryMethod.AIR_DRY)
        self.assertEqual(plan.estimated_cost_yuan, 6.0)
        self.assertEqual(plan.estimated_duration_minutes, 60)
        self.assertEqual(buckets_by_id["light-standard"].dryer_machine_id, "dryer-1")
        self.assertEqual(buckets_by_id["light-standard"].estimated_cost_yuan, 6.0)
        self.assertEqual(
            [(line.bucket_id, line.machine_id, line.amount_yuan) for line in plan.cost_breakdown],
            [("light-standard", "washer-1", 4.0), ("light-standard", "dryer-1", 2.0)],
        )
        self.assertIn("推荐使用 dryer-1", " ".join(buckets_by_id["light-standard"].warnings))
        self.assertIn("不可烘干", " ".join(buckets_by_id["hand-wash"].warnings))

    def test_allow_mixed_colors_combines_low_risk_standard_items(self) -> None:
        items = [
            _item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0}),
            _item("navy-tee", "藏青色 T 恤", colors=["navy"], materials={"cotton": 1.0}),
        ]

        plan = plan_laundry(
            items,
            LaundryConstraints(
                selected_item_ids=["white-tee", "navy-tee"],
                allow_mixed_colors=True,
                allow_dryer=False,
            ),
            _campus_context(),
        )

        self.assertEqual([bucket.bucket_id for bucket in plan.buckets], ["mixed-standard"])
        bucket = plan.buckets[0]
        self.assertEqual(bucket.item_ids, ["white-tee", "navy-tee"])
        self.assertEqual(bucket.detergent_ml, 30.0)
        self.assertIn("允许混色", " ".join(bucket.warnings))

    def test_urgent_items_must_be_selected(self) -> None:
        items = [_item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0})]

        with self.assertRaisesRegex(ValueError, "urgent item ids must be selected"):
            plan_laundry(
                items,
                LaundryConstraints(
                    selected_item_ids=["white-tee"],
                    urgent_item_ids=["missing-urgent"],
                ),
                _campus_context(),
            )

    def test_constraints_require_string_item_id_lists(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_values: list[object] = ["white-tee", [True], [123], [""]]

        for selected_item_ids in invalid_values:
            with self.subTest(field="selected_item_ids", value=selected_item_ids):
                with self.assertRaisesRegex(ValueError, "selected_item_ids"):
                    plan_laundry(
                        items,
                        LaundryConstraints(selected_item_ids=selected_item_ids),  # type: ignore[arg-type]
                        _campus_context(),
                    )

        for urgent_item_ids in invalid_values:
            with self.subTest(field="urgent_item_ids", value=urgent_item_ids):
                with self.assertRaisesRegex(ValueError, "urgent_item_ids"):
                    plan_laundry(
                        items,
                        LaundryConstraints(
                            selected_item_ids=["white-tee"],
                            urgent_item_ids=urgent_item_ids,  # type: ignore[arg-type]
                        ),
                        _campus_context(),
                    )

    def test_constraints_require_boolean_flags(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_values: list[object] = ["true", 1, None]

        for field_name in ("allow_mixed_colors", "allow_dryer", "hygiene_sensitive"):
            for value in invalid_values:
                with self.subTest(field_name=field_name, value=value):
                    constraints = LaundryConstraints(selected_item_ids=["white-tee"])
                    setattr(constraints, field_name, value)

                    with self.assertRaisesRegex(ValueError, field_name):
                        plan_laundry(items, constraints, _campus_context())

    def test_constraints_require_valid_numeric_limits(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_budgets: list[object] = [True, "2", -1, float("nan"), float("inf")]
        invalid_waits: list[object] = [True, "5", 1.5, -1, float("nan"), float("inf")]

        for budget_yuan in invalid_budgets:
            with self.subTest(field="budget_yuan", value=budget_yuan):
                with self.assertRaisesRegex(ValueError, "budget_yuan"):
                    plan_laundry(
                        items,
                        LaundryConstraints(selected_item_ids=["white-tee"], budget_yuan=budget_yuan),  # type: ignore[arg-type]
                        _campus_context(),
                    )

        for max_wait_minutes in invalid_waits:
            with self.subTest(field="max_wait_minutes", value=max_wait_minutes):
                with self.assertRaisesRegex(ValueError, "max_wait_minutes"):
                    plan_laundry(
                        items,
                        LaundryConstraints(
                            selected_item_ids=["white-tee"],
                            max_wait_minutes=max_wait_minutes,  # type: ignore[arg-type]
                        ),
                        _campus_context(),
                    )

    def test_plan_requires_wardrobe_item_list(self) -> None:
        invalid_items: list[object] = ["items", [object()], [True]]
        for items in invalid_items:
            with self.subTest(items=items):
                with self.assertRaisesRegex(ValueError, "items"):
                    plan_laundry(
                        items,  # type: ignore[arg-type]
                        LaundryConstraints(selected_item_ids=["white-tee"]),
                        _campus_context(),
                    )

    def test_plan_requires_valid_item_profile(self) -> None:
        items = [WardrobeItem(profile="profile")]  # type: ignore[arg-type]

        with self.assertRaisesRegex(ValueError, r"items\[0\].profile"):
            plan_laundry(
                items,
                LaundryConstraints(selected_item_ids=["broken"]),
                _campus_context(),
            )

    def test_plan_requires_valid_item_identity_fields(self) -> None:
        invalid_items = [
            ("item_id", WardrobeItem(profile=ClothingProfile(item_id=True, name="white tee"))),  # type: ignore[arg-type]
            ("item_id", WardrobeItem(profile=ClothingProfile(item_id="", name="white tee"))),
            ("name", WardrobeItem(profile=ClothingProfile(item_id="bad-name", name=True))),  # type: ignore[arg-type]
            ("name", WardrobeItem(profile=ClothingProfile(item_id="bad-name", name=""))),
        ]

        for field_name, item in invalid_items:
            with self.subTest(field_name=field_name, item=item):
                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(
                        [item],
                        LaundryConstraints(selected_item_ids=["bad-name"]),
                        _campus_context(),
                    )

    def test_plan_requires_valid_item_search_fields(self) -> None:
        invalid_items = [
            (
                "user_note",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-note",
                        name="white tee",
                        user_note=True,  # type: ignore[arg-type]
                    )
                ),
            ),
            (
                "material_ratios",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-materials",
                        name="white tee",
                        material_ratios="cotton",  # type: ignore[arg-type]
                    )
                ),
            ),
            (
                "material_ratios",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-material-keys",
                        name="white tee",
                        material_ratios={True: 1.0},  # type: ignore[dict-item]
                    )
                ),
            ),
            (
                "colors",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-colors",
                        name="white tee",
                        colors="white",  # type: ignore[arg-type]
                    )
                ),
            ),
            (
                "colors",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-colors",
                        name="white tee",
                        colors=[True],  # type: ignore[list-item]
                    )
                ),
            ),
            (
                "care_warnings",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-warnings",
                        name="white tee",
                        care_warnings=[True],  # type: ignore[list-item]
                    )
                ),
            ),
            (
                "care_recommendations",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-recommendations",
                        name="white tee",
                        care_recommendations=[True],  # type: ignore[list-item]
                    )
                ),
            ),
            (
                "care_forbidden",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-care",
                        name="white tee",
                        care_forbidden=[True],  # type: ignore[list-item]
                    )
                ),
            ),
            (
                "source_notes",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-source",
                        name="white tee",
                        source_notes=[True],  # type: ignore[list-item]
                    )
                ),
            ),
            (
                "user_notes",
                WardrobeItem(
                    profile=ClothingProfile(item_id="bad-user-notes", name="white tee"),
                    user_notes="note",  # type: ignore[arg-type]
                ),
            ),
            (
                "user_notes",
                WardrobeItem(
                    profile=ClothingProfile(item_id="bad-user-notes", name="white tee"),
                    user_notes=[True],  # type: ignore[list-item]
                ),
            ),
        ]

        for field_name, item in invalid_items:
            with self.subTest(field_name=field_name, item=item):
                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(
                        [item],
                        LaundryConstraints(selected_item_ids=[item.profile.item_id]),
                        _campus_context(),
                    )

    def test_plan_requires_valid_item_risks(self) -> None:
        invalid_items = [
            (
                "risks",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-risks",
                        name="white tee",
                        risks="high",  # type: ignore[arg-type]
                    )
                ),
            ),
            (
                "risks",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-risk-key",
                        name="white tee",
                        risks={True: RiskLevel.HIGH},  # type: ignore[dict-item]
                    )
                ),
            ),
            (
                "risks",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-risk-value",
                        name="white tee",
                        risks={"shrink": "high"},  # type: ignore[dict-item]
                    )
                ),
            ),
        ]

        for field_name, item in invalid_items:
            with self.subTest(field_name=field_name, item=item):
                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(
                        [item],
                        LaundryConstraints(selected_item_ids=[item.profile.item_id]),
                        _campus_context(),
                    )

    def test_plan_requires_laundry_constraints(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_constraints: list[object] = [None, object(), {"selected_item_ids": ["white-tee"]}]

        for constraints in invalid_constraints:
            with self.subTest(constraints=constraints):
                with self.assertRaisesRegex(ValueError, "constraints"):
                    plan_laundry(
                        items,
                        constraints,  # type: ignore[arg-type]
                        _campus_context(),
                    )

    def test_plan_requires_campus_context(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_contexts: list[object] = [None, object(), {"available_machines": []}]

        for campus_context in invalid_contexts:
            with self.subTest(campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, "campus_context"):
                    plan_laundry(
                        items,
                        LaundryConstraints(selected_item_ids=["white-tee"]),
                        campus_context,  # type: ignore[arg-type]
                    )

    def test_plan_requires_valid_campus_context_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        cases: list[tuple[str, object, LaundryConstraints]] = [
            ("all_machines", [object()], LaundryConstraints(selected_item_ids=["white-tee"])),
            ("available_machines", [object()], LaundryConstraints(selected_item_ids=["white-tee"])),
            (
                "queue_estimates",
                [object()],
                LaundryConstraints(selected_item_ids=["white-tee"], max_wait_minutes=5),
            ),
            ("weather", [], LaundryConstraints(selected_item_ids=["white-tee"])),
            ("drying_context", [], LaundryConstraints(selected_item_ids=["white-tee"])),
            ("pricing_rules", [], LaundryConstraints(selected_item_ids=["white-tee"])),
        ]

        for field_name, value, constraints in cases:
            with self.subTest(field_name=field_name):
                context = _campus_context()
                setattr(context, field_name, value)

                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(items, constraints, context)

    def test_plan_requires_valid_campus_machine_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        cases: list[tuple[str, object]] = [
            ("machine_id", True),
            ("machine_id", " "),
            ("location", None),
            ("machine_type", "washer"),
            ("status", "available"),
            ("remaining_minutes", True),
            ("remaining_minutes", -1),
            ("price_yuan", True),
            ("price_yuan", float("nan")),
            ("modes", "standard"),
            ("modes", ["standard", 1]),
        ]

        for field_name, value in cases:
            with self.subTest(field_name=field_name, value=value):
                context = _campus_context()
                setattr(context.available_machines[0], field_name, value)

                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(
                        items,
                        LaundryConstraints(selected_item_ids=["white-tee"]),
                        context,
                    )

    def test_plan_requires_valid_queue_estimate_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        cases: list[tuple[str, object]] = [
            ("machine_type", "washer"),
            ("total_count", True),
            ("total_count", -1),
            ("available_count", -1),
            ("running_count", 1.5),
            ("out_of_service_count", -1),
            ("unknown_count", -1),
            ("estimated_wait_minutes", True),
            ("estimated_wait_minutes", 1.5),
            ("estimated_wait_minutes", -1),
        ]

        for field_name, value in cases:
            with self.subTest(field_name=field_name, value=value):
                context = _campus_context()
                setattr(context.queue_estimates[0], field_name, value)

                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(
                        items,
                        LaundryConstraints(selected_item_ids=["white-tee"], max_wait_minutes=5),
                        context,
                    )

    def test_air_dry_and_budget_warnings_use_explicit_context(self) -> None:
        context = _campus_context()
        context.drying_context = {"balcony_available": False, "ventilation": "poor"}
        items = [
            _item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0}),
            _item("gray-tee", "浅灰 T 恤", colors=["gray"], materials={"cotton": 1.0}),
        ]

        plan = plan_laundry(
            items,
            LaundryConstraints(
                selected_item_ids=["white-tee", "gray-tee"],
                allow_dryer=False,
                budget_yuan=2.0,
            ),
            context,
        )

        bucket = plan.buckets[0]
        warning_text = " ".join(plan.global_warnings)
        self.assertEqual(bucket.detergent_ml, 30.0)
        self.assertIn("无阳台", warning_text)
        self.assertIn("poor", warning_text)
        self.assertIn("超过预算", warning_text)
        self.assertIn("推迟非急用标准洗批次", warning_text)

    def test_missing_selected_item_is_explicit_error(self) -> None:
        items = [_item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0})]

        with self.assertRaisesRegex(ValueError, "selected item ids not found"):
            plan_laundry(
                items,
                LaundryConstraints(selected_item_ids=["white-tee", "missing"]),
                _campus_context(),
            )

    def test_missing_machine_or_pricing_data_is_explicit_error(self) -> None:
        items = [_item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0})]

        with self.assertRaisesRegex(ValueError, "no available machine"):
            plan_laundry(
                items,
                LaundryConstraints(selected_item_ids=["white-tee"]),
                CampusContext(available_machines=[], pricing_rules=_campus_context().pricing_rules),
            )

        with self.assertRaisesRegex(ValueError, "missing wash program pricing"):
            plan_laundry(
                items,
                LaundryConstraints(selected_item_ids=["white-tee"]),
                CampusContext(available_machines=_campus_context().available_machines, pricing_rules={}),
            )

    def test_invalid_pricing_values_are_explicit_error(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_prices: list[object] = [True, float("nan"), float("inf")]
        for price in invalid_prices:
            with self.subTest(price=price):
                context = _campus_context()
                context.pricing_rules["wash_programs"]["standard"]["price_yuan"] = price

                with self.assertRaisesRegex(ValueError, "wash program standard price_yuan"):
                    plan_laundry(
                        items,
                        LaundryConstraints(selected_item_ids=["white-tee"]),
                        context,
                    )

    def test_negative_pricing_values_are_explicit_error(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        context = _campus_context()
        context.pricing_rules["wash_programs"]["standard"]["price_yuan"] = -1

        with self.assertRaisesRegex(ValueError, "wash program standard price_yuan"):
            plan_laundry(
                items,
                LaundryConstraints(selected_item_ids=["white-tee"]),
                context,
            )

    def test_budget_and_max_wait_constraints_are_explicit_warnings(self) -> None:
        items = [_item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0})]
        context = _campus_context()
        context.queue_estimates = [
            MachineQueueEstimate(
                machine_type=MachineType.STANDARD_WASHER,
                total_count=1,
                available_count=0,
                running_count=1,
                out_of_service_count=0,
                unknown_count=0,
                estimated_wait_minutes=12,
            )
        ]

        plan = plan_laundry(
            items,
            LaundryConstraints(selected_item_ids=["white-tee"], budget_yuan=2, max_wait_minutes=5),
            context,
        )

        warnings = " ".join(plan.global_warnings)
        self.assertIn("超过预算", warnings)
        self.assertIn("预计等待 12 分钟超过最大等待 5 分钟", warnings)

    def test_report_requires_laundry_plan(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]

        with self.assertRaisesRegex(ValueError, "plan"):
            generate_report(
                object(),  # type: ignore[arg-type]
                items,
                _campus_context(),
            )

    def test_report_requires_valid_plan_buckets(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_plans = [
            ("buckets", LaundryPlan(buckets="buckets")),  # type: ignore[arg-type]
            (r"buckets\[0\]", LaundryPlan(buckets=[object()])),  # type: ignore[list-item]
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_plan_estimates(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        bucket = LaundryBucket(
            bucket_id="light-standard",
            item_ids=["white-tee"],
            wash_method=WashMethod.MACHINE_WASH,
        )
        invalid_plans = [
            ("estimated_cost_yuan", LaundryPlan(buckets=[bucket], estimated_cost_yuan=True, estimated_duration_minutes=0)),
            (
                "estimated_cost_yuan",
                LaundryPlan(buckets=[bucket], estimated_cost_yuan=float("inf"), estimated_duration_minutes=0),
            ),
            ("estimated_cost_yuan", LaundryPlan(buckets=[bucket], estimated_cost_yuan=-1, estimated_duration_minutes=0)),
            ("estimated_duration_minutes", LaundryPlan(buckets=[bucket], estimated_cost_yuan=0, estimated_duration_minutes=True)),
            ("estimated_duration_minutes", LaundryPlan(buckets=[bucket], estimated_cost_yuan=0, estimated_duration_minutes=1.5)),
            ("estimated_duration_minutes", LaundryPlan(buckets=[bucket], estimated_cost_yuan=0, estimated_duration_minutes=-1)),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_global_warnings(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        bucket = LaundryBucket(
            bucket_id="light-standard",
            item_ids=["white-tee"],
            wash_method=WashMethod.MACHINE_WASH,
        )

        def invalid_plan(global_warnings: object) -> LaundryPlan:
            return LaundryPlan(
                buckets=[bucket],
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
                global_warnings=global_warnings,  # type: ignore[arg-type]
            )

        invalid_plans = [
            ("global_warnings", invalid_plan("warning")),
            (r"global_warnings\[0\]", invalid_plan([True])),
            (r"global_warnings\[0\]", invalid_plan([""])),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_cost_breakdown(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        bucket = LaundryBucket(
            bucket_id="light-standard",
            item_ids=["white-tee"],
            wash_method=WashMethod.MACHINE_WASH,
        )

        def invalid_plan(cost_breakdown: object) -> LaundryPlan:
            return LaundryPlan(
                buckets=[bucket],
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
                cost_breakdown=cost_breakdown,  # type: ignore[arg-type]
            )

        invalid_plans = [
            ("cost_breakdown", invalid_plan("costs")),
            (r"cost_breakdown\[0\]", invalid_plan([object()])),
            (
                "label",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label=True, amount_yuan=1, duration_minutes=30)]),
            ),
            (
                "label",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="", amount_yuan=1, duration_minutes=30)]),
            ),
            (
                "amount_yuan",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=True, duration_minutes=30)]),
            ),
            (
                "amount_yuan",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=float("inf"), duration_minutes=30)]),
            ),
            (
                "amount_yuan",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=-1, duration_minutes=30)]),
            ),
            (
                "duration_minutes",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=True)]),
            ),
            (
                "duration_minutes",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=1.5)]),
            ),
            (
                "duration_minutes",
                invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=-1)]),
            ),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_cost_line_metadata(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        bucket = LaundryBucket(
            bucket_id="light-standard",
            item_ids=["white-tee"],
            wash_method=WashMethod.MACHINE_WASH,
        )

        def invalid_plan(line: LaundryChargeLine) -> LaundryPlan:
            return LaundryPlan(
                buckets=[bucket],
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
                cost_breakdown=[line],
            )

        invalid_plans = [
            (
                "bucket_id",
                invalid_plan(
                    LaundryChargeLine(bucket_id=True, label="wash", amount_yuan=1, duration_minutes=30)  # type: ignore[arg-type]
                ),
            ),
            (
                "bucket_id",
                invalid_plan(LaundryChargeLine(bucket_id="", label="wash", amount_yuan=1, duration_minutes=30)),
            ),
            (
                "machine_id",
                invalid_plan(
                    LaundryChargeLine(
                        bucket_id="light-standard",
                        label="wash",
                        amount_yuan=1,
                        duration_minutes=30,
                        machine_id=True,  # type: ignore[arg-type]
                    )
                ),
            ),
            (
                "machine_type",
                invalid_plan(
                    LaundryChargeLine(
                        bucket_id="light-standard",
                        label="wash",
                        amount_yuan=1,
                        duration_minutes=30,
                        machine_type="standard_washer",  # type: ignore[arg-type]
                    )
                ),
            ),
            (
                "program",
                invalid_plan(
                    LaundryChargeLine(
                        bucket_id="light-standard",
                        label="wash",
                        amount_yuan=1,
                        duration_minutes=30,
                        program=True,  # type: ignore[arg-type]
                    )
                ),
            ),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_bucket_item_ids(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_plans = [
            (
                "item_ids",
                LaundryPlan(
                    buckets=[
                        LaundryBucket(
                            bucket_id="light-standard",
                            item_ids="white-tee",  # type: ignore[arg-type]
                            wash_method=WashMethod.MACHINE_WASH,
                        )
                    ]
                ),
            ),
            (
                r"item_ids\[0\]",
                LaundryPlan(
                    buckets=[
                        LaundryBucket(
                            bucket_id="light-standard",
                            item_ids=[True],  # type: ignore[list-item]
                            wash_method=WashMethod.MACHINE_WASH,
                        )
                    ]
                ),
            ),
            (
                r"item_ids\[0\]",
                LaundryPlan(
                    buckets=[
                        LaundryBucket(
                            bucket_id="light-standard",
                            item_ids=[""],
                            wash_method=WashMethod.MACHINE_WASH,
                        )
                    ]
                ),
            ),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_bucket_enum_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        invalid_plans = [
            (
                "wash_method",
                LaundryPlan(
                    buckets=[
                        LaundryBucket(
                            bucket_id="light-standard",
                            item_ids=["white-tee"],
                            wash_method="machine_wash",  # type: ignore[arg-type]
                        )
                    ],
                    estimated_cost_yuan=0,
                    estimated_duration_minutes=0,
                ),
            ),
            (
                "machine_type",
                LaundryPlan(
                    buckets=[
                        LaundryBucket(
                            bucket_id="light-standard",
                            item_ids=["white-tee"],
                            wash_method=WashMethod.MACHINE_WASH,
                            machine_type="standard_washer",  # type: ignore[arg-type]
                        )
                    ],
                    estimated_cost_yuan=0,
                    estimated_duration_minutes=0,
                ),
            ),
            (
                "dry_method",
                LaundryPlan(
                    buckets=[
                        LaundryBucket(
                            bucket_id="light-standard",
                            item_ids=["white-tee"],
                            wash_method=WashMethod.MACHINE_WASH,
                            dry_method="air_dry",  # type: ignore[arg-type]
                        )
                    ],
                    estimated_cost_yuan=0,
                    estimated_duration_minutes=0,
                ),
            ),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_bucket_text_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]

        def invalid_plan(**overrides: object) -> LaundryPlan:
            bucket_values = {
                "bucket_id": "light-standard",
                "item_ids": ["white-tee"],
                "wash_method": WashMethod.MACHINE_WASH,
            }
            bucket_values.update(overrides)
            return LaundryPlan(
                buckets=[LaundryBucket(**bucket_values)],  # type: ignore[arg-type]
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
            )

        invalid_plans = [
            ("bucket_id", invalid_plan(bucket_id=True)),
            ("bucket_id", invalid_plan(bucket_id="")),
            ("machine_id", invalid_plan(machine_id=True)),
            ("machine_location", invalid_plan(machine_location=True)),
            ("program", invalid_plan(program=True)),
            ("dryer_machine_id", invalid_plan(dryer_machine_id=True)),
            ("dryer_machine_location", invalid_plan(dryer_machine_location=True)),
            ("warnings", invalid_plan(warnings="warning")),
            (r"warnings\[0\]", invalid_plan(warnings=[True])),
            (r"warnings\[0\]", invalid_plan(warnings=[""])),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_valid_bucket_numeric_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]

        def invalid_plan(**overrides: object) -> LaundryPlan:
            bucket_values = {
                "bucket_id": "light-standard",
                "item_ids": ["white-tee"],
                "wash_method": WashMethod.MACHINE_WASH,
            }
            bucket_values.update(overrides)
            return LaundryPlan(
                buckets=[LaundryBucket(**bucket_values)],  # type: ignore[arg-type]
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
            )

        invalid_plans = [
            ("detergent_ml", invalid_plan(detergent_ml=True)),
            ("detergent_ml", invalid_plan(detergent_ml=float("nan"))),
            ("detergent_ml", invalid_plan(detergent_ml=-1)),
            ("use_laundry_bag", invalid_plan(use_laundry_bag="yes")),
            ("estimated_cost_yuan", invalid_plan(estimated_cost_yuan=True)),
            ("estimated_cost_yuan", invalid_plan(estimated_cost_yuan=float("inf"))),
            ("estimated_cost_yuan", invalid_plan(estimated_cost_yuan=-1)),
            ("estimated_duration_minutes", invalid_plan(estimated_duration_minutes=True)),
            ("estimated_duration_minutes", invalid_plan(estimated_duration_minutes=1.5)),
            ("estimated_duration_minutes", invalid_plan(estimated_duration_minutes=-1)),
        ]

        for field_name, plan in invalid_plans:
            with self.subTest(field_name=field_name, plan=plan):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, _campus_context())

    def test_report_requires_wardrobe_item_list(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

        invalid_items: list[object] = ["items", [object()]]
        for report_items in invalid_items:
            with self.subTest(report_items=report_items):
                with self.assertRaisesRegex(ValueError, "items"):
                    generate_report(
                        plan,
                        report_items,  # type: ignore[arg-type]
                        _campus_context(),
                    )

    def test_report_requires_valid_item_identity_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
        invalid_report_items = [
            ("profile", [WardrobeItem(profile="profile")]),  # type: ignore[arg-type]
            ("item_id", [WardrobeItem(profile=ClothingProfile(item_id=True, name="white tee"))]),  # type: ignore[arg-type]
            ("item_id", [WardrobeItem(profile=ClothingProfile(item_id="", name="white tee"))]),
            ("name", [WardrobeItem(profile=ClothingProfile(item_id="white-tee", name=True))]),  # type: ignore[arg-type]
            ("name", [WardrobeItem(profile=ClothingProfile(item_id="white-tee", name=""))]),
        ]

        for field_name, report_items in invalid_report_items:
            with self.subTest(field_name=field_name, report_items=report_items):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, report_items, _campus_context())

    def test_report_requires_unique_item_ids(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
        report_items = [
            _item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0}),
            _item("white-tee", "duplicate white tee", colors=["white"], materials={"cotton": 1.0}),
        ]

        with self.assertRaisesRegex(ValueError, "white-tee"):
            generate_report(plan, report_items, _campus_context())

    def test_report_requires_campus_context(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

        invalid_contexts: list[object] = [None, object(), {"available_machines": []}]
        for campus_context in invalid_contexts:
            with self.subTest(campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, "campus_context"):
                    generate_report(
                        plan,
                        items,
                        campus_context,  # type: ignore[arg-type]
                    )

    def test_report_requires_valid_campus_context_maps(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
        invalid_contexts = [
            ("weather", CampusContext(weather=[])),  # type: ignore[arg-type]
            ("drying_context", CampusContext(drying_context=[])),  # type: ignore[arg-type]
            ("pricing_rules", CampusContext(pricing_rules=[])),  # type: ignore[arg-type]
        ]

        for field_name, campus_context in invalid_contexts:
            with self.subTest(field_name=field_name, campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, campus_context)

    def test_report_requires_valid_drying_context_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
        invalid_contexts = [
            ("balcony_available", CampusContext(drying_context={"balcony_available": "yes"})),
            ("balcony_available", CampusContext(drying_context={"balcony_available": 1})),
            ("ventilation", CampusContext(drying_context={"ventilation": True})),
            ("ventilation", CampusContext(drying_context={"ventilation": ""})),
        ]

        for field_name, campus_context in invalid_contexts:
            with self.subTest(field_name=field_name, campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, campus_context)

    def test_report_requires_valid_campus_machine_lists(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
        invalid_contexts = [
            ("all_machines", CampusContext(all_machines="machines")),  # type: ignore[arg-type]
            (r"all_machines\[0\]", CampusContext(all_machines=[object()])),  # type: ignore[list-item]
            ("available_machines", CampusContext(available_machines="machines")),  # type: ignore[arg-type]
            (r"available_machines\[0\]", CampusContext(available_machines=[object()])),  # type: ignore[list-item]
        ]

        for field_name, campus_context in invalid_contexts:
            with self.subTest(field_name=field_name, campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, campus_context)

    def test_report_requires_valid_campus_machine_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

        def invalid_context(**overrides: object) -> CampusContext:
            machine_values = {
                "machine_id": "washer-1",
                "location": "Dorm 1F",
                "machine_type": MachineType.STANDARD_WASHER,
                "status": MachineStatus.AVAILABLE,
            }
            machine_values.update(overrides)
            return CampusContext(
                available_machines=[MachineInfo(**machine_values)],  # type: ignore[arg-type]
            )

        invalid_contexts = [
            ("machine_id", invalid_context(machine_id=True)),
            ("machine_id", invalid_context(machine_id="")),
            ("location", invalid_context(location=True)),
            ("location", invalid_context(location="")),
            ("machine_type", invalid_context(machine_type="standard_washer")),
            ("status", invalid_context(status="available")),
            ("remaining_minutes", invalid_context(remaining_minutes=True)),
            ("remaining_minutes", invalid_context(remaining_minutes=1.5)),
            ("remaining_minutes", invalid_context(remaining_minutes=-1)),
            ("price_yuan", invalid_context(price_yuan=True)),
            ("price_yuan", invalid_context(price_yuan=float("nan"))),
            ("price_yuan", invalid_context(price_yuan=-1)),
            ("modes", invalid_context(modes="standard")),
            ("modes", invalid_context(modes=["standard", 1])),
        ]

        for field_name, campus_context in invalid_contexts:
            with self.subTest(field_name=field_name, campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, campus_context)

    def test_report_requires_valid_queue_estimate_list(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
        invalid_contexts = [
            ("queue_estimates", CampusContext(queue_estimates="queues")),  # type: ignore[arg-type]
            (r"queue_estimates\[0\]", CampusContext(queue_estimates=[object()])),  # type: ignore[list-item]
        ]

        for field_name, campus_context in invalid_contexts:
            with self.subTest(field_name=field_name, campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, campus_context)

    def test_report_requires_valid_queue_estimate_fields(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

        def invalid_context(**overrides: object) -> CampusContext:
            estimate_values = {
                "machine_type": MachineType.STANDARD_WASHER,
                "total_count": 1,
                "available_count": 1,
                "running_count": 0,
                "out_of_service_count": 0,
                "unknown_count": 0,
            }
            estimate_values.update(overrides)
            return CampusContext(
                queue_estimates=[MachineQueueEstimate(**estimate_values)],  # type: ignore[arg-type]
            )

        invalid_contexts = [
            ("machine_type", invalid_context(machine_type="standard_washer")),
            ("total_count", invalid_context(total_count=True)),
            ("total_count", invalid_context(total_count=1.5)),
            ("total_count", invalid_context(total_count=-1)),
            ("available_count", invalid_context(available_count=True)),
            ("available_count", invalid_context(available_count=1.5)),
            ("available_count", invalid_context(available_count=-1)),
            ("running_count", invalid_context(running_count=True)),
            ("running_count", invalid_context(running_count=1.5)),
            ("running_count", invalid_context(running_count=-1)),
            ("out_of_service_count", invalid_context(out_of_service_count=True)),
            ("out_of_service_count", invalid_context(out_of_service_count=1.5)),
            ("out_of_service_count", invalid_context(out_of_service_count=-1)),
            ("unknown_count", invalid_context(unknown_count=True)),
            ("unknown_count", invalid_context(unknown_count=1.5)),
            ("unknown_count", invalid_context(unknown_count=-1)),
            ("estimated_wait_minutes", invalid_context(estimated_wait_minutes=True)),
            ("estimated_wait_minutes", invalid_context(estimated_wait_minutes=1.5)),
            ("estimated_wait_minutes", invalid_context(estimated_wait_minutes=-1)),
        ]

        for field_name, campus_context in invalid_contexts:
            with self.subTest(field_name=field_name, campus_context=campus_context):
                with self.assertRaisesRegex(ValueError, field_name):
                    generate_report(plan, items, campus_context)

    def test_report_cost_breakdown_lines_are_copied(self) -> None:
        items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
        plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

        report = generate_report(plan, items, _campus_context())
        report.cost_breakdown[0].amount_yuan = 99.0

        self.assertEqual(plan.cost_breakdown[0].amount_yuan, 4.0)

    def test_report_describes_plan_without_mutating_it(self) -> None:
        items = [
            _item("white-tee", "白色纯棉 T 恤", colors=["white"], materials={"cotton": 1.0}),
            _item(
                "black-jeans",
                "黑色牛仔裤",
                colors=["black"],
                materials={"denim": 1.0},
                risks={"color_bleed": RiskLevel.HIGH},
            ),
        ]
        plan = plan_laundry(
            items,
            LaundryConstraints(selected_item_ids=["white-tee", "black-jeans"], allow_dryer=False),
            _campus_context(),
        )
        original_bucket_ids = [bucket.bucket_id for bucket in plan.buckets]

        report = generate_report(plan, items, _campus_context())

        self.assertEqual([bucket.bucket_id for bucket in plan.buckets], original_bucket_ids)
        self.assertEqual(report.title, "本次校园洗衣方案")
        self.assertIn("白色纯棉 T 恤", report.sections["洗衣步骤"])
        self.assertIn("黑色牛仔裤", report.sections["洗衣步骤"])
        self.assertIn("原因：浅色普通机洗衣物集中标准洗", report.sections["洗衣步骤"])
        self.assertIn("深色或高掉色风险衣物单独处理", report.sections["洗衣步骤"])
        self.assertIn("8.0", report.sections["费用和时间"])
        self.assertIn("计费批次", report.sections["费用和时间"])
        self.assertIn("洗衣液：24.0 ml", report.sections["洗衣步骤"])
        self.assertIn("洗衣机：washer-1", report.sections["洗衣步骤"])
        self.assertIn("本批费用：4.0 元", report.sections["洗衣步骤"])
        self.assertEqual([line.amount_yuan for line in report.cost_breakdown], [4.0, 4.0])
        self.assertTrue(any("washer-1" in step for step in report.action_steps))
        self.assertIn("Dorm A 洗衣机", report.sections["机器环境"])
        self.assertIn("排队估算", report.sections["机器环境"])
        self.assertIn("晾晒条件", report.sections["机器环境"])
        self.assertTrue(any("自然晾干" in note for note in report.savings_notes))
        self.assertTrue(any("掉色" in note for note in report.risk_notes))


if __name__ == "__main__":
    unittest.main()
