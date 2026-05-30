interface LoadEstimateItem {
  name?: string;
  category?: string;
  user_note?: string;
  user_notes?: string[];
  material_ratios?: Record<string, unknown>;
  colors?: string[];
}

export const WASHER_LOAD_UNITS = 100;
export const TARGET_WASHER_LOAD_UNITS = WASHER_LOAD_UNITS;

export function estimateLaundryLoadUnits(item: LoadEstimateItem): number {
  const text = itemSearchText(item);

  if (containsAny(text, ["床单", "被套", "床品", "duvet", "sheet", "bedding"])) return 65;
  if (containsAny(text, ["羽绒", "棉服", "大衣", "coat", "down"])) return 36;
  if (containsAny(text, ["外套", "夹克", "jacket"])) return 28;
  if (containsAny(text, ["卫衣", "hoodie", "sweatshirt"])) return 22;
  if (containsAny(text, ["连衣裙", "dress"])) return 18;
  if (containsAny(text, ["牛仔", "长裤", "裤", "jeans", "pants", "trousers"])) return 18;
  if (containsAny(text, ["毛巾", "浴巾", "towel"])) return 18;
  if (containsAny(text, ["内衣", "袜", "underwear", "socks", "sock"])) return 5;

  return 10;
}

export function loadPercentForItems(items: LoadEstimateItem[]): number {
  return Math.min(100, Math.round(totalLaundryLoadUnits(items)));
}

export function estimatedWasherLoadCount(items: LoadEstimateItem[], targetUnits = TARGET_WASHER_LOAD_UNITS): number {
  const totalUnits = totalLaundryLoadUnits(items);
  if (totalUnits <= 0) return 0;
  return Math.max(1, Math.ceil(totalUnits / safeTargetUnits(targetUnits)));
}

export function splitItemsByLaundryLoad<T extends LoadEstimateItem>(
  items: T[],
  targetUnits = TARGET_WASHER_LOAD_UNITS,
): T[][] {
  const splitTargetUnits = safeTargetUnits(targetUnits);
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentUnits = 0;

  for (const item of items) {
    const itemUnits = estimateLaundryLoadUnits(item);
    if (current.length > 0 && currentUnits + itemUnits > splitTargetUnits) {
      chunks.push(current);
      current = [];
      currentUnits = 0;
    }
    current.push(item);
    currentUnits += itemUnits;
  }

  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function safeTargetUnits(targetUnits: number): number {
  return Number.isFinite(targetUnits) && targetUnits > 0 ? targetUnits : TARGET_WASHER_LOAD_UNITS;
}

function totalLaundryLoadUnits(items: LoadEstimateItem[]): number {
  return items.reduce((sum, item) => sum + estimateLaundryLoadUnits(item), 0);
}

function itemSearchText(item: LoadEstimateItem): string {
  return [
    item.name,
    item.category,
    item.user_note,
    ...(item.user_notes ?? []),
    ...Object.keys(item.material_ratios ?? {}),
    ...(item.colors ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => termMatches(text, term.toLowerCase()));
}

function termMatches(text: string, term: string): boolean {
  if (/^[a-z0-9 _-]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
