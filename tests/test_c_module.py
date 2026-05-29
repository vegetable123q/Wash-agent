from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from backend.shared.models import ClothingProfile, LaundryConstraints, WardrobeItem, WashMethod, WashRecord
from backend.wardrobe.frequency_advisor import advise_all_frequencies, advise_frequency, recommended_item_ids
from backend.wardrobe.store import WardrobeStore


ROOT = Path(__file__).resolve().parents[1]


class CModuleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "wardrobe_sample.json"
        shutil.copyfile(ROOT / "data" / "wardrobe_sample.json", self.path)
        self.store = WardrobeStore(self.path)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_store_loads_sample_items(self) -> None:
        items = self.store.list_items()
        self.assertGreaterEqual(len(items), 1)
        self.assertIn("wm-white-tee-001", {item.profile.item_id for item in items})
        self.assertEqual(items[0].profile.item_id, "wm-white-tee-001")

    def test_upsert_record_wear_and_wash_history(self) -> None:
        item = self.store.get_item("wm-white-tee-001")
        assert item is not None
        item.user_notes.append("test note")
        self.store.upsert_item(item)

        worn = self.store.record_wear("wm-white-tee-001", count=2)
        self.assertEqual(worn.wear_count_since_wash, 4)

        self.store.add_wash_record(
            "wm-white-tee-001",
            WashRecord(washed_at="2026-05-28", method=WashMethod.MACHINE_WASH),
        )
        washed = self.store.get_item("wm-white-tee-001")
        assert washed is not None
        self.assertEqual(washed.wear_count_since_wash, 0)
        self.assertEqual(washed.preferred_method, WashMethod.MACHINE_WASH)
        self.assertEqual(len(washed.wash_history), 2)

    def test_record_wear_rejects_invalid_count(self) -> None:
        invalid_counts: list[object] = [True, 0, -1, 1.5, "2"]
        for count in invalid_counts:
            with self.subTest(count=count):
                with self.assertRaisesRegex(ValueError, "count"):
                    self.store.record_wear("wm-white-tee-001", count=count)  # type: ignore[arg-type]

    def test_select_items_preserves_order_and_delete_requires_existing_item(self) -> None:
        selected = self.store.select_items(["wm-black-jeans-001", "wm-white-tee-001"])
        self.assertEqual([item.profile.item_id for item in selected], ["wm-black-jeans-001", "wm-white-tee-001"])

        self.store.delete_item("wm-black-jeans-001")
        self.assertIsNone(self.store.get_item("wm-black-jeans-001"))
        with self.assertRaises(KeyError):
            self.store.delete_item("wm-black-jeans-001")

    def test_frequency_raises_priority_for_sports_and_urgent_items(self) -> None:
        items = self.store.list_items()
        constraints = LaundryConstraints(urgent_item_ids=["wm-white-tee-001"])
        advice = {item.item_id: item for item in advise_all_frequencies(items, constraints)}

        self.assertGreaterEqual(advice["wm-sports-tee-001"].priority_score, 75)
        self.assertGreaterEqual(advice["wm-white-tee-001"].priority_score, 45)
        self.assertIn("运动", " ".join(advice["wm-sports-tee-001"].reasons))

    def test_jeans_can_be_deferred_before_threshold(self) -> None:
        item = self.store.get_item("wm-black-jeans-001")
        assert item is not None
        advice = advise_frequency(item, LaundryConstraints())

        self.assertLess(advice.priority_score, 45)
        self.assertEqual(advice.recommendation, "可暂缓清洗")
        self.assertIn("少洗", " ".join(advice.reasons))

    def test_recommended_item_ids_uses_explicit_score_threshold(self) -> None:
        items = self.store.list_items()
        constraints = LaundryConstraints()

        ids = recommended_item_ids(items, constraints, min_score=45.0)

        self.assertIn("wm-sports-tee-001", ids)
        self.assertNotIn("wm-black-jeans-001", ids)

    def test_unknown_frequency_category_is_explicit_error(self) -> None:
        item = WardrobeItem(
            profile=ClothingProfile(
                item_id="unknown-item",
                name="unclassified garment",
                material_ratios={"modal": 1.0},
            )
        )

        with self.assertRaisesRegex(ValueError, "cannot infer wash-frequency threshold"):
            advise_frequency(item, LaundryConstraints())

    def test_missing_required_store_fields_are_explicit_error(self) -> None:
        self.path.write_text('{"items": [{"profile": {"item_id": "broken"}}]}', encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "missing required fields"):
            self.store.list_items()

    def test_store_rejects_invalid_wear_count(self) -> None:
        invalid_counts: list[object] = [True, -1, 1.5, "2"]
        for count in invalid_counts:
            with self.subTest(count=count):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["wear_count_since_wash"] = count
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "wear_count_since_wash"):
                    self.store.list_items()

    def test_store_rejects_invalid_user_notes(self) -> None:
        invalid_notes: list[object] = ["note", [True], [123]]
        for notes in invalid_notes:
            with self.subTest(notes=notes):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["user_notes"] = notes
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "user_notes"):
                    self.store.list_items()

    def test_store_rejects_invalid_wash_record_issues(self) -> None:
        invalid_issues: list[object] = ["pilling", [True], [123]]
        for issues in invalid_issues:
            with self.subTest(issues=issues):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][2]["wash_history"][0]["issues"] = issues
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "issues"):
                    self.store.list_items()


if __name__ == "__main__":
    unittest.main()

