from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from backend.campus.context import (
    build_campus_context,
    build_campus_context_from_user_input,
)
from backend.shared.models import MachineInfo, MachineQueueEstimate, MachineStatus, MachineType


class FakeMachineClient:
    def __init__(self, machines: list[MachineInfo]) -> None:
        self.machines = machines
        self.calls: list[tuple[str, str, str]] = []

    def list_machines(
        self,
        tower_key: str,
        *,
        provider: str | None = None,
        tower_name: str = "",
    ) -> list[MachineInfo]:
        self.calls.append((tower_key, str(provider or ""), tower_name))
        return list(self.machines)


class FakeCleverSchoolTransport:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    def __call__(self, url: str, payload: dict[str, object]) -> dict[str, object]:
        self.calls.append((url, payload))
        if url.endswith("/device/tower"):
            return {
                "success": True,
                "data": [
                    {"text": "请选择楼号", "value": "0"},
                    {"text": "南区21号楼", "value": "nq21"},
                    {"text": "南区26号楼东", "value": "nwhstuo"},
                    {"text": "南区26号楼西", "value": "yeybcgx"},
                    {"text": "紫荆1号楼", "value": "ncrkiz1"},
                ],
            }
        if url.endswith("/device/status"):
            if payload["towerKey"] == "nq21":
                return {
                    "success": True,
                    "data": [
                        {
                            "tower": "南区21号楼",
                            "towerKey": "nq21",
                            "macUnionCode": "洗衣机 clever-nq21-1",
                            "floorName": "一层",
                            "status": "状态:待机中 更新时间:2026-05-28 13:23:08",
                        }
                    ],
                }
            return {
                "success": True,
                "data": [
                    {
                        "tower": "南区26号楼东",
                        "towerKey": "nwhstuo",
                        "macUnionCode": "洗衣机 he10000125",
                        "floorName": "一层",
                        "status": "状态:待机中 更新时间:2026-05-28 13:23:08",
                    },
                    {
                        "tower": "南区26号楼东",
                        "towerKey": "nwhstuo",
                        "macUnionCode": "洗衣机 he10000177",
                        "floorName": "二层",
                        "status": "状态:工作中 剩余时间:24分钟 更新时间:2026-05-28 13:26:28",
                    },
                ],
            }
        if url.endswith("/position/nearPosition"):
            return {
                "code": 0,
                "data": {
                    "items": [
                        {"name": "清华大学南区21号楼", "id": 43762},
                        {"name": "清华大学红杉学生公寓", "id": 440},
                    ]
                },
            }
        if url.endswith("/position/deviceDetailPage"):
            if payload["categoryCode"] == "00":
                return {
                    "code": 0,
                    "data": {
                        "items": [
                            {
                                "id": 85500827,
                                "name": "南区21号楼1层1号",
                                "state": 1,
                            },
                            {
                                "id": 85500828,
                                "name": "南区21号楼1层2号",
                                "state": 2,
                            },
                        ]
                    },
                }
            return {"code": 0, "data": {"items": []}}
        raise AssertionError(f"unexpected URL: {url}")


