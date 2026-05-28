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
    return CampusContext(
        available_machines=[
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
                machine_type=MachineType.LARGE_WASHER,
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
        ],
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
        self.assertTrue(buckets_by_id["dark-standard"].use_laundry_bag)
        self.assertTrue(all(bucket.dry_method == DryMethod.AIR_DRY for bucket in plan.buckets))
        self.assertEqual(plan.estimated_cost_yuan, 14.0)
        self.assertEqual(plan.estimated_duration_minutes, 115)

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
        self.assertIn("不可烘干", " ".join(buckets_by_id["hand-wash"].warnings))

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
        self.assertIn("8.0", report.sections["费用和时间"])
        self.assertTrue(any("自然晾干" in note for note in report.savings_notes))
        self.assertTrue(any("掉色" in note for note in report.risk_notes))


if __name__ == "__main__":
    unittest.main()
