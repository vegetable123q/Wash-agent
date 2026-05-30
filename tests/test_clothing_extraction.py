from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from backend.clothing_extraction.extractor import (
    build_wardrobe_item,
    extract_clothing_info,
)
from backend.clothing_extraction.llm_client import (
    GeminiV1BetaLLMClient,
    build_care_inference_prompt,
    build_extraction_prompt,
    build_image_router_prompt,
    build_image_single_pass_prompt,
    build_typed_extraction_prompt,
    create_configured_llm_client,
)
from backend.shared.models import (
    ClothingInput,
    LLMResponse,
    RiskLevel,
    WashMethod,
)
from backend.clothing_extraction.product_info import enrich_product_info


class FakeLLMClient:
    def __init__(self, text: str) -> None:
        self.text = text
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float = 0.0) -> LLMResponse:
        self.prompts.append(prompt)
        return LLMResponse(text=self.text, provider="fake", model="unit-test")


class FakeVisionLLMClient:
    def __init__(self, text: str) -> None:
        self.text = text
        self.prompts: list[str] = []
        self.image_refs: list[list[str]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        response_schema: dict[str, object] | None = None,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        self.prompts.append(prompt)
        self.image_refs.append(list(image_refs or []))
        return LLMResponse(text=self.text, provider="fake-vision", model="unit-test")


class ScriptedVisionLLMClient:
    def __init__(self, responses: list[dict[str, object]]) -> None:
        self.responses = list(responses)
        self.prompts: list[str] = []
        self.image_refs: list[list[str]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        response_schema: dict[str, object] | None = None,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        self.prompts.append(prompt)
        self.image_refs.append(list(image_refs or []))
        payload = self.responses.pop(0)
        return LLMResponse(
            text=json.dumps(payload, ensure_ascii=False),
            provider="scripted-vision",
            model="unit-test",
        )


class BrokenLLMClient:
    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        response_schema: dict[str, object] | None = None,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        raise RuntimeError("network unavailable")


class ClothingExtractionTests(unittest.TestCase):
    def test_build_extraction_prompt_requests_json_schema(self) -> None:
        prompt = build_extraction_prompt("灰色连帽卫衣，棉混纺，不能高温烘干")

        self.assertIn("JSON", prompt)
        self.assertIn("material_ratios", prompt)
        self.assertIn("care_forbidden", prompt)
        self.assertIn("灰色连帽卫衣", prompt)
        self.assertIn("不要输出店铺", prompt)

    def test_image_agent_prompts_have_separate_responsibilities(self) -> None:
        router_prompt = build_image_router_prompt("image refs only")
        label_prompt = build_typed_extraction_prompt("tag photo", "care_label")
        garment_prompt = build_typed_extraction_prompt("jacket photo", "garment_photo")
        single_pass_prompt = build_image_single_pass_prompt("jacket photo")
        inference_prompt = build_care_inference_prompt(
            {"name": "jacket", "missing_fields": ["material_ratios"]},
            "garment_photo",
        )

        self.assertIn("ImageRouterAgent", router_prompt)
        self.assertIn("image_type", router_prompt)
        self.assertIn("visible_regions", router_prompt)
        self.assertIn("recommended_next_agents", router_prompt)
        self.assertIn("TypedExtractionAgent", label_prompt)
        self.assertIn("OCR", label_prompt)
        self.assertIn("care symbols", label_prompt)
        self.assertIn("care_warnings", label_prompt)
        self.assertIn("care_recommendations", label_prompt)
        self.assertIn("strict constraints", label_prompt)
        self.assertIn("visual fabric", garment_prompt)
        self.assertIn("CareInferenceAgent", inference_prompt)
        self.assertIn("best-effort", inference_prompt)
        self.assertIn("do not override visible evidence", inference_prompt)
        self.assertIn("Do not leave material_ratios empty", inference_prompt)
        self.assertIn("VisionExtractionAgent", single_pass_prompt)
        self.assertIn("image_type", single_pass_prompt)
        self.assertIn("visible facts and conservative inference", single_pass_prompt)
        self.assertIn("agent_trace", single_pass_prompt)

    def test_enrich_product_info_normalizes_source_text(self) -> None:
        raw = ClothingInput(
            name="  优衣库 灰色 连帽卫衣  ",
            shop_name=" 优衣库 ",
            tag_text=" 棉 78% 聚酯纤维 22% \n 不可漂白 ",
            user_description=" 之前高温烘干后有点缩水 ",
        )

        enriched = enrich_product_info(raw)

        self.assertEqual(enriched.name, "优衣库 灰色 连帽卫衣")
        self.assertEqual(enriched.shop_name, "优衣库")
        self.assertIn("棉 78% 聚酯纤维 22%", enriched.extra["normalized_source_text"])
        self.assertIn("不可漂白", enriched.extra["normalized_source_text"])
        self.assertIn("source_notes", enriched.extra)
        self.assertNotIn("店铺名", enriched.extra["normalized_source_text"])

    def test_enrich_product_info_normalizes_extra_source_notes(self) -> None:
        raw = ClothingInput(
            name="",
            extra={"source_notes": [" kept note ", True, "", 123]},
        )

        enriched = enrich_product_info(raw)

        self.assertEqual(enriched.extra["source_notes"], ["kept note"])

    def test_enrich_product_info_ignores_malformed_supplemental_sources(self) -> None:
        raw = ClothingInput(
            name="",
            extra={
                "supplemental_sources": [
                    True,
                    {"source": 123, "text": True},
                    {"source": " manual ", "text": " kept text "},
                    " loose text ",
                ]
            },
        )

        enriched = enrich_product_info(raw)
        source_text = enriched.extra["normalized_source_text"]

        self.assertIn("kept text", source_text)
        self.assertIn("loose text", source_text)
        self.assertNotIn("True", source_text)
        self.assertNotIn("123", source_text)

    def test_enrich_product_info_uses_fallback_for_blank_supplemental_source_name(
        self,
    ) -> None:
        raw = ClothingInput(
            name="",
            extra={
                "supplemental_sources": [
                    {"source": "   ", "text": " kept text "},
                ]
            },
        )

        enriched = enrich_product_info(raw)

        matching_lines = [
            line
            for line in enriched.extra["normalized_source_text"].splitlines()
            if "kept text" in line
        ]
        self.assertEqual(len(matching_lines), 1)
        self.assertFalse(matching_lines[0].startswith(":"))

    def test_enrich_product_info_ignores_non_string_extra_text_fields(self) -> None:
        raw = ClothingInput(
            name="",
            extra={
                "ocr_text": True,
                "product_page_text": 123,
                "taobao_text": " kept product text ",
            },
        )

        enriched = enrich_product_info(raw)
        source_text = enriched.extra["normalized_source_text"]

        self.assertIn("kept product text", source_text)
        self.assertNotIn("True", source_text)
        self.assertNotIn("123", source_text)

    def test_enrich_product_info_normalizes_image_refs(self) -> None:
        raw = ClothingInput(
            name="",
            image_refs=[" uploads/tag.png ", True, "", 123],
        )

        try:
            enriched = enrich_product_info(raw)
        except TypeError as exc:
            self.fail(f"malformed image refs should not crash: {exc}")

        self.assertEqual(enriched.image_refs, ["uploads/tag.png"])
        self.assertIn("uploads/tag.png", enriched.extra["normalized_source_text"])
        self.assertNotIn("True", enriched.extra["normalized_source_text"])
        self.assertNotIn("123", enriched.extra["normalized_source_text"])

    def test_enrich_product_info_ignores_non_string_user_note_overrides(self) -> None:
        raw = ClothingInput(
            name="test shirt",
            user_description=" legacy note ",
            extra={"user_note": True},
        )

        enriched = enrich_product_info(raw)

        self.assertEqual(enriched.user_note, "legacy note")
        self.assertEqual(enriched.user_description, "legacy note")
        self.assertEqual(enriched.extra["user_note"], "legacy note")

    def test_user_note_is_preserved_without_product_metadata_in_core_profile(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="灰色卫衣",
                shop_name="不需要进入后续流程的店铺",
                tag_text="棉 80% 聚酯纤维 20%",
                user_description="备注：运动后常穿，洗过一次轻微缩水",
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertEqual(profile.user_note, "备注：运动后常穿，洗过一次轻微缩水")
        self.assertEqual(profile.extraction_status, "llm_error")
        self.assertIn("network unavailable", profile.extraction_error)
        self.assertNotIn("店铺", " ".join(profile.source_notes))

    def test_user_note_field_is_preferred_over_legacy_description(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="白色T恤",
                tag_text="棉 100% 不可漂白",
                user_description="旧备注",
                user_note="备注：明天要穿",
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertEqual(profile.user_note, "备注：明天要穿")
        self.assertEqual(profile.extraction_status, "llm_error")

    def test_build_wardrobe_item_prepares_profile_for_c_module(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="蓝色牛仔外套",
                tag_text="棉 80% 聚酯纤维 20% 不可漂白",
                user_description="备注：少洗，怕掉色",
            ),
            llm_client=BrokenLLMClient(),
        )

        item = build_wardrobe_item(profile)

        self.assertIs(item.profile, profile)
        self.assertEqual(item.preferred_method, WashMethod.UNKNOWN)
        self.assertEqual(item.wear_count_since_wash, 0)
        self.assertEqual(item.user_notes, ["备注：少洗，怕掉色"])

    def test_build_wardrobe_item_accepts_user_note_override_for_c_module(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="黑色运动裤",
                tag_text="聚酯纤维 90% 氨纶 10%",
                user_note="原备注",
            ),
            llm_client=BrokenLLMClient(),
        )

        item = build_wardrobe_item(profile, user_note="C模块备注覆盖")

        self.assertEqual(item.user_notes, ["C模块备注覆盖"])

    def test_enrich_product_info_merges_supplemental_sources_and_manual_fields(self) -> None:
        raw = ClothingInput(
            name="牛仔外套",
            image_refs=["tag.jpg"],
            extra={
                "ocr_text": "吊牌识别: 棉 80% 聚酯纤维 20%",
                "taobao_text": "淘宝页: 深蓝色 牛仔 不可漂白",
                "supplemental_sources": [
                    {"source": "brand_page", "text": "建议反面冷水洗涤"},
                ],
                "manual_fields": {"colors": ["blue", "dark"]},
            },
        )

        enriched = enrich_product_info(raw)

        source_text = enriched.extra["normalized_source_text"]
        self.assertIn("吊牌识别", source_text)
        self.assertIn("淘宝页", source_text)
        self.assertIn("brand_page", source_text)
        self.assertIn("用户手填字段", source_text)
        self.assertIn("tag.jpg", source_text)

    def test_extract_clothing_info_uses_llm_json_when_available(self) -> None:
        response = {
            "name": "白色棉T恤",
            "material_ratios": {"cotton": 0.95, "spandex": 0.05},
            "colors": ["white"],
            "care_forbidden": ["do_not_bleach"],
            "risks": {"color_bleed": "low", "shrink": "medium"},
            "confidence": 0.86,
            "source_notes": ["LLM parsed tag text"],
        }
        fake = FakeLLMClient("```json\n" + json.dumps(response, ensure_ascii=False) + "\n```")

        profile = extract_clothing_info(
            ClothingInput(name="白色棉T恤", tag_text="95%棉 5%氨纶 不可漂白"),
            llm_client=fake,
        )

        self.assertEqual(profile.name, "白色棉T恤")
        self.assertEqual(profile.material_ratios["cotton"], 0.95)
        self.assertEqual(profile.colors, ["white"])
        self.assertEqual(profile.risks["shrink"], RiskLevel.MEDIUM)
        self.assertGreaterEqual(profile.confidence, 0.86)
        self.assertTrue(fake.prompts)

    def test_extract_clothing_info_sends_uploaded_images_to_llm(self) -> None:
        response = {
            "name": "黑色运动T恤",
            "material_ratios": {"polyester": 0.92, "spandex": 0.08},
            "colors": ["black"],
            "care_forbidden": ["do_not_bleach"],
            "risks": {"color_bleed": "medium"},
            "confidence": 0.88,
            "source_notes": ["vision parsed tag photo"],
        }
        fake = FakeVisionLLMClient(json.dumps(response, ensure_ascii=False))

        profile = extract_clothing_info(
            ClothingInput(name="运动T恤", image_refs=["uploads/tag-photo.png"]),
            llm_client=fake,
        )

        self.assertEqual(fake.image_refs, [["uploads/tag-photo.png"]])
        self.assertEqual(profile.name, "黑色运动T恤")
        self.assertEqual(profile.material_ratios["polyester"], 0.92)
        self.assertIn("black", profile.colors)

    def test_image_extraction_uses_router_extractor_and_inference_agents(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {
                    "image_type": "garment_photo",
                    "name": "black white layered tee",
                    "material_ratios": {"cotton": 0.8, "polyester": 0.2},
                    "material_evidence_level": "inferred",
                    "colors": ["black", "white"],
                    "care_forbidden": [
                        "do_not_bleach",
                        "do_not_tumble_dry",
                        "wash_separately",
                    ],
                    "care_evidence_level": "inferred",
                    "risks": {
                        "shrink": "medium",
                        "color_bleed": "high",
                        "deform": "low",
                        "pilling": "medium",
                        "dryer_damage": "medium",
                    },
                    "confidence": 0.72,
                    "source_notes": [
                        "router saw a garment photo",
                        "extractor saw contrast panels",
                        "inference filled likely jersey care",
                    ],
                    "agent_trace": [
                        "image_router",
                        "typed_extractor",
                        "care_inference",
                    ],
                    "missing_fields": [],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(name="layered tee", image_refs=["uploads/layered.png"]),
            llm_client=fake,
        )

        self.assertEqual(len(fake.prompts), 1)
        self.assertIn("VisionExtractionAgent", fake.prompts[0])
        self.assertEqual(fake.image_refs, [["uploads/layered.png"]])
        self.assertEqual(profile.image_type, "garment_photo")
        self.assertEqual(profile.agent_trace, [
            "image_router",
            "typed_extractor",
            "care_inference",
        ])
        self.assertEqual(profile.material_ratios["cotton"], 0.8)
        self.assertIn("wash_separately", profile.care_forbidden)
        self.assertEqual(profile.material_evidence_level, "inferred")
        self.assertEqual(profile.care_evidence_level, "inferred")
        self.assertEqual(profile.missing_fields, [])

    def test_visible_extraction_is_not_overwritten_by_inference_agent(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {
                    "image_type": "care_label",
                    "name": "polyester dress",
                    "material_ratios": {"polyester": 1.0},
                    "material_evidence_level": "visible",
                    "colors": ["blue"],
                    "care_forbidden": ["do_not_bleach", "do_not_tumble_dry"],
                    "care_evidence_level": "inferred",
                    "risks": {"dryer_damage": "high"},
                    "confidence": 0.7,
                    "missing_fields": [],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(name="dress", image_refs=["uploads/label.jpg"]),
            llm_client=fake,
        )

        self.assertEqual(profile.material_ratios, {"polyester": 1.0})
        self.assertEqual(profile.material_evidence_level, "visible")
        self.assertIn("do_not_tumble_dry", profile.care_forbidden)
        self.assertEqual(profile.care_evidence_level, "inferred")

    def test_care_forbidden_labels_are_canonicalized(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {
                    "image_type": "garment_photo",
                    "name": "contrast tee",
                    "material_ratios": {"cotton": 0.8, "polyester": 0.2},
                    "material_evidence_level": "inferred",
                    "colors": ["black", "white"],
                    "care_forbidden": [
                        "no tumble dry",
                        "wash_with_hot_water",
                        "bleach",
                        "use laundry bag",
                        "made_up_label",
                    ],
                    "care_evidence_level": "inferred",
                    "risks": {},
                    "confidence": 0.7,
                    "missing_fields": [],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(name="contrast tee", image_refs=["uploads/tee.jpg"]),
            llm_client=fake,
        )

        self.assertEqual(
            profile.care_forbidden,
            [
                "do_not_tumble_dry",
                "avoid_hot_water",
                "do_not_bleach",
                "use_laundry_bag",
            ],
        )

    def test_care_symbols_capture_standard_wash_label_dimensions(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {
                    "image_type": "care_label",
                    "name": "labeled shirt",
                    "material_ratios": {"cotton": 1.0},
                    "material_evidence_level": "visible",
                    "colors": ["white"],
                    "care_symbols": {
                        "wash_method": "machine wash",
                        "wash_temperature": "30°C",
                        "bleach": "bleach",
                        "tumble_dry": "low tumble dry",
                        "iron": "no iron",
                        "dry_clean": "no dry clean",
                        "unknown_category": "ignored",
                    },
                    "care_symbol_evidence": {
                        "wash_method": "visible",
                        "wash_temperature": "inferred",
                        "bleach": "visible",
                        "tumble_dry": "inferred",
                        "iron": "visible",
                        "dry_clean": "inferred",
                        "unknown_category": "visible",
                    },
                    "care_forbidden": ["wash_with_hot_water"],
                    "care_evidence_level": "inferred",
                    "risks": {},
                    "confidence": 0.75,
                    "missing_fields": [],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(name="labeled shirt", image_refs=["uploads/label.png"]),
            llm_client=fake,
        )

        self.assertEqual(
            profile.care_symbols,
            {
                "wash_method": "machine_wash",
                "wash_temperature": "30c",
                "bleach": "do_not_bleach",
                "tumble_dry": "low_heat",
                "iron": "do_not_iron",
                "dry_clean": "do_not_dry_clean",
            },
        )
        self.assertEqual(
            profile.care_symbol_evidence,
            {
                "wash_method": "visible",
                "wash_temperature": "inferred",
                "bleach": "visible",
                "tumble_dry": "inferred",
                "iron": "visible",
                "dry_clean": "inferred",
            },
        )
        self.assertEqual(
            profile.care_forbidden,
            [
                "avoid_hot_water",
                "do_not_bleach",
                "do_not_iron",
                "do_not_dry_clean",
            ],
        )
        self.assertEqual(
            profile.care_warnings,
            [
                "avoid_hot_water",
                "do_not_bleach",
                "do_not_iron",
                "do_not_dry_clean",
            ],
        )

    def test_care_actions_are_split_into_warnings_and_recommendations(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {
                    "image_type": "garment_photo",
                    "name": "contrast tee",
                    "material_ratios": {"cotton": 0.7, "polyester": 0.3},
                    "material_evidence_level": "inferred",
                    "colors": ["black", "white"],
                    "care_warnings": ["no tumble dry"],
                    "care_recommendations": [
                        "wash separately",
                        "use laundry bag",
                        "gentle wash",
                        "air dry",
                    ],
                    "care_symbols": {
                        "bleach": "no bleach",
                        "natural_dry": "dry flat",
                    },
                    "care_symbol_evidence": {
                        "bleach": "inferred",
                        "natural_dry": "inferred",
                    },
                    "care_evidence_level": "inferred",
                    "risks": {},
                    "confidence": 0.7,
                    "missing_fields": [],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(name="contrast tee", image_refs=["uploads/tee.png"]),
            llm_client=fake,
        )

        self.assertEqual(
            profile.care_warnings,
            ["do_not_tumble_dry", "do_not_bleach"],
        )
        self.assertEqual(
            profile.care_recommendations,
            [
                "wash_separately",
                "use_laundry_bag",
                "gentle_cycle",
                "air_dry",
                "flat_dry",
            ],
        )
        self.assertEqual(
            profile.care_forbidden,
            [
                "do_not_tumble_dry",
                "do_not_bleach",
                "wash_separately",
                "use_laundry_bag",
                "gentle_cycle",
                "air_dry",
                "flat_dry",
            ],
        )

    def test_visible_care_symbol_resolves_conflicting_inferred_warning(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {
                    "image_type": "care_label",
                    "name": "labeled shirt",
                    "material_ratios": {"cotton": 1.0},
                    "material_evidence_level": "visible",
                    "colors": ["white"],
                    "care_symbols": {"tumble_dry": "low tumble dry"},
                    "care_symbol_evidence": {"tumble_dry": "visible"},
                    "care_evidence_level": "visible",
                    "risks": {},
                    "confidence": 0.82,
                    "care_warnings": ["no tumble dry"],
                    "missing_fields": ["care_symbols.wash_temperature"],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(name="labeled shirt", image_refs=["uploads/label.png"]),
            llm_client=fake,
        )

        self.assertEqual(profile.care_symbols["tumble_dry"], "low_heat")
        self.assertEqual(profile.care_symbol_evidence["tumble_dry"], "visible")
        self.assertNotIn("do_not_tumble_dry", profile.care_warnings)
        self.assertNotIn("do_not_tumble_dry", profile.care_forbidden)
        self.assertIn("care_symbols.wash_temperature", profile.missing_fields)

    def test_manual_care_warning_is_preserved_over_visible_symbol(self) -> None:
        fake = ScriptedVisionLLMClient(
            [
                {"image_type": "care_label"},
                {
                    "name": "labeled shirt",
                    "material_ratios": {"cotton": 1.0},
                    "material_evidence_level": "visible",
                    "colors": ["white"],
                    "care_symbols": {"tumble_dry": "low tumble dry"},
                    "care_symbol_evidence": {"tumble_dry": "visible"},
                    "care_evidence_level": "visible",
                    "risks": {},
                    "confidence": 0.82,
                    "missing_fields": [],
                },
                {
                    "risks": {},
                    "confidence": 0.71,
                    "missing_fields": [],
                },
            ]
        )

        profile = extract_clothing_info(
            ClothingInput(
                name="labeled shirt",
                image_refs=["uploads/label.png"],
                extra={"manual_fields": {"care_warnings": ["no tumble dry"]}},
            ),
            llm_client=fake,
        )

        self.assertIn("do_not_tumble_dry", profile.care_warnings)
        self.assertIn("do_not_tumble_dry", profile.care_forbidden)

    def test_gemini_v1beta_client_builds_generate_content_path_without_network(self) -> None:
        captured: dict[str, object] = {}

        class FakeHTTPResponse:
            def __enter__(self) -> "FakeHTTPResponse":
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return (
                    b'{"candidates":[{"content":{"parts":[{"text":"{\\"ok\\":true}"}]}}]}'
                )

        def fake_urlopen(request, timeout):
            captured["url"] = request.full_url
            captured["headers"] = dict(request.header_items())
            captured["payload"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return FakeHTTPResponse()

        client = GeminiV1BetaLLMClient(
            apikey="test-key",
            base_url="https://modelhub.ailemac.com/v1beta",
            model="gemini-3.1-pro-preview",
        )

        with patch("urllib.request.urlopen", fake_urlopen):
            response = client.complete("extract")

        self.assertEqual(
            captured["url"],
            "https://modelhub.ailemac.com/v1beta/models/"
            "gemini-3.1-pro-preview:generateContent",
        )
        self.assertEqual(captured["headers"]["X-goog-api-key"], "test-key")
        payload = captured["payload"]
        self.assertEqual(payload["generationConfig"]["responseMimeType"], "application/json")
        self.assertEqual(payload["contents"][0]["role"], "user")
        self.assertEqual(payload["contents"][0]["parts"][0], {"text": "extract"})
        self.assertEqual(response.provider, "gemini-v1beta")
        self.assertEqual(response.text, '{"ok":true}')

    def test_gemini_v1beta_client_includes_response_schema_without_network(self) -> None:
        captured: dict[str, object] = {}

        class FakeHTTPResponse:
            def __enter__(self) -> "FakeHTTPResponse":
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return b'{"candidates":[{"content":{"parts":[{"text":"{}"}]}}]}'

        def fake_urlopen(request, timeout):
            captured["payload"] = json.loads(request.data.decode("utf-8"))
            return FakeHTTPResponse()

        schema = {
            "type": "object",
            "properties": {
                "image_type": {
                    "type": "string",
                    "enum": ["garment_photo", "care_label"],
                }
            },
            "required": ["image_type"],
        }
        client = GeminiV1BetaLLMClient(
            apikey="test-key",
            base_url="https://modelhub.ailemac.com/v1beta",
            model="gemini-3.1-pro-preview",
        )

        with patch("urllib.request.urlopen", fake_urlopen):
            client.complete("extract", response_schema=schema)

        payload = captured["payload"]
        self.assertEqual(payload["generationConfig"]["responseSchema"], schema)

    def test_gemini_v1beta_client_builds_inline_image_parts_without_network(self) -> None:
        import base64
        import tempfile
        from pathlib import Path

        captured: dict[str, object] = {}

        class FakeHTTPResponse:
            def __enter__(self) -> "FakeHTTPResponse":
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return b'{"candidates":[{"content":{"parts":[{"text":"{}"}]}}]}'

        def fake_urlopen(request, timeout):
            captured["payload"] = json.loads(request.data.decode("utf-8"))
            return FakeHTTPResponse()

        with tempfile.TemporaryDirectory() as tmp_dir:
            image_path = Path(tmp_dir) / "tag.png"
            image_path.write_bytes(base64.b64decode("iVBORw0KGgo="))
            client = GeminiV1BetaLLMClient(
                apikey="test-key",
                base_url="https://modelhub.ailemac.com/v1beta",
                model="gemini-3.1-pro-preview",
            )

            with patch("urllib.request.urlopen", fake_urlopen):
                response = client.complete("extract", image_refs=[str(image_path)])

        parts = captured["payload"]["contents"][0]["parts"]
        self.assertEqual(parts[0], {"text": "extract"})
        self.assertEqual(parts[1]["inline_data"]["mime_type"], "image/png")
        self.assertTrue(parts[1]["inline_data"]["data"])
        self.assertEqual(response.provider, "gemini-v1beta")

    def test_extract_clothing_info_does_not_generate_rules_when_llm_fails(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="优衣库灰色连帽卫衣",
                tag_text="棉混纺 深色",
                user_description="之前高温烘干后有点缩水",
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertEqual(profile.name, "优衣库灰色连帽卫衣")
        self.assertEqual(profile.material_ratios, {})
        self.assertEqual(profile.colors, [])
        self.assertEqual(profile.care_forbidden, [])
        self.assertEqual(profile.risks["shrink"], RiskLevel.UNKNOWN)
        self.assertEqual(profile.confidence, 0.0)
        self.assertEqual(profile.extraction_status, "llm_error")
        self.assertIn("network unavailable", profile.extraction_error)
        self.assertIn("material_ratios", profile.missing_fields)

    def test_manual_fields_fill_missing_image_data_when_llm_fails(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="针织衫",
                image_refs=["blurred-tag.jpg"],
                extra={
                    "manual_fields": {
                        "material_ratios": {"wool": 70, "nylon": 30},
                        "colors": ["light"],
                        "care_forbidden": ["hand_wash_only"],
                        "risks": {"deform": "high"},
                    }
                },
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertAlmostEqual(profile.material_ratios["wool"], 0.7)
        self.assertAlmostEqual(profile.material_ratios["nylon"], 0.3)
        self.assertEqual(profile.colors, ["light"])
        self.assertIn("hand_wash_only", profile.care_forbidden)
        self.assertEqual(profile.risks["deform"], RiskLevel.HIGH)
        self.assertEqual(profile.extraction_status, "llm_error")
        self.assertNotIn("material_ratios", profile.missing_fields)

    def test_llm_missing_fields_are_preserved_when_still_missing(self) -> None:
        response = {
            "name": "截图里的外套",
            "material_ratios": {"polyester": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "missing_fields": ["care_forbidden"],
            "confidence": 0.7,
            "source_notes": ["product screenshot did not show care label"],
        }
        fake = FakeVisionLLMClient(json.dumps(response, ensure_ascii=False))

        profile = extract_clothing_info(
            ClothingInput(name="外套", image_refs=["product-page.png"]),
            llm_client=fake,
        )

        self.assertIn("care_forbidden", profile.missing_fields)
        self.assertIn("care_forbidden", profile.user_fill_suggestions)

    def test_llm_material_ratios_ignore_boolean_and_nonfinite_values(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {
                "cotton": True,
                "wool": float("nan"),
                "nylon": float("inf"),
            },
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
        }

        profile = extract_clothing_info(
            ClothingInput(name="test shirt"),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.material_ratios, {})
        self.assertIn("material_ratios", profile.missing_fields)

    def test_llm_material_ratios_trim_and_ignore_invalid_keys(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {" Cotton ": 0.8, "": 0.2},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
        }

        profile = extract_clothing_info(
            ClothingInput(name="test shirt"),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.material_ratios, {"cotton": 0.8})

    def test_manual_material_ratios_trim_and_ignore_invalid_keys(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="sweater",
                extra={
                    "manual_fields": {
                        "material_ratios": {True: 50, " Wool ": 70, "": 30},
                        "colors": ["navy"],
                        "care_forbidden": ["hand wash only"],
                    }
                },
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertEqual(profile.material_ratios, {"wool": 0.7})

    def test_llm_confidence_ignores_boolean_and_nonfinite_values(self) -> None:
        for invalid_confidence in (True, float("nan"), float("inf")):
            with self.subTest(invalid_confidence=invalid_confidence):
                response = {
                    "name": "test shirt",
                    "material_ratios": {"cotton": 1.0},
                    "colors": ["black"],
                    "care_forbidden": [],
                    "risks": {},
                    "confidence": invalid_confidence,
                }

                profile = extract_clothing_info(
                    ClothingInput(name="test shirt"),
                    llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
                )

                self.assertEqual(profile.confidence, 0.0)

    def test_llm_colors_require_a_string_list(self) -> None:
        cases = [
            ("non-list string", "black", [], True),
            (
                "invalid list items",
                [True, 123, " Black ", "", "black"],
                ["black"],
                False,
            ),
        ]
        for label, colors, expected_colors, colors_missing in cases:
            with self.subTest(label=label):
                response = {
                    "name": "test shirt",
                    "material_ratios": {"cotton": 1.0},
                    "colors": colors,
                    "care_forbidden": [],
                    "risks": {},
                    "confidence": 0.7,
                }

                profile = extract_clothing_info(
                    ClothingInput(name="test shirt"),
                    llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
                )

                self.assertEqual(profile.colors, expected_colors)
                self.assertEqual("colors" in profile.missing_fields, colors_missing)

    def test_llm_text_lists_require_string_items(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {"cotton": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
            "source_notes": "visible tag",
            "agent_trace": [True, " typed_extractor ", "", 123],
        }

        profile = extract_clothing_info(
            ClothingInput(name="", extra={"source_notes": ["fallback note"]}),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.source_notes, ["fallback note"])
        self.assertEqual(profile.agent_trace, ["typed_extractor"])

    def test_llm_map_fields_require_objects(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": True,
            "colors": ["black"],
            "care_forbidden": [],
            "risks": True,
            "confidence": 0.7,
            "field_sources": True,
        }

        try:
            profile = extract_clothing_info(
                ClothingInput(name="test shirt"),
                llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
            )
        except TypeError as exc:
            self.fail(f"malformed LLM map fields should not crash: {exc}")

        self.assertEqual(profile.material_ratios, {})
        self.assertIn("material_ratios", profile.missing_fields)
        self.assertEqual(profile.risks["shrink"], RiskLevel.UNKNOWN)
        self.assertEqual(profile.field_sources, {})

    def test_llm_missing_fields_require_string_items(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {"cotton": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
            "missing_fields": [True, 123, " care_forbidden "],
        }

        profile = extract_clothing_info(
            ClothingInput(name="test shirt"),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.missing_fields, ["care_forbidden"])

    def test_llm_string_metadata_requires_strings(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {"cotton": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
            "recommended_wash": True,
            "field_sources": {
                True: "manual",
                "colors": 123,
                "care_forbidden": " vision_extraction ",
            },
        }

        profile = extract_clothing_info(
            ClothingInput(name="test shirt"),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.recommended_wash, "")
        self.assertEqual(profile.field_sources, {"care_forbidden": "vision_extraction"})

    def test_missing_fields_are_reported_when_sources_are_insufficient(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(name="外套", user_description="只知道是日常穿的外套"),
            llm_client=BrokenLLMClient(),
        )

        self.assertIn("material_ratios", profile.missing_fields)
        self.assertIn("colors", profile.missing_fields)
        self.assertIn("material_ratios", profile.user_fill_suggestions)
        self.assertEqual(profile.extraction_status, "llm_error")

    def test_invalid_llm_json_returns_explicit_status_without_rules(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="灰色连帽卫衣",
                tag_text="棉 78% 聚酯纤维 22% 不可漂白",
                user_description="深色，高温烘干后缩水",
            ),
            llm_client=FakeLLMClient("not json at all"),
        )

        self.assertEqual(profile.material_ratios, {})
        self.assertEqual(profile.colors, [])
        self.assertEqual(profile.care_forbidden, [])
        self.assertEqual(profile.extraction_status, "llm_invalid_json")
        self.assertIn("No JSON object", profile.extraction_error)
        self.assertIn("material_ratios", profile.missing_fields)

    def test_create_configured_llm_client_requires_api_config_file(self) -> None:
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp_dir:
            missing_config = Path(tmp_dir) / "missing_api_config.json"
            with patch("backend.clothing_extraction.llm_client._CONFIG_PATH", missing_config):
                with self.assertRaises(FileNotFoundError):
                    create_configured_llm_client()

    def test_create_configured_llm_client_reads_api_config_file(self) -> None:
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp_dir:
            config_path = Path(tmp_dir) / "api_config.json"
            config_path.write_text(
                json.dumps(
                    {
                        "baseUrl": "https://modelhub.ailemac.com/v1beta",
                        "apikey": "configured-test-key",
                        "model_name": "gemini-3.1-pro-preview",
                    }
                ),
                encoding="utf-8",
            )
            with patch("backend.clothing_extraction.llm_client._CONFIG_PATH", config_path):
                client = create_configured_llm_client()

        self.assertEqual(client.apikey, "configured-test-key")
        self.assertEqual(client.base_url, "https://modelhub.ailemac.com/v1beta")
        self.assertEqual(client.model, "gemini-3.1-pro-preview")

    def test_api_config_example_uses_modelhub_gemini_fields(self) -> None:
        from pathlib import Path

        example = json.loads(
            Path("config/api_config.example.json").read_text(encoding="utf-8")
        )

        self.assertEqual(
            example["baseUrl"],
            "https://modelhub.ailemac.com/v1beta",
        )
        self.assertEqual(example["apikey"], "sk-your-api-key-here")
        self.assertEqual(example["model_name"], "gemini-3.1-pro-preview")
        self.assertEqual(set(example), {"baseUrl", "apikey", "model_name"})

    def test_create_configured_llm_client_requires_apikey(self) -> None:
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp_dir:
            config_path = Path(tmp_dir) / "api_config.json"
            config_path.write_text(
                json.dumps(
                    {
                        "baseUrl": "https://modelhub.ailemac.com/v1beta",
                        "apikey": "",
                        "model_name": "gemini-3.1-pro-preview",
                    }
                ),
                encoding="utf-8",
            )
            with patch("backend.clothing_extraction.llm_client._CONFIG_PATH", config_path):
                with self.assertRaisesRegex(ValueError, "apikey"):
                    create_configured_llm_client()

    def test_create_configured_llm_client_requires_baseurl_and_model_name(self) -> None:
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp_dir:
            config_path = Path(tmp_dir) / "api_config.json"
            config_path.write_text(
                json.dumps({"apikey": "configured-test-key"}),
                encoding="utf-8",
            )
            with patch("backend.clothing_extraction.llm_client._CONFIG_PATH", config_path):
                with self.assertRaisesRegex(ValueError, "baseUrl"):
                    create_configured_llm_client()


if __name__ == "__main__":
    unittest.main()
