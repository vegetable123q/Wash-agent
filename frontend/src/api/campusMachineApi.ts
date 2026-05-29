import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { resolveCampusTowerByName } from "./campusTowerDirectory";
import type { CampusContext, MachineInfo, MachineQueueEstimate, MachineStatus, MachineType } from "./types";

const CLEVER_STATUS_URL = "https://api.cleverschool.cn/washapi4/device/status";
const HAIER_DETAIL_URL = "https://yshz-user.haier-ioc.com/position/deviceDetailPage";

export interface CampusMachineTransportRequest {
  url: string;
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export type CampusMachineTransport = (request: CampusMachineTransportRequest) => Promise<unknown>;

interface BuildCampusContextForDormOptions {
  transport?: CampusMachineTransport;
  weather?: Record<string, unknown>;
  dryingContext?: Record<string, unknown>;
  pricingRules?: CampusContext["pricing_rules"];
}

const CLEVER_SCHOOL_MACHINE_TYPES: Record<string, MachineType> = {
  洗衣机: "standard_washer",
  洗鞋机: "shoe_washer",
  烘干机: "dryer",
};

export async function buildCampusContextForDorm(
  dormName: string,
  options: BuildCampusContextForDormOptions = {},
): Promise<CampusContext> {
  const tower = resolveCampusTowerByName(dormName);
  const transport = options.transport ?? defaultCampusMachineTransport;
  const allMachines: MachineInfo[] = [];

  if (tower.providerKeys.cleverschool) {
    allMachines.push(...await listCleverSchoolMachines(tower.providerKeys.cleverschool, transport));
  }
  if (tower.providerKeys.haier) {
    allMachines.push(...await listHaierMachines(tower.providerKeys.haier, tower.name, transport));
  }

  return {
    all_machines: allMachines,
    available_machines: allMachines.filter((machine) => machine.status === "available"),
    queue_estimates: buildQueueEstimates(allMachines),
    weather: options.weather ?? {},
    drying_context: { ...(options.dryingContext ?? {}) },
    pricing_rules: options.pricingRules ?? { wash_programs: {}, dryer_programs: {} },
  };
}

async function listCleverSchoolMachines(
  towerKey: string,
  transport: CampusMachineTransport,
): Promise<MachineInfo[]> {
  const response = await transport({
    url: CLEVER_STATUS_URL,
    data: { towerKey, deviceType: "" },
    headers: jsonHeaders(),
  });
  const data = responseData(response, "CleverSchool device status");
  return data.map((item, index) => cleverSchoolMachineFromPayload(requiredObject(item, `cleverschool[${index}]`), index));
}

async function listHaierMachines(
  positionId: string,
  dormName: string,
  transport: CampusMachineTransport,
): Promise<MachineInfo[]> {
  const machines: MachineInfo[] = [];
  for (const categoryCode of ["00", "01", "02"]) {
    const response = await transport({
      url: HAIER_DETAIL_URL,
      data: { positionId, categoryCode, page: 1, floorCode: "", pageSize: 100 },
      headers: jsonHeaders(),
    });
    const items = haierItems(response, `HaiLe category ${categoryCode}`);
    machines.push(
      ...items.map((item, index) =>
        haierMachineFromPayload(requiredObject(item, `haier[${categoryCode}][${index}]`), categoryCode, dormName, index),
      ),
    );
  }
  return machines;
}

async function defaultCampusMachineTransport(request: CampusMachineTransportRequest): Promise<unknown> {
  const data = request.data ?? {};
  const headers = request.headers ?? jsonHeaders();
  if (Capacitor.getPlatform() !== "web") {
    const response = await CapacitorHttp.post({ url: request.url, data, headers });
    return response.data;
  }
  const url = webRequestUrl(request.url);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Campus machine request failed: ${response.status}`);
  }
  return response.json();
}

function webRequestUrl(url: string): string {
  if (!isLocalWebPreview()) {
    return url;
  }
  if (url.startsWith("https://api.cleverschool.cn")) {
    return url.replace("https://api.cleverschool.cn", "/cleverschool-api");
  }
  if (url.startsWith("https://yshz-user.haier-ioc.com")) {
    return url.replace("https://yshz-user.haier-ioc.com", "/haier-api");
  }
  return url;
}

function isLocalWebPreview(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function cleverSchoolMachineFromPayload(item: Record<string, unknown>, index: number): MachineInfo {
  const [label, machineId] = parseMacUnionCode(requiredText(item, "macUnionCode", `cleverschool[${index}]`));
  const machineType = machineTypeForLabel(label);
  return {
    machine_id: machineId,
    location: `${requiredText(item, "tower", `cleverschool[${index}]`)} ${requiredText(item, "floorName", `cleverschool[${index}]`)}`,
    machine_type: machineType,
    status: machineStatus(requiredText(item, "status", `cleverschool[${index}]`)),
    remaining_minutes: remainingMinutes(requiredText(item, "status", `cleverschool[${index}]`)),
    price_yuan: null,
    modes: [],
    provider: "cleverschool",
  };
}

function haierMachineFromPayload(
  item: Record<string, unknown>,
  categoryCode: string,
  dormName: string,
  index: number,
): MachineInfo {
  const id = requiredIdentifier(item, "id", `haier[${index}]`);
  const name = requiredText(item, "name", `haier[${index}]`);
  return {
    machine_id: id,
    location: `${dormName} ${name}`,
    machine_type: haierMachineType(categoryCode),
    status: haierMachineStatus(item.state),
    remaining_minutes: null,
    price_yuan: null,
    modes: [],
    provider: "haier",
  };
}

export function buildQueueEstimates(machines: MachineInfo[]): MachineQueueEstimate[] {
  const grouped = new Map<MachineType, MachineInfo[]>();
  const order: MachineType[] = [];
  for (const machine of machines) {
    if (!grouped.has(machine.machine_type)) {
      grouped.set(machine.machine_type, []);
      order.push(machine.machine_type);
    }
    grouped.get(machine.machine_type)!.push(machine);
  }
  return order.map((machineType) => {
    const typedMachines = grouped.get(machineType)!;
    const availableCount = statusCount(typedMachines, "available");
    const remaining = typedMachines
      .filter((machine) => machine.status === "running" && machine.remaining_minutes !== null)
      .map((machine) => machine.remaining_minutes!);
    return {
      machine_type: machineType,
      total_count: typedMachines.length,
      available_count: availableCount,
      running_count: statusCount(typedMachines, "running"),
      out_of_service_count: statusCount(typedMachines, "out_of_service"),
      unknown_count: statusCount(typedMachines, "unknown"),
      estimated_wait_minutes: availableCount > 0 ? 0 : remaining.length ? Math.min(...remaining) : null,
    };
  });
}

function responseData(response: unknown, context: string): unknown[] {
  const root = requiredObject(response, context);
  if (root.success !== true) throw new Error(`${context} was not successful`);
  if (!Array.isArray(root.data)) throw new Error(`${context} data must be a list`);
  return root.data;
}

function haierItems(response: unknown, context: string): unknown[] {
  const root = requiredObject(response, context);
  if (root.code !== 0) throw new Error(`${context} was not successful`);
  const data = requiredObject(root.data, `${context}.data`);
  if (!Array.isArray(data.items)) throw new Error(`${context} data.items must be a list`);
  return data.items;
}

function requiredObject(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredText(item: Record<string, unknown>, key: string, context: string): string {
  const value = item[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required ${context}.${key}`);
  }
  return value.trim();
}

