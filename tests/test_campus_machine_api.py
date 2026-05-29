from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from typing import Any

from backend.campus.machine_api import LaundryMachineClient, mock_transport_from_file
from backend.shared.models import MachineStatus, MachineTower, MachineType


class FakeCleverSchoolTransport:
    def __init__(self, responses: dict[str, dict[str, Any]]) -> None:
        self.responses = responses
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def __call__(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((url, payload))
        if url.endswith("/device/tower"):
            return self.responses["tower"]
        if url.endswith("/device/status"):
            return self.responses["status"]
        if url.endswith("/position/nearPosition"):
            return self.responses["haier_positions"]
        if url.endswith("/position/deviceDetailPage"):
            return self.responses[f"haier_detail_{payload['categoryCode']}"]
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
                "dryer_modes": {},
                "pricing": {"currency": "CNY"},
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return rules_path


class CampusMachineApiTests(unittest.TestCase):
    def test_list_towers_returns_cleverschool_tower_contracts(self) -> None:
        transport = FakeCleverSchoolTransport(
            {
                "tower": {
                    "success": True,
                    "data": [
                        {"text": "请选择楼号", "value": "0"},
                        {"text": "南区21号楼", "value": "nq21"},
                        {"text": "南区26号楼东", "value": "nwhstuo"},
                        {"text": "紫荆1号楼", "value": "ncrkiz1"},
                    ],
                },
                "status": {"success": True, "data": []},
                "haier_positions": {
                    "code": 0,
                    "data": {
                        "items": [
                            {"name": "清华大学南区21号楼", "id": 43762},
                            {"name": "北京大学宿舍", "id": 99999},
                        ]
                    },
                },
            }
        )
        client = LaundryMachineClient(transport=transport)

        towers = client.list_towers()

        self.assertEqual(
            towers,
            [
                MachineTower(
                    name="南区21号楼",
                    tower_key="nq21",
                    provider="mixed",
                    provider_keys={
                        "cleverschool": "nq21",
                        "haier": "43762",
                    },
                ),
                MachineTower(
                    name="南区26号楼东",
                    tower_key="nwhstuo",
                    provider="cleverschool",
                    provider_keys={"cleverschool": "nwhstuo"},
                ),
                MachineTower(
                    name="紫荆1号楼",
                    tower_key="ncrkiz1",
                    provider="cleverschool",
                    provider_keys={"cleverschool": "ncrkiz1"},
                ),
            ],
        )
        self.assertEqual(transport.calls[0][1], {})
        self.assertEqual(
            transport.calls[1][1],
            {"lng": 116.32697, "lat": 40.00281, "page": 1, "pageSize": 100},
        )

    def test_list_machines_parses_haier_categories_and_statuses(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            rules_path = _write_rules(tmp_dir)
            transport = FakeCleverSchoolTransport(
                {
                    "tower": {"success": True, "data": []},
                    "status": {"success": True, "data": []},
                    "haier_positions": {"code": 0, "data": {"items": []}},
                    "haier_detail_00": {
                        "code": 0,
                        "data": {
                            "items": [
                                {
                                    "id": 85500827,
                                    "name": "紫荆19号楼1层1号",
                                    "state": 1,
                                }
                            ]
                        },
                    },
                    "haier_detail_01": {
                        "code": 0,
                        "data": {
                            "items": [
                                {
                                    "id": 85500828,
                                    "name": "紫荆19号楼1层洗鞋机",
                                    "state": 3,
                                }
                            ]
                        },
                    },
                    "haier_detail_02": {
                        "code": 0,
                        "data": {
                            "items": [
                                {
                                    "id": 85500829,
                                    "name": "紫荆19号楼1层烘干机",
                                    "state": 2,
                                }
                            ]
                        },
                    },
                }
            )
            client = LaundryMachineClient(
                transport=transport,
                machine_rules_path=rules_path,
            )

            machines = client.list_machines(
                "516",
                provider="haier",
                tower_name="清华大学紫荆19号楼",
            )

        self.assertEqual(
            [call[1]["categoryCode"] for call in transport.calls],
            ["00", "01", "02"],
        )
        self.assertEqual(len(machines), 3)
        self.assertEqual(machines[0].machine_id, "85500827")
        self.assertEqual(machines[0].location, "清华大学紫荆19号楼 紫荆19号楼1层1号")
        self.assertEqual(machines[0].machine_floor, 1)
        self.assertEqual(machines[0].machine_type, MachineType.STANDARD_WASHER)
        self.assertEqual(machines[0].status, MachineStatus.AVAILABLE)
        self.assertEqual(machines[1].machine_type, MachineType.SHOE_WASHER)
        self.assertEqual(machines[1].status, MachineStatus.OUT_OF_SERVICE)
        self.assertEqual(machines[2].machine_type, MachineType.DRYER)
        self.assertEqual(machines[2].status, MachineStatus.RUNNING)

    def test_list_machines_requires_explicit_provider(self) -> None:
        transport = FakeCleverSchoolTransport(
            {
                "tower": {"success": True, "data": []},
                "status": {"success": True, "data": []},
                "haier_positions": {"code": 0, "data": {"items": []}},
            }
        )
        client = LaundryMachineClient(transport=transport)

        with self.assertRaisesRegex(ValueError, "provider"):
            client.list_machines("nq21")

    def test_list_machines_parses_status_price_and_modes_without_capacity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            rules_path = _write_rules(tmp_dir)
            transport = FakeCleverSchoolTransport(
                {
                    "tower": {"success": True, "data": []},
                    "status": {
                        "success": True,
                        "data": [
                            {
                                "tower": "紫荆1号楼",
                                "towerKey": "ncrkiz1",
                                "macUnionCode": "洗衣机 he10000177",
                                "floorName": "一层",
                                "status": "状态:工作中 剩余时间:10分钟 更新时间:2026-05-28 13:26:28",
                            },
                            {
                                "tower": "紫荆1号楼",
                                "towerKey": "ncrkiz1",
                                "macUnionCode": "洗衣机 he10000125",
                                "floorName": "二层",
                                "status": "状态:待机中 更新时间:2026-05-28 13:23:08",
                            },
                        ],
                    },
                }
            )
            client = LaundryMachineClient(
                transport=transport,
                machine_rules_path=rules_path,
            )

            machines = client.list_machines("ncrkiz1", provider="cleverschool")

        self.assertEqual(transport.calls[-1][1], {"towerKey": "ncrkiz1", "deviceType": ""})
        self.assertEqual(len(machines), 2)
        self.assertEqual(machines[0].machine_id, "he10000177")
        self.assertEqual(machines[0].location, "紫荆1号楼 一层")
        self.assertEqual(machines[0].machine_floor, 1)
        self.assertEqual(machines[0].machine_type, MachineType.STANDARD_WASHER)
        self.assertEqual(machines[0].status, MachineStatus.RUNNING)
        self.assertEqual(machines[0].remaining_minutes, 10)
        self.assertFalse(hasattr(machines[0], "capacity_kg"))
        self.assertEqual(machines[0].price_yuan, 3.0)
        self.assertEqual(machines[0].modes, ["quick", "standard", "heavy"])
        self.assertEqual(machines[1].status, MachineStatus.AVAILABLE)
        self.assertEqual(machines[1].machine_floor, 2)
        self.assertIsNone(machines[1].remaining_minutes)

    def test_list_machines_maps_cleverschool_shoe_washer_and_dryer_labels(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            rules_path = _write_rules(tmp_dir)
            transport = FakeCleverSchoolTransport(
                {
                    "tower": {"success": True, "data": []},
                    "status": {
                        "success": True,
                        "data": [
                            {
                                "tower": "南区21号楼",
                                "towerKey": "nq21",
                                "macUnionCode": "洗鞋机 wm10003113",
                                "floorName": "三层",
                                "status": "状态:待机中 更新时间:2026-05-28 15:25:16",
                            },
                            {
                                "tower": "南区21号楼",
                                "towerKey": "nq21",
                                "macUnionCode": "烘干机 764255",
                                "floorName": "六层",
                                "status": "状态:故障 null 更新时间:2025-12-22 10:38:29",
                            },
                        ],
                    },
                }
            )
            client = LaundryMachineClient(
                transport=transport,
                machine_rules_path=rules_path,
            )

            machines = client.list_machines("nq21", provider="cleverschool")

        self.assertEqual(machines[0].machine_type, MachineType.SHOE_WASHER)
        self.assertEqual(machines[1].machine_type, MachineType.DRYER)
        self.assertEqual(machines[1].status, MachineStatus.OUT_OF_SERVICE)

    def test_list_machines_does_not_treat_non_idle_waiting_text_as_available(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            rules_path = _write_rules(tmp_dir)
            transport = FakeCleverSchoolTransport(
                {
                    "tower": {"success": True, "data": []},
                    "status": {
                        "success": True,
                        "data": [
                            {
                                "tower": "南区21号楼",
                                "towerKey": "nq21",
                                "macUnionCode": "洗衣机 clever-nq21-1",
                                "floorName": "一层",
                                "status": "状态:待维修 更新时间:2026-05-28 15:25:16",
                            },
                            {
                                "tower": "南区21号楼",
                                "towerKey": "nq21",
                                "macUnionCode": "洗衣机 clever-nq21-2",
                                "floorName": "二层",
                                "status": "状态:运转中 剩余时间:5分钟 更新时间:2026-05-28 15:25:16",
                            },
                        ],
                    },
                }
            )
            client = LaundryMachineClient(
                transport=transport,
                machine_rules_path=rules_path,
            )

            machines = client.list_machines("nq21", provider="cleverschool")

        self.assertEqual(machines[0].status, MachineStatus.UNKNOWN)
        self.assertEqual(machines[1].status, MachineStatus.RUNNING)

    def test_get_machine_returns_matching_machine_or_none(self) -> None:
        transport = FakeCleverSchoolTransport(
            {
                "tower": {"success": True, "data": []},
                "status": {
                    "success": True,
                    "data": [
                        {
                            "tower": "南区26号楼东",
                            "towerKey": "nwhstuo",
                            "macUnionCode": "洗衣机 457621",
                            "floorName": "二层",
                            "status": "状态:待机 更新时间:2026-05-28 13:18:14",
                        }
                    ],
                },
            }
        )
        client = LaundryMachineClient(transport=transport)

        self.assertEqual(
            client.get_machine(
                "nwhstuo",
                "457621",
                provider="cleverschool",
            ).machine_id,
            "457621",
        )
        self.assertIsNone(
            client.get_machine("nwhstuo", "missing", provider="cleverschool")
        )

    def test_invalid_machine_payload_raises_value_error(self) -> None:
        transport = FakeCleverSchoolTransport(
            {
                "tower": {"success": True, "data": []},
                "status": {
                    "success": True,
                    "data": [
                        {
                            "tower": "南区26号楼东",
                            "towerKey": "nwhstuo",
                            "floorName": "二层",
                            "status": "状态:待机 更新时间:2026-05-28 13:18:14",
                        }
                    ],
                },
            }
        )
        client = LaundryMachineClient(transport=transport)

        with self.assertRaisesRegex(ValueError, "macUnionCode"):
            client.list_machines("nwhstuo", provider="cleverschool")

    def test_mock_transport_from_file_reads_machines_mock_contract(self) -> None:
        client = LaundryMachineClient(
            transport=mock_transport_from_file("data/machines_mock.json")
        )

        towers = client.list_towers()
        nq21 = next(tower for tower in towers if tower.name == "南区21号楼")
        cleverschool_machines = client.list_machines(
            nq21.provider_keys["cleverschool"],
            provider="cleverschool",
        )
        haier_machines = client.list_machines(
            nq21.provider_keys["haier"],
            provider="haier",
            tower_name=nq21.name,
        )

        self.assertEqual(
            nq21.provider_keys,
            {"cleverschool": "nq21", "haier": "43762"},
        )
        self.assertEqual(cleverschool_machines[0].machine_type, MachineType.STANDARD_WASHER)
        self.assertEqual(haier_machines[0].machine_type, MachineType.STANDARD_WASHER)


if __name__ == "__main__":
    unittest.main()
