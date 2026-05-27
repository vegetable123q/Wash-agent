# Wash Agent

面向校园共享洗衣场景的衣物洗护助手。当前代码按模块拆分，B 模块负责把用户上传或输入的衣物信息抽取成后续衣柜、洗衣决策、报告模块可使用的结构化数据。

## B 模块：衣物核心洗护信息抽取

B 模块只负责“数据获取与结构化”，不负责衣柜存储、机器状态、洗衣方案或商品推荐。

### 输入

入口数据结构为 `backend.models.ClothingInput`，核心输入包括：

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
- `care_forbidden`
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

展示给用户时，建议优先展示 `visible`；`inferred` 和 `uncertain` 应以“建议/推测”口吻呈现。`care_forbidden` 是兼容字段，由 `care_symbols` 和模型输出归一化得到，用于快速给出不可漂白、不可烘干、避免热水等禁忌提醒。

如果图片或文字中缺少关键信息，模块会返回 `missing_fields` 和 `user_fill_suggestions`，用于前端提示用户补拍吊牌或手动填写。

如果 LLM 不可用、返回空 JSON 或返回非 JSON，B 模块不会再使用规则兜底生成材质、颜色或风险。此时核心字段保持空值或 `unknown`，并通过 `extraction_status` / `extraction_error` 标明失败原因，避免把规则猜测误认为大模型结果。

### 接入 C 模块

B 模块预留了 `build_wardrobe_item()`，可直接把抽取结果包装成 C 模块的 `WardrobeItem`。

```python
from backend.clothing_extractor import build_wardrobe_item, extract_clothing_info
from backend.models import ClothingInput

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

未配置 API key 时，B 模块会返回 `extraction_status="llm_unavailable"`，不会生成规则猜测结果。用户手填字段仍会被保留，因为它们来自用户明确输入。

可选环境变量：

```powershell
$env:WASHMATE_API_KEY="..."
$env:WASHMATE_BASE_URL="https://api.openai.com/v1"
$env:WASHMATE_MODEL="gpt-4o-mini"
```

也兼容：

```powershell
$env:OPENAI_API_KEY="..."
$env:OPENAI_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_MODEL="gpt-4o-mini"
```

### 本地验证

```powershell
python -m unittest tests.test_b_modules -v
python -m unittest discover -v
```