function requiredIdentifier(item: Record<string, unknown>, key: string, context: string): string {
  const value = item[key];
  if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
    return String(value).trim();
  }
  throw new Error(`Missing required ${context}.${key}`);
}

function parseMacUnionCode(value: string): [string, string] {
  const parts = value.split(/\s+/);
  if (parts.length < 2) throw new Error(`Invalid macUnionCode: ${value}`);
  return [parts[0], parts[1]];
}

function machineTypeForLabel(label: string): MachineType {
  return CLEVER_SCHOOL_MACHINE_TYPES[label] ?? "unknown";
}

function haierMachineType(categoryCode: string): MachineType {
  if (categoryCode === "00") return "standard_washer";
  if (categoryCode === "01") return "shoe_washer";
  if (categoryCode === "02") return "dryer";
  return "unknown";
}

function haierMachineStatus(state: unknown): MachineStatus {
  const stateCode =
    typeof state === "number" ? state : typeof state === "string" && state.trim() ? Number(state.trim()) : NaN;
  if (stateCode === 1) return "available";
  if (stateCode === 2) return "running";
  if (stateCode === 3) return "out_of_service";
  return "unknown";
}

function machineStatus(statusText: string): MachineStatus {
  if (["脱水", "开盖", "出错", "错误", "异常", "故障"].some((token) => statusText.includes(token))) {
    return "out_of_service";
  }
  if (statusText.includes("待机") || statusText.includes("空闲") || statusText.includes("可用")) return "available";
  if (statusText.includes("工作") || statusText.includes("运转") || statusText.includes("使用") || statusText.includes("运行")) return "running";
  return "unknown";
}

function remainingMinutes(statusText: string): number | null {
  const match = statusText.match(/剩余(?:时间)?[:：]?\s*(\d+)\s*分钟/);
  return match ? Number(match[1]) : null;
}

function statusCount(machines: MachineInfo[], status: MachineStatus): number {
  return machines.filter((machine) => machine.status === status).length;
}

function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}
