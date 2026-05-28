# Wash Agent 结构设计文档

日期：2026-05-28

## 目标

本项目按语义目录拆分模块，明确页面、共享模型、衣物抽取、衣柜记忆、校园上下文、洗衣计划和报告生成的边界。新增代码应放到对应目录，不把多个业务模块继续平铺在 `backend/` 根目录下。

核心原则：

- 页面层只做交互和编排，不写洗衣规则、LLM prompt、机器解析、存储细节。
- 后端模块只通过 `backend/shared/models.py` 里的共享模型对齐。
- 文件应优先复用现有函数、类和 dataclass，不重复造相同结构。
- 新逻辑保持简洁；失败时显式返回错误状态或抛出异常，不新增 fallback、default 或静默猜测。
- Python 包管理统一使用 `uv`。

## 总体目录

```text
Wash-agent/
  AGENTS.md
  app.py
  main.py
  README.md
  pyproject.toml
  docs/
    structure_design.md
  backend/
    __init__.py
    shared/
      __init__.py
      models.py
    clothing_extraction/
      __init__.py
      llm_client.py
      product_info.py
      extractor.py
    wardrobe/
      __init__.py
      store.py
      frequency_advisor.py
    campus/
      __init__.py
      machine_api.py
      context.py
    laundry/
      __init__.py
      planner.py
    reports/
      __init__.py
      generator.py
  data/
    wardrobe_sample.json
    machines_mock.json
  config/
    api_config.example.json
    api_config.json
    machine_rules.json
  tests/
    test_clothing_extraction.py
```

## 模块职责

### 页面入口

文件：

- `app.py`
- `main.py`

应该做：

- 搭建 Streamlit 页面入口。
- 收集用户输入，并转换成 `backend.shared.models` 中的结构。
- 调用后端模块完成抽取、衣柜更新、校园环境读取、洗衣方案生成和报告生成。

不应该做：

- 不直接写 LLM prompt。
- 不直接解析机器接口返回。
- 不直接写洗衣分桶规则。
- 不直接操作 JSON 文件细节。

### 共享模型

文件：

- `backend/shared/models.py`

应该做：

- 存放跨模块使用的 dataclass 和 Enum。
- 作为页面、衣物抽取、衣柜、校园上下文、洗衣计划和报告模块之间的唯一共享数据契约。

不应该做：

- 不写业务流程。
- 不调用外部服务。
- 不存放某个单独模块才需要的私有辅助函数。

### 衣物信息抽取

文件：

- `backend/clothing_extraction/llm_client.py`
- `backend/clothing_extraction/product_info.py`
- `backend/clothing_extraction/extractor.py`

应该做：

- `llm_client.py` 负责 ModelHub / Gemini v1beta 请求、图片 payload 构造和 prompt 构造。
- `product_info.py` 负责归一化商品名、吊牌文字、用户备注、OCR 和商品页文字。
- `extractor.py` 负责把归一化输入抽取为 `ClothingProfile`。
- 图片输入通过一次结构化 Gemini 请求完成图片类型识别、可见事实抽取和保守洗护推断，请求使用 `responseMimeType=application/json` 和 `responseSchema` 约束输出 JSON。

不应该做：

- 不存储衣柜。
- 不判断本次是否该洗。
- 不读校园机器状态。
- 不生成最终洗衣方案或报告。

### 衣柜记忆

文件：

- `backend/wardrobe/store.py`
- `backend/wardrobe/frequency_advisor.py`
- `data/wardrobe_sample.json`

应该做：

- `store.py` 负责衣柜 CRUD、洗涤历史、穿着次数、历史问题记录。
- `frequency_advisor.py` 负责基于衣物和本次约束生成洗护频率建议。
- 数据读写对外暴露为 `WardrobeStore`，页面层不直接操作 JSON。

不应该做：

- 不调用 LLM。
- 不读取洗衣机状态。
- 不生成最终洗衣分桶方案。

### 校园上下文

文件：

- `backend/campus/machine_api.py`
- `backend/campus/context.py`
- `data/machines_mock.json`
- `config/machine_rules.json`

