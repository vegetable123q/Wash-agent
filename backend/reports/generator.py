"""User-facing laundry report generation implementation."""

from __future__ import annotations

from backend.shared.models import (
    CampusContext,
    DryMethod,
    LaundryBucket,
    LaundryPlan,
    MachineInfo,
    MachineQueueEstimate,
    MachineType,
    WardrobeItem,
    WashMethod,
    WashReport,
)
from backend.shared.utils import dedupe


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
        action_steps=_action_steps(plan, item_names),
        cost_breakdown=list(plan.cost_breakdown),
        savings_notes=_savings_notes(plan),
        risk_notes=_risk_notes(plan),
    )


def _steps_section(plan: LaundryPlan, item_names: dict[str, str]) -> str:
    lines: list[str] = []
    for index, bucket in enumerate(plan.buckets, start=1):
        names = [_item_name(item_id, item_names) for item_id in bucket.item_ids]
        parts = [
            f"{index}. {'、'.join(names)}",
            f"原因：{_bucket_reason(bucket)}",
            f"洗护方式：{_wash_method_text(bucket.wash_method)}",
        ]
        if bucket.machine_id:
            parts.append(f"洗衣机：{bucket.machine_id}（{bucket.machine_location}）")
        if bucket.program:
            parts.append(f"程序：{bucket.program}")
        if bucket.detergent_ml is not None:
            parts.append(f"洗衣液：{bucket.detergent_ml} ml")
        if bucket.use_laundry_bag:
            parts.append("使用洗衣袋")
        if bucket.estimated_cost_yuan is not None:
            parts.append(f"本批费用：{bucket.estimated_cost_yuan} 元")
        if bucket.estimated_duration_minutes is not None:
            parts.append(f"机器占用：{bucket.estimated_duration_minutes} 分钟")
        parts.append(f"干燥：{_dry_method_text(bucket.dry_method)}")
        if bucket.dryer_machine_id:
            parts.append(f"烘干机：{bucket.dryer_machine_id}（{bucket.dryer_machine_location}）")
        if bucket.warnings:
            parts.append(f"提醒：{'；'.join(bucket.warnings)}")
        lines.append("；".join(parts) + "。")
    return "\n".join(lines)


def _action_steps(plan: LaundryPlan, item_names: dict[str, str]) -> list[str]:
    steps: list[str] = []
    for index, bucket in enumerate(plan.buckets, start=1):
        names = "、".join(_item_name(item_id, item_names) for item_id in bucket.item_ids)
        if bucket.wash_method == WashMethod.MACHINE_WASH:
            machine = bucket.machine_id or _machine_type_text(bucket.machine_type)
            step = f"{index}. {names} 使用 {machine} 执行 {bucket.program} 程序"
            if bucket.detergent_ml is not None:
                step += f"，加入 {bucket.detergent_ml} ml 洗衣液"
            if bucket.use_laundry_bag:
                step += "，使用洗衣袋"
            step += f"，{_dry_method_text(bucket.dry_method)}"
            if bucket.dryer_machine_id:
                step += f"（{bucket.dryer_machine_id}）"
            steps.append(step + "。")
            continue
        steps.append(
            f"{index}. {names} {_wash_method_text(bucket.wash_method)}，{_dry_method_text(bucket.dry_method)}，不使用共享洗衣机。"
        )
    return steps


def _cost_time_section(plan: LaundryPlan) -> str:
    if plan.estimated_cost_yuan is None:
        raise ValueError("plan estimated_cost_yuan is required for report generation")
    if plan.estimated_duration_minutes is None:
        raise ValueError("plan estimated_duration_minutes is required for report generation")
    if plan.cost_breakdown:
        batch_text = "；".join(
            f"{line.label} {line.amount_yuan} 元/{line.duration_minutes} 分钟"
            for line in plan.cost_breakdown
        )
    else:
        batch_text = "本次没有共享洗衣机或烘干机计费批次"
    return (
        f"预计费用 {plan.estimated_cost_yuan} 元，预计机器占用时间 {plan.estimated_duration_minutes} 分钟。"
        f"计费批次：{batch_text}。"
    )


def _campus_section(campus_context: CampusContext) -> str:
    machines = campus_context.all_machines or campus_context.available_machines
    available_count = len(campus_context.available_machines)
    machine_count = len(machines)
    locations = _available_machine_locations(campus_context.available_machines)
    queues = _queue_summary(campus_context.queue_estimates)
    drying = _drying_context_summary(campus_context.drying_context)
    parts = [
        f"本次报告基于传入的校园上下文生成，当前可用机器记录 {available_count} 台，机器总记录 {machine_count} 台。",
    ]
    if locations:
        parts.append(f"可用位置：{locations}。")
    if queues:
        parts.append(f"排队估算：{queues}。")
    if drying:
        parts.append(f"晾晒条件：{drying}。")
    return "\n".join(parts)


