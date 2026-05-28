from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from backend.campus.context import build_campus_context
from backend.campus.machine_api import LaundryMachineClient
from backend.laundry.planner import plan_laundry
from backend.reports.generator import generate_report
from backend.shared.models import LaundryConstraints
from backend.wardrobe.store import WardrobeStore


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


class FullIntegrationTests(unittest.TestCase):
    def test_repository_sample_data_runs_through_campus_planner_and_report(self) -> None:
        root = Path(__file__).resolve().parents[1]
        items = WardrobeStore(root / "data" / "wardrobe_sample.json").list_items()
        campus_context = build_campus_context(
            LaundryMachineClient(root / "data" / "machines_mock.json"),
            {"machine_rules_path": str(root / "config" / "machine_rules.json")},
        )
        constraints = LaundryConstraints(
            selected_item_ids=[
                "wm-white-tee-001",
                "wm-black-jeans-001",
                "wm-gray-wool-001",
                "wm-bedding-001",
            ],
            allow_dryer=False,
        )

        plan = plan_laundry(items, constraints, campus_context)
        report = generate_report(plan, items, campus_context)

        self.assertEqual(plan.estimated_cost_yuan, 14.0)
        self.assertIn("本次校园洗衣方案", report.title)

    def test_sample_wardrobe_campus_planner_and_report_work_together(self) -> None:
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)
            machine_path = tmp / "machines.json"
            rules_path = tmp / "machine_rules.json"
            _write_json(
                machine_path,
                {
                    "machines": [
                        {
                            "machine_id": "washer-standard-1",
                            "location": "Dorm A 1F",
                            "machine_type": "standard_washer",
                            "status": "available",
                            "modes": ["standard", "gentle"],
                        },
                        {
                            "machine_id": "washer-large-1",
                            "location": "Dorm A 1F",
                            "machine_type": "large_washer",
                            "status": "available",
                            "modes": ["large"],
                        },
                        {
                            "machine_id": "dryer-low-1",
                            "location": "Dorm A 1F",
                            "machine_type": "dryer",
                            "status": "available",
                            "modes": ["low"],
                        },
                    ]
                },
            )
            _write_json(
                rules_path,
                {
                    "pricing_rules": {
                        "wash_programs": {
                            "standard": {"price_yuan": 4.0, "duration_minutes": 35},
                            "large": {"price_yuan": 6.0, "duration_minutes": 45},
                        },
                        "dryer_programs": {
                            "low": {"price_yuan": 2.0, "duration_minutes": 25},
                        },
                    },
                    "drying_context": {
                        "balcony_available": True,
                        "ventilation": "normal",
                    },
                },
            )

            items = WardrobeStore(root / "data" / "wardrobe_sample.json").list_items()
            campus_context = build_campus_context(
                LaundryMachineClient(machine_path),
                {"machine_rules_path": str(rules_path)},
            )
            constraints = LaundryConstraints(
                selected_item_ids=[
                    "wm-white-tee-001",
                    "wm-black-jeans-001",
                    "wm-gray-wool-001",
                    "wm-bedding-001",
                ],
                allow_dryer=False,
            )

            plan = plan_laundry(items, constraints, campus_context)
            report = generate_report(plan, items, campus_context)

        self.assertEqual(
            [bucket.bucket_id for bucket in plan.buckets],
            ["hand-wash", "large-bedding", "dark-standard", "light-standard"],
        )
        self.assertEqual(plan.estimated_cost_yuan, 14.0)
        buckets_by_id = {bucket.bucket_id: bucket for bucket in plan.buckets}
        self.assertEqual(buckets_by_id["large-bedding"].detergent_ml, 40.0)
        self.assertIn("推荐使用 washer-large-1", " ".join(buckets_by_id["large-bedding"].warnings))
        self.assertIn("白色纯棉 T 恤", report.sections["洗衣步骤"])
        self.assertIn("洗衣液：", report.sections["洗衣步骤"])
        self.assertIn("当前可用机器记录 3 台", report.sections["机器环境"])
        self.assertIn("可用位置", report.sections["机器环境"])
        self.assertIn("排队估算", report.sections["机器环境"])
        self.assertIn("晾晒条件", report.sections["机器环境"])
        self.assertIn("计费批次", report.sections["费用和时间"])


if __name__ == "__main__":
    unittest.main()
