"""Small local HTTP API for the mobile frontend."""

from __future__ import annotations

import argparse
import json
import re
from uuid import uuid4
from dataclasses import asdict, is_dataclass
from enum import Enum
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable

from backend.campus.context import build_campus_context
from backend.campus.machine_api import LaundryMachineClient
from backend.laundry.planner import plan_laundry
from backend.reports.generator import generate_report
from backend.shared.models import ClothingProfile, LaundryConstraints, RiskLevel, WardrobeItem, WashMethod
from backend.weather.current import fetch_tsinghua_weather
from backend.wardrobe.store import WardrobeStore


DEFAULT_SELECTED_ITEM_IDS = [
    "wm-white-tee-001",
    "wm-black-jeans-001",
    "wm-gray-wool-001",
    "wm-bedding-001",
]


def build_mobile_summary(
    root: Path | str | None = None,
    *,
    weather_provider: Callable[[], dict[str, Any]] | None = fetch_tsinghua_weather,
) -> dict[str, Any]:
    """Build one frontend-ready snapshot from the real backend modules."""

    repo_root = Path(root) if root is not None else Path(__file__).resolve().parents[2]
    wardrobe_path = repo_root / "data" / "wardrobe_sample.json"
    machines_path = repo_root / "data" / "machines_mock.json"
    machine_rules_path = repo_root / "config" / "machine_rules.json"

    items = WardrobeStore(wardrobe_path).list_items()
    weather = weather_provider() if weather_provider is not None else {}
    campus_context = build_campus_context(
        LaundryMachineClient(machines_path),
        {"machine_rules_path": str(machine_rules_path), "weather": weather},
    )
    constraints = LaundryConstraints(
        selected_item_ids=DEFAULT_SELECTED_ITEM_IDS,
        allow_dryer=False,
    )
    plan = plan_laundry(items, constraints, campus_context)
    report = generate_report(plan, items, campus_context)

    return {
        "source": "backend",
        "weather": weather,
        "wardrobe": {"items": [_wardrobe_item_summary(item) for item in items]},
        "campus_context": _to_jsonable(campus_context),
        "constraints": _to_jsonable(constraints),
        "plan": _to_jsonable(plan),
        "report": _to_jsonable(report),
    }


def add_wardrobe_item(
    payload: dict[str, Any],
    *,
    root: Path | str | None = None,
    wardrobe_path: Path | str | None = None,
) -> dict[str, Any]:
    """Persist one user-created wardrobe item from mobile input."""

    repo_root = Path(root) if root is not None else Path(__file__).resolve().parents[2]
    store_path = Path(wardrobe_path) if wardrobe_path is not None else repo_root / "data" / "wardrobe_sample.json"
    name = _required_text(payload, "name")
    material = _optional_text(payload, "material")
    colors = _split_user_list(_optional_text(payload, "colors"))
    note = _optional_text(payload, "note")
    image_filename = _optional_text(payload, "image_filename")
    user_notes = [text for text in [note, image_filename] if text]

    profile = ClothingProfile(
        item_id=str(payload.get("item_id") or f"wm-user-{uuid4().hex[:8]}"),
        name=name,
        user_note=note,
        material_ratios=_material_ratios(material),
        colors=colors,
        care_warnings=["用户备注提到缩水史"] if "缩水" in note else [],
        risks={"shrinkage": RiskLevel.MEDIUM} if "缩水" in note else {},
        confidence=0.72 if material or colors else 0.45,
        source_notes=[f"user uploaded file: {image_filename}"] if image_filename else [],
        field_sources={"name": "user", "material": "user", "colors": "user", "note": "user"},
        extraction_status="user_input",
    )
    item = WardrobeItem(
        profile=profile,
        preferred_method=WashMethod.MACHINE_WASH,
        user_notes=user_notes,
    )
    WardrobeStore(store_path).upsert_item(item)
    return {"status": "created", "item": _wardrobe_item_summary(item)}


def run_server(host: str = "127.0.0.1", port: int = 8000, root: Path | str | None = None) -> None:
    """Run the local development API server."""

    repo_root = Path(root) if root is not None else Path(__file__).resolve().parents[2]

    class MobileApiHandler(BaseHTTPRequestHandler):
        def do_OPTIONS(self) -> None:
            self._send_empty(HTTPStatus.NO_CONTENT)

        def do_GET(self) -> None:
            path = self.path.split("?", 1)[0]
            if path == "/api/mobile/summary":
                self._send_json(HTTPStatus.OK, build_mobile_summary(repo_root))
                return
            if path == "/api/wardrobe/items":
                items = WardrobeStore(repo_root / "data" / "wardrobe_sample.json").list_items()
                self._send_json(HTTPStatus.OK, {"items": [_wardrobe_item_summary(item) for item in items]})
                return
            if path == "/api/weather/current":
                self._send_json(HTTPStatus.OK, fetch_tsinghua_weather())
                return
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {"error": "not_found", "message": f"Unknown path: {self.path}"},
            )

        def do_POST(self) -> None:
            path = self.path.split("?", 1)[0]
            if path == "/api/wardrobe/items":
                try:
                    payload = self._read_json_body()
                    result = add_wardrobe_item(payload, root=repo_root)
                except ValueError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "bad_request", "message": str(exc)})
                    return
                self._send_json(HTTPStatus.CREATED, result)
                return
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {"error": "not_found", "message": f"Unknown path: {self.path}"},
            )

        def log_message(self, format: str, *args: object) -> None:
            return

        def _send_empty(self, status: HTTPStatus) -> None:
            self.send_response(status)
            self._send_cors_headers()
            self.end_headers()

        def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _read_json_body(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                raise ValueError("JSON body is required")
            raw = self.rfile.read(length)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON body: {exc}") from exc
            if not isinstance(payload, dict):
                raise ValueError("JSON body must be an object")
            return payload

        def _send_cors_headers(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

    server = ThreadingHTTPServer((host, port), MobileApiHandler)
    print(f"WashMate API listening on http://{host}:{port}/api/mobile/summary")
    server.serve_forever()


def _wardrobe_item_summary(item: WardrobeItem) -> dict[str, Any]:
    profile = item.profile
    return {
        "item_id": profile.item_id,
        "name": profile.name,
        "user_note": profile.user_note,
        "material_ratios": dict(profile.material_ratios),
        "colors": list(profile.colors),
        "care_warnings": list(profile.care_warnings),
        "care_recommendations": list(profile.care_recommendations),
        "risks": _to_jsonable(profile.risks),
        "confidence": profile.confidence,
        "wear_count_since_wash": item.wear_count_since_wash,
        "preferred_method": item.preferred_method.value,
        "wash_count": len(item.wash_history),
        "user_notes": list(item.user_notes),
    }


def _required_text(payload: dict[str, Any], key: str) -> str:
    value = _optional_text(payload, key)
    if not value:
        raise ValueError(f"{key} is required")
    return value


def _optional_text(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key, "")
    if value is None:
        return ""
    return str(value).strip()


def _split_user_list(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"[,，、\n]+", value) if part.strip()]


def _material_ratios(value: str) -> dict[str, float]:
    materials = _split_user_list(value)
    if not materials:
        return {}
    ratio = round(1 / len(materials), 4)
    return {material: ratio for material in materials}


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value):
        return {key: _to_jsonable(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _to_jsonable(item) for key, item in value.items()}
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the WashMate local mobile API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    args = parser.parse_args()
    run_server(args.host, args.port, args.root)


if __name__ == "__main__":
    main()
