from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from backend.api.server import add_wardrobe_item, build_mobile_summary
from backend.wardrobe.store import WardrobeStore


class MobileApiTests(unittest.TestCase):
    def test_build_mobile_summary_uses_repository_backend_modules(self) -> None:
        root = Path(__file__).resolve().parents[1]

        summary = build_mobile_summary(root, weather_provider=lambda: {"status": "test"})

        self.assertEqual(summary["source"], "backend")
        self.assertGreaterEqual(len(summary["wardrobe"]["items"]), 4)
        self.assertEqual(summary["plan"]["estimated_cost_yuan"], 14.0)
        self.assertIn("本次校园洗衣方案", summary["report"]["title"])
        self.assertIn("洗衣步骤", summary["report"]["sections"])
        self.assertGreaterEqual(len(summary["campus_context"]["all_machines"]), 3)
        self.assertGreaterEqual(len(summary["campus_context"]["queue_estimates"]), 1)
        self.assertIn("pricing_rules", summary["campus_context"])

    def test_build_mobile_summary_includes_live_weather_snapshot(self) -> None:
        root = Path(__file__).resolve().parents[1]

        def fake_weather_provider() -> dict[str, object]:
            return {
                "source": "open-meteo",
                "status": "live",
                "location": "Tsinghua University",
                "current": {
                    "temperature_2m": 24.5,
                    "relative_humidity_2m": 72,
                    "precipitation": 0.2,
                    "weather_code": 61,
                },
                "units": {
                    "temperature_2m": "°C",
                    "relative_humidity_2m": "%",
                    "precipitation": "mm",
                },
            }

        summary = build_mobile_summary(root, weather_provider=fake_weather_provider)

        self.assertEqual(summary["weather"]["source"], "open-meteo")
        self.assertEqual(summary["weather"]["status"], "live")
        self.assertEqual(summary["weather"]["current"]["relative_humidity_2m"], 72)

    def test_add_wardrobe_item_persists_user_input(self) -> None:
        root = Path(__file__).resolve().parents[1]
        sample_payload = (root / "data" / "wardrobe_sample.json").read_text(encoding="utf-8")

        with TemporaryDirectory() as temp_dir:
            wardrobe_path = Path(temp_dir) / "wardrobe.json"
            wardrobe_path.write_text(sample_payload, encoding="utf-8")

            result = add_wardrobe_item(
                {
                    "name": "用户上传的清华紫卫衣",
                    "material": "棉",
                    "colors": "紫色, 白色",
                    "note": "之前烘干后轻微缩水",
                    "image_filename": "hoodie-care-tag.jpg",
                },
                wardrobe_path=wardrobe_path,
            )

            self.assertEqual(result["status"], "created")
            item = result["item"]
            self.assertEqual(item["name"], "用户上传的清华紫卫衣")
            self.assertEqual(item["material_ratios"], {"棉": 1.0})
            self.assertEqual(item["colors"], ["紫色", "白色"])
            self.assertIn("之前烘干后轻微缩水", item["user_notes"])
            self.assertIn("hoodie-care-tag.jpg", item["user_notes"])

            saved_names = [saved.profile.name for saved in WardrobeStore(wardrobe_path).list_items()]
            self.assertIn("用户上传的清华紫卫衣", saved_names)


if __name__ == "__main__":
    unittest.main()
