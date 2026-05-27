# Wash Agent 结构设计文档

日期：2026-05-27

## 1. 目标

本项目先形成可并行开发的结构骨架：明确每个成员负责的模块、模块输入输出、共享数据结构、接口边界和联调顺序。当前阶段不实现具体业务逻辑，只固定目录、文件、函数签名和数据契约。

核心原则：

- Streamlit 页面只做交互和编排，不直接写洗衣规则、LLM prompt、机器规则或存储细节。
- 后端模块只通过 `backend/models.py` 里的共享模型对齐，避免各模块重复定义字段。
- 每个模块保留稳定的入口函数或类，后续实现可以替换内部逻辑，不影响其他模块调用。
- Mock 数据和真实 API 使用同一接口，方便先做 demo，再接真实服务。

## 2. 总体目录

```text
Wash-agent/
  app.py
  main.py
  README.md
  requirements.txt
  overall.md
  pyproject.toml
  docs/
    structure_design.md
  backend/
    __init__.py
    models.py
    llm_client.py
    clothing_extractor.py
    product_info.py
    wardrobe_store.py
    frequency_advisor.py
    laundry_machine_api.py
    campus_context.py
    laundry_planner.py
    report_generator.py
  data/
    wardrobe_sample.json
    machines_mock.json
  config/
    machine_rules.json
```

## 3. 模块职责

### A. Web 集成

负责人模块：

- `app.py`

应该做：

- 搭建 Streamlit 页面入口。
- 页面组织为六个区域：添加衣物、我的衣柜、本次洗衣约束、洗衣机状态、方案结果、报告。
- 调用后端模块完成抽取、衣柜更新、校园环境读取、洗衣方案生成和报告生成。
- 负责把用户输入转换成 `backend.models` 里的结构。

不应该做：

- 不直接写 LLM prompt。
- 不直接解析机器接口返回。
- 不直接写洗衣分桶规则。
- 不直接操作 JSON 文件细节。

预留接口：

- `run_app() -> None`

### B. 大模型衣物抽取

负责人模块：

- `backend/llm_client.py`
- `backend/clothing_extractor.py`
- `backend/product_info.py`

应该做：

- `llm_client.py` 负责统一 LLM 调用接口和响应格式；未配置 API key 时只返回空响应标记，不生成规则猜测结果。
- `product_info.py` 负责商品名、店铺名、吊牌文字、用户描述等原始信息的补全和归一化。
- `clothing_extractor.py` 负责从归一化输入中抽取材质、颜色、洗护禁忌、风险和置信度。

不应该做：

- 不存储衣柜。
- 不判断本次是否该洗。
- 不做分桶和机器推荐。

预留接口：

- `LLMClient.complete(prompt: str, *, temperature: float = 0.0) -> LLMResponse`
- `enrich_product_info(raw: ClothingInput) -> ClothingInput`
- `extract_clothing_info(raw: ClothingInput, llm_client: LLMClient | None = None) -> ClothingProfile`

### C. 衣柜记忆与洗护频率

负责人模块：

- `backend/wardrobe_store.py`
- `backend/frequency_advisor.py`
- `data/wardrobe_sample.json`

应该做：

- `wardrobe_store.py` 负责衣柜 CRUD、洗涤历史、穿着次数、历史问题记录。
- `frequency_advisor.py` 负责运动后、明天要穿、牛仔裤少洗、羊毛衫少水洗等频率建议。
- 数据读写对外暴露为 `WardrobeStore`，页面层不直接操作 JSON。

不应该做：

- 不调用 LLM。
- 不读取洗衣机状态。
- 不生成最终洗衣分桶方案。

预留接口：

- `WardrobeStore.list_items() -> list[WardrobeItem]`
- `WardrobeStore.get_item(item_id: str) -> WardrobeItem | None`
- `WardrobeStore.upsert_item(item: WardrobeItem) -> None`
- `WardrobeStore.delete_item(item_id: str) -> None`
- `WardrobeStore.add_wash_record(item_id: str, record: WashRecord) -> None`
- `advise_frequency(item: WardrobeItem, constraints: LaundryConstraints) -> FrequencyAdvice`

### D. 校园机器与时间费用

负责人模块：

- `backend/laundry_machine_api.py`
- `backend/campus_context.py`
- `data/machines_mock.json`
- `config/machine_rules.json`

应该做：

- `laundry_machine_api.py` 负责统一机器状态接口，先接 mock，后续可接真实校园洗衣机接口。
- `campus_context.py` 负责整合机器、价格、等待时间、天气、阳台、湿度等上下文。
- `machine_rules.json` 负责保存小筒、标准筒、大筒、烘干 30/60/90 分钟、价格、容量等规则。

不应该做：

- 不管理衣柜。
- 不判断衣物材质风险。
- 不生成最终报告文案。

预留接口：

