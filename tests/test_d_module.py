from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from backend.campus.context import build_campus_context
from backend.campus.machine_api import LaundryMachineClient
from backend.shared.models import MachineStatus, MachineType


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


class DModuleTests(unittest.TestCase):
    def test_machine_client_loads_normalized_mock_machine_records(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            machine_path = Path(tmp_dir) / "machines.json"
            _write_json(
                machine_path,
                {
                    "machines": [
                        {
                            "machine_id": "washer-1",
                            "location": "Dorm A 1F",
                            "machine_type": "standard_washer",
                            "status": "available",
                            "capacity_kg": 7.0,
                            "remaining_minutes": None,
                            "price_yuan": 4.0,
                            "modes": ["standard", "gentle"],
                        }
                    ]
                },
            )

            client = LaundryMachineClient(machine_path)
            machines = client.list_machines()

        self.assertEqual(len(machines), 1)
        self.assertEqual(machines[0].machine_id, "washer-1")
        self.assertEqual(machines[0].machine_type, MachineType.STANDARD_WASHER)
        self.assertEqual(machines[0].status, MachineStatus.AVAILABLE)
        self.assertEqual(machines[0].modes, ["standard", "gentle"])

    def test_get_machine_returns_matching_machine_or_none(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            machine_path = Path(tmp_dir) / "machines.json"
            _write_json(
                machine_path,
                {
                    "machines": [
                        {
                            "machine_id": "dryer-1",
                            "location": "Dorm A 1F",
                            "machine_type": "dryer",
                            "status": "running",
                            "remaining_minutes": 12,
                            "modes": ["low"],
                        }
                    ]
                },
            )

            client = LaundryMachineClient(machine_path)

            self.assertEqual(client.get_machine("dryer-1").remaining_minutes, 12)
            self.assertIsNone(client.get_machine("missing"))

    def test_build_campus_context_combines_machines_rules_and_user_context(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)
            machine_path = tmp / "machines.json"
            rules_path = tmp / "machine_rules.json"
            _write_json(
                machine_path,
                {
                    "machines": [
                        {
                            "machine_id": "washer-1",
                            "location": "Dorm A 1F",
                            "machine_type": "standard_washer",
                            "status": "available",
                            "modes": ["standard"],
                        },
                        {
                            "machine_id": "dryer-1",
                            "location": "Dorm A 1F",
                            "machine_type": "dryer",
                            "status": "available",
                            "modes": ["low"],
                        },
                    ]
                },
            )
            _write_json(
                rules_path,
                {
                    "pricing_rules": {
                        "wash_programs": {
                            "standard": {"price_yuan": 4.0, "duration_minutes": 35}
                        },
                        "dryer_programs": {
                            "low": {"price_yuan": 2.0, "duration_minutes": 25}
                        },
                    },
                    "drying_context": {"balcony_available": True},
                },
            )

            context = build_campus_context(
                LaundryMachineClient(machine_path),
                {
                    "machine_rules_path": str(rules_path),
                    "weather": {"condition": "cloudy"},
                    "drying_context": {"humidity_percent": 58},
                },
            )

        self.assertEqual(len(context.available_machines), 2)
        self.assertEqual(
            context.pricing_rules["wash_programs"]["standard"]["price_yuan"],
            4.0,
        )
        self.assertEqual(context.weather, {"condition": "cloudy"})
        self.assertEqual(
            context.drying_context,
            {"balcony_available": True, "humidity_percent": 58},
        )

    def test_missing_or_invalid_machine_context_is_explicit_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)
            machine_path = tmp / "machines.json"
            rules_path = tmp / "machine_rules.json"
            _write_json(machine_path, {"machines": [{"machine_id": "broken"}]})
            _write_json(rules_path, {"pricing_rules": {}})

            with self.assertRaisesRegex(ValueError, "missing required machine fields"):
                LaundryMachineClient(machine_path).list_machines()

            _write_json(machine_path, {"machines": []})
            with self.assertRaisesRegex(ValueError, "machine_rules_path is required"):
                build_campus_context(LaundryMachineClient(machine_path), {})

            with self.assertRaisesRegex(ValueError, "pricing_rules"):
                build_campus_context(
                    LaundryMachineClient(machine_path),
                    {"machine_rules_path": str(tmp / "missing.json")},
                )


if __name__ == "__main__":
    unittest.main()
