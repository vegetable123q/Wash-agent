"""Campus laundry machine status client and parsing boundary."""

from __future__ import annotations

import json
import math
import re
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any

from backend.shared.models import MachineInfo, MachineStatus, MachineTower, MachineType


_TOWER_URL = "https://api.cleverschool.cn/washapi4/device/tower"
_STATUS_URL = "https://api.cleverschool.cn/washapi4/device/status"
_HAIER_POSITION_URL = "https://yshz-user.haier-ioc.com/position/nearPosition"
_HAIER_DETAIL_URL = "https://yshz-user.haier-ioc.com/position/deviceDetailPage"
_TSINGHUA_LOCATION = {"lng": 116.32697, "lat": 40.00281}
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 "
        "MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
    ),
    "Referer": "https://servicewechat.com/wx8034ff6b2ab33a9e/28/page-frame.html",
    "Content-Type": "application/json",
}

Transport = Callable[[str, dict[str, Any]], dict[str, Any]]


class LaundryMachineClient:
    """Client boundary for supported campus laundry machine services."""

    def __init__(
        self,
        mock_path: Path | str | None = None,
        *,
        machine_rules_path: Path | str = "config/machine_rules.json",
        transport: Transport | None = None,
        tower_url: str = _TOWER_URL,
        status_url: str = _STATUS_URL,
        haier_position_url: str = _HAIER_POSITION_URL,
        haier_detail_url: str = _HAIER_DETAIL_URL,
        timeout_seconds: float = 20.0,
    ) -> None:
        self.mock_path = Path(mock_path) if mock_path is not None else None
        self.machine_rules_path = Path(machine_rules_path)
        self.transport = transport
        self.tower_url = tower_url
        self.status_url = status_url
        self.haier_position_url = haier_position_url
        self.haier_detail_url = haier_detail_url
        self.timeout_seconds = _validate_timeout_seconds(timeout_seconds)

    def list_towers(self) -> list[MachineTower]:
        """Return dormitory/tower choices from all supported machine services."""
        return _merge_towers(
            [*self.list_cleverschool_towers(), *self.list_haier_towers()]
        )

    def list_cleverschool_towers(self) -> list[MachineTower]:
        """Return dormitory/tower choices from the CleverSchool service."""
        response = self._post(self.tower_url, {})
        towers: list[MachineTower] = []
        for index, item in enumerate(_response_data(response, "tower")):
            if not isinstance(item, dict):
                raise ValueError(f"Invalid tower item at index {index}: expected object")
            name = _required_text(item, "text", f"tower[{index}]")
            tower_key = _required_text(item, "value", f"tower[{index}]")
            if tower_key == "0":
                continue
            towers.append(
                MachineTower(
                    name=_canonical_tower_name(name),
                    tower_key=tower_key,
                    provider="cleverschool",
                    provider_keys={"cleverschool": tower_key},
                )
            )
        return towers

    def list_haier_towers(self) -> list[MachineTower]:
        """Return Tsinghua positions from the HaiLe Life service."""
        response = self._post(
            self.haier_position_url,
            {**_TSINGHUA_LOCATION, "page": 1, "pageSize": 100},
        )
        towers: list[MachineTower] = []
        for index, item in enumerate(_haier_items(response, "nearPosition")):
            if not isinstance(item, dict):
                raise ValueError(f"Invalid HaiLe position at index {index}: expected object")
            name = _required_text(item, "name", f"haier_position[{index}]")
            if "清华" not in name:
                continue
            towers.append(
                MachineTower(
                    name=_canonical_tower_name(name),
                    tower_key=_required_identifier(
                        item,
                        "id",
                        f"haier_position[{index}]",
                    ),
                    provider="haier",
                    provider_keys={
                        "haier": _required_identifier(
                            item,
                            "id",
                            f"haier_position[{index}]",
                        )
                    },
                )
            )
        return towers

    def list_machines(
        self,
        tower_key: str | None = None,
        *,
        provider: str | None = None,
        tower_name: str = "",
    ) -> list[MachineInfo]:
        """Return normalized machine statuses for one dormitory/tower."""
        if tower_key is None:
            if self.mock_path is None:
                raise ValueError("tower_key is required to list machines")
            return _list_mock_machines(self.mock_path)
        normalized_tower_key = str(tower_key or "").strip()
        if not normalized_tower_key:
            raise ValueError("tower_key is required to list machines")
        normalized_provider = _normalize_provider(provider)
        if normalized_provider == "haier":
            return self._list_haier_machines(
                normalized_tower_key,
                str(tower_name or "").strip(),
            )
        return self._list_cleverschool_machines(normalized_tower_key)

    def _list_cleverschool_machines(self, tower_key: str) -> list[MachineInfo]:
        response = self._post(
            self.status_url,
            {"towerKey": tower_key, "deviceType": ""},
        )
        rules = _read_machine_rules(self.machine_rules_path)
        machines: list[MachineInfo] = []
        for index, item in enumerate(_response_data(response, "status")):
            if not isinstance(item, dict):
                raise ValueError(f"Invalid machine item at index {index}: expected object")
            machines.append(_machine_info_from_payload(item, rules, index))
        return machines

    def _list_haier_machines(self, position_id: str, tower_name: str) -> list[MachineInfo]:
        machines: list[MachineInfo] = []
        for category_code in ("00", "01", "02"):
            response = self._post(
                self.haier_detail_url,
                {
                    "positionId": position_id,
                    "categoryCode": category_code,
                    "page": 1,
                    "floorCode": "",
                    "pageSize": 100,
                },
            )
            for index, item in enumerate(_haier_items(response, "deviceDetailPage")):
                if not isinstance(item, dict):
                    raise ValueError(
                        f"Invalid HaiLe machine at index {index}: expected object"
                    )
                machines.append(
                    _machine_info_from_haier_payload(
                        item,
                        category_code,
                        tower_name,
                        index,
                    )
                )
        return machines

    def get_machine(
        self,
        tower_key: str,
        machine_id: str | None = None,
        *,
        provider: str | None = None,
        tower_name: str = "",
    ) -> MachineInfo | None:
        """Return one machine by id."""
        if machine_id is None:
            if self.mock_path is None:
                raise ValueError("machine_id is required to get a machine")
            normalized_machine_id = str(tower_key or "").strip()
            if not normalized_machine_id:
                raise ValueError("machine_id is required to get a machine")
            for machine in self.list_machines():
                if machine.machine_id == normalized_machine_id:
                    return machine
            return None
        normalized_machine_id = str(machine_id or "").strip()
        if not normalized_machine_id:
            raise ValueError("machine_id is required to get a machine")
        for machine in self.list_machines(
            tower_key,
            provider=provider,
            tower_name=tower_name,
        ):
            if machine.machine_id == normalized_machine_id:
                return machine
        return None

    def _post(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        if self.transport is not None:
            return self.transport(url, payload)
        return _post_json(url, payload, self.timeout_seconds)


def mock_transport_from_file(path: Path | str = "data/machines_mock.json") -> Transport:
    """Return a transport backed by the checked-in machine mock contract."""
    mock_path = Path(path)
    if not mock_path.is_file():
        raise FileNotFoundError(f"Missing machines mock file: {mock_path}")
    try:
        mock_data = json.loads(mock_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in machines mock file {mock_path}: {exc}") from exc
    if not isinstance(mock_data, dict):
        raise ValueError(f"Machines mock root must be an object: {mock_path}")

    def transport(url: str, payload: dict[str, Any]) -> dict[str, Any]:
        if url.endswith("/device/tower"):
            return _required_mock_object(mock_data, "tower_response")
        if url.endswith("/device/status"):
            tower_key = _required_payload_text(payload, "towerKey", url)
            responses = _required_mock_object(mock_data, "status_responses")
            return _required_mock_object(responses, tower_key)
        if url.endswith("/position/nearPosition"):
            return _required_mock_object(mock_data, "haier_position_response")
        if url.endswith("/position/deviceDetailPage"):
            position_id = _required_payload_text(payload, "positionId", url)
            category_code = _required_payload_text(payload, "categoryCode", url)
            responses = _required_mock_object(mock_data, "haier_detail_responses")
            position_responses = _required_mock_object(responses, position_id)
            return _required_mock_object(position_responses, category_code)
        raise ValueError(f"Unexpected machine mock URL: {url}")

    return transport


def _post_json(
    url: str,
    payload: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=_HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_text = response.read().decode("utf-8")
    except (OSError, urllib.error.URLError) as exc:
        raise RuntimeError(f"Laundry machine request failed for {url}: {exc}") from exc
    try:
        decoded = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Laundry machine service returned invalid JSON for {url}: {exc}"
        ) from exc
    if not isinstance(decoded, dict):
        raise ValueError(f"Laundry machine service JSON root must be an object for {url}")
    return decoded


def _response_data(response: dict[str, Any], endpoint_name: str) -> list[Any]:
    if not isinstance(response, dict):
        raise ValueError(f"CleverSchool {endpoint_name} response must be an object")
    if response.get("success") is not True:
        raise ValueError(f"CleverSchool {endpoint_name} response was not successful")
    data = response.get("data")
    if not isinstance(data, list):
        raise ValueError(f"CleverSchool {endpoint_name} response data must be a list")
    return data


def _haier_items(response: dict[str, Any], endpoint_name: str) -> list[Any]:
    if not isinstance(response, dict):
        raise ValueError(f"HaiLe {endpoint_name} response must be an object")
    if response.get("code") != 0:
        raise ValueError(f"HaiLe {endpoint_name} response was not successful")
    data = response.get("data")
    if not isinstance(data, dict):
        raise ValueError(f"HaiLe {endpoint_name} response data must be an object")
    items = data.get("items")
    if not isinstance(items, list):
        raise ValueError(f"HaiLe {endpoint_name} response data.items must be a list")
    return items


def _required_text(item: dict[str, Any], key: str, context: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing required {context}.{key}")
    return value.strip()


def _required_identifier(item: dict[str, Any], key: str, context: str) -> str:
    value = item.get(key)
    if isinstance(value, bool):
        raise ValueError(f"Missing required {context}.{key}")
    if isinstance(value, (str, int)) and str(value).strip():
        return str(value).strip()
    raise ValueError(f"Missing required {context}.{key}")


def _validate_timeout_seconds(timeout_seconds: object) -> float:
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int | float):
        raise ValueError("timeout_seconds must be a positive finite number")
    timeout = float(timeout_seconds)
    if timeout <= 0 or not math.isfinite(timeout):
        raise ValueError("timeout_seconds must be a positive finite number")
    return timeout


def _required_payload_text(
    payload: dict[str, Any],
    key: str,
    url: str,
) -> str:
    value = payload.get(key)
    if isinstance(value, (str, int)) and str(value).strip():
        return str(value).strip()
    raise ValueError(f"Missing required payload.{key} for {url}")


def _required_mock_object(data: dict[str, Any], key: str) -> dict[str, Any]:
    value = data.get(key)
    if not isinstance(value, dict):
        raise ValueError(f"Missing mock object: {key}")
    return value


def _required_mock_text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"machine {key} must be a non-empty string")
    return value.strip()


def _mock_string_list(value: object, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"machine {field_name} must be a list")
    result: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(
                f"machine {field_name} entries must be non-empty strings"
            )
        result.append(item.strip())
    return result


def _list_mock_machines(path: Path) -> list[MachineInfo]:
    if not path.is_file():
        raise FileNotFoundError(f"machine data file not found: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in machine data file {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ValueError("machine data must be a JSON object")
    machines = payload.get("machines")
    if not isinstance(machines, list):
        raise ValueError("machine data field 'machines' must be a list")
    return [_machine_from_mock_dict(machine) for machine in machines]


def _machine_from_mock_dict(data: object) -> MachineInfo:
    if not isinstance(data, dict):
        raise ValueError("each machine record must be an object")

    allowed = {
        "machine_id",
        "location",
        "machine_type",
        "status",
        "machine_floor",
        "remaining_minutes",
        "price_yuan",
        "modes",
        "provider",
    }
    unknown = set(data) - allowed
    if unknown:
        raise ValueError(f"unknown machine fields: {', '.join(sorted(unknown))}")

    required = {"machine_id", "location", "machine_type", "status"}
    missing = required - set(data)
    if missing:
        raise ValueError(f"missing required machine fields: {', '.join(sorted(missing))}")

    modes = _mock_string_list(data.get("modes", []), "modes")

    return MachineInfo(
        machine_id=_required_mock_text(data, "machine_id"),
        location=_required_mock_text(data, "location"),
        machine_type=_machine_type_from_value(data["machine_type"]),
        status=_machine_status_from_value(data["status"]),
        machine_floor=_optional_int(data.get("machine_floor"), "machine_floor"),
        remaining_minutes=_optional_int(data.get("remaining_minutes"), "remaining_minutes"),
        price_yuan=_optional_number(data.get("price_yuan"), "price_yuan"),
        modes=modes,
        provider=str(data.get("provider", "")).strip(),
    )


def _machine_type_from_value(value: object) -> MachineType:
    try:
        return MachineType(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid machine_type: {value}") from exc


def _machine_status_from_value(value: object) -> MachineStatus:
    try:
        return MachineStatus(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid machine status: {value}") from exc


def _optional_number(value: object, field_name: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"machine {field_name} must be numeric")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"machine {field_name} must be finite")
    if number < 0:
        raise ValueError(f"machine {field_name} must be non-negative")
    return number


def _optional_int(value: object, field_name: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"machine {field_name} must be an integer")
    if value < 0:
        raise ValueError(f"machine {field_name} must be non-negative")
    return value


def _merge_towers(towers: list[MachineTower]) -> list[MachineTower]:
    merged: dict[str, MachineTower] = {}
    order: list[str] = []
    for tower in towers:
        canonical_name = _canonical_tower_name(tower.name)
        lookup_key = _normalize_tower_lookup(canonical_name)
        keys = dict(tower.provider_keys or {tower.provider: tower.tower_key})
        if lookup_key not in merged:
            merged[lookup_key] = _tower_from_provider_keys(canonical_name, keys)
            order.append(lookup_key)
        else:
            provider_keys = dict(merged[lookup_key].provider_keys)
            provider_keys.update(keys)
            merged[lookup_key] = _tower_from_provider_keys(canonical_name, provider_keys)
    return [merged[key] for key in order]


def _tower_from_provider_keys(
    name: str,
    provider_keys: dict[str, str],
) -> MachineTower:
    primary_provider = "cleverschool" if "cleverschool" in provider_keys else next(
        iter(provider_keys)
    )
    provider = primary_provider if len(provider_keys) == 1 else "mixed"
    return MachineTower(
        name=name,
        tower_key=provider_keys[primary_provider],
        provider=provider,
        provider_keys=provider_keys,
    )


def _canonical_tower_name(name: str) -> str:
    canonical = "".join(str(name or "").split())
    if canonical.startswith("清华大学"):
        canonical = canonical.removeprefix("清华大学")
    match = re.fullmatch(r"(紫荆|南区)(\d+)", canonical)
    if match:
        return f"{match.group(1)}{match.group(2)}号楼"
    return canonical


def _normalize_tower_lookup(name: str) -> str:
    return _canonical_tower_name(name).lower()


def _read_machine_rules(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"Missing machine rules file: {path}")
    try:
        rules = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in machine rules file {path}: {exc}") from exc
    if not isinstance(rules, dict):
        raise ValueError(f"Machine rules root must be an object: {path}")
    return rules


def _machine_info_from_payload(
    item: dict[str, Any],
    rules: dict[str, Any],
    index: int,
) -> MachineInfo:
    label, machine_id = _parse_mac_union_code(
        _required_text(item, "macUnionCode", f"machine[{index}]")
    )
    tower = _required_text(item, "tower", f"machine[{index}]")
    floor = _required_text(item, "floorName", f"machine[{index}]")
    status_text = _required_text(item, "status", f"machine[{index}]")
    machine_type = _machine_type_for_label(label, rules)
    rule_details = _rule_details_for_type(machine_type, rules)

    return MachineInfo(
        machine_id=machine_id,
        location=f"{tower} {floor}",
        machine_type=machine_type,
        status=_machine_status(status_text),
        machine_floor=_parse_machine_floor(floor),
        remaining_minutes=_remaining_minutes(status_text),
        price_yuan=_optional_float(
            rule_details.get("default_price_yuan"),
            "default_price_yuan",
        ),
        modes=_string_list(rule_details.get("modes"), "modes"),
        provider="cleverschool",
    )


def _machine_info_from_haier_payload(
    item: dict[str, Any],
    category_code: str,
    tower_name: str,
    index: int,
) -> MachineInfo:
    machine_name = _required_text(item, "name", f"haier_machine[{index}]")
    location = f"{tower_name} {machine_name}" if tower_name else machine_name
    return MachineInfo(
        machine_id=_required_identifier(item, "id", f"haier_machine[{index}]"),
        location=location,
        machine_type=_haier_machine_type(category_code),
        status=_haier_machine_status(item.get("state")),
        machine_floor=_parse_machine_floor(machine_name),
        provider="haier",
    )


def _parse_machine_floor(value: str) -> int | None:
    digit_match = re.search(r"(?:^|[^\d])([1-9]|[12]\d|30)\s*层", value)
    if digit_match:
        return int(digit_match.group(1))
    chinese_match = re.search(r"([一二三四五六七八九十]{1,3})\s*层", value)
    if chinese_match is None:
        return None
    floor = _chinese_floor_number(chinese_match.group(1))
    if floor is None or floor < 1 or floor > 30:
        return None
    return floor


def _chinese_floor_number(value: str) -> int | None:
    digits = {
        "一": 1,
        "二": 2,
        "三": 3,
        "四": 4,
        "五": 5,
        "六": 6,
        "七": 7,
        "八": 8,
        "九": 9,
    }
    if value == "十":
        return 10
    if value.startswith("十"):
        return 10 + digits.get(value[1:], 0)
    if "十" in value:
        tens, _, ones = value.partition("十")
        if tens not in digits:
            return None
        return digits[tens] * 10 + (digits.get(ones, 0) if ones else 0)
    return digits.get(value)


def _parse_mac_union_code(value: str) -> tuple[str, str]:
    parts = value.split()
    if len(parts) < 2:
        raise ValueError(f"Invalid macUnionCode: {value}")
    return parts[0], parts[1]


def _normalize_provider(provider: str | None) -> str:
    normalized = str(provider or "").strip().lower()
    if not normalized:
        raise ValueError("provider is required to list machines")
    if normalized not in {"cleverschool", "haier"}:
        raise ValueError(f"Unsupported machine provider: {provider}")
    return normalized


def _haier_machine_type(category_code: str) -> MachineType:
    if category_code == "00":
        return MachineType.STANDARD_WASHER
    if category_code == "01":
        return MachineType.SHOE_WASHER
    if category_code == "02":
        return MachineType.DRYER
    return MachineType.UNKNOWN


def _haier_machine_status(state: Any) -> MachineStatus:
    if state == 1:
        return MachineStatus.AVAILABLE
    if state == 2:
        return MachineStatus.RUNNING
    if state == 3:
        return MachineStatus.OUT_OF_SERVICE
    return MachineStatus.UNKNOWN


def _machine_status(status_text: str) -> MachineStatus:
    if any(
        token in status_text
        for token in ("脱水", "开盖", "出错", "错误", "异常", "故障")
    ):
        return MachineStatus.OUT_OF_SERVICE
    if "待机" in status_text:
        return MachineStatus.AVAILABLE
    if "工作" in status_text or "运转" in status_text:
        return MachineStatus.RUNNING
    return MachineStatus.UNKNOWN


def _remaining_minutes(status_text: str) -> int | None:
    match = re.search(r"剩余时间[:：]\s*(\d+)\s*分钟", status_text)
    if not match:
        return None
    return int(match.group(1))


def _machine_type_for_label(label: str, rules: dict[str, Any]) -> MachineType:
    mapping = rules.get("machine_type_map", {})
    if mapping is None:
        mapping = {}
    if not isinstance(mapping, dict):
        raise ValueError("machine_rules.machine_type_map must be an object")
    mapped = mapping.get(label)
    if mapped is None:
        return MachineType.UNKNOWN
    try:
        return MachineType(str(mapped))
    except ValueError as exc:
        raise ValueError(f"Invalid machine type mapping for {label}: {mapped}") from exc


def _rule_details_for_type(
    machine_type: MachineType,
    rules: dict[str, Any],
) -> dict[str, Any]:
    if machine_type == MachineType.UNKNOWN:
        return {}
    washer_types = rules.get("washer_types", {})
    if washer_types is None:
        washer_types = {}
    if not isinstance(washer_types, dict):
        raise ValueError("machine_rules.washer_types must be an object")
    details = washer_types.get(machine_type.value, {})
    if details is None:
        return {}
    if not isinstance(details, dict):
        raise ValueError(f"machine_rules.washer_types.{machine_type.value} must be an object")
    return details


def _optional_float(value: Any, field_name: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError(f"machine_rules {field_name} must be numeric")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"machine_rules {field_name} must be numeric") from exc
    if not math.isfinite(number):
        raise ValueError(f"machine_rules {field_name} must be finite")
    if number < 0:
        raise ValueError(f"machine_rules {field_name} must be non-negative")
    return number


def _string_list(value: Any, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"machine_rules {field_name} must be a list")
    result: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(
                f"machine_rules {field_name} entries must be non-empty strings"
            )
        result.append(item.strip())
    return result
