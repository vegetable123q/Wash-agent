from __future__ import annotations

import json
import os
import unittest
from unittest.mock import patch

from backend.clothing_extractor import build_wardrobe_item, extract_clothing_info
from backend.llm_client import build_extraction_prompt, create_default_llm_client
from backend.models import ClothingInput, LLMResponse, RiskLevel, WashMethod
from backend.product_info import enrich_product_info


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
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        self.prompts.append(prompt)
        self.image_refs.append(list(image_refs or []))
        return LLMResponse(text=self.text, provider="fake-vision", model="unit-test")


class BrokenLLMClient:
    def complete(self, prompt: str, *, temperature: float = 0.0) -> LLMResponse:
        raise RuntimeError("network unavailable")


class BModuleTests(unittest.TestCase):
    def test_build_extraction_prompt_requests_json_schema(self) -> None:
        prompt = build_extraction_prompt("灰色连帽卫衣，棉混纺，不能高温烘干")

        self.assertIn("JSON", prompt)
        self.assertIn("material_ratios", prompt)
        self.assertIn("care_forbidden", prompt)
        self.assertIn("灰色连帽卫衣", prompt)
        self.assertIn("不要输出店铺", prompt)

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

    def test_openai_client_builds_multimodal_payload_without_network(self) -> None:
        import base64
        import tempfile
        from pathlib import Path

        from backend.llm_client import OpenAICompatibleLLMClient

        captured: dict[str, object] = {}

        class FakeHTTPResponse:
            def __enter__(self) -> "FakeHTTPResponse":
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return b'{"choices":[{"message":{"content":"{}"}}]}'

        def fake_urlopen(request, timeout):
            captured["payload"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return FakeHTTPResponse()

        with tempfile.TemporaryDirectory() as tmp_dir:
            image_path = Path(tmp_dir) / "tag.png"
            image_path.write_bytes(base64.b64decode("iVBORw0KGgo="))
            client = OpenAICompatibleLLMClient(
                api_key="test-key",
                base_url="https://example.test",
            )

            with patch("urllib.request.urlopen", fake_urlopen):
                response = client.complete("extract", image_refs=[str(image_path)])

        payload = captured["payload"]
        self.assertIsInstance(payload, dict)
        user_content = payload["messages"][1]["content"]
        self.assertEqual(response.provider, "openai-compatible")
        self.assertEqual(user_content[0], {"type": "text", "text": "extract"})
        self.assertEqual(user_content[1]["type"], "image_url")
        self.assertTrue(
            user_content[1]["image_url"]["url"].startswith("data:image/png;base64,")
        )

    def test_openai_client_rejects_unsupported_local_image_without_network(self) -> None:
        import tempfile
        from pathlib import Path

        from backend.llm_client import OpenAICompatibleLLMClient

        def fail_urlopen(request, timeout):
            raise AssertionError("network should not be called for invalid images")

        with tempfile.TemporaryDirectory() as tmp_dir:
            image_path = Path(tmp_dir) / "tag.txt"
            image_path.write_text("not an image", encoding="utf-8")
            client = OpenAICompatibleLLMClient(
                api_key="test-key",
                base_url="https://example.test",
            )

            with patch("urllib.request.urlopen", fail_urlopen):
                response = client.complete("extract", image_refs=[str(image_path)])

        self.assertEqual(response.text, "{}")
        self.assertIn("unsupported image type", response.raw["error"].lower())

    def test_extract_clothing_info_falls_back_to_rules_when_llm_fails(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="优衣库灰色连帽卫衣",
                tag_text="棉混纺 深色",
                user_description="之前高温烘干后有点缩水",
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertEqual(profile.name, "优衣库灰色连帽卫衣")
        self.assertIn("cotton", profile.material_ratios)
        self.assertIn("gray", profile.colors)
        self.assertIn("dark", profile.colors)
        self.assertEqual(profile.risks["shrink"], RiskLevel.HIGH)
        self.assertEqual(profile.risks["dryer_damage"], RiskLevel.HIGH)
        self.assertLess(profile.confidence, 0.8)
        self.assertIn("LLM unavailable", " ".join(profile.source_notes))

    def test_manual_fields_fill_missing_image_data_after_fallback(self) -> None:
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

    def test_missing_fields_are_reported_when_sources_are_insufficient(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(name="外套", user_description="只知道是日常穿的外套"),
            llm_client=BrokenLLMClient(),
        )

        self.assertIn("material_ratios", profile.missing_fields)
        self.assertIn("colors", profile.missing_fields)
        self.assertIn("material_ratios", profile.user_fill_suggestions)

    def test_rule_fallback_parses_material_percentages_without_bleach_color_noise(self) -> None:
        profile = extract_clothing_info(
            ClothingInput(
                name="灰色连帽卫衣",
                tag_text="棉 78% 聚酯纤维 22% 不可漂白",
                user_description="深色，高温烘干后缩水",
            ),
            llm_client=BrokenLLMClient(),
        )

        self.assertAlmostEqual(profile.material_ratios["cotton"], 0.78)
        self.assertAlmostEqual(profile.material_ratios["polyester"], 0.22)
        self.assertIn("gray", profile.colors)
        self.assertIn("dark", profile.colors)
        self.assertNotIn("white", profile.colors)

    def test_create_default_llm_client_is_safe_without_api_key(self) -> None:
        env_without_keys = {
            key: value
            for key, value in os.environ.items()
            if key not in {"WASHMATE_API_KEY", "OPENAI_API_KEY"}
        }
        with patch.dict(os.environ, env_without_keys, clear=True):
            client = create_default_llm_client()

            response = client.complete("hello")

        self.assertEqual(response.provider, "local-fallback")
        self.assertEqual(response.text, "{}")


if __name__ == "__main__":
    unittest.main()
