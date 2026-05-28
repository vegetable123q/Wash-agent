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
    api/
      __init__.py
      server.py
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
      weather.py
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
  frontend/
    package.json
    capacitor.config.ts
    src/
      App.tsx
      api/
        apiConnection.ts
        mobileSummary.ts
      data/
      components/
      screens/
  .github/
    workflows/
      preview.yml
      release-apk.yml
  tests/
    test_campus_context.py
    test_campus_machine_api.py
    test_d_module.py
    test_e_module.py
    test_full_integration.py
    test_clothing_extraction.py
```

## 2026-05-28 移动端接入边界更新

本节覆盖上方移动端前端视觉工程的早期静态原型描述。

### 本地移动端 API

文件：

- `backend/api/server.py`

应该做：

- 提供 `/api/mobile/summary`、`/api/wardrobe/items` 和 `/api/weather/current` 等本地 HTTP JSON 边界。
- 服务启动必须显式配置 API key：调用方传 `api_key` 或设置 `WASH_API_KEY`。除 `OPTIONS` 预检外，所有移动端 API 请求必须带 `x-api-key`；缺失或不匹配返回 `401`。
- 提供 `DELETE /api/wardrobe/items/{item_id}`，让移动端衣柜支持删除已有衣物；删除必须通过 `WardrobeStore.delete_item()`，不存在的衣物返回显式错误，不静默成功。
- 提供 `/api/campus/towers`，并在 `/api/mobile/summary.campus_towers` 中附带可选宿舍楼列表。移动端个人页使用该列表渲染宿舍楼下拉菜单，保存时同步 `dormName` 和 `towerKey`。
- 编排已有后端模块，把 `WardrobeStore`、`CampusContext`、`LaundryPlan` 和 `WashReport` 转成前端可消费的 JSON。
- 在服务不可用或天气接口失败时返回显式 `status` / `error` 字段，不生成猜测天气或机器数据。

不应该做：

- 不在 API 层实现衣物抽取、洗衣规则、机器解析、天气解析或报告文案。
- 不直接操作衣柜 JSON 细节，衣柜读写必须通过 `WardrobeStore`。

### 移动端前端

文件：

- `frontend/`

应该做：

- 构建手机版 WashMate Campus 交互界面和 Capacitor Android 包装。
- 通过 `/api/*` 调用本地移动端 API，不直接导入或调用后端业务函数。
- `baseUrl` 和 `apikey` 只能来自用户在移动端“我的”页输入；release APK 不内置真实 API 地址、API key 或服务端密钥，也不能把用户输入的 `baseUrl` / `apikey` 写入持久化存储。个人页可以用当前输入测试连接，测试通过后同一内存配置用于摘要、方案、报告、衣柜新增和衣柜删除请求。
- 所有移动端 API 请求必须带 `x-api-key`。若 `baseUrl` 或 `apikey` 未配置，前端不得发起请求，应显示待配置状态。
- 保存仅限当前设备的界面偏好和个人洗衣上下文，例如宿舍楼、最晚取衣时间和烘干偏好；后续接入账号系统后再迁移到后端 profile API。
- 图片选择当前只保留文件名用于本地衣柜记录，不上传二进制图片内容。
- 后端不可用时必须在 UI 上明确标记为前端预览状态。
- 衣柜页必须同时提供查看详情和删除已有后端衣物的操作；删除中应禁用对应按钮，成功或失败都要显示状态。
- 添加衣物页的图片入口当前只记录图片文件名，不做移动端二进制上传或前端本地识别；界面文案必须明确这一点，不能标成“已识别”。
- 衣物详情和机器详情必须展示用户刚选择的后端或预览记录；如果没有对应记录，页面必须显式显示未找到状态，不能静默展示其他样例。
- 展示型控件不能做成可点击按钮；没有真实行为的详情页按钮必须禁用并给出原因，或改为普通展示元素。

不应该做：

- 不直接调用外部网络服务。
- 不在源码、构建配置、APK 或前端持久化存储中保存密钥、令牌、真实账号凭证或遥测数据；用户手动输入的 `baseUrl` 和 `apikey` 只作为本次打开期间的内存连接配置使用。
- 不在前端重复实现洗衣规则、衣物抽取、机器解析、天气解析或报告生成逻辑。

## 模块职责

### 移动端前端视觉工程

文件：

- `frontend/`

应该做：

- 搭建手机版 WashMate Campus 前端视觉与本地交互壳。
- 使用静态演示数据呈现离线预览；后端摘要存在时优先展示后端衣柜、机器、方案和报告记录。
- 通过 Capacitor 保留 Android APK 包装路径。
- Android APK 允许用户输入的 `baseUrl` 使用 `http` 或 `https`，以便模拟器通过 `http://10.0.2.2:8000` 调用本机 `backend.api.server`。前端不得保存真实账号凭证或密钥。

不应该做：

- 不调用后端业务函数或外部网络服务。
- 不在源码、构建配置或 APK 中保存真实用户数据、密钥或上传内容。
- 不在前端重复实现洗衣规则、衣物抽取、机器解析或报告生成逻辑。

### CI/CD 与分支

文件：

- `.github/workflows/preview.yml`
- `.github/workflows/release-apk.yml`
- `frontend/android/app/build.gradle`

应该做：

- `preview` 分支用于提交和修改预览；push 或 PR 时运行 Python 单元测试、前端测试和前端 build，不发布 APK。
- `main` 分支用于发布；push 后运行完整验证、同步 Capacitor、构建签名 release APK，并发布到 GitHub Release。
- Android release 签名只从 GitHub Secrets 注入：`ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`。keystore 文件不能提交到仓库。
- Gradle release 签名配置只读取环境变量；debug 构建可不签名 release key。

不应该做：

- 不把 keystore、签名密码、API key 或生产 API 地址写进源码、workflow 明文或 APK 构建参数。
- 不让 `preview` 自动发布 APK。

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
- 当前校园模块新增 `MachineTower`，用于把 CleverSchool 楼号和海乐生活点位列表传给页面层；`MachineTower.provider_keys` 显式记录同一统一楼名下的所有来源 id，避免把两套外部 id 混用；`CampusContext` 同时保留 `all_machines`、`available_machines` 和 `queue_estimates`，避免丢失运行中机器的剩余时间和排队摘要。

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

- `machine_api.py` 负责 CleverSchool 和海乐生活洗衣机接口及机器数据解析。CleverSchool 使用 `https://api.cleverschool.cn/washapi4/device/tower` 获取楼号列表，使用 `https://api.cleverschool.cn/washapi4/device/status` 按 `towerKey` 获取机器状态；海乐生活使用 `https://yshz-user.haier-ioc.com/position/nearPosition` 获取清华附近点位，使用 `https://yshz-user.haier-ioc.com/position/deviceDetailPage` 按 `positionId` 和分类获取设备状态。
- `machine_api.py` 负责统一楼名。海乐生活点位名前缀 `清华大学` 会被去掉；同名楼会归并成一个 `MachineTower`，并通过 `provider_keys` 保存 `cleverschool` / `haier` 对应的外部 id。前端下拉菜单使用统一后的 `MachineTower.name`。
- `machine_api.py` 把 CleverSchool 接口中的 `macUnionCode`、`tower`、`floorName` 和中文 `status` 文本转换为 `MachineTower` / `MachineInfo`。状态文本中的“待机”映射为可用，“工作/运转”映射为运行中，“脱水/开盖/故障/出错/异常”映射为不可用异常状态；剩余分钟数只从 `剩余时间:N分钟` 显式解析。状态解析必须匹配明确词，不能用单字包含关系把“待维修”等文本误判为空闲。
- `machine_api.py` 把海乐生活分类 `00/01/02` 分别转换为 `standard_washer`、`shoe_washer`、`dryer`，把状态 `1/2/3` 分别转换为可用、运行中、不可用异常。海乐缺失的容量、价格、模式和剩余时间不做猜测。
- `context.py` 负责组合机器、价格、等待时间、天气、阳台、湿度等上下文。页面层可直接调用 `build_campus_context_from_user_input()`，传入用户可理解的 `tower_name`、`weather` 和 `drying_context`，由该入口通过合并后的楼号列表精确解析内部 `tower_keys`，再创建机器客户端、调用所有对应 provider 的状态 API 并输出 `CampusContext`。后端不做模糊匹配；如果楼名不在下拉列表中，必须显式报错。若调用方直接传外部楼栋 id，则必须同时传 `tower_provider` 或 `tower_keys`，不能静默默认 CleverSchool。
- `context.py` 必须生成 `CampusContext.queue_estimates`。该字段按 `MachineType` 汇总总数、可用数、运行中数、异常数、未知数和 `estimated_wait_minutes`：有可用机器时为 `0`；无可用机器但运行中机器有剩余时间时取最短剩余时间；信息不足时保持 `None`。
- `machine_api.py` 提供 `mock_transport_from_file("data/machines_mock.json")`，用于让交付 mock 文件通过正式 transport 入口参与测试；mock 缺少必要响应时应显式报错。
- `machines_mock.json` 同时保留本地离线集成使用的 `machines` 列表，以及真实接口 transport 测试使用的 CleverSchool / 海乐响应片段。
- `machine_rules.json` 同时保存 E 模块消费的 `pricing_rules`、晾晒上下文 `drying_context`，以及 D 模块解析真实机器接口所需的机器类型映射、容量、模式、价格和时长等配置。外部状态接口不提供的容量、价格和模式，相关字段只能来自该配置，不能从接口文本猜测。

不应该做：

- 不管理衣柜。
- 不判断衣物材质风险。
- 不生成最终报告文案。
- 不从外部接口缺失字段中猜测容量、价格、模式、剩余时间或天气。

### 洗衣计划

文件：

- `backend/laundry/planner.py`

应该做：

- 根据衣物、用户约束和校园上下文生成 `LaundryPlan`。
- 负责手洗、机洗、干洗判断，分桶规则，模式推荐，洗衣袋、洗衣液、烘干强度、防串色、防缩水和公共洗衣卫生策略。
- 第一版确定性实现要求调用方显式传入所选衣物、可用机器和 `CampusContext.pricing_rules` 中的洗衣/烘干价格与时长；缺少所选衣物、机器、价格或时长时抛出错误，不生成默认方案。
- 当 `LaundryConstraints` 包含预算或最大等待时间时，在 `LaundryPlan.global_warnings` 中显式说明超预算、等待估算缺失、等待未知或等待超时，不能静默忽略这些约束。
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
7. `backend.campus.machine_api.LaundryMachineClient.list_towers()` 获取并统一 CleverSchool 楼号和海乐生活点位列表，页面传入下拉菜单中的统一楼名后由 `build_campus_context_from_user_input()` 精确解析 `tower_keys`，再调用所有对应 provider 的 `list_machines(...)` 获取机器状态。
8. `backend.campus.context.build_campus_context()` 组合校园上下文。
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
