# Wash Agent

面向校园共享洗衣场景的衣物洗护助手。当前代码按语义目录拆分，衣物信息抽取模块负责把用户上传或输入的衣物信息抽取成后续衣柜、洗衣决策、报告模块可使用的结构化数据。

## 手机版前端视觉工程

移动端实现位于 `frontend/`，使用 Vite + React + TypeScript + Capacitor。当前 APK 不需要单独启动后端服务：衣柜、校园机器、洗衣方案和报告摘要由前端内置 TypeScript 服务生成。只有识图功能需要用户在“我的”页输入 ModelHub 配置；`apikey` 只保存在本次打开期间的 React 内存中，不写入 `localStorage`、源码、构建配置或 APK 持久化存储。当前模型下拉框只允许 `gemini-3.1-pro-preview`。

```powershell
uv sync
cd frontend
npm install
npm run dev
```

常用验证：

```powershell
cd frontend
npm test
npm run build
npm run cap:sync
```

生成 debug APK 需要本机安装 JDK 21、Android SDK 35、Android Build Tools 35.0.0，并在 `frontend/android/local.properties` 中配置 `sdk.dir`：

```powershell
cd frontend
npm run apk:debug
```

生成文件位于 `frontend/android/app/build/outputs/apk/debug/app-debug.apk`。

Release APK 由 GitHub Actions 在 `main` 分支 push 后自动构建并发布。发布构建不内置也不保存 ModelHub API key；用户每次打开后在“我的”页输入 `baseUrl`、`apikey` 并选择 `gemini-3.1-pro-preview` 后即可使用识图。其他功能可直接在 APK 中使用。`preview` 分支用于提交和修改预览，只运行测试和前端构建，不发布 APK。

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
- `agent_trace`：图片输入在单次 VLM 请求内完成的阶段，例如 `image_router -> typed_extractor -> care_inference`。
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

图片输入会合并为一次结构化 Gemini 请求，单次返回 `image_type`、可见事实、保守推断、`agent_trace` 和 `missing_fields`。请求使用 JSON schema 约束输出，减少非 JSON 响应和多轮视觉调用耗时。

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

### 校园洗衣机接口

D 模块通过 `backend.campus.machine_api.LaundryMachineClient` 查询清华宿舍洗衣机状态。当前合并 CleverSchool 和海乐生活两个来源：

- `POST https://api.cleverschool.cn/washapi4/device/tower`：获取楼号列表。
- `POST https://api.cleverschool.cn/washapi4/device/status`：按 `towerKey` 获取某栋楼机器状态。
- `POST https://yshz-user.haier-ioc.com/position/nearPosition`：按清华附近坐标获取海乐生活点位。
- `POST https://yshz-user.haier-ioc.com/position/deviceDetailPage`：按海乐点位和设备分类获取设备状态。

示例：

```python
from backend.campus.context import build_campus_context_from_user_input
from backend.campus.machine_api import LaundryMachineClient

client = LaundryMachineClient()
towers = client.list_towers()
context = build_campus_context_from_user_input(
    {
        "tower_name": "南区26号楼东",
        "weather": {"condition": "cloudy", "humidity": 72},
        "drying_context": {"has_balcony": True},
    },
)
```

页面层可以传用户输入的 `tower_name`，D 模块会通过合并后的楼号列表解析成内部 `tower_keys`。用户不需要知道 CleverSchool 的 `towerKey` 或海乐的 `positionId`。后端只做精确楼名匹配；前端应使用 `list_towers()` 返回的楼名做下拉菜单。若调用方绕过楼名、直接传外部 id，则必须同时传 `tower_provider` 或 `tower_keys`，否则会显式报错。

