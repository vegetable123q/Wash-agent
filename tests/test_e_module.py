from __future__ import annotations

import unittest

from backend.laundry.planner import plan_laundry
from backend.reports.generator import generate_report
from backend.shared.models import (
    CampusContext,
    ClothingProfile,
    DryMethod,
    LaundryConstraints,
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
