"""Laundry decision and bucket planning implementation."""

from __future__ import annotations

import math

from backend.shared.models import (
    CampusContext,
    DryMethod,
    LaundryBucket,
    LaundryChargeLine,
    LaundryConstraints,
    LaundryPlan,
    MachineInfo,
    MachineStatus,
    MachineType,
    RiskLevel,
    WardrobeItem,
    WashMethod,
)
from backend.shared.utils import contains_any, dedupe


_DARK_COLOR_TERMS = {"black", "dark", "navy", "indigo", "深色", "黑", "藏青", "靛蓝"}
_LIGHT_COLOR_TERMS = {"white", "light", "gray", "grey", "浅色", "白", "灰"}
_BEDDING_TERMS = {"bedding", "sheet", "duvet", "床单", "被套", "床品"}
_WOOL_TERMS = {"wool", "羊毛", "cashmere", "羊绒"}
_HAND_WASH_TERMS = {"hand_wash_only", "hand wash only", "只能手洗", "手洗"}
_DRY_CLEAN_TERMS = {"dry_clean_only", "dry clean only", "只能干洗", "干洗"}
_DO_NOT_WASH_TERMS = {"do_not_wash", "不可水洗", "不能水洗"}
_DO_NOT_DRY_TERMS = {"do_not_tumble_dry", "do_not_dry", "不可烘干", "不能烘干"}
_HIGH_DRY_RISK_KEYS = {"shrink", "deform", "dryer_damage"}
_HAND_WASH_DETERGENT_ML_PER_ITEM = 8.0
_STANDARD_DETERGENT_ML_BASE = 18.0
_STANDARD_DETERGENT_ML_PER_ITEM = 6.0
_LARGE_DETERGENT_ML_BASE = 32.0
_LARGE_DETERGENT_ML_PER_ITEM = 8.0
_STANDARD_BUCKET_IDS = {"dark-standard", "light-standard", "mixed-standard"}


