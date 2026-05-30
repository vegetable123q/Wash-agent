from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from backend.shared.models import ClothingProfile, LaundryConstraints, RiskLevel, WardrobeItem, WashMethod, WashRecord
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

    def test_add_wash_record_rejects_invalid_record_input(self) -> None:
        invalid_records: list[object] = [object(), "record"]
        for record in invalid_records:
            with self.subTest(record=record):
                with self.assertRaisesRegex(ValueError, "record"):
                    self.store.add_wash_record(
                        "wm-white-tee-001",
                        record,  # type: ignore[arg-type]
                    )

    def test_record_wear_rejects_invalid_count(self) -> None:
        invalid_counts: list[object] = [True, 0, -1, 1.5, "2"]
        for count in invalid_counts:
            with self.subTest(count=count):
                with self.assertRaisesRegex(ValueError, "count"):
                    self.store.record_wear("wm-white-tee-001", count=count)  # type: ignore[arg-type]

    def test_get_item_requires_string_item_id(self) -> None:
        invalid_item_ids: list[object] = [True, 123, "", " "]
        for item_id in invalid_item_ids:
            with self.subTest(item_id=item_id):
                with self.assertRaisesRegex(ValueError, "item_id"):
                    self.store.get_item(item_id)  # type: ignore[arg-type]

    def test_select_items_preserves_order_and_delete_requires_existing_item(self) -> None:
        selected = self.store.select_items(["wm-black-jeans-001", "wm-white-tee-001"])
        self.assertEqual([item.profile.item_id for item in selected], ["wm-black-jeans-001", "wm-white-tee-001"])

        self.store.delete_item("wm-black-jeans-001")
        self.assertIsNone(self.store.get_item("wm-black-jeans-001"))
        with self.assertRaises(KeyError):
            self.store.delete_item("wm-black-jeans-001")

    def test_select_items_requires_string_item_ids(self) -> None:
        invalid_item_ids: list[object] = ["wm-white-tee-001", [True], [123], [""]]
        for item_ids in invalid_item_ids:
            with self.subTest(item_ids=item_ids):
                with self.assertRaisesRegex(ValueError, "item_ids"):
                    self.store.select_items(item_ids)  # type: ignore[arg-type]

    def test_delete_item_requires_string_item_id(self) -> None:
        invalid_item_ids: list[object] = [True, 123, "", " "]
        for item_id in invalid_item_ids:
            with self.subTest(item_id=item_id):
                with self.assertRaisesRegex(ValueError, "item_id"):
                    self.store.delete_item(item_id)  # type: ignore[arg-type]

    def test_store_mutations_reject_malformed_existing_item_ids(self) -> None:
        new_item = WardrobeItem(
            profile=ClothingProfile(
                item_id="new-item",
                name="new item",
                material_ratios={"cotton": 1.0},
            )
        )

        for operation in ("upsert", "delete"):
            with self.subTest(operation=operation):
                self.path.write_text(
                    json.dumps({"items": [{"profile": {"name": "broken"}}]}),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "item_id"):
                    if operation == "upsert":
                        self.store.upsert_item(new_item)
                    else:
                        self.store.delete_item("missing-item")

    def test_store_rejects_duplicate_profile_item_ids(self) -> None:
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        payload["items"][1]["profile"]["item_id"] = payload["items"][0]["profile"][
            "item_id"
        ]
        self.path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "duplicate.*item_id"):
            self.store.list_items()

    def test_upsert_rejects_invalid_item_input(self) -> None:
        invalid_items: list[object] = [
            object(),
            "item",
            WardrobeItem(profile="profile"),  # type: ignore[arg-type]
        ]

        for item in invalid_items:
            with self.subTest(item=item):
                with self.assertRaisesRegex(ValueError, "item|profile"):
                    self.store.upsert_item(item)  # type: ignore[arg-type]

    def test_frequency_raises_priority_for_sports_and_urgent_items(self) -> None:
        items = self.store.list_items()
        constraints = LaundryConstraints(urgent_item_ids=["wm-white-tee-001"])
        advice = {item.item_id: item for item in advise_all_frequencies(items, constraints)}

        self.assertGreaterEqual(advice["wm-sports-tee-001"].priority_score, 75)
        self.assertGreaterEqual(advice["wm-white-tee-001"].priority_score, 45)
        self.assertIn("运动", " ".join(advice["wm-sports-tee-001"].reasons))

    def test_frequency_trims_urgent_item_ids_before_matching(self) -> None:
        item = WardrobeItem(
            profile=ClothingProfile(
                item_id="urgent-tee",
                name="cotton t-shirt",
                material_ratios={"cotton": 1.0},
                colors=["white"],
            ),
            wear_count_since_wash=0,
        )

        advice = advise_frequency(
            item,
            LaundryConstraints(urgent_item_ids=[" urgent-tee ", " urgent-tee "]),
        )

        self.assertGreaterEqual(advice.priority_score, 25)

    def test_frequency_does_not_match_sport_inside_unrelated_english_words(self) -> None:
        item = WardrobeItem(
            profile=ClothingProfile(
                item_id="commute-tee",
                name="transport t-shirt",
                material_ratios={"cotton": 1.0},
                colors=["white"],
            ),
            wear_count_since_wash=0,
        )

        advice = advise_frequency(item, LaundryConstraints())

        self.assertEqual(advice.priority_score, 0)

    def test_frequency_uses_common_english_alias_thresholds(self) -> None:
        cases = [
            ("white cotton tee", 2, 45),
            ("cotton bed sheet", 1, 45),
        ]

        for name, wear_count, min_score in cases:
            with self.subTest(name=name):
                item = WardrobeItem(
                    profile=ClothingProfile(
                        item_id=f"alias-{wear_count}",
                        name=name,
                        material_ratios={"cotton": 1.0},
                        colors=["white"],
                    ),
                    wear_count_since_wash=wear_count,
                )

                advice = advise_frequency(item, LaundryConstraints())

                self.assertGreaterEqual(advice.priority_score, min_score)

    def test_frequency_requires_item_and_constraints(self) -> None:
        item = self.store.get_item("wm-white-tee-001")
        assert item is not None

        invalid_items: list[object] = [object(), "item"]
        for invalid_item in invalid_items:
            with self.subTest(invalid_item=invalid_item):
                with self.assertRaisesRegex(ValueError, "item"):
                    advise_frequency(
                        invalid_item,  # type: ignore[arg-type]
                        LaundryConstraints(),
                    )

        invalid_constraints: list[object] = [None, object(), {"urgent_item_ids": []}]
        for constraints in invalid_constraints:
            with self.subTest(constraints=constraints):
                with self.assertRaisesRegex(ValueError, "constraints"):
                    advise_frequency(
                        item,
                        constraints,  # type: ignore[arg-type]
                    )

    def test_frequency_requires_valid_constraints_fields(self) -> None:
        item = self.store.get_item("wm-white-tee-001")
        assert item is not None

        invalid_constraints = [
            ("urgent_item_ids", LaundryConstraints(urgent_item_ids="wm-white-tee-001")),  # type: ignore[arg-type]
            ("urgent_item_ids", LaundryConstraints(urgent_item_ids=[True])),  # type: ignore[list-item]
            ("urgent_item_ids", LaundryConstraints(urgent_item_ids=[""])),
            ("hygiene_sensitive", LaundryConstraints(hygiene_sensitive="yes")),  # type: ignore[arg-type]
            ("hygiene_sensitive", LaundryConstraints(hygiene_sensitive=1)),  # type: ignore[arg-type]
        ]

        for field_name, constraints in invalid_constraints:
            with self.subTest(field_name=field_name, constraints=constraints):
                with self.assertRaisesRegex(ValueError, field_name):
                    advise_frequency(item, constraints)

    def test_frequency_requires_valid_item_profile(self) -> None:
        item = WardrobeItem(profile="profile")  # type: ignore[arg-type]

        with self.assertRaisesRegex(ValueError, "profile"):
            advise_frequency(item, LaundryConstraints())

    def test_frequency_requires_valid_profile_identity_fields(self) -> None:
        invalid_profiles = [
            ("item.profile.item_id", ClothingProfile(item_id=True, name="cotton t-shirt")),  # type: ignore[arg-type]
            ("item.profile.item_id", ClothingProfile(item_id="", name="cotton t-shirt")),
            ("item.profile.name", ClothingProfile(item_id="bad-name", name=True)),  # type: ignore[arg-type]
            ("item.profile.name", ClothingProfile(item_id="bad-name", name="")),
        ]

        for field_name, profile in invalid_profiles:
            with self.subTest(field_name=field_name, profile=profile):
                item = WardrobeItem(profile=profile)

                with self.assertRaisesRegex(ValueError, field_name):
                    advise_frequency(item, LaundryConstraints())

    def test_frequency_requires_valid_profile_risks(self) -> None:
        invalid_profiles = [
            (
                "item.profile.risks",
                ClothingProfile(
                    item_id="bad-risks",
                    name="cotton t-shirt",
                    risks="high",  # type: ignore[arg-type]
                ),
            ),
            (
                "item.profile.risks",
                ClothingProfile(
                    item_id="bad-risk-key",
                    name="cotton t-shirt",
                    risks={True: RiskLevel.HIGH},  # type: ignore[dict-item]
                ),
            ),
            (
                "item.profile.risks",
                ClothingProfile(
                    item_id="bad-risk-value",
                    name="cotton t-shirt",
                    risks={"shrink": "high"},  # type: ignore[dict-item]
                ),
            ),
        ]

        for field_name, profile in invalid_profiles:
            with self.subTest(field_name=field_name, profile=profile):
                item = WardrobeItem(profile=profile)

                with self.assertRaisesRegex(ValueError, field_name):
                    advise_frequency(item, LaundryConstraints())

    def test_frequency_requires_valid_profile_search_fields(self) -> None:
        invalid_profiles = [
            (
                "item.profile.material_ratios",
                ClothingProfile(
                    item_id="bad-materials",
                    name="cotton t-shirt",
                    material_ratios="cotton",  # type: ignore[arg-type]
                ),
            ),
            (
                "item.profile.material_ratios",
                ClothingProfile(
                    item_id="bad-material-keys",
                    name="cotton t-shirt",
                    material_ratios={True: 1.0},  # type: ignore[dict-item]
                ),
            ),
            (
                "item.profile.colors",
                ClothingProfile(
                    item_id="bad-colors",
                    name="cotton t-shirt",
                    colors="white",  # type: ignore[arg-type]
                ),
            ),
            (
                "item.profile.colors",
                ClothingProfile(
                    item_id="bad-colors",
                    name="cotton t-shirt",
                    colors=[True],  # type: ignore[list-item]
                ),
            ),
            (
                "item.profile.care_forbidden",
                ClothingProfile(
                    item_id="bad-care",
                    name="cotton t-shirt",
                    care_forbidden=[True],  # type: ignore[list-item]
                ),
            ),
            (
                "item.profile.source_notes",
                ClothingProfile(
                    item_id="bad-source",
                    name="cotton t-shirt",
                    source_notes=[True],  # type: ignore[list-item]
                ),
            ),
        ]

        for field_name, profile in invalid_profiles:
            with self.subTest(field_name=field_name, profile=profile):
                item = WardrobeItem(profile=profile)

                with self.assertRaisesRegex(ValueError, field_name):
                    advise_frequency(item, LaundryConstraints())

    def test_frequency_requires_valid_user_text_fields(self) -> None:
        valid_profile = ClothingProfile(item_id="text-item", name="cotton t-shirt")
        invalid_items = [
            (
                "item.profile.user_note",
                WardrobeItem(
                    profile=ClothingProfile(
                        item_id="bad-note",
                        name="cotton t-shirt",
                        user_note=True,  # type: ignore[arg-type]
                    )
                ),
            ),
            ("user_notes", WardrobeItem(profile=valid_profile, user_notes="note")),  # type: ignore[arg-type]
            ("user_notes", WardrobeItem(profile=valid_profile, user_notes=[True])),  # type: ignore[list-item]
        ]

        for field_name, item in invalid_items:
            with self.subTest(field_name=field_name, item=item):
                with self.assertRaisesRegex(ValueError, field_name):
                    advise_frequency(item, LaundryConstraints())

    def test_frequency_requires_valid_wear_count(self) -> None:
        invalid_counts: list[object] = [True, -1, 1.5, "2"]

        for count in invalid_counts:
            with self.subTest(count=count):
                item = self.store.get_item("wm-white-tee-001")
                assert item is not None
                item.wear_count_since_wash = count  # type: ignore[assignment]

                with self.assertRaisesRegex(ValueError, "wear_count_since_wash"):
                    advise_frequency(item, LaundryConstraints())

    def test_advise_all_requires_items_and_constraints(self) -> None:
        invalid_items: list[object] = ["items", [object()]]
        for items in invalid_items:
            with self.subTest(items=items):
                with self.assertRaisesRegex(ValueError, "items"):
                    advise_all_frequencies(
                        items,  # type: ignore[arg-type]
                        LaundryConstraints(),
                    )

        invalid_constraints: list[object] = [None, object(), {"urgent_item_ids": []}]
        for constraints in invalid_constraints:
            with self.subTest(constraints=constraints):
                with self.assertRaisesRegex(ValueError, "constraints"):
                    advise_all_frequencies(
                        [],
                        constraints,  # type: ignore[arg-type]
                    )

    def test_advise_all_rejects_duplicate_item_ids(self) -> None:
        items = self.store.list_items()
        items[1].profile.item_id = items[0].profile.item_id

        with self.assertRaisesRegex(ValueError, "duplicate.*item_id"):
            advise_all_frequencies(items, LaundryConstraints())

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

    def test_recommended_item_ids_defaults_nonfinite_threshold_to_zero(self) -> None:
        items = self.store.list_items()

        ids = recommended_item_ids(items, LaundryConstraints(), min_score=float("nan"))

        self.assertIn("wm-white-tee-001", ids)

    def test_recommended_item_ids_requires_numeric_min_score(self) -> None:
        items = self.store.list_items()
        invalid_min_scores: list[object] = [True, "45", None]

        for min_score in invalid_min_scores:
            with self.subTest(min_score=min_score):
                with self.assertRaisesRegex(ValueError, "min_score"):
                    recommended_item_ids(
                        items,
                        LaundryConstraints(),
                        min_score=min_score,  # type: ignore[arg-type]
                    )

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

    def test_store_wraps_invalid_json_errors(self) -> None:
        self.path.write_text("{bad json", encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "Invalid JSON in wardrobe data file"):
            self.store.list_items()

    def test_store_rejects_invalid_item_shape(self) -> None:
        invalid_items: list[object] = [True, 123, "item"]
        for item in invalid_items:
            with self.subTest(item=item):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0] = item
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, r"items\[0\]"):
                    self.store.list_items()

    def test_store_rejects_invalid_profile_shape(self) -> None:
        invalid_profiles: list[object] = [True, ["profile"], "profile"]
        for profile in invalid_profiles:
            with self.subTest(profile=profile):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["profile"] = profile
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "profile"):
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

    def test_store_rejects_invalid_preferred_method(self) -> None:
        invalid_methods: list[object] = [True, 123, "", "steam"]
        for method in invalid_methods:
            with self.subTest(method=method):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["preferred_method"] = method
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "preferred_method"):
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

    def test_store_rejects_invalid_profile_item_id(self) -> None:
        invalid_item_ids: list[object] = [True, 123, ""]
        for item_id in invalid_item_ids:
            with self.subTest(item_id=item_id):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["item_id"] = item_id
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "item_id"):
                    self.store.list_items()

    def test_store_rejects_invalid_profile_name(self) -> None:
        invalid_names: list[object] = [True, 123, ""]
        for name in invalid_names:
            with self.subTest(name=name):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["name"] = name
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "name"):
                    self.store.list_items()

    def test_store_rejects_invalid_profile_colors(self) -> None:
        invalid_colors: list[object] = ["black", [True], [123]]
        for colors in invalid_colors:
            with self.subTest(colors=colors):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["colors"] = colors
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "colors"):
                    self.store.list_items()

    def test_store_rejects_invalid_profile_text_lists(self) -> None:
        fields = [
            "care_forbidden",
            "care_warnings",
            "care_recommendations",
            "source_notes",
            "missing_fields",
            "agent_trace",
        ]
        invalid_values: list[object] = ["note", [True], [123]]
        for field_name in fields:
            for value in invalid_values:
                with self.subTest(field_name=field_name, value=value):
                    payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
                    payload["items"][0]["profile"][field_name] = value
                    self.path.write_text(
                        json.dumps(payload, ensure_ascii=False),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(ValueError, field_name):
                        self.store.list_items()

    def test_store_rejects_invalid_profile_string_fields(self) -> None:
        fields = [
            "user_note",
            "image_type",
            "material_evidence_level",
            "care_evidence_level",
            "recommended_wash",
            "extraction_status",
            "extraction_error",
        ]
        invalid_values: list[object] = [True, 123, ["text"]]
        for field_name in fields:
            for value in invalid_values:
                with self.subTest(field_name=field_name, value=value):
                    payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
                    payload["items"][0]["profile"][field_name] = value
                    self.path.write_text(
                        json.dumps(payload, ensure_ascii=False),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(ValueError, field_name):
                        self.store.list_items()

    def test_store_rejects_invalid_profile_material_ratios(self) -> None:
        invalid_ratios: list[object] = [
            True,
            ["cotton"],
            {"": 0.5},
            {"cotton": True},
            {"cotton": -0.1},
            {"cotton": 1.5},
            {"cotton": float("nan")},
        ]
        for ratios in invalid_ratios:
            with self.subTest(ratios=ratios):
                payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["material_ratios"] = ratios
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "material_ratios"):
                    self.store.list_items()

    def test_store_rejects_invalid_profile_string_maps(self) -> None:
        fields = [
            "user_fill_suggestions",
            "care_symbols",
            "care_symbol_evidence",
            "field_sources",
        ]
        invalid_values: list[object] = [True, ["entry"], {"": "value"}, {"key": True}, {"key": 123}]
        for field_name in fields:
            for value in invalid_values:
                with self.subTest(field_name=field_name, value=value):
                    payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
                    payload["items"][0]["profile"][field_name] = value
                    self.path.write_text(
                        json.dumps(payload, ensure_ascii=False),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(ValueError, field_name):
                        self.store.list_items()

    def test_store_rejects_invalid_profile_confidence(self) -> None:
        invalid_confidences: list[object] = [True, "0.7", -0.1, 1.5, float("nan")]
        for confidence in invalid_confidences:
            with self.subTest(confidence=confidence):
                payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["confidence"] = confidence
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "confidence"):
                    self.store.list_items()

    def test_store_rejects_invalid_profile_risks(self) -> None:
        invalid_risks: list[object] = [
            True,
            ["shrink"],
            {"shrink": True},
            {"shrink": "extreme"},
            {"": "low"},
        ]
        for risks in invalid_risks:
            with self.subTest(risks=risks):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["risks"] = risks
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "risks"):
                    self.store.list_items()

    def test_store_rejects_invalid_wash_history_shape(self) -> None:
        invalid_histories: list[object] = ["not-a-list", [True], [123]]
        for wash_history in invalid_histories:
            with self.subTest(wash_history=wash_history):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["wash_history"] = wash_history
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "wash_history"):
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

    def test_store_rejects_invalid_wash_record_date(self) -> None:
        invalid_dates: list[object] = [True, 20260510, ""]
        for washed_at in invalid_dates:
            with self.subTest(washed_at=washed_at):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][2]["wash_history"][0]["washed_at"] = washed_at
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "washed_at"):
                    self.store.list_items()

    def test_store_rejects_invalid_wash_record_method(self) -> None:
        invalid_methods: list[object] = [True, 123, "", "steam"]
        for method in invalid_methods:
            with self.subTest(method=method):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][2]["wash_history"][0]["method"] = method
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "method"):
                    self.store.list_items()

    def test_store_rejects_invalid_wash_record_notes(self) -> None:
        invalid_notes: list[object] = [True, 123]
        for notes in invalid_notes:
            with self.subTest(notes=notes):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][2]["wash_history"][0]["notes"] = notes
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "notes"):
                    self.store.list_items()


if __name__ == "__main__":
    unittest.main()