应该做：

- `machine_api.py` 负责统一机器状态接口和机器数据解析。
- `context.py` 负责组合机器、价格、等待时间、天气、阳台、湿度等上下文。
- `machines_mock.json` 使用 `machines` 列表保存显式机器记录，机器类型和状态必须能映射到 `MachineType` 与 `MachineStatus`。
- `machine_rules.json` 使用 `pricing_rules` 保存洗衣和烘干程序的价格与时长，并可包含 `drying_context`。
- `build_campus_context()` 要求调用方显式传入 `machine_rules_path`，缺少规则文件、`pricing_rules` 或机器必要字段时抛出错误。

不应该做：

- 不管理衣柜。
- 不判断衣物材质风险。
- 不生成最终报告文案。

### 洗衣计划

文件：

- `backend/laundry/planner.py`

应该做：

- 根据衣物、用户约束和校园上下文生成 `LaundryPlan`。
- 负责手洗、机洗、干洗判断，分桶规则，模式推荐，洗衣袋、洗衣液、烘干强度、防串色、防缩水和公共洗衣卫生策略。
- 第一版确定性实现要求调用方显式传入所选衣物、可用机器和 `CampusContext.pricing_rules` 中的洗衣/烘干价格与时长；缺少所选衣物、机器、价格或时长时抛出错误，不生成默认方案。
- 当前分桶规则按不可水洗、干洗、手洗、床品大件、深色/掉色风险和浅色标准批次拆分。

不应该做：

- 不直接读取页面状态。
- 不直接调用 LLM。
- 不直接抓取机器接口。
- 不生成最终展示报告。

### 报告生成

文件：

- `backend/reports/generator.py`

应该做：

- 把 `LaundryPlan`、衣物列表和校园上下文转换成 `WashReport`。
- 负责用户可读文案、风险说明、节水节电省钱说明和操作步骤。
- 报告只解释 planner 已生成的方案，不重新分桶、不重算洗衣决策。

不应该做：

- 不修改洗衣计划。
- 不调用 LLM。
- 不读取页面状态。

## 主流程

1. `app.py` 收集用户衣物输入。
2. 页面构造 `ClothingInput`。
3. `backend.clothing_extraction.product_info.enrich_product_info()` 归一化输入。
4. `backend.clothing_extraction.extractor.extract_clothing_info()` 生成 `ClothingProfile`。
   - 有图片时，`extractor` 调用 `build_image_single_pass_prompt()`，由单次 VLM 请求返回 `image_type`、`agent_trace`、材质、颜色、洗护动作、风险和 `missing_fields`。
   - 无图片时，继续使用文本抽取 prompt。
5. `backend.wardrobe.store.WardrobeStore.upsert_item()` 写入衣柜。
6. 页面构造 `LaundryConstraints`。
7. `backend.campus.machine_api.LaundryMachineClient.list_machines()` 获取并校验机器状态。
8. `backend.campus.context.build_campus_context()` 用显式 `machine_rules_path` 组合校园上下文。
9. `backend.wardrobe.frequency_advisor.advise_frequency()` 给每件衣物洗护优先级。
10. `backend.laundry.planner.plan_laundry()` 输出 `LaundryPlan`。
    - 调用方需提供显式价格与时长规则，例如 `pricing_rules["wash_programs"]["standard"]` 和 `pricing_rules["dryer_programs"]["low"]`。
11. `backend.reports.generator.generate_report()` 输出 `WashReport`。
12. `app.py` 渲染方案和报告。

## 开发规则

- 每个成员只改自己负责目录和必要的共享模型。
- 修改 `backend/shared/models.py` 前先确认所有调用方需要这个字段。
- 模块之间只传 dataclass 或基本类型，不传 Streamlit 组件、不传页面 session state。
- 不保留旧路径兼容层；迁移后统一使用新 import。
- 不新增 fallback、default 或静默猜测逻辑。
- 依赖管理只用 `uv add`、`uv remove`、`uv sync` 和 `uv run`。