def _risk_section(plan: LaundryPlan) -> str:
    warnings = dedupe([warning for bucket in plan.buckets for warning in bucket.warnings] + plan.global_warnings)
    if not warnings:
        return "本次计划没有额外风险提醒。"
    return "\n".join(f"- {warning}" for warning in warnings)


def _savings_notes(plan: LaundryPlan) -> list[str]:
    notes: list[str] = []
    if any(bucket.dry_method == DryMethod.AIR_DRY for bucket in plan.buckets):
        notes.append("自然晾干批次减少烘干用电，也能降低缩水和变形风险。")
    if any(bucket.bucket_id == "mixed-standard" for bucket in plan.buckets):
        notes.append("用户允许混色且衣物无高掉色风险时合并标准批次，减少空筒和重复用水。")
    if any(bucket.bucket_id in {"dark-standard", "hand-wash"} for bucket in plan.buckets):
        notes.append("高风险衣物分开处理，能减少串色、返洗和重复用水。")
    if any(bucket.bucket_id == "large-bedding" for bucket in plan.buckets):
        notes.append("床品使用大件批次，减少普通筒过载造成的洗不净和返洗。")
    return dedupe(notes)


def _risk_notes(plan: LaundryPlan) -> list[str]:
    notes: list[str] = []
    for bucket in plan.buckets:
        if bucket.bucket_id == "dark-standard":
            notes.append("深色或掉色风险衣物不要与浅色衣物混洗。")
        if bucket.wash_method in {WashMethod.HAND_WASH, WashMethod.DRY_CLEAN, WashMethod.DO_NOT_WASH}:
            notes.append("非普通机洗衣物应按单独批次处理，不进入共享洗衣机。")
        notes.extend(bucket.warnings)
    return dedupe(notes)


def _bucket_reason(bucket: LaundryBucket) -> str:
    reasons = {
        "do-not-wash": "洗护标签或用户偏好提示不可水洗",
        "dry-clean": "该批次需要专业干洗",
        "hand-wash": "材质或风险提示不适合共享洗衣机",
        "large-bedding": "床品体积大，使用大件批次减少过载和返洗",
        "dark-standard": "深色或高掉色风险衣物单独处理，避免串色",
        "light-standard": "浅色普通机洗衣物集中标准洗",
        "mixed-standard": "用户允许混色，低掉色风险普通衣物合并标准洗",
    }
    return reasons.get(bucket.bucket_id, f"{bucket.bucket_id} 批次")


def _available_machine_locations(machines: list[MachineInfo]) -> str:
    if not machines:
        return ""
    grouped: dict[str, list[str]] = {}
    for machine in machines:
        key = f"{machine.location} {_machine_type_text(machine.machine_type)}".strip()
        grouped.setdefault(key, []).append(machine.machine_id)
    return "；".join(
        f"{location_type} {len(machine_ids)} 台"
        for location_type, machine_ids in grouped.items()
    )


def _queue_summary(estimates: list[MachineQueueEstimate]) -> str:
    if not estimates:
        return ""
    summaries: list[str] = []
    for estimate in estimates:
        wait = "未知" if estimate.estimated_wait_minutes is None else f"{estimate.estimated_wait_minutes} 分钟"
        summaries.append(
            f"{_machine_type_text(estimate.machine_type)} 可用 {estimate.available_count}/{estimate.total_count}，预计等待 {wait}"
        )
    return "；".join(summaries)


def _drying_context_summary(drying_context: dict[str, object]) -> str:
    if not drying_context:
        return ""
    parts: list[str] = []
    if "balcony_available" in drying_context:
        balcony = "有阳台" if drying_context["balcony_available"] is True else "无阳台"
        parts.append(balcony)
    if "ventilation" in drying_context:
        parts.append(f"通风 {drying_context['ventilation']}")
    return "，".join(parts)


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


def _machine_type_text(machine_type: MachineType) -> str:
    labels = {
        MachineType.SMALL_WASHER: "小型洗衣机",
        MachineType.STANDARD_WASHER: "标准洗衣机",
        MachineType.LARGE_WASHER: "大件洗衣机",
        MachineType.SHOE_WASHER: "洗鞋机",
        MachineType.DRYER: "烘干机",
        MachineType.UNKNOWN: "未知机器",
    }
    return labels[machine_type]
