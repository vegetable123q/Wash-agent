import { backendPlanSummary, machines, wardrobeItems } from "../data/washMateContent";

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

export interface CampusTower {
  name: string;
  tower_key: string;
  provider: string;
  provider_keys: Record<string, string>;
}

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

export interface MobileSummary {
  source: "backend";
  weather?: WeatherSnapshot;
  campus_towers?: CampusTower[];
  wardrobe: {
    items: WardrobeSummaryItem[];
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

export interface WardrobeInput {
  name: string;
  material: string;
  colors: string;
  note: string;
  image_filename: string;
}

const LOCAL_WARDROBE_STORAGE_KEY = "washmate.localWardrobe";

export async function fetchMobileSummary(): Promise<MobileSummary> {
  return buildLocalMobileSummary(readLocalWardrobeItems());
}

export async function createWardrobeItem(input: WardrobeInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("name is required");
  }
  const item: WardrobeSummaryItem = {
    item_id: `wm-user-${Date.now().toString(36)}`,
    name,
    user_note: input.note.trim(),
    user_notes: [input.note.trim(), input.image_filename.trim()].filter(Boolean),
    wear_count_since_wash: 0,
    wash_count: 0,
    material_ratios: materialRatiosFromText(input.material),
    colors: splitUserList(input.colors),
    risks: input.note.includes("缩水") ? { shrinkage: "medium" } : {},
  };
  const items = [...readLocalWardrobeItems(), item];
  writeLocalWardrobeItems(items);
  return { status: "created", item };
}

export async function deleteWardrobeItem(itemId: string) {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    throw new Error("item_id is required");
  }
  const items = readLocalWardrobeItems();
  const nextItems = items.filter((item) => item.item_id !== normalizedItemId);
  if (nextItems.length === items.length) {
    throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);
  }
  writeLocalWardrobeItems(nextItems);
  return { status: "deleted", item_id: normalizedItemId };
}

function buildLocalMobileSummary(items: WardrobeSummaryItem[]): MobileSummary {
  const allMachines = machines.map((machine): BackendMachine => ({
    machine_id: machine.backendId,
    location: machine.location,
    machine_type: machine.backendType,
    status: machine.backendStatus,
    capacity_kg: parseCapacity(machine.capacity),
    remaining_minutes: parseRemainingMinutes(machine.remaining),
    price_yuan: parsePrice(machine.price),
    modes: machine.modes,
  }));
  const availableMachines = allMachines.filter((machine) => machine.status === "available");
  return {
    source: "backend",
    weather: {
      source: "in-apk",
      status: "unavailable",
      error: "APK 内置模式未启用实时天气请求",
    },
    campus_towers: [
      {
        name: "紫荆1号楼",
        tower_key: "ncrkiz1",
        provider: "cleverschool",
        provider_keys: { cleverschool: "ncrkiz1", haier: "440" },
      },
      {
        name: "南区21号楼",
        tower_key: "nq21",
        provider: "cleverschool",
        provider_keys: { cleverschool: "nq21" },
      },
    ],
    wardrobe: { items },
    campus_context: {
      all_machines: allMachines,
      available_machines: availableMachines,
      queue_estimates: buildQueueEstimates(allMachines),
      weather: { status: "in_apk_unavailable" },
      drying_context: { recommendation: "无实时天气时优先按衣物风险选择低温烘干或晾干" },
      pricing_rules: { source: "in_apk_static" },
    },
    plan: {
      buckets: [
        {
          bucket_id: "local-light",
          item_ids: items.slice(0, 2).map((item) => item.item_id),
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          program: "standard",
          dry_method: "air_dry",
          warnings: [],
        },
      ].filter((bucket) => bucket.item_ids.length > 0),
      estimated_cost_yuan: 14,
      estimated_duration_minutes: 80,
      summary: backendPlanSummary.note,
      global_warnings: [],
    },
    report: {
      title: "本次校园洗衣方案",
      sections: {
        洗衣步骤: "APK 已根据本地衣柜和机器数据生成洗衣步骤。",
        费用和时间: "预计费用 14 元，预计机器占用时间 80 分钟。",
        机器环境: `当前内置数据中可用机器记录 ${availableMachines.length} 台。`,
        风险提醒: "识图未配置时仅使用手动输入和本地衣柜记录。",
      },
      savings_notes: ["优先合并相近材质和颜色的衣物，减少空筒。"],
      risk_notes: [],
    },
  };
}

function readLocalWardrobeItems(): WardrobeSummaryItem[] {
  const saved = typeof localStorage === "undefined" ? null : localStorage.getItem(LOCAL_WARDROBE_STORAGE_KEY);
  if (!saved) {
    return initialWardrobeItems();
  }
  const parsed = JSON.parse(saved) as WardrobeSummaryItem[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid local wardrobe data");
  }
  return parsed;
}

function writeLocalWardrobeItems(items: WardrobeSummaryItem[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(LOCAL_WARDROBE_STORAGE_KEY, JSON.stringify(items));
}

function initialWardrobeItems(): WardrobeSummaryItem[] {
  return wardrobeItems.slice(0, 4).map((item) => ({
    item_id: item.id,
    name: item.name,
    user_note: item.description,
    user_notes: [item.description],
    wear_count_since_wash: item.wearCount,
    wash_count: item.washCount,
    material_ratios: materialRatiosFromStatic(item.material),
    colors: colorsFromStatic(item),
    risks: risksFromStatic(item.riskLevel),
  }));
}

function splitUserList(value: string): string[] {
  return value.split(/[,，、\n]+/).map((part) => part.trim()).filter(Boolean);
}

function materialRatiosFromText(value: string): Record<string, number> {
  const materials = splitUserList(value);
  if (!materials.length) {
    return {};
  }
  const ratio = Number((1 / materials.length).toFixed(4));
  return Object.fromEntries(materials.map((material) => [material, ratio]));
}

function materialRatiosFromStatic(value: string): Record<string, number> {
  const percentMatch = value.match(/^(.+?)\s*(\d+)%$/);
  if (percentMatch) {
    return { [percentMatch[1].trim()]: Number(percentMatch[2]) / 100 };
  }
  return value ? { [value]: 1 } : {};
}

function colorsFromStatic(item: { name: string }): string[] {
  if (item.name.includes("白")) {
    return ["white"];
  }
  if (item.name.includes("黑")) {
    return ["black"];
  }
  if (item.name.includes("灰")) {
    return ["gray"];
  }
  return [];
}

function risksFromStatic(level: string): Record<string, string> {
  if (level === "高") {
    return { general: "high" };
  }
  if (level === "中") {
    return { general: "medium" };
  }
  return {};
}

function buildQueueEstimates(allMachines: BackendMachine[]): BackendQueueEstimate[] {
  const machineTypes = Array.from(new Set(allMachines.map((machine) => machine.machine_type)));
  return machineTypes.map((machineType) => {
    const matching = allMachines.filter((machine) => machine.machine_type === machineType);
    const available = matching.filter((machine) => machine.status === "available").length;
    const running = matching.filter((machine) => machine.status === "running").length;
    const outOfService = matching.filter((machine) => machine.status === "out_of_service").length;
    return {
      machine_type: machineType,
      total_count: matching.length,
      available_count: available,
      running_count: running,
      out_of_service_count: outOfService,
      unknown_count: 0,
      estimated_wait_minutes: available > 0 ? 0 : 12,
    };
  });
}

function parseCapacity(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseRemainingMinutes(value: string): number | null {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function parsePrice(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}
