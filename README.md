# Wash Agent

面向校园共享洗衣场景的衣物洗护助手。当前代码按语义目录拆分，衣物信息抽取模块负责把用户上传或输入的衣物信息抽取成后续衣柜、洗衣决策、报告模块可使用的结构化数据。

## 衣物核心洗护信息抽取

衣物抽取模块只负责“数据获取与结构化”，不负责衣柜存储、机器状态、洗衣方案或商品推荐。

### 输入

入口数据结构为 `backend.shared.models.ClothingInput`，核心输入包括：

- `name`：衣物名称，可由用户填写，也可来自图片/商品页识别。
- `tag_text`：吊牌或洗护标签文字。
- `user_note`：用户备注，例如“明天要穿”“运动后常穿”“怕掉色”。
- `image_refs`：衣服照片、吊牌照片、商品页截图路径或 URL。
- `extra["ocr_text"]`：图片 OCR 文字。
- `extra["product_page_text"]` / `extra["taobao_text"]`：商品页辅助文字。
- `extra["manual_fields"]`：用户手动修正的核心字段。

`shop_name` 仅作为历史兼容输入保留，不进入核心抽取文本，也不会作为后续流程字段。

### 输出

`extract_clothing_info()` 返回 `ClothingProfile`，核心字段包括：

- `name`
- `user_note`
- `material_ratios`
- `colors`
- `material_evidence_level`：材质来源等级，取值为 `visible`、`inferred`、`uncertain` 或 `unknown`。
- `care_symbols`：按常见水洗标维度结构化后的标签，例如水洗方式、水温、漂白、翻转烘干、熨烫、干洗和自然晾干。
- `care_symbol_evidence`：与 `care_symbols` 一一对应，标注每个洗护标签是图片/吊牌可见、模型推断，还是不确定。
- `care_warnings`：严格禁忌或强约束，例如不可漂白、不可烘干、不可机洗、只能手洗。
- `care_recommendations`：建议动作，例如冷水洗、分开洗、装洗衣袋、轻柔程序、自然晾干。
- `care_forbidden`：兼容字段，等于 `care_warnings` 和 `care_recommendations` 的归一化合并，旧调用方仍可继续读取。
- `care_evidence_level`：整体洗护信息来源等级。
- `risks`
- `confidence`
- `image_type`：图片类型判断结果，例如 `garment_photo`、`care_label`、`tag_photo`、`product_page`、`mixed`。
- `agent_trace`：图片输入经过的 Agent 阶段，例如 `image_router -> typed_extractor -> care_inference`。
- `missing_fields`
- `user_fill_suggestions`
- `source_notes`
- `extraction_status`
- `extraction_error`

`care_symbols` 使用固定维度，便于后续洗衣方案模块消费：

```json
{
  "wash_method": "machine_wash",
  "wash_temperature": "30c",
  "bleach": "do_not_bleach",
  "tumble_dry": "low_heat",
  "iron": "do_not_iron",
  "dry_clean": "do_not_dry_clean",
  "natural_dry": "line_dry"
}
```

每个 `care_symbols` 标签都会在 `care_symbol_evidence` 中有对应等级：

```json
{
  "wash_temperature": "visible",
  "tumble_dry": "inferred",
  "iron": "uncertain"
}
```

含义：

- `visible`：来自吊牌、洗护标、商品页明确可见文字或符号。
- `inferred`：基于衣物种类、材质、颜色拼接、涂层、填充物等合理推断。
- `uncertain`：模型只能给粗略建议，建议用户补拍吊牌或手动确认。

展示给用户时，建议优先展示 `visible`；`inferred` 和 `uncertain` 应以“建议/推测”口吻呈现。严格禁忌看 `care_warnings`，柔性建议看 `care_recommendations`。

洗护动作现在会拆成两类，避免把“禁忌”和“建议”混在一起：

```json
{
  "care_warnings": ["do_not_bleach", "do_not_tumble_dry"],
  "care_recommendations": ["wash_separately", "use_laundry_bag", "gentle_cycle"],
  "care_forbidden": [
    "do_not_bleach",
    "do_not_tumble_dry",
    "wash_separately",
    "use_laundry_bag",
    "gentle_cycle"
  ]
}
```

推荐新模块优先消费 `care_warnings` 和 `care_recommendations`。`care_forbidden` 仅用于兼容旧流程或快速展示合并后的提醒。B 模块还会做一次确定性一致性校验：如果吊牌可见标签显示“低温烘干”，后续推断里出现的 `do_not_tumble_dry` 会被丢弃，避免推断覆盖可见事实。

如果图片或文字中缺少关键信息，模块会返回 `missing_fields` 和 `user_fill_suggestions`，用于前端提示用户补拍吊牌或手动填写。

如果 LLM 不可用、返回空 JSON 或返回非 JSON，模块不会再使用规则兜底生成材质、颜色或风险。此时核心字段保持空值或 `unknown`，并通过 `extraction_status` / `extraction_error` 标明失败原因，避免把规则猜测误认为大模型结果。

### 接入衣柜模块

衣物抽取模块预留了 `build_wardrobe_item()`，可直接把抽取结果包装成衣柜模块的 `WardrobeItem`。

```python
from backend.clothing_extraction.extractor import build_wardrobe_item, extract_clothing_info
from backend.shared.models import ClothingInput

raw = ClothingInput(
    name="蓝色牛仔外套",
    tag_text="棉 80% 聚酯纤维 20% 不可漂白",
    user_note="备注：少洗，怕掉色",
    image_refs=["uploads/tag-photo.png"],
)

profile = extract_clothing_info(raw)
wardrobe_item = build_wardrobe_item(profile)
```

### 大模型 API 配置

`config/api_config.json` 不会被提交到 git，适合放自己的 API 地址和密钥。首次运行可以从桌面已有配置复制：

```powershell
Copy-Item D:\桌面\api_config.json config\api_config.json
```

仓库只提交 `config/api_config.example.json`，字段结构如下。除 `api_key` 本地填写外，其余字段保持团队统一的 Gemini 访问方式：

```json
{
  "base_url": "https://rjmodel.rjupc.com/v1beta",
  "api_key": "",
  "model_name": "gemini-3.1-pro-preview",
  "role": "user"
}
```

字段说明：

- `base_url`：课程统一的 Gemini API 根地址，客户端会请求 `models/{model_name}:generateContent`。
- `api_key`：个人 API key，只放在本地 `config/api_config.json`。
- `model_name`：统一模型名。
- `role`：Gemini `contents` 中使用的角色，通常为 `user`。

客户端只读取 `config/api_config.json`，不读取环境变量，也不使用其他字段名。缺少 `base_url`、`api_key`、`model_name` 或 `role` 时会显式报错。

### 本地验证

本项目统一使用 `uv` 管理依赖和运行命令，不使用 `requirements.txt`。

```powershell
uv run python -m unittest tests.test_clothing_extraction -v
uv run python -m unittest discover -v
```
