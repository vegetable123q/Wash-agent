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
- `care_forbidden`
- `risks`
- `confidence`
- `missing_fields`
- `user_fill_suggestions`
- `source_notes`

如果图片或文字中缺少关键信息，模块会返回 `missing_fields` 和 `user_fill_suggestions`，用于前端提示用户补拍吊牌或手动填写。

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

未配置 API key 时，B 模块会自动使用本地规则兜底，不会因为网络或密钥缺失导致流程中断。

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
