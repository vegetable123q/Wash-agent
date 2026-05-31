/**
 * Shared type contracts for all Wash Mate frontend services.
 * Mirrors backend/shared/models.py to keep APK self-contained.
 */

export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type WashMethod = "hand_wash" | "machine_wash" | "dry_clean" | "do_not_wash" | "unknown";
export type DryMethod = "air_dry" | "low_heat_dryer" | "normal_dryer" | "do_not_dry" | "unknown";
export type MachineType = "standard_washer" | "shoe_washer" | "dryer" | "unknown";
export type MachineStatus = "available" | "running" | "out_of_service" | "unknown";
export type WardrobeCategory = "上衣" | "裤装" | "裙装" | "外套" | "内衣袜子" | "床品" | "鞋包配饰" | "其他";
export type DirtyBasketAddedAtSource = "known" | "estimated";

/** Outfit log entry — records what the user wore on a given day. */
export interface OutfitLog {
  date: string;
  top_ids: string[];
  bottom_ids: string[];
  outer_ids: string[];
  accessory_ids: string[];
  note?: string;
  weather_snapshot?: {
    temperature_2m: number;
    weather_code: number;
    precipitation: number;
  };
}

/** LLM-generated outfit recommendation for today. */
export interface OutfitRecommendation {
  top_ids: string[];
  bottom_ids: string[];
  outer_ids: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
  match_score: number;
}

/** Co-occurrence pair between two clothing items. */
export interface ClothingPair {
  item_a: string;
  item_b: string;
  co_wear_count: number;
  pair_type: "top-bottom" | "top-top" | "outer-top";
  llm_comment?: string;
}

/** Normalized machine status used by the planner. */
export interface MachineInfo {
  machine_id: string;
  location: string;
  machine_floor?: number | null;
  machine_type: MachineType;
  status: MachineStatus;
  remaining_minutes: number | null;
  price_yuan: number | null;
  modes: string[];
  provider?: string;
}

/** Queue and waiting-time summary for one machine type. */
export interface MachineQueueEstimate {
  machine_type: MachineType;
  total_count: number;
  available_count: number;
  running_count: number;
  out_of_service_count: number;
  unknown_count: number;
  estimated_wait_minutes: number | null;
}

/** Campus machine, weather, drying, and pricing context. */
export interface CampusContext {
  all_machines: MachineInfo[];
  available_machines: MachineInfo[];
  queue_estimates: MachineQueueEstimate[];
  weather: Record<string, unknown>;
  drying_context: Record<string, unknown>;
  pricing_rules: PricingRules;
}

export interface PricingRules {
  wash_programs: Record<string, ProgramPricing>;
  dryer_programs: Record<string, ProgramPricing>;
  shoe_washer_programs?: Record<string, ProgramPricing>;
  provider_programs?: Record<string, ProviderPricingRules>;
  washer_types?: Record<string, unknown>;
  dryer_modes?: Record<string, unknown>;
}

export interface ProgramPricing {
  price_yuan: number;
  duration_minutes: number;
}

export interface LabeledProgramPricing extends ProgramPricing {
  label: string;
}

export interface ProviderPricingRules {
  wash_programs: Record<string, LabeledProgramPricing>;
  dryer_programs: Record<string, LabeledProgramPricing>;
  shoe_washer_programs?: Record<string, LabeledProgramPricing>;
}

/** Clothing profile enriched enough for the planner and frequency advisor. */
export interface ClothingProfile {
  item_id: string;
  name: string;
  user_note: string;
  material_ratios: Record<string, number>;
  colors: string[];
  care_warnings: string[];
  care_recommendations: string[];
  care_forbidden: string[];
  care_symbols: Record<string, string>;
  risks: Record<string, RiskLevel>;
  recommended_wash: string;
}

/** Wardrobe item as consumed by planner and frequency advisor. */
export interface WardrobeItemForPlan {
  profile: ClothingProfile;
  wear_count_since_wash: number;
  preferred_method: WashMethod;
  user_notes: string[];
  last_washed_at?: string;
  first_worn_after_wash_at?: string;
  last_worn_at?: string;
}

/** User constraints for the current laundry session. */
export interface LaundryConstraints {
  selected_item_ids: string[];
  urgent_item_ids: string[];
  allow_mixed_colors: boolean;
  allow_dryer: boolean;
  hygiene_sensitive: boolean;
  max_wait_minutes: number | null;
  budget_yuan: number | null;
  preferred_machine_floor?: number | null;
}

/** One recommended bucket in the wash-phase laundry plan.
 *  Dryer assignment is deferred to ``recommendDrying``. */
export interface LaundryBucket {
  bucket_id: string;
  item_ids: string[];
  wash_method: WashMethod;
  machine_type: MachineType;
  machine_id?: string;
  machine_location?: string;
  machine_floor?: number | null;
  program: string;
  detergent_ml: number | null;
  use_laundry_bag: boolean;
  dry_method: DryMethod;
  estimated_cost_yuan?: number | null;
  estimated_duration_minutes?: number | null;
  warnings: string[];
}

/** Wash-phase laundry plan.  Use ``recommendDrying`` for dryer assignments. */
export interface LaundryPlan {
  buckets: LaundryBucket[];
  estimated_cost_yuan: number | null;
  estimated_duration_minutes: number | null;
  summary: string;
  global_warnings: string[];
}

/** One dryer assignment for a previously-washed bucket. */
export interface DryingStep {
  bucket_id: string;
  item_ids: string[];
  dry_method: DryMethod;
  dryer_machine_id?: string;
  dryer_machine_location?: string;
  dryer_machine_floor?: number | null;
  estimated_cost_yuan?: number | null;
  estimated_duration_minutes?: number | null;
  warnings: string[];
}

