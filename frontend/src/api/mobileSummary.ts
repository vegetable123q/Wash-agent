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

export interface BackendQueueEstimate {
  machine_type: string;
  total_count: number;
  available_count: number;
  running_count: number;
  out_of_service_count: number;
  unknown_count: number;
  estimated_wait_minutes: number | null;
}

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

export interface MobileSummary {
  source: "backend";
  weather?: WeatherSnapshot;
  wardrobe: {
    items: Array<{
      item_id: string;
      name: string;
      user_note?: string;
      user_notes?: string[];
      wear_count_since_wash: number;
      wash_count: number;
      material_ratios: Record<string, number>;
      colors: string[];
      risks: Record<string, string>;
    }>;
  };
  campus_context: {
    all_machines: BackendMachine[];
    available_machines: BackendMachine[];
    queue_estimates: BackendQueueEstimate[];
    weather: Record<string, unknown>;
    drying_context: Record<string, unknown>;
    pricing_rules: Record<string, unknown>;
  };
  plan: {
    buckets: Array<{
      bucket_id: string;
      item_ids: string[];
      wash_method: string;
      machine_type: string;
      program: string;
      dry_method: string;
      warnings: string[];
    }>;
    estimated_cost_yuan: number | null;
    estimated_duration_minutes: number | null;
    summary: string;
    global_warnings: string[];
  };
  report: {
    title: string;
    sections: Record<string, string>;
    savings_notes: string[];
    risk_notes: string[];
  };
}

export async function fetchMobileSummary(): Promise<MobileSummary> {
  const apiBase = import.meta.env.VITE_API_BASE ?? "";
  const response = await fetch(`${apiBase}/api/mobile/summary`);
  if (!response.ok) {
    throw new Error(`Failed to load mobile summary: ${response.status}`);
  }
  return (await response.json()) as MobileSummary;
}

export interface WardrobeInput {
  name: string;
  material: string;
  colors: string;
  note: string;
  image_filename: string;
}

export async function createWardrobeItem(input: WardrobeInput) {
  const apiBase = import.meta.env.VITE_API_BASE ?? "";
  const response = await fetch(`${apiBase}/api/wardrobe/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to save wardrobe item: ${response.status}`);
  }
  return response.json();
}