同一栋楼可能同时存在两个来源，例如 CleverSchool 提供洗衣机、海乐生活提供烘干机。`list_towers()` 会先统一楼名，例如把 `清华大学南区21号楼` 归并为 `南区21号楼`，并在 `MachineTower.provider_keys` 中记录该楼所有来源。查询 `build_campus_context_from_user_input({"tower_name": "南区21号楼"})` 时会同时请求这些来源，并把洗衣机、洗鞋机、烘干机一起放进 `CampusContext.all_machines`。后端只做精确楼名匹配；前端应使用 `list_towers()` 返回的楼名做下拉菜单。

CleverSchool 状态文本中的“待机”会映射为可用，“工作/运转”会映射为运行中，“脱水/开盖/故障/出错/异常”会映射为不可用异常状态。状态解析只匹配这些明确词，不会把“待维修”这类文本误判为空闲。海乐生活的分类 `00/01/02` 分别映射为洗衣机、洗鞋机、烘干机，状态 `1/2/3` 分别映射为可用、运行中、不可用异常。

`CampusContext.queue_estimates` 按机器类型给出排队/等待摘要：总数、可用数、运行中数、异常数、未知数，以及 `estimated_wait_minutes`。如果该类型已有可用机器，等待时间为 `0`；如果没有可用机器但运行中机器提供剩余时间，则取最短剩余时间；如果接口没有足够信息，则保持 `None`，不猜测。

容量、价格和模式只从 `config/machine_rules.json` 读取；接口缺失字段不会被猜测。离线测试可使用 `backend.campus.machine_api.mock_transport_from_file("data/machines_mock.json")` 读取交付 mock 文件。

### 大模型 API 配置

推荐复制示例配置文件后本地修改：

```powershell
Copy-Item config/api_config.example.json config/api_config.json
```

`config/api_config.json` 不会被提交到 git，适合放自己的 API 地址和密钥：

```json
{
  "baseUrl": "https://modelhub.ailemac.com/v1beta",
  "apikey": "sk-your-api-key-here",
  "model_name": "gemini-3.1-pro-preview"
}
```

字段说明：

- `baseUrl`：ModelHub / Gemini v1beta 根地址，当前固定使用 `https://modelhub.ailemac.com/v1beta`。
- `apikey`：ModelHub API key。
- `model_name`：模型名。

客户端只读取 `config/api_config.json`，不读取环境变量，也不使用其他字段名。缺少 `baseUrl`、`apikey` 或 `model_name` 时会显式报错。

### 衣柜记忆与洗护频率

衣柜模块负责保存用户衣物、维护穿着次数、洗涤历史和用户备注，并根据当前洗衣约束生成洗护频率建议。

相关文件：

- `backend/wardrobe/store.py`：衣柜数据读写、增删改查、穿着次数和洗涤历史维护。
- `backend/wardrobe/frequency_advisor.py`：根据 `WardrobeItem` 和 `LaundryConstraints` 生成 `FrequencyAdvice`。
- `data/wardrobe_sample.json`：衣柜样例数据。
- `docs/c_delivery.md`：C 模块交付说明。

基本用法：

```python
from backend.shared.models import LaundryConstraints, WashMethod, WashRecord
from backend.wardrobe.store import WardrobeStore
from backend.wardrobe.frequency_advisor import advise_all_frequencies

store = WardrobeStore("data/wardrobe_sample.json")
items = store.list_items()

constraints = LaundryConstraints(urgent_item_ids=["wm-white-tee-001"])
advice = advise_all_frequencies(items, constraints)

store.record_wear("wm-white-tee-001")
store.add_wash_record(
    "wm-white-tee-001",
    WashRecord(washed_at="2026-05-28", method=WashMethod.MACHINE_WASH),
)
```

本模块只负责衣柜记忆与洗护频率，不调用 LLM，不读取洗衣机状态，不生成最终洗衣方案或报告。

### 洗衣计划与报告

E 模块负责把已选择的衣柜衣物和校园上下文转换成可执行洗衣方案，并把方案生成可读报告。

相关文件：

