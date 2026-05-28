from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from backend.clothing_extraction.extractor import build_wardrobe_item, extract_clothing_info
from backend.shared.models import ClothingInput, LLMResponse, LaundryConstraints
from backend.wardrobe.frequency_advisor import advise_frequency
from backend.wardrobe.store import WardrobeStore


class FakeLLMClient:
    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        response_schema: dict[str, object] | None = None,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        payload = {
            "name": "运动速干T恤",
            "material_ratios": {"polyester": 0.92, "spandex": 0.08},
            "colors": ["black"],
            "care_warnings": ["do_not_bleach"],
            "care_recommendations": ["air_dry"],
            "care_forbidden": ["do_not_bleach", "air_dry"],
            "risks": {
                "shrink": "low",
                "color_bleed": "medium",
                "deform": "low",
                "pilling": "medium",
                "dryer_damage": "medium",
            },
            "confidence": 0.88,
            "source_notes": ["运动速干面料，贴身出汗后建议及时清洗。"],
            "missing_fields": [],
        }
        return LLMResponse(
            text=json.dumps(payload, ensure_ascii=False),
            provider="fake",
            model="unit-test",
        )


class BCIntegrationTests(unittest.TestCase):
    def test_extracted_profile_can_be_stored_and_scored_by_wardrobe_module(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="运动T恤",
                user_note="今天跑步后穿过",
            ),
            llm_client=FakeLLMClient(),
        )
        item = build_wardrobe_item(profile)
        item.wear_count_since_wash = 1

        with tempfile.TemporaryDirectory() as tmp_dir:
            store_path = Path(tmp_dir) / "wardrobe.json"
            store_path.write_text('{"items": []}', encoding="utf-8")
            store = WardrobeStore(store_path)

            store.upsert_item(item)
            stored = store.get_item(item.profile.item_id)
            assert stored is not None

        advice = advise_frequency(stored, LaundryConstraints())

        self.assertEqual(stored.profile.name, "运动速干T恤")
        self.assertEqual(stored.user_notes, ["今天跑步后穿过"])
        self.assertIn("do_not_bleach", stored.profile.care_warnings)
        self.assertGreaterEqual(advice.priority_score, 45)
        self.assertIn("运动", " ".join(advice.reasons))


if __name__ == "__main__":
    unittest.main()
