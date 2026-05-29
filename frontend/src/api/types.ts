/**
 * Shared type contracts for all Wash Mate frontend services.
 * Mirrors backend/shared/models.py to keep APK self-contained.
 */

export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type WashMethod = "hand_wash" | "machine_wash" | "dry_clean" | "do_not_wash" | "unknown";
export type DryMethod = "air_dry" | "low_heat_dryer" | "normal_dryer" | "do_not_dry" | "unknown";
export type MachineType = "standard_washer" | "shoe_washer" | "dryer" | "unknown";
export type MachineStatus = "available" | "running" | "out_of_service" | "unknown";

/** Normalized machine status used by the planner. */
export interface MachineInfo {
  machine_id: string;
  location: string;
  machine_type: MachineType;
  status: MachineStatus;
  capacity_kg: number | null;
  remaining_minutes: number | null;
  price_yuan: number | null;
  modes: string[];
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
  washer_types?: Record<string, unknown>;
  dryer_modes?: Record<string, unknown>;
}

export interface ProgramPricing {
  price_yuan: number;
  duration_minutes: number;
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
}

/** One recommended bucket in the final laundry plan. */
export interface LaundryBucket {
  bucket_id: string;
  item_ids: string[];
  wash_method: WashMethod;
  machine_type: MachineType;
  program: string;
  detergent_ml: number | null;
  use_laundry_bag: boolean;
  dry_method: DryMethod;
  warnings: string[];
}

/** Final laundry plan produced by the planner. */
export interface LaundryPlan {
  buckets: LaundryBucket[];
  estimated_cost_yuan: number | null;
  estimated_duration_minutes: number | null;
  summary: string;
  global_warnings: string[];
}

/** User-facing report generated from the final plan. */
export interface WashReport {
  title: string;
  sections: Record<string, string>;
  savings_notes: string[];
  risk_notes: string[];
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

/** Wardrobe item as stored in localStorage and displayed on screens. */
export interface WardrobeSummaryItem {
  item_id: string;
  name: string;
  user_note?: string;
  user_notes?: string[];
  wear_count_since_wash: number;
  wash_count: number;
  material_ratios: Record<string, number>;
  colors: string[];
  risks: Record<string, string>;
}

/** Raw wardrobe input from the add-clothing form. */
export interface WardrobeInput {
  name: string;
  material: string;
  colors: string;
  note: string;
  image_filename: string;
}

/** Machine data in the shape screens consume. */
export interface BackendMachine {
  machine_id: string;
  location: string;
  machine_type: string;
  status: string;
  capacity_kg: number | null;
  remaining_minutes: number | null;
  price_yuan: number | null;
  modes: string[];
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
  plan: LaundryPlan;
  report: {
    title: string;
    sections: Record<string, string>;
    savings_notes: string[];
    risk_notes: string[];
  };
}