- `LaundryMachineClient.list_machines() -> list[MachineInfo]`
- `LaundryMachineClient.get_machine(machine_id: str) -> MachineInfo | None`
- `build_campus_context(machine_client: LaundryMachineClient, user_inputs: dict[str, object] | None = None) -> CampusContext`

### E. 洗衣决策、报告和提交材料

负责人模块：

- `backend/laundry_planner.py`
- `backend/report_generator.py`
- `README.md`

应该做：

- `laundry_planner.py` 负责手洗、机洗、干洗判断，分桶规则，模式推荐，洗衣袋、洗衣液、烘干强度、防串色、防缩水和公共洗衣卫生策略。
- `report_generator.py` 负责把方案转成用户可读报告，包括风险说明、节水节电省钱说明和操作步骤。
- README 负责运行方式、模块说明、demo 流程和成员分工。

不应该做：

- 不直接读取页面状态。
- 不直接调用 LLM。
- 不直接抓取机器接口。

预留接口：

- `plan_laundry(items: list[WardrobeItem], constraints: LaundryConstraints, campus_context: CampusContext) -> LaundryPlan`
- `generate_report(plan: LaundryPlan, items: list[WardrobeItem], campus_context: CampusContext) -> WashReport`

## 4. 共享数据模型

所有模块通过 `backend/models.py` 对齐。第一阶段固定以下模型：

- `ClothingInput`：页面或商品补全模块提供的原始衣物输入。
- `ClothingProfile`：LLM 抽取后的衣物画像。
- `WardrobeItem`：衣柜中的一件衣物。
- `WashRecord`：单次洗护历史。
- `LaundryConstraints`：本次洗衣约束。
- `MachineInfo`：单台洗衣机或烘干机状态。
- `CampusContext`：机器、天气、晾晒和费用上下文。
- `FrequencyAdvice`：是否应该洗、优先级和原因。
- `LaundryPlan`：最终分桶和模式方案。
- `WashReport`：最终报告结构。

字段命名规则：

- 标识符统一用 `*_id`。
- 金额统一用 `*_yuan`。
- 时长统一用 `*_minutes`。
- 容量统一用 `*_kg`。
- 风险等级统一用 `RiskLevel`。
- 洗护方式统一用 `WashMethod`。

## 5. 主流程对齐

推荐联调流程：

1. 用户在 `app.py` 添加衣物。
2. `app.py` 构造 `ClothingInput`。
3. `product_info.enrich_product_info()` 补全商品和吊牌信息。
4. `clothing_extractor.extract_clothing_info()` 生成 `ClothingProfile`。
5. `wardrobe_store.WardrobeStore.upsert_item()` 写入衣柜。
6. 用户选择本次要洗的衣物和约束，页面构造 `LaundryConstraints`。
7. `laundry_machine_api.LaundryMachineClient.list_machines()` 获取机器状态。
8. `campus_context.build_campus_context()` 组合校园上下文。
9. `frequency_advisor.advise_frequency()` 给每件衣物洗护优先级。
10. `laundry_planner.plan_laundry()` 输出 `LaundryPlan`。
11. `report_generator.generate_report()` 输出 `WashReport`。
12. `app.py` 渲染方案和报告。

## 6. 错误与可用性边界

第一阶段保留以下错误边界：

- LLM 失败：`clothing_extractor` 返回空核心字段、`unknown` 风险、`extraction_status` 和 `extraction_error`，页面提示用户重试或手动填写。
- LLM 返回空 JSON 或非 JSON：`clothing_extractor` 不做规则兜底，明确标记 `llm_empty_response` 或 `llm_invalid_json`。
- 商品信息不足：`product_info` 保留原始输入，不阻断流程。
- 机器接口失败：`laundry_machine_api` 使用 `data/machines_mock.json`。
- 天气信息缺失：`campus_context` 使用用户手动输入或默认未知状态。
- 洗衣方案风险过高：`laundry_planner` 输出手洗或干洗建议，不强行机洗。

## 7. 开发对齐规则

- 每个成员只改自己模块和必要的共享模型；修改 `backend/models.py` 需要通知其他成员。
- 模块之间只传 dataclass 或基本类型，不传 Streamlit 组件、不传页面 session state。
- 所有函数先按接口返回结构，内部实现可以先用 mock。
- 真实 API 和 mock 数据必须共用同一返回模型。
- README 最终只描述已稳定的运行方式，不提前承诺未实现功能。

## 8. 第一阶段交付边界

本次结构工作只交付：

- 结构设计文档。
- 目录结构。
- 共享模型文件。
- 各模块接口桩。
- mock 数据和规则文件的初始形状。

本次不交付：

- Streamlit 页面实现。
- LLM prompt 和真实 API 调用。
- 洗衣决策规则实现。
- 报告文案生成实现。
- 视频和最终作业说明。