- `backend/laundry/planner.py`：分桶、洗衣模式、烘干方式、费用时间和风险提醒。
- `backend/reports/generator.py`：把 `LaundryPlan` 转换成 `WashReport`。
- `tests/test_e_module.py`：E 模块真实单元测试。
- `docs/e_demo_script.md`：E 模块 3-5 分钟演示录屏脚本。

`plan_laundry()` 不读取页面状态、不调用 LLM、不读取机器文件。调用方必须显式传入：

- `LaundryConstraints.selected_item_ids`
- `CampusContext.available_machines`
- `CampusContext.pricing_rules["wash_programs"]`
- `CampusContext.pricing_rules["dryer_programs"]`，当允许并推荐烘干时需要

价格和时长规则示例：

```python
pricing_rules = {
    "wash_programs": {
        "standard": {"price_yuan": 4.0, "duration_minutes": 35},
        "large": {"price_yuan": 6.0, "duration_minutes": 45},
        "gentle": {"price_yuan": 4.0, "duration_minutes": 30},
    },
    "dryer_programs": {
        "low": {"price_yuan": 2.0, "duration_minutes": 25},
    },
}
```

缺少所选衣物、可用机器、价格或时长时，模块会显式抛出 `ValueError`，不会编造默认方案。

基本用法：

```python
from backend.campus.context import build_campus_context
from backend.campus.machine_api import LaundryMachineClient
from backend.laundry.planner import plan_laundry
from backend.reports.generator import generate_report
from backend.shared.models import LaundryConstraints

campus_context = build_campus_context(
    LaundryMachineClient("data/machines_mock.json"),
    {"machine_rules_path": "config/machine_rules.json"},
)

constraints = LaundryConstraints(
    selected_item_ids=["wm-white-tee-001", "wm-black-jeans-001"],
    allow_dryer=False,
)

plan = plan_laundry(items, constraints, campus_context)
report = generate_report(plan, items, campus_context)
```

`plan_laundry()` 会在 `LaundryBucket` 中写入真实执行数据：推荐洗衣机 id/位置、烘干机 id/位置、洗衣液用量、是否使用洗衣袋、本桶费用和本桶机器占用时间。机洗和烘干的每一笔计费会进入 `LaundryPlan.cost_breakdown`，调用方不需要再从文案中解析费用拆分。

`LaundryConstraints` 中的约束会被显式处理：`urgent_item_ids` 必须属于本次 `selected_item_ids`；`allow_mixed_colors=True` 时，只有低掉色风险普通衣物会合并成 `mixed-standard` 批次；高掉色风险、床品、手洗、干洗和不可水洗衣物仍单独处理。`hygiene_sensitive=True` 时，机洗批次会标记使用洗衣袋。

`generate_report()` 会保留移动端直接消费的 `WashReport.sections` 结构，同时输出 `WashReport.action_steps` 和 `WashReport.cost_breakdown`。报告只解释 planner 生成的真实方案，不重算分桶、不重新选择机器、不编造节省金额。报告中会解释每个分桶原因、洗衣液用量、计费批次、机器位置、排队估算、晾晒条件、风险控制和节水节电省钱价值。

校园上下文模块当前支持本地 mock 机器数据和显式规则文件：

- `data/machines_mock.json`：`machines` 列表，每条记录必须包含 `machine_id`、`location`、`machine_type` 和 `status`。
- `config/machine_rules.json`：必须包含 `pricing_rules["wash_programs"]`，需要烘干时还要包含对应的 `pricing_rules["dryer_programs"]`。
- `build_campus_context()` 不会猜测规则路径；调用方必须传入 `machine_rules_path`。

### 本地验证

本项目统一使用 `uv` 管理依赖和运行命令，不使用 `requirements.txt`。

```powershell
uv run python -m unittest tests.test_clothing_extraction -v
uv run python -m unittest tests.test_c_module -v
uv run python -m unittest tests.test_d_module -v
uv run python -m unittest tests.test_e_module -v
uv run python -m unittest tests.test_full_integration -v
uv run python -m unittest discover -v
uv run python scripts/demo_c_module.py
```
