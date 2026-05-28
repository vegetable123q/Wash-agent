"""Laundry decision and bucket planning implementation."""

from __future__ import annotations

from backend.shared.models import (
    CampusContext,
    DryMethod,
    LaundryBucket,
    LaundryConstraints,
    LaundryPlan,
    MachineInfo,
    MachineStatus,
    MachineType,
    RiskLevel,
    WardrobeItem,
    WashMethod,
)


_DARK_COLOR_TERMS = {"black", "dark", "navy", "indigo", "深色", "黑", "藏青", "靛蓝"}
_LIGHT_COLOR_TERMS = {"white", "light", "gray", "grey", "浅色", "白", "灰"}
_BEDDING_TERMS = {"bedding", "sheet", "duvet", "床单", "被套", "床品"}
_WOOL_TERMS = {"wool", "羊毛", "cashmere", "羊绒"}
_HAND_WASH_TERMS = {"hand_wash_only", "hand wash only", "只能手洗", "手洗"}
_DRY_CLEAN_TERMS = {"dry_clean_only", "dry clean only", "只能干洗", "干洗"}
_DO_NOT_WASH_TERMS = {"do_not_wash", "不可水洗", "不能水洗"}
_DO_NOT_DRY_TERMS = {"do_not_tumble_dry", "do_not_dry", "不可烘干", "不能烘干"}
_HIGH_DRY_RISK_KEYS = {"shrink", "deform", "dryer_damage"}


def plan_laundry(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> LaundryPlan:
    """Create wash buckets, machine modes, drying advice, and risk warnings."""

    selected_items = _selected_items(items, constraints.selected_item_ids)
    bucket_inputs = _split_bucket_inputs(selected_items)
    buckets = [
        _build_bucket(bucket_id, bucket_items, constraints, campus_context)
        for bucket_id, bucket_items in bucket_inputs
    ]

    estimated_cost = _estimate_cost(buckets, campus_context)
    estimated_duration = _estimate_duration(buckets, campus_context)
    global_warnings = _global_warnings(buckets, constraints, estimated_cost)

    return LaundryPlan(
        buckets=buckets,
        estimated_cost_yuan=estimated_cost,
        estimated_duration_minutes=estimated_duration,
        summary=f"本次共 {len(buckets)} 个洗护批次，已按颜色、材质、床品和高风险衣物分开处理。",
        global_warnings=global_warnings,
    )


def _selected_items(items: list[WardrobeItem], selected_item_ids: list[str]) -> list[WardrobeItem]:
    if not selected_item_ids:
        raise ValueError("selected_item_ids is required for laundry planning")
    items_by_id = {item.profile.item_id: item for item in items}
    missing = [item_id for item_id in selected_item_ids if item_id not in items_by_id]
    if missing:
        raise ValueError(f"selected item ids not found: {', '.join(missing)}")
    return [items_by_id[item_id] for item_id in selected_item_ids]


def _split_bucket_inputs(items: list[WardrobeItem]) -> list[tuple[str, list[WardrobeItem]]]:
    groups: dict[str, list[WardrobeItem]] = {}
    for item in items:
        bucket_id = _bucket_id_for(item)
        groups.setdefault(bucket_id, []).append(item)

    order = ["do-not-wash", "dry-clean", "hand-wash", "large-bedding", "dark-standard", "light-standard"]
    return [(bucket_id, groups[bucket_id]) for bucket_id in order if bucket_id in groups]


def _bucket_id_for(item: WardrobeItem) -> str:
    search_text = _search_text(item)
    if item.preferred_method == WashMethod.DO_NOT_WASH or _contains_any(search_text, _DO_NOT_WASH_TERMS):
        return "do-not-wash"
    if item.preferred_method == WashMethod.DRY_CLEAN or _contains_any(search_text, _DRY_CLEAN_TERMS):
        return "dry-clean"
    if (
        item.preferred_method == WashMethod.HAND_WASH
        or _contains_any(search_text, _HAND_WASH_TERMS)
        or _has_material(item, _WOOL_TERMS)
        or _has_high_risk(item, {"shrink", "deform"})
    ):
        return "hand-wash"
    if _contains_any(search_text, _BEDDING_TERMS):
        return "large-bedding"
    if _contains_any(search_text, _DARK_COLOR_TERMS) or _has_high_risk(item, {"color_bleed"}):
        return "dark-standard"
    if _contains_any(search_text, _LIGHT_COLOR_TERMS):
        return "light-standard"
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
            warnings=["该批次含不可水洗衣物，不进入本次水洗流程。"],
        )
    if bucket_id == "dry-clean":
        return LaundryBucket(
            bucket_id=bucket_id,
            item_ids=_item_ids(items),
            wash_method=WashMethod.DRY_CLEAN,
            dry_method=DryMethod.DO_NOT_DRY,
            warnings=["该批次建议送专业干洗，不进入共享洗衣机。"],
        )
    if bucket_id == "hand-wash":
        return LaundryBucket(
            bucket_id=bucket_id,
            item_ids=_item_ids(items),
            wash_method=WashMethod.HAND_WASH,
            use_laundry_bag=True,
            dry_method=DryMethod.AIR_DRY,
            warnings=_hand_wash_warnings(items),
        )

    program = "large" if bucket_id == "large-bedding" else "standard"
    machine_type = MachineType.LARGE_WASHER if bucket_id == "large-bedding" else MachineType.STANDARD_WASHER
    _require_available_machine(campus_context.available_machines, machine_type, program)
    _require_wash_program(campus_context, program)

    dry_method, dry_warnings = _drying_decision(items, constraints, campus_context)
    warnings = _machine_bucket_warnings(bucket_id, items) + dry_warnings

    return LaundryBucket(
        bucket_id=bucket_id,
        item_ids=_item_ids(items),
        wash_method=WashMethod.MACHINE_WASH,
        machine_type=machine_type,
        program=program,
        use_laundry_bag=bucket_id == "dark-standard" or _any_recommends_bag(items),
        dry_method=dry_method,
        warnings=warnings,
    )


