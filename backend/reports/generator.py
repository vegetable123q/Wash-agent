"""User-facing laundry report generation implementation."""

from __future__ import annotations

from backend.shared.models import CampusContext, DryMethod, LaundryPlan, WardrobeItem, WashMethod, WashReport


def generate_report(
    plan: LaundryPlan,
    items: list[WardrobeItem],
    campus_context: CampusContext,
) -> WashReport:
    """Generate report sections from the final laundry plan."""

    item_names = {item.profile.item_id: item.profile.name for item in items}
    sections = {
        "洗衣步骤": _steps_section(plan, item_names),
        "费用和时间": _cost_time_section(plan),
        "机器环境": _campus_section(campus_context),
        "风险提醒": _risk_section(plan),
    }
    return WashReport(
        title="本次校园洗衣方案",
        sections=sections,
        savings_notes=_savings_notes(plan),
        risk_notes=_risk_notes(plan),
    )


def _steps_section(plan: LaundryPlan, item_names: dict[str, str]) -> str:
    lines: list[str] = []
    for index, bucket in enumerate(plan.buckets, start=1):
        names = [_item_name(item_id, item_names) for item_id in bucket.item_ids]
        parts = [
            f"{index}. {'、'.join(names)}",
            f"洗护方式：{_wash_method_text(bucket.wash_method)}",
        ]
        if bucket.program:
            parts.append(f"程序：{bucket.program}")
        if bucket.use_laundry_bag:
            parts.append("使用洗衣袋")
        parts.append(f"干燥：{_dry_method_text(bucket.dry_method)}")
        lines.append("；".join(parts) + "。")
    return "\n".join(lines)


def _cost_time_section(plan: LaundryPlan) -> str:
    if plan.estimated_cost_yuan is None:
        raise ValueError("plan estimated_cost_yuan is required for report generation")
    if plan.estimated_duration_minutes is None:
        raise ValueError("plan estimated_duration_minutes is required for report generation")
    return f"预计费用 {plan.estimated_cost_yuan} 元，预计机器占用时间 {plan.estimated_duration_minutes} 分钟。"


def _campus_section(campus_context: CampusContext) -> str:
    machine_count = len(campus_context.available_machines)
    return f"本次报告基于传入的校园上下文生成，当前可用机器记录 {machine_count} 台。"


def _risk_section(plan: LaundryPlan) -> str:
    warnings = _dedupe([warning for bucket in plan.buckets for warning in bucket.warnings] + plan.global_warnings)
    if not warnings:
        return "本次计划没有额外风险提醒。"
    return "\n".join(f"- {warning}" for warning in warnings)


def _savings_notes(plan: LaundryPlan) -> list[str]:
    notes: list[str] = []
    if any(bucket.dry_method == DryMethod.AIR_DRY for bucket in plan.buckets):
        notes.append("自然晾干批次减少烘干用电，也能降低缩水和变形风险。")
    if any(bucket.bucket_id in {"dark-standard", "hand-wash"} for bucket in plan.buckets):
        notes.append("高风险衣物分开处理，能减少串色、返洗和重复用水。")
    if any(bucket.bucket_id == "large-bedding" for bucket in plan.buckets):
        notes.append("床品使用大件批次，减少普通筒过载造成的洗不净和返洗。")
    return _dedupe(notes)


def _risk_notes(plan: LaundryPlan) -> list[str]:
    notes: list[str] = []
    for bucket in plan.buckets:
        if bucket.bucket_id == "dark-standard":
            notes.append("深色或掉色风险衣物不要与浅色衣物混洗。")
        if bucket.wash_method in {WashMethod.HAND_WASH, WashMethod.DRY_CLEAN, WashMethod.DO_NOT_WASH}:
            notes.append("非普通机洗衣物应按单独批次处理，不进入共享洗衣机。")
        notes.extend(bucket.warnings)
    return _dedupe(notes)


def _item_name(item_id: str, item_names: dict[str, str]) -> str:
    if item_id not in item_names:
        raise ValueError(f"report item id not found: {item_id}")
    return item_names[item_id]


def _wash_method_text(method: WashMethod) -> str:
    labels = {
        WashMethod.HAND_WASH: "手洗",
        WashMethod.MACHINE_WASH: "机洗",
        WashMethod.DRY_CLEAN: "干洗",
        WashMethod.DO_NOT_WASH: "不水洗",
        WashMethod.UNKNOWN: "未知",
    }
    return labels[method]


def _dry_method_text(method: DryMethod) -> str:
    labels = {
        DryMethod.AIR_DRY: "自然晾干",
        DryMethod.LOW_HEAT_DRYER: "低温烘干",
        DryMethod.NORMAL_DRYER: "普通烘干",
        DryMethod.DO_NOT_DRY: "不烘干",
        DryMethod.UNKNOWN: "未知",
    }
    return labels[method]


def _dedupe(items: list[str]) -> list[str]:
    return list(dict.fromkeys(items))