def plan_laundry(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> LaundryPlan:
    """Create wash buckets, machine modes, drying advice, and risk warnings."""

    _validate_constraints(constraints)
    selected_items = _selected_items(items, constraints.selected_item_ids)
    _validate_urgent_items(constraints)
    bucket_inputs = _split_bucket_inputs(selected_items, constraints)
    buckets = [
        _build_bucket(bucket_id, bucket_items, constraints, campus_context)
        for bucket_id, bucket_items in bucket_inputs
    ]

    cost_breakdown = _cost_breakdown(buckets, campus_context)
    estimated_cost = _estimate_cost(cost_breakdown)
    estimated_duration = _estimate_duration(cost_breakdown)
    global_warnings = _global_warnings(buckets, constraints, estimated_cost, campus_context)

    return LaundryPlan(
        buckets=buckets,
        estimated_cost_yuan=estimated_cost,
        estimated_duration_minutes=estimated_duration,
        summary=f"本次共 {len(buckets)} 个洗护批次，已按颜色、材质、床品和高风险衣物分开处理。",
        cost_breakdown=cost_breakdown,
        global_warnings=global_warnings,
    )


def _validate_constraints(constraints: LaundryConstraints) -> None:
    _item_id_list(constraints.selected_item_ids, "selected_item_ids")
    _item_id_list(constraints.urgent_item_ids, "urgent_item_ids")
    _boolean(constraints.allow_mixed_colors, "allow_mixed_colors")
    _boolean(constraints.allow_dryer, "allow_dryer")
    _boolean(constraints.hygiene_sensitive, "hygiene_sensitive")


def _item_id_list(value: object, field_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    return value


def _boolean(value: object, field_name: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{field_name} must be a boolean")
    return value


def _selected_items(items: list[WardrobeItem], selected_item_ids: list[str]) -> list[WardrobeItem]:
    if not selected_item_ids:
        raise ValueError("selected_item_ids is required for laundry planning")
    items_by_id = {item.profile.item_id: item for item in items}
    missing = [item_id for item_id in selected_item_ids if item_id not in items_by_id]
    if missing:
        raise ValueError(f"selected item ids not found: {', '.join(missing)}")
    return [items_by_id[item_id] for item_id in selected_item_ids]


def _validate_urgent_items(constraints: LaundryConstraints) -> None:
    missing = [item_id for item_id in constraints.urgent_item_ids if item_id not in constraints.selected_item_ids]
    if missing:
        raise ValueError(f"urgent item ids must be selected for laundry planning: {', '.join(missing)}")


def _split_bucket_inputs(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
) -> list[tuple[str, list[WardrobeItem]]]:
    groups: dict[str, list[WardrobeItem]] = {}
    for item in items:
        bucket_id = _bucket_id_for(item, constraints)
        groups.setdefault(bucket_id, []).append(item)

    order = [
        "do-not-wash",
        "dry-clean",
        "hand-wash",
        "large-bedding",
        "dark-standard",
        "light-standard",
        "mixed-standard",
    ]
    return [(bucket_id, groups[bucket_id]) for bucket_id in order if bucket_id in groups]


def _bucket_id_for(item: WardrobeItem, constraints: LaundryConstraints) -> str:
    search_text = _search_text(item)
    if item.preferred_method == WashMethod.DO_NOT_WASH or contains_any(search_text, _DO_NOT_WASH_TERMS):
        return "do-not-wash"
    if item.preferred_method == WashMethod.DRY_CLEAN or contains_any(search_text, _DRY_CLEAN_TERMS):
        return "dry-clean"
    if (
        item.preferred_method == WashMethod.HAND_WASH
        or contains_any(search_text, _HAND_WASH_TERMS)
        or _has_material(item, _WOOL_TERMS)
        or _has_high_risk(item, {"shrink", "deform"})
    ):
        return "hand-wash"
    if contains_any(search_text, _BEDDING_TERMS):
        return "large-bedding"
    if contains_any(search_text, _DARK_COLOR_TERMS) or _has_high_risk(item, {"color_bleed"}):
        if constraints.allow_mixed_colors and not _has_high_risk(item, {"color_bleed"}):
            return "mixed-standard"
        return "dark-standard"
    if contains_any(search_text, _LIGHT_COLOR_TERMS):
        return "mixed-standard" if constraints.allow_mixed_colors else "light-standard"
    raise ValueError(f"cannot assign laundry bucket from item data: {item.profile.item_id}")


def _build_bucket(
    bucket_id: str,
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> LaundryBucket:
    if bucket_id == "do-not-wash":
        return LaundryBucket(
            bucket_id=bucket_id,
            item_ids=_item_ids(items),
            wash_method=WashMethod.DO_NOT_WASH,
            dry_method=DryMethod.DO_NOT_DRY,
            estimated_cost_yuan=0.0,
            estimated_duration_minutes=0,
            warnings=["该批次含不可水洗衣物，不进入本次水洗流程。"],
        )
    if bucket_id == "dry-clean":
        return LaundryBucket(
            bucket_id=bucket_id,
            item_ids=_item_ids(items),
            wash_method=WashMethod.DRY_CLEAN,
            dry_method=DryMethod.DO_NOT_DRY,
            estimated_cost_yuan=0.0,
            estimated_duration_minutes=0,
            warnings=["该批次建议送专业干洗，不进入共享洗衣机。"],
        )
    if bucket_id == "hand-wash":
        return LaundryBucket(
            bucket_id=bucket_id,
            item_ids=_item_ids(items),
            wash_method=WashMethod.HAND_WASH,
            detergent_ml=_detergent_ml(bucket_id, items),
            use_laundry_bag=True,
            dry_method=DryMethod.AIR_DRY,
            estimated_cost_yuan=0.0,
            estimated_duration_minutes=0,
            warnings=_hand_wash_warnings(items, campus_context),
        )

    program = "large" if bucket_id == "large-bedding" else "standard"
    machine_type = MachineType.STANDARD_WASHER
    machine = _require_available_machine(campus_context.available_machines, machine_type, program)
    _require_wash_program(campus_context, program)

    dry_method, dryer, dry_warnings = _drying_decision(items, constraints, campus_context)
    wash_cost = _wash_program_value(campus_context, program, "price_yuan")
    wash_duration = int(_wash_program_value(campus_context, program, "duration_minutes"))
    dryer_cost = _dryer_program_value(campus_context, "low", "price_yuan") if dryer is not None else 0.0
    dryer_duration = int(_dryer_program_value(campus_context, "low", "duration_minutes")) if dryer is not None else 0
    warnings = (
        _machine_bucket_warnings(bucket_id, items)
        + [_machine_recommendation_warning(machine, program)]
        + dry_warnings
    )

    return LaundryBucket(
        bucket_id=bucket_id,
        item_ids=_item_ids(items),
        wash_method=WashMethod.MACHINE_WASH,
        machine_type=machine_type,
        machine_id=machine.machine_id,
        machine_location=machine.location,
        program=program,
        detergent_ml=_detergent_ml(bucket_id, items),
        use_laundry_bag=(
            bucket_id == "dark-standard"
            or constraints.hygiene_sensitive
            or _any_recommends_bag(items)
        ),
        dry_method=dry_method,
        dryer_machine_id=dryer.machine_id if dryer is not None else "",
        dryer_machine_location=dryer.location if dryer is not None else "",
        estimated_cost_yuan=round(wash_cost + dryer_cost, 2),
        estimated_duration_minutes=wash_duration + dryer_duration,
        warnings=warnings,
    )


def _drying_decision(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> tuple[DryMethod, MachineInfo | None, list[str]]:
    if not constraints.allow_dryer:
        return DryMethod.AIR_DRY, None, ["用户未允许烘干，本批次自然晾干。"] + _air_dry_context_warnings(campus_context)
    unsafe = [item.profile.name for item in items if _dryer_unsafe(item)]
    if unsafe:
        return DryMethod.AIR_DRY, None, [
            f"{'、'.join(unsafe)} 不可烘干或存在高温损伤风险，改为自然晾干。"
        ] + _air_dry_context_warnings(campus_context)
    dryer = _require_available_machine(campus_context.available_machines, MachineType.DRYER, "low")
    _require_dryer_program(campus_context, "low")
    return DryMethod.LOW_HEAT_DRYER, dryer, [_machine_recommendation_warning(dryer, "low")]


def _cost_breakdown(
    buckets: list[LaundryBucket],
    campus_context: CampusContext,
) -> list[LaundryChargeLine]:
    lines: list[LaundryChargeLine] = []
    for bucket in buckets:
        if bucket.wash_method == WashMethod.MACHINE_WASH:
            lines.append(
                LaundryChargeLine(
                    bucket_id=bucket.bucket_id,
                    label=f"{bucket.bucket_id} {bucket.program} 洗",
                    amount_yuan=round(_wash_program_value(campus_context, bucket.program, "price_yuan"), 2),
                    duration_minutes=int(_wash_program_value(campus_context, bucket.program, "duration_minutes")),
                    machine_id=bucket.machine_id,
                    machine_type=bucket.machine_type,
                    program=bucket.program,
                )
            )
        if bucket.dry_method == DryMethod.LOW_HEAT_DRYER:
            lines.append(
                LaundryChargeLine(
                    bucket_id=bucket.bucket_id,
                    label=f"{bucket.bucket_id} 低温烘干",
                    amount_yuan=round(_dryer_program_value(campus_context, "low", "price_yuan"), 2),
                    duration_minutes=int(_dryer_program_value(campus_context, "low", "duration_minutes")),
                    machine_id=bucket.dryer_machine_id,
                    machine_type=MachineType.DRYER,
                    program="low",
                )
            )
    return lines


def _estimate_cost(cost_breakdown: list[LaundryChargeLine]) -> float:
    total = 0.0
    for line in cost_breakdown:
        total += line.amount_yuan
    return round(total, 2)


def _estimate_duration(cost_breakdown: list[LaundryChargeLine]) -> int:
    return sum(line.duration_minutes for line in cost_breakdown)


def _global_warnings(
    buckets: list[LaundryBucket],
    constraints: LaundryConstraints,
    estimated_cost: float,
    campus_context: CampusContext,
) -> list[str]:
    warnings: list[str] = []
    if constraints.budget_yuan is not None and estimated_cost > constraints.budget_yuan:
        warnings.append(f"预计费用 {estimated_cost} 元超过预算 {constraints.budget_yuan} 元。")
        warnings.append("若需压低费用，可推迟非急用标准洗批次，并优先保留手洗、自然晾干和高卫生需求衣物。")
    warnings.extend(_wait_constraint_warnings(buckets, constraints, campus_context))
    for bucket in buckets:
        warnings.extend(bucket.warnings)
    return dedupe(warnings)


def _wait_constraint_warnings(
    buckets: list[LaundryBucket],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> list[str]:
    if constraints.max_wait_minutes is None:
        return []
    queue_by_type = {estimate.machine_type: estimate for estimate in campus_context.queue_estimates}
    warnings: list[str] = []
    for machine_type in _required_machine_types(buckets):
        estimate = queue_by_type.get(machine_type)
        if estimate is None:
            warnings.append(f"缺少 {machine_type.value} 等待时间估算，无法确认是否满足最大等待 {constraints.max_wait_minutes} 分钟。")
            continue
        wait_minutes = estimate.estimated_wait_minutes
        if wait_minutes is None:
            warnings.append(f"{machine_type.value} 等待时间未知，无法确认是否满足最大等待 {constraints.max_wait_minutes} 分钟。")
            continue
        if wait_minutes > constraints.max_wait_minutes:
            warnings.append(f"{machine_type.value} 预计等待 {wait_minutes} 分钟超过最大等待 {constraints.max_wait_minutes} 分钟。")
    return warnings


def _required_machine_types(buckets: list[LaundryBucket]) -> list[MachineType]:
    machine_types: list[MachineType] = []
    for bucket in buckets:
        if bucket.wash_method != WashMethod.MACHINE_WASH or bucket.machine_type is None:
            continue
        machine_types.append(bucket.machine_type)
        if bucket.dry_method == DryMethod.LOW_HEAT_DRYER:
            machine_types.append(MachineType.DRYER)
    return list(dict.fromkeys(machine_types))


def _require_available_machine(machines: list[MachineInfo], machine_type: MachineType, program: str) -> MachineInfo:
    for machine in machines:
        if machine.machine_type != machine_type or machine.status != MachineStatus.AVAILABLE:
            continue
        if not machine.modes or program not in machine.modes:
            continue
        return machine
    raise ValueError(f"no available machine for {machine_type.value} program {program}")


def _require_wash_program(campus_context: CampusContext, program: str) -> None:
    _wash_program_value(campus_context, program, "price_yuan")
    _wash_program_value(campus_context, program, "duration_minutes")


def _require_dryer_program(campus_context: CampusContext, program: str) -> None:
    _dryer_program_value(campus_context, program, "price_yuan")
    _dryer_program_value(campus_context, program, "duration_minutes")


def _wash_program_value(campus_context: CampusContext, program: str, key: str) -> float:
    programs = campus_context.pricing_rules.get("wash_programs")
    if not isinstance(programs, dict) or program not in programs:
        raise ValueError(f"missing wash program pricing: {program}")
    program_rules = programs[program]
    if not isinstance(program_rules, dict) or key not in program_rules:
        raise ValueError(f"missing wash program {key}: {program}")
    return _number(program_rules[key], f"wash program {program} {key}")


def _dryer_program_value(campus_context: CampusContext, program: str, key: str) -> float:
    programs = campus_context.pricing_rules.get("dryer_programs")
    if not isinstance(programs, dict) or program not in programs:
        raise ValueError(f"missing dryer program pricing: {program}")
    program_rules = programs[program]
    if not isinstance(program_rules, dict) or key not in program_rules:
        raise ValueError(f"missing dryer program {key}: {program}")
    return _number(program_rules[key], f"dryer program {program} {key}")


def _number(value: object, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"{field_name} must be numeric")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field_name} must be finite")
    if number < 0:
        raise ValueError(f"{field_name} must be non-negative")
    return number


def _machine_bucket_warnings(bucket_id: str, items: list[WardrobeItem]) -> list[str]:
    warnings: list[str] = []
    if bucket_id == "dark-standard":
        warnings.append("深色或高掉色风险衣物已单独成桶，减少串色和返洗。")
    if bucket_id == "mixed-standard":
        warnings.append("用户允许混色，低掉色风险普通衣物合并成标准批次。")
    if bucket_id == "large-bedding":
        warnings.append("床品使用大件批次，避免普通筒过载导致洗不净。")
    for item in items:
        if _has_high_risk(item, {"color_bleed"}):
            warnings.append(f"{item.profile.name} 掉色风险高，避免与浅色衣物混洗。")
    return dedupe(warnings)


def _hand_wash_warnings(items: list[WardrobeItem], campus_context: CampusContext) -> list[str]:
    warnings = ["该批次不进入共享洗衣机，建议冷水轻柔手洗并自然晾干。"]
    for item in items:
        if contains_any(_search_text(item), _DO_NOT_DRY_TERMS) or _dryer_unsafe(item):
            warnings.append(f"{item.profile.name} 不可烘干或高温风险较高。")
    warnings.extend(_air_dry_context_warnings(campus_context))
    return dedupe(warnings)


def _detergent_ml(bucket_id: str, items: list[WardrobeItem]) -> float | None:
    item_count = len(items)
    if bucket_id == "hand-wash":
        return round(item_count * _HAND_WASH_DETERGENT_ML_PER_ITEM, 1)
    if bucket_id == "large-bedding":
        return round(_LARGE_DETERGENT_ML_BASE + item_count * _LARGE_DETERGENT_ML_PER_ITEM, 1)
    if bucket_id in _STANDARD_BUCKET_IDS:
        return round(_STANDARD_DETERGENT_ML_BASE + item_count * _STANDARD_DETERGENT_ML_PER_ITEM, 1)
    return None


def _machine_recommendation_warning(machine: MachineInfo, program: str) -> str:
    return f"推荐使用 {machine.machine_id}，位置 {machine.location}，程序 {program}。"


def _air_dry_context_warnings(campus_context: CampusContext) -> list[str]:
    context = campus_context.drying_context
    warnings: list[str] = []
    if not context:
        return warnings
    if context.get("balcony_available") is False:
        warnings.append("当前晾晒条件显示无阳台，自然晾干批次需要预留更长时间或选择通风位置。")
    ventilation = str(context.get("ventilation") or "").strip().lower()
    if ventilation and ventilation not in {"normal", "good", "strong", "良好", "通风良好"}:
        warnings.append(f"当前通风条件为 {context['ventilation']}，自然晾干可能变慢。")
    return warnings


def _dryer_unsafe(item: WardrobeItem) -> bool:
    search_text = _search_text(item)
    return (
        contains_any(search_text, _DO_NOT_DRY_TERMS)
        or _has_material(item, _WOOL_TERMS)
        or _has_high_risk(item, _HIGH_DRY_RISK_KEYS)
    )


def _any_recommends_bag(items: list[WardrobeItem]) -> bool:
    return any("laundry_bag" in _search_text(item) or "洗衣袋" in _search_text(item) for item in items)


def _has_material(item: WardrobeItem, terms: set[str]) -> bool:
    materials = " ".join(item.profile.material_ratios.keys()).lower()
    return contains_any(materials, terms)


def _has_high_risk(item: WardrobeItem, keys: set[str]) -> bool:
    return any(item.profile.risks.get(key) == RiskLevel.HIGH for key in keys)


def _search_text(item: WardrobeItem) -> str:
    profile = item.profile
    return " ".join(
        [
            profile.name,
            profile.user_note,
            " ".join(profile.material_ratios.keys()),
            " ".join(profile.colors),
            " ".join(profile.care_warnings),
            " ".join(profile.care_recommendations),
            " ".join(profile.care_forbidden),
            " ".join(profile.source_notes),
            " ".join(item.user_notes),
        ]
    ).lower()


def _item_ids(items: list[WardrobeItem]) -> list[str]:
    return [item.profile.item_id for item in items]