def _drying_decision(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> tuple[DryMethod, list[str]]:
    if not constraints.allow_dryer:
        return DryMethod.AIR_DRY, ["用户未允许烘干，本批次自然晾干。"]
    unsafe = [item.profile.name for item in items if _dryer_unsafe(item)]
    if unsafe:
        return DryMethod.AIR_DRY, [f"{'、'.join(unsafe)} 不可烘干或存在高温损伤风险，改为自然晾干。"]
    _require_available_machine(campus_context.available_machines, MachineType.DRYER, "low")
    _require_dryer_program(campus_context, "low")
    return DryMethod.LOW_HEAT_DRYER, []


def _estimate_cost(buckets: list[LaundryBucket], campus_context: CampusContext) -> float:
    total = 0.0
    for bucket in buckets:
        if bucket.wash_method == WashMethod.MACHINE_WASH:
            total += _wash_program_value(campus_context, bucket.program, "price_yuan")
        if bucket.dry_method == DryMethod.LOW_HEAT_DRYER:
            total += _dryer_program_value(campus_context, "low", "price_yuan")
    return round(total, 2)


def _estimate_duration(buckets: list[LaundryBucket], campus_context: CampusContext) -> int:
    total = 0
    for bucket in buckets:
        if bucket.wash_method == WashMethod.MACHINE_WASH:
            total += int(_wash_program_value(campus_context, bucket.program, "duration_minutes"))
        if bucket.dry_method == DryMethod.LOW_HEAT_DRYER:
            total += int(_dryer_program_value(campus_context, "low", "duration_minutes"))
    return total


def _global_warnings(
    buckets: list[LaundryBucket],
    constraints: LaundryConstraints,
    estimated_cost: float,
) -> list[str]:
    warnings: list[str] = []
    if constraints.budget_yuan is not None and estimated_cost > constraints.budget_yuan:
        warnings.append(f"预计费用 {estimated_cost} 元超过预算 {constraints.budget_yuan} 元。")
    for bucket in buckets:
        warnings.extend(bucket.warnings)
    return _dedupe(warnings)


def _require_available_machine(machines: list[MachineInfo], machine_type: MachineType, program: str) -> None:
    for machine in machines:
        if machine.machine_type != machine_type or machine.status != MachineStatus.AVAILABLE:
            continue
        if not machine.modes or program not in machine.modes:
            continue
        return
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
    if not isinstance(value, int | float):
        raise ValueError(f"{field_name} must be numeric")
    return float(value)


def _machine_bucket_warnings(bucket_id: str, items: list[WardrobeItem]) -> list[str]:
    warnings: list[str] = []
    if bucket_id == "dark-standard":
        warnings.append("深色或高掉色风险衣物已单独成桶，减少串色和返洗。")
    if bucket_id == "large-bedding":
        warnings.append("床品使用大件批次，避免普通筒过载导致洗不净。")
    for item in items:
        if _has_high_risk(item, {"color_bleed"}):
            warnings.append(f"{item.profile.name} 掉色风险高，避免与浅色衣物混洗。")
    return _dedupe(warnings)


def _hand_wash_warnings(items: list[WardrobeItem]) -> list[str]:
    warnings = ["该批次不进入共享洗衣机，建议冷水轻柔手洗并自然晾干。"]
    for item in items:
        if _contains_any(_search_text(item), _DO_NOT_DRY_TERMS) or _dryer_unsafe(item):
            warnings.append(f"{item.profile.name} 不可烘干或高温风险较高。")
    return _dedupe(warnings)


def _dryer_unsafe(item: WardrobeItem) -> bool:
    search_text = _search_text(item)
    return (
        _contains_any(search_text, _DO_NOT_DRY_TERMS)
        or _has_material(item, _WOOL_TERMS)
        or _has_high_risk(item, _HIGH_DRY_RISK_KEYS)
    )


def _any_recommends_bag(items: list[WardrobeItem]) -> bool:
    return any("laundry_bag" in _search_text(item) or "洗衣袋" in _search_text(item) for item in items)


def _has_material(item: WardrobeItem, terms: set[str]) -> bool:
    materials = " ".join(item.profile.material_ratios.keys()).lower()
    return _contains_any(materials, terms)


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


def _contains_any(text: str, terms: set[str]) -> bool:
    return any(term in text for term in terms)


def _item_ids(items: list[WardrobeItem]) -> list[str]:
    return [item.profile.item_id for item in items]


def _dedupe(items: list[str]) -> list[str]:
    return list(dict.fromkeys(items))