/** Drying recommendations produced after wash-phase is complete. */
export interface DryingPlan {
  steps: DryingStep[];
  estimated_cost_yuan: number | null;
  estimated_duration_minutes: number | null;
  cost_breakdown: LaundryChargeLine[];
  warnings: string[];
}

/** One priced machine action. */
export interface LaundryChargeLine {
  bucket_id: string;
  label: string;
  amount_yuan: number;
  duration_minutes: number;
  machine_id?: string;
  machine_type?: MachineType;
  program?: string;
}

/** User-facing report generated from the final plan. */
export interface WashReport {
  title: string;
  sections: Record<string, string>;
  savings_notes: string[];
  risk_notes: string[];
}

/** Wardrobe counters before a laundry completion, used for undo. */
export interface CompletedLaundryItemSnapshot {
  item_id: string;
  wear_count_since_wash: number;
  wash_count: number;
  last_washed_at?: string;
}

/** One locally recorded completed laundry session. */
export interface CompletedLaundryRecord {
  record_id: string;
  completed_at: string;
  completed_item_ids: string[];
  item_names: string[];
  estimated_cost_yuan: number | null;
  estimated_duration_minutes: number | null;
  machine_labels: string[];
  plan_summary: string;
  before_items: CompletedLaundryItemSnapshot[];
}

/** Lightweight weekly summary for the report tab. */
export interface CompletedLaundrySummary {
  weekly_count: number;
  weekly_cost_yuan: number | null;
  recent_records: CompletedLaundryRecord[];
}

/** Wash frequency and priority advice for one wardrobe item. */
export interface FrequencyAdvice {
  item_id: string;
  priority_score: number;
  recommendation: string;
  reasons: string[];
}

/** Weather snapshot from Open-Meteo. */
export interface WeatherSnapshot {
  source: string;
  status: "live" | "unavailable" | string;
  location?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
  units?: Record<string, string>;
  error?: string;
}

/** User-facing dormitory option backed by an internal machine API mapping. */
export interface CampusTowerOption {
  name: string;
}

/** Legacy tower contract kept for modules that still own non-D pricing/sample data. */
export interface CampusTower {
  name: string;
  tower_key: string;
  provider: string;
  provider_keys: Record<string, string>;
}

/** Live campus machine context status for screens. */
export interface CampusContextStatus {
  state: "unconfigured" | "live" | "unavailable";
  dorm_name: string;
  message: string;
  updated_at: string;
}

/** One wardrobe item currently sitting in the dirty basket. */
export interface DirtyBasketItem {
  item_id: string;
  name: string;
  added_at: string;
  added_at_source: DirtyBasketAddedAtSource;
  days_in_basket: number;
  warning_label: string;
}

/** Practical dirty-basket summary derived from the current dirty-basket records. */
export interface DirtyBasketSummary {
  item_count: number;
  load_percent: number;
  estimated_load_count?: number;
  oldest_days: number;
  urgent_count: number;
  status_label: string;
  recommendation: string;
  next_action: string;
  items: DirtyBasketItem[];
}

/** Wardrobe item as stored in localStorage and displayed on screens. */
export interface WardrobeSummaryItem {
  item_id: string;
  name: string;
  category?: WardrobeCategory;
  user_note?: string;
  user_notes?: string[];
  wear_count_since_wash: number;
  wash_count: number;
  last_washed_at?: string;
  first_worn_after_wash_at?: string;
  last_worn_at?: string;
  material_ratios: Record<string, number>;
  colors: string[];
  risks: Record<string, string>;
  photo_file_path?: string;
  photo_data_url?: string;
}

/** Raw wardrobe input from the add-clothing form. */
export interface WardrobeInput {
  name: string;
  material: string;
  colors: string;
  note: string;
  image_filename: string;
  category?: WardrobeCategory;
  photo_data_url?: string;
}

/** Machine data in the shape screens consume. */
export interface BackendMachine {
  machine_id: string;
  location: string;
  machine_floor?: number | null;
  machine_type: string;
  status: string;
  remaining_minutes: number | null;
  price_yuan: number | null;
  modes: string[];
  provider?: string;
}

/** Queue estimate in the shape screens consume. */
export interface BackendQueueEstimate {
  machine_type: string;
  total_count: number;
  available_count: number;
  running_count: number;
  out_of_service_count: number;
  unknown_count: number;
  estimated_wait_minutes: number | null;
}

/** The complete summary served to all mobile screens. */
export interface MobileSummary {
  source: "backend";
  selected_laundry_item_ids: string[];
  dirty_basket: DirtyBasketSummary;
  weather?: WeatherSnapshot;
  campus_towers?: CampusTowerOption[];
  campus_status?: CampusContextStatus;
  wardrobe: {
    items: WardrobeSummaryItem[];
  };
  frequency_advice?: FrequencyAdvice[];
  campus_context: {
    all_machines: BackendMachine[];
    available_machines: BackendMachine[];
    queue_estimates: BackendQueueEstimate[];
    weather: Record<string, unknown>;
    drying_context: Record<string, unknown>;
    pricing_rules: Record<string, unknown>;
  };
  completed_laundry?: CompletedLaundrySummary;
  plan: LaundryPlan;
  drying_plan?: DryingPlan;
  report: {
    title: string;
    sections: Record<string, string>;
    savings_notes: string[];
    risk_notes: string[];
  };
}
