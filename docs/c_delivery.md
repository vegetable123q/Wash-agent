# C 模块交付说明：衣柜记忆与洗护频率

## 交付范围

C 模块负责衣柜记忆和洗护频率建议：

- `backend/wardrobe/store.py`：保存 `WardrobeItem`，维护穿着次数、洗涤历史和用户备注。
- `backend/wardrobe/frequency_advisor.py`：基于真实衣物资料和 `LaundryConstraints` 输出 `FrequencyAdvice`。
- `data/wardrobe_sample.json`：真实结构样例，顶层为 `{"items": [...]}`。

本模块不调用 LLM，不读取洗衣机状态，不生成最终分桶方案或报告。

## 接口对齐

代码按仓库最新规范使用语义目录和共享模型：

```python
from backend.shared.models import LaundryConstraints, WashMethod, WashRecord
from backend.wardrobe.store import WardrobeStore
from backend.wardrobe.frequency_advisor import advise_all_frequencies, advise_frequency

store = WardrobeStore("data/wardrobe_sample.json")
items = store.list_items()

constraints = LaundryConstraints(urgent_item_ids=["wm-white-tee-001"])
advice = advise_frequency(items[0], constraints)
all_advice = advise_all_frequencies(items, constraints)

store.record_wear("wm-white-tee-001")
store.add_wash_record(
    "wm-white-tee-001",
    WashRecord(washed_at="2026-05-28", method=WashMethod.MACHINE_WASH)
)
```

## 设计约束

- 复用 `backend.shared.models`，不在 C 模块重复定义 dataclass 或 enum。
- 不提供旧路径兼容层，不使用 `backend.models`、`backend.wardrobe_store`、`backend.frequency_advisor`。
- 不做静默 fallback：衣柜文件缺失、JSON 结构错误、字段缺失、未知枚举值、无法识别频率阈值都会显式报错。
- `recommended_item_ids` 要求调用方显式传入 `min_score`，不在函数里隐藏默认阈值。

## 验收

```bash
uv run python scripts/demo_c_module.py
uv run python -m unittest tests.test_c_module
```

验收点：

- 能读取 5 件样例衣物。
- 能新增或更新衣物、删除衣物、记录穿着、追加洗涤历史。
- 能根据急用、运动后、穿着次数、牛仔少洗、羊毛风险等真实字段输出频率建议。
- 无法从衣物资料识别频率阈值时抛出 `ValueError`，不使用默认阈值。

