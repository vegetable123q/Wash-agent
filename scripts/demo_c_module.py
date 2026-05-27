from __future__ import annotations

import json
import shutil
import sys
import tempfile
from dataclasses import asdict
from enum import Enum
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.shared.models import LaundryConstraints, WashMethod, WashRecord
from backend.wardrobe.frequency_advisor import advise_all_frequencies, recommended_item_ids
from backend.wardrobe.store import WardrobeStore


def main() -> None:
    store = WardrobeStore(ROOT / "data" / "wardrobe_sample.json")
    items = store.list_items()
    constraints = LaundryConstraints(urgent_item_ids=["wm-white-tee-001"])

    print("=== Wardrobe Items ===")
    print(json.dumps([item.profile.item_id for item in items], ensure_ascii=False, indent=2))

    print("\n=== Frequency Advice ===")
    advice = advise_all_frequencies(items, constraints)
    print(json.dumps(_jsonable(advice), ensure_ascii=False, indent=2))

    print("\n=== Recommended Item IDs ===")
    print(json.dumps(recommended_item_ids(items, constraints, min_score=45.0), ensure_ascii=False, indent=2))

    print("\n=== Store Mutation Demo On Temporary Copy ===")
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / "wardrobe_sample.json"
        shutil.copyfile(store.path, temp_path)
        temp_store = WardrobeStore(temp_path)

        worn = temp_store.record_wear("wm-white-tee-001")
        temp_store.add_wash_record(
            "wm-white-tee-001",
            WashRecord(washed_at="2026-05-28", method=WashMethod.MACHINE_WASH, notes="demo wash"),
        )
        washed = temp_store.get_item("wm-white-tee-001")

        print(
            json.dumps(
                {
                    "after_record_wear": _jsonable(worn),
                    "after_add_wash_record": _jsonable(washed),
                },
                ensure_ascii=False,
                indent=2,
            )
        )


def _jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if hasattr(value, "__dataclass_fields__"):
        return _jsonable(asdict(value))
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    return value


if __name__ == "__main__":
    main()

