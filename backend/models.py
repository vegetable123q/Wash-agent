"""Shared data contracts for all Wash Agent backend modules."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class RiskLevel(str, Enum):
    """Shared risk scale used by extraction, planning, and reporting."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNKNOWN = "unknown"


class WashMethod(str, Enum):
    """Supported wash method categories."""

    HAND_WASH = "hand_wash"
    MACHINE_WASH = "machine_wash"
    DRY_CLEAN = "dry_clean"
    DO_NOT_WASH = "do_not_wash"
    UNKNOWN = "unknown"


class DryMethod(str, Enum):
    """Supported drying method categories."""

    AIR_DRY = "air_dry"
    LOW_HEAT_DRYER = "low_heat_dryer"
    NORMAL_DRYER = "normal_dryer"
    DO_NOT_DRY = "do_not_dry"
    UNKNOWN = "unknown"


class MachineType(str, Enum):
    """Campus machine capacity categories."""

    SMALL_WASHER = "small_washer"
    STANDARD_WASHER = "standard_washer"
    LARGE_WASHER = "large_washer"
    DRYER = "dryer"
    UNKNOWN = "unknown"


class MachineStatus(str, Enum):
    """Runtime status for campus laundry machines."""

    AVAILABLE = "available"
    RUNNING = "running"
    OUT_OF_SERVICE = "out_of_service"
    UNKNOWN = "unknown"


@dataclass(slots=True)
class ClothingInput:
    """Raw clothing input collected from the page or product enrichment."""

    name: str
    shop_name: str = ""
    tag_text: str = ""
    user_description: str = ""
    user_note: str = ""
    image_refs: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LLMResponse:
    """Normalized LLM response used by extraction modules."""

    text: str
    provider: str = ""
    model: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ClothingProfile:
    """Structured clothing profile extracted from raw user and product input."""

    item_id: str
    name: str
    user_note: str = ""
    material_ratios: dict[str, float] = field(default_factory=dict)
    colors: list[str] = field(default_factory=list)
    care_forbidden: list[str] = field(default_factory=list)
    risks: dict[str, RiskLevel] = field(default_factory=dict)
    confidence: float = 0.0
    source_notes: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)
    user_fill_suggestions: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class WashRecord:
    """One wash history record for a wardrobe item."""

    washed_at: str
    method: WashMethod
    notes: str = ""
    issues: list[str] = field(default_factory=list)


@dataclass(slots=True)
class WardrobeItem:
    """One item stored in the user's wardrobe."""

    profile: ClothingProfile
    wear_count_since_wash: int = 0
    preferred_method: WashMethod = WashMethod.UNKNOWN
    wash_history: list[WashRecord] = field(default_factory=list)
    user_notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class LaundryConstraints:
    """User constraints for the current laundry session."""

    selected_item_ids: list[str] = field(default_factory=list)
    urgent_item_ids: list[str] = field(default_factory=list)
    allow_mixed_colors: bool = False
    allow_dryer: bool = False
    hygiene_sensitive: bool = True
    max_wait_minutes: int | None = None
    budget_yuan: float | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class FrequencyAdvice:
    """Wash frequency and priority advice for one wardrobe item."""

    item_id: str
    priority_score: float
    recommendation: str
    reasons: list[str] = field(default_factory=list)


@dataclass(slots=True)
class MachineInfo:
    """Normalized campus washing or drying machine status."""

    machine_id: str
    location: str
    machine_type: MachineType
    status: MachineStatus
    capacity_kg: float | None = None
    remaining_minutes: int | None = None
    price_yuan: float | None = None
    modes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class CampusContext:
    """Campus machine, weather, drying, and pricing context."""

    available_machines: list[MachineInfo] = field(default_factory=list)
    weather: dict[str, Any] = field(default_factory=dict)
    drying_context: dict[str, Any] = field(default_factory=dict)
    pricing_rules: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LaundryBucket:
    """One recommended bucket or batch in the final laundry plan."""

    bucket_id: str
    item_ids: list[str]
    wash_method: WashMethod
    machine_type: MachineType = MachineType.UNKNOWN
    program: str = ""
    detergent_ml: float | None = None
    use_laundry_bag: bool = False
    dry_method: DryMethod = DryMethod.UNKNOWN
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class LaundryPlan:
    """Final laundry plan produced by the planner."""

    buckets: list[LaundryBucket] = field(default_factory=list)
    estimated_cost_yuan: float | None = None
    estimated_duration_minutes: int | None = None
    summary: str = ""
    global_warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class WashReport:
    """User-facing report generated from the final plan."""

    title: str
    sections: dict[str, str] = field(default_factory=dict)
    savings_notes: list[str] = field(default_factory=list)
    risk_notes: list[str] = field(default_factory=list)

