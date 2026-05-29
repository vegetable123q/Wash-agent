/**
 * Campus context aggregation — builds machine lists, queue estimates,
 * weather, drying context, and pricing from embedded config + live weather.
 * Mirrors backend/campus/context.py.
 */

import { machines } from "../data/washMateContent";
import type { MachineView } from "../data/washMateContent";
import { DRYING_CONTEXT, PRICING_RULES } from "./pricingRules";
import type {
  CampusContext,
  MachineInfo,
  MachineQueueEstimate,
  MachineStatus,
  MachineType,
} from "./types";
export type { MachineInfo };
import { fetchTsinghuaWeather, type WeatherSnapshot } from "./weatherService";

/** Convert a static MachineView to a normalized MachineInfo. */
export function machineInfoFromView(view: MachineView): MachineInfo {
  return {
    machine_id: view.backendId,
    location: view.location,
    machine_type: view.backendType,
    status: view.backendStatus as MachineStatus,
    capacity_kg: parseNumber(view.capacity),
    remaining_minutes: parseNumber(view.remaining),
    price_yuan: parsePriceYuan(view.price),
    modes: view.modes,
  };
}

function parseNumber(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parsePriceYuan(value: string): number | null {
  if (value === "--") return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/** Build MachineInfo list from static data. */
export function buildMachineInfoList(): MachineInfo[] {
  return machines.map(machineInfoFromView);
}

/** Compute queue estimates for each machine type. */
export function buildQueueEstimates(allMachines: MachineInfo[]): MachineQueueEstimate[] {
  const grouped = new Map<MachineType, MachineInfo[]>();
  const order: MachineType[] = [];

  for (const machine of allMachines) {
    if (!grouped.has(machine.machine_type)) {
      grouped.set(machine.machine_type, []);
      order.push(machine.machine_type);
    }
    grouped.get(machine.machine_type)!.push(machine);
  }

  return order.map((machineType) => {
    const typed = grouped.get(machineType)!;
    const available = countByStatus(typed, "available");
    const running = countByStatus(typed, "running");
    const outOfService = countByStatus(typed, "out_of_service");
    const unknown = countByStatus(typed, "unknown");
    const remaining = typed
      .filter((m) => m.status === "running" && m.remaining_minutes != null)
      .map((m) => m.remaining_minutes!);

    let estimatedWait: number | null = null;
    if (available > 0) {
      estimatedWait = 0;
    } else if (remaining.length > 0) {
      estimatedWait = Math.min(...remaining);
    }

    return {
      machine_type: machineType,
      total_count: typed.length,
      available_count: available,
      running_count: running,
      out_of_service_count: outOfService,
      unknown_count: unknown,
      estimated_wait_minutes: estimatedWait,
    };
  });
}

function countByStatus(machines: MachineInfo[], status: MachineStatus): number {
  return machines.filter((m) => m.status === status).length;
}

/** Build the full CampusContext, optionally with live weather. */
export function buildCampusContext(weather?: WeatherSnapshot): CampusContext {
  const allMachines = buildMachineInfoList();
  const availableMachines = allMachines.filter((m) => m.status === "available");

  return {
    all_machines: allMachines,
    available_machines: availableMachines,
    queue_estimates: buildQueueEstimates(allMachines),
    weather: (weather ?? { status: "unavailable" }) as Record<string, unknown>,
    drying_context: { ...DRYING_CONTEXT },
    pricing_rules: {
      wash_programs: PRICING_RULES.wash_programs,
      dryer_programs: PRICING_RULES.dryer_programs,
    },
  };
}

/** Async version that also fetches live weather. */
export async function fetchCampusContext(): Promise<{ context: CampusContext; weather: WeatherSnapshot }> {
  const weather = await fetchTsinghuaWeather();
  const context = buildCampusContext(weather);
  return { context, weather };
}
