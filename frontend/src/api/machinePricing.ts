import type { BackendMachine, LabeledProgramPricing, ProgramPricing } from "./types";

type PricingRulesLike = Record<string, unknown>;
type ProgramPricingLike = ProgramPricing | LabeledProgramPricing;

export interface MachineProgramOption {
  id: string;
  label: string;
  priceText: string;
  durationText: string;
  summaryText: string;
}

const PROGRAM_GROUP_BY_MACHINE_TYPE: Record<string, string> = {
  standard_washer: "wash_programs",
  dryer: "dryer_programs",
  shoe_washer: "shoe_washer_programs",
};

const DEFAULT_PROGRAM_LABELS: Record<string, string> = {
  quick: "快速洗",
  standard: "标准洗",
  large: "大件洗",
  high: "高温",
  medium: "中温",
  low: "低温",
  two_pairs: "两双洗",
  single_pair_standard: "单双标准",
  single_pair: "单双洗",
};

export function machinePriceText(machine: BackendMachine, pricingRules?: PricingRulesLike | null): string {
  if (typeof machine.price_yuan === "number" && Number.isFinite(machine.price_yuan) && machine.price_yuan >= 0) {
    return `价格：¥${formatYuan(machine.price_yuan)}`;
  }

  const prices = configuredPricesForMachine(machine, pricingRules);
  if (!prices.length) {
    return "价格：未配置";
  }

  return `价格：${formatPriceRange(prices)}`;
}

export function machineProgramOptions(machine: BackendMachine, pricingRules?: PricingRulesLike | null): MachineProgramOption[] {
  const programs = configuredProgramsForMachine(machine.machine_type, machine.provider, pricingRules);
  const supportedModes = machine.modes.length ? new Set(machine.modes) : null;
  return programs
    .filter(([programId]) => !supportedModes || supportedModes.has(programId))
    .map(([programId, program]) => {
      const priceText = `¥${formatYuan(program.price_yuan)}`;
      const durationText = `${program.duration_minutes} 分`;
      return {
        id: programId,
        label: programLabel(programId, program),
        priceText,
        durationText,
        summaryText: `${priceText} · ${durationText}`,
      };
    });
}

function configuredPricesForMachine(machine: BackendMachine, pricingRules?: PricingRulesLike | null): number[] {
  const supportedModes = machine.modes.length ? new Set(machine.modes) : null;
  return configuredProgramsForMachine(machine.machine_type, machine.provider, pricingRules)
    .filter(([programId]) => !supportedModes || supportedModes.has(programId))
    .map(([, program]) => program.price_yuan)
    .filter((price, index, allPrices) => allPrices.indexOf(price) === index)
    .sort((left, right) => left - right);
}

function configuredProgramsForMachine(
  machineType: string,
  provider: string | undefined,
  pricingRules?: PricingRulesLike | null,
): Array<[string, ProgramPricingLike]> {
  if (!pricingRules) {
    return [];
  }

  const groupKey = PROGRAM_GROUP_BY_MACHINE_TYPE[machineType];
  if (!groupKey) {
    return [];
  }

  const programGroup = providerProgramGroup(pricingRules, provider, groupKey) ?? pricingRules[groupKey];
  if (!isRecord(programGroup)) {
    return [];
  }

  return Object.entries(programGroup).filter((entry): entry is [string, ProgramPricingLike] => isProgramPricing(entry[1]));
}

function providerProgramGroup(pricingRules: PricingRulesLike, provider: string | undefined, groupKey: string): unknown {
  if (!provider) {
    return undefined;
  }
  const providerPrograms = pricingRules.provider_programs;
  if (!isRecord(providerPrograms)) {
    return undefined;
  }
  const providerRules = providerPrograms[provider];
  if (!isRecord(providerRules)) {
    return undefined;
  }
  return providerRules[groupKey];
}

function isProgramPricing(value: unknown): value is ProgramPricingLike {
  return (
    isRecord(value)
    && typeof value.price_yuan === "number"
    && Number.isFinite(value.price_yuan)
    && typeof value.duration_minutes === "number"
    && Number.isFinite(value.duration_minutes)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatPriceRange(prices: number[]): string {
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (first === last) {
    return `¥${formatYuan(first)}`;
  }
  return `¥${formatYuan(first)}-${formatYuan(last)}`;
}

function formatYuan(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function programLabel(programId: string, program: ProgramPricingLike): string {
  if ("label" in program && typeof program.label === "string" && program.label.trim()) {
    return program.label.trim();
  }
  return DEFAULT_PROGRAM_LABELS[programId] ?? programId;
}