def _write_rules(tmp_dir: str) -> Path:
    rules_path = Path(tmp_dir) / "machine_rules.json"
    rules_path.write_text(
        json.dumps(
            {
                "machine_type_map": {
                    "洗衣机": "standard_washer",
                    "洗鞋机": "shoe_washer",
                    "烘干机": "dryer",
                },
                "washer_types": {
                    "standard_washer": {
                        "default_price_yuan": 3.0,
                        "modes": ["quick", "standard", "heavy"],
                    }
                },
                "dryer_modes": {
                    "60min": {"duration_minutes": 60, "price_yuan": 5.0}
                },
                "pricing": {"currency": "CNY"},
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return rules_path


class CampusContextTests(unittest.TestCase):
    def test_build_campus_context_from_user_input_resolves_tower_name_to_key(
        self,
    ) -> None:
        transport = FakeCleverSchoolTransport()
        with tempfile.TemporaryDirectory() as tmp_dir:
            context = build_campus_context_from_user_input(
                {
                    "tower_name": "南区26号楼东",
                    "weather": {"condition": "rainy", "humidity": 88},
                    "drying_context": {"has_balcony": False},
                },
                machine_rules_path=_write_rules(tmp_dir),
                transport=transport,
            )

        self.assertEqual(
            transport.calls,
            [
                (
                    "https://api.cleverschool.cn/washapi4/device/tower",
                    {},
                ),
                (
                    "https://yshz-user.haier-ioc.com/position/nearPosition",
                    {
                        "lng": 116.32697,
                        "lat": 40.00281,
                        "page": 1,
                        "pageSize": 100,
                    },
                ),
                (
                    "https://api.cleverschool.cn/washapi4/device/status",
                    {"towerKey": "nwhstuo", "deviceType": ""},
                ),
            ],
        )
        self.assertEqual(len(context.all_machines), 2)
        self.assertEqual(context.available_machines, [context.all_machines[0]])
        self.assertEqual(context.weather, {"condition": "rainy", "humidity": 88})
        self.assertEqual(
            context.drying_context,
            {"has_balcony": False, "balcony_available": False},
        )

    def test_build_campus_context_normalizes_has_balcony_alias(self) -> None:
        client = FakeMachineClient([])
        with tempfile.TemporaryDirectory() as tmp_dir:
            context = build_campus_context(
                client,
                {
                    "tower_key": "ncrkiz1",
                    "tower_provider": "cleverschool",
                    "drying_context": {"has_balcony": False},
                },
                machine_rules_path=_write_rules(tmp_dir),
            )

        self.assertEqual(
            context.drying_context,
            {"has_balcony": False, "balcony_available": False},
        )

    def test_build_campus_context_from_user_input_merges_sources_for_same_building(
        self,
    ) -> None:
        transport = FakeCleverSchoolTransport()
        with tempfile.TemporaryDirectory() as tmp_dir:
            context = build_campus_context_from_user_input(
                {
                    "tower_name": "南区21号楼",
                    "weather": {"condition": "sunny", "humidity": 45},
                },
                machine_rules_path=_write_rules(tmp_dir),
                transport=transport,
            )

        self.assertEqual(
            [
                payload
                for url, payload in transport.calls
                if url.endswith("/device/status")
            ],
            [{"towerKey": "nq21", "deviceType": ""}],
        )
        self.assertEqual(
            [
                payload
                for url, payload in transport.calls
                if url.endswith("/position/deviceDetailPage")
            ],
            [
                {
                    "positionId": "43762",
                    "categoryCode": "00",
                    "page": 1,
                    "floorCode": "",
                    "pageSize": 100,
                },
                {
                    "positionId": "43762",
                    "categoryCode": "01",
                    "page": 1,
                    "floorCode": "",
                    "pageSize": 100,
                },
                {
                    "positionId": "43762",
                    "categoryCode": "02",
                    "page": 1,
                    "floorCode": "",
                    "pageSize": 100,
                },
            ],
        )
        self.assertEqual(len(context.all_machines), 3)
        self.assertEqual(context.all_machines[0].machine_type, MachineType.STANDARD_WASHER)
        self.assertEqual(
            context.available_machines,
            [context.all_machines[0], context.all_machines[1]],
        )
        self.assertEqual(context.weather, {"condition": "sunny", "humidity": 45})

    def test_build_campus_context_from_user_input_requires_exact_tower_name(
        self,
    ) -> None:
        transport = FakeCleverSchoolTransport()
        with tempfile.TemporaryDirectory() as tmp_dir:
            with self.assertRaisesRegex(ValueError, "tower_name not found"):
                build_campus_context_from_user_input(
                    {"tower_name": "南区26号楼"},
                    machine_rules_path=_write_rules(tmp_dir),
                    transport=transport,
                )

    def test_build_campus_context_from_user_input_calls_api_and_merges_user_context(
        self,
    ) -> None:
        transport = FakeCleverSchoolTransport()
        with tempfile.TemporaryDirectory() as tmp_dir:
            context = build_campus_context_from_user_input(
                {
                    "tower_key": "nwhstuo",
                    "tower_provider": "cleverschool",
                    "weather": {
                        "condition": "rainy",
                        "humidity": 88,
                        "temperature_c": 19,
                    },
                    "drying_context": {
                        "has_balcony": False,
                        "indoor_rack": True,
                    },
                },
                machine_rules_path=_write_rules(tmp_dir),
                transport=transport,
            )

        self.assertEqual(
            transport.calls,
            [
                (
                    "https://api.cleverschool.cn/washapi4/device/status",
                    {"towerKey": "nwhstuo", "deviceType": ""},
                )
            ],
        )
        self.assertEqual(len(context.all_machines), 2)
        self.assertEqual(context.available_machines, [context.all_machines[0]])
        self.assertEqual(context.all_machines[1].remaining_minutes, 24)
        self.assertEqual(
            context.weather,
            {"condition": "rainy", "humidity": 88, "temperature_c": 19},
        )
        self.assertEqual(
            context.drying_context,
            {"has_balcony": False, "indoor_rack": True, "balcony_available": False},
        )
        self.assertEqual(context.pricing_rules["currency"], "CNY")

    def test_build_campus_context_filters_available_and_keeps_all_machines(self) -> None:
        machines = [
            MachineInfo(
                machine_id="idle-1",
                location="紫荆1号楼 一层",
                machine_type=MachineType.STANDARD_WASHER,
                status=MachineStatus.AVAILABLE,
            ),
            MachineInfo(
                machine_id="busy-1",
                location="紫荆1号楼 二层",
                machine_type=MachineType.STANDARD_WASHER,
                status=MachineStatus.RUNNING,
                remaining_minutes=18,
            ),
        ]
        client = FakeMachineClient(machines)
        with tempfile.TemporaryDirectory() as tmp_dir:
            context = build_campus_context(
                client,
                {
                    "tower_key": "ncrkiz1",
                    "tower_provider": "cleverschool",
                    "weather": {"condition": "cloudy", "humidity": 72},
                    "drying_context": {"has_balcony": True, "indoor_rack": True},
                },
                machine_rules_path=_write_rules(tmp_dir),
            )

        self.assertEqual(client.calls, [("ncrkiz1", "cleverschool", "")])
        self.assertEqual(context.all_machines, machines)
        self.assertEqual(context.available_machines, [machines[0]])
        self.assertEqual(context.weather, {"condition": "cloudy", "humidity": 72})
        self.assertEqual(
            context.drying_context,
            {"has_balcony": True, "indoor_rack": True, "balcony_available": True},
        )
        self.assertEqual(context.pricing_rules["currency"], "CNY")
        self.assertIn("washer_types", context.pricing_rules)
        self.assertIn("dryer_modes", context.pricing_rules)

    def test_build_campus_context_computes_queue_estimates_by_machine_type(self) -> None:
        machines = [
            MachineInfo(
                machine_id="washer-busy-1",
                location="南区21号楼 一层",
                machine_type=MachineType.STANDARD_WASHER,
                status=MachineStatus.RUNNING,
                remaining_minutes=18,
            ),
            MachineInfo(
                machine_id="washer-busy-2",
                location="南区21号楼 二层",
                machine_type=MachineType.STANDARD_WASHER,
                status=MachineStatus.RUNNING,
                remaining_minutes=9,
            ),
            MachineInfo(
                machine_id="dryer-idle",
                location="南区21号楼 六层",
                machine_type=MachineType.DRYER,
                status=MachineStatus.AVAILABLE,
            ),
            MachineInfo(
                machine_id="shoe-unknown",
                location="南区21号楼 三层",
                machine_type=MachineType.SHOE_WASHER,
                status=MachineStatus.UNKNOWN,
            ),
        ]
        client = FakeMachineClient(machines)
        with tempfile.TemporaryDirectory() as tmp_dir:
            context = build_campus_context(
                client,
                {"tower_key": "nq21", "tower_provider": "cleverschool"},
                machine_rules_path=_write_rules(tmp_dir),
            )

        self.assertEqual(
            context.queue_estimates,
            [
                MachineQueueEstimate(
                    machine_type=MachineType.STANDARD_WASHER,
                    total_count=2,
                    available_count=0,
                    running_count=2,
                    out_of_service_count=0,
                    unknown_count=0,
                    estimated_wait_minutes=9,
                ),
                MachineQueueEstimate(
                    machine_type=MachineType.DRYER,
                    total_count=1,
                    available_count=1,
                    running_count=0,
                    out_of_service_count=0,
                    unknown_count=0,
                    estimated_wait_minutes=0,
                ),
                MachineQueueEstimate(
                    machine_type=MachineType.SHOE_WASHER,
                    total_count=1,
                    available_count=0,
                    running_count=0,
                    out_of_service_count=0,
                    unknown_count=1,
                    estimated_wait_minutes=None,
                ),
            ],
        )

    def test_build_campus_context_requires_provider_with_direct_tower_key(self) -> None:
        client = FakeMachineClient([])

        with self.assertRaisesRegex(ValueError, "tower_provider"):
            build_campus_context(client, {"tower_key": "nq21"})

    def test_build_campus_context_requires_tower_key(self) -> None:
        client = FakeMachineClient([])

        with self.assertRaisesRegex(ValueError, "tower_key"):
            build_campus_context(client, {})

    def test_build_campus_context_rejects_non_object_weather(self) -> None:
        client = FakeMachineClient([])

        with self.assertRaisesRegex(ValueError, "weather"):
            build_campus_context(
                client,
                {
                    "tower_key": "ncrkiz1",
                    "tower_provider": "cleverschool",
                    "weather": "rainy",
                },
            )


if __name__ == "__main__":
    unittest.main()
