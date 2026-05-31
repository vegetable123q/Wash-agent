/**
 * Mobile summary orchestration — builds the complete in-APK summary by
 * combining wardrobe data, campus context, frequency advice, laundry planning,
 * and report generation. All backend logic runs in TypeScript.
 *
 * Only the ModelHub image recognition requires an external API call
 * with user-provided credentials.
 */

import { buildCampusContextForDorm } from "./campusMachineApi";
import { listCampusTowerOptions } from "./campusTowerDirectory";
import { buildProfileFromInput, storedToPlanItem, type StoredWardrobeItem } from "./clothingExtractor";
import { adviseAllFrequencies } from "./frequencyAdvisor";
import { estimatedWasherLoadCount, loadPercentForItems } from "./laundryLoad";
import { planLaundry, recommendDrying } from "./laundryPlanner";
import { machineDisplayLabel } from "./machineDisplay";
import { deleteWardrobePhotoFile, loadWardrobePhotoDataUrl, saveWardrobePhotoDataUrl } from "./photoFileStorage";
import { loadOutfitLogs } from "./outfitLogStore";
import { DRYING_CONTEXT, PRICING_RULES } from "./pricingRules";
import { generateReport } from "./reportGenerator";
import type {
  BackendMachine,
  BackendQueueEstimate,
  CampusContext,
  CampusContextStatus,
  CampusTowerOption,
  CompletedLaundryRecord,
  CompletedLaundrySummary,
  DirtyBasketAddedAtSource,
  DirtyBasketItem,
  DirtyBasketSummary,
  DryingPlan,
  FrequencyAdvice,
  LaundryConstraints,
  LaundryPlan,
  MachineInfo,
  MachineQueueEstimate,
  MobileSummary,
  OutfitLog,
  WardrobeInput,
  WardrobeCategory,
  WardrobeSummaryItem,
  WashReport,
  WeatherSnapshot,
} from "./types";
import { fetchTsinghuaWeather } from "./weatherService";
import { normalizeDormFloor, type UserProfile } from "../userProfile";

// ─── public types re-exported for screens ───────────────────────────────

export type { BackendMachine, BackendQueueEstimate, CampusTowerOption, CompletedLaundryRecord, CompletedLaundrySummary, MobileSummary, WardrobeCategory, WardrobeInput, WardrobeSummaryItem };

// ─── wardrobe CRUD ──────────────────────────────────────────────────────

const LOCAL_WARDROBE_STORAGE_KEY = "washmate.localWardrobe";
const LOCAL_LAUNDRY_SELECTION_STORAGE_KEY = "washmate.selectedLaundryItemIds";
const LOCAL_COMPLETED_LAUNDRY_STORAGE_KEY = "washmate.completedLaundryRecords";
const DAY_MS = 24 * 60 * 60 * 1000;
let wardrobeItemIdCounter = 0;

interface DirtyBasketRecord {
  item_id: string;
  added_at: string;
  added_at_source: DirtyBasketAddedAtSource;
}

type MobileSummaryProfile = Partial<Pick<UserProfile, "dormName" | "dormFloor" | "allowDryer" | "budgetYuan" | "maxWaitMinutes">>;
type LaundryPreferenceProfile = Partial<Pick<UserProfile, "dormFloor" | "allowDryer" | "budgetYuan" | "maxWaitMinutes">>;

export async function fetchMobileSummary(profile?: MobileSummaryProfile): Promise<MobileSummary> {
  return buildIntegratedMobileSummary(profile);
}

export function rebuildMobileSummaryForSelection(
  summary: MobileSummary,
  itemIds: string[],
  profile?: LaundryPreferenceProfile,
): MobileSummary {
  const storedItems = summary.wardrobe.items;
  const validIds = new Set(storedItems.map((item) => item.item_id));
  const selectedLaundryItemIds = [...new Set(itemIds.map((id) => id.trim()).filter((id) => validIds.has(id)))];
  const existingRecords = new Map(readDirtyBasketRecords(storedItems).map((record) => [record.item_id, record]));
  const dirtyBasketRecords = selectedLaundryItemIds.map((itemId) =>
    existingRecords.get(itemId) ?? {
      item_id: itemId,
      added_at: new Date().toISOString(),
      added_at_source: "known" as DirtyBasketAddedAtSource,
    },
  );
  writeDirtyBasketRecords(dirtyBasketRecords);

  const selectedSet = new Set(selectedLaundryItemIds);
  const selectedItems = storedItems.filter((item) => selectedSet.has(item.item_id));
  const campusContext = mobileSummaryCampusContextToPlanner(summary.campus_context);
  const { frequencyAdvice, plan, dryingPlan, report } = buildLaundryArtifacts(storedItems, selectedLaundryItemIds, campusContext, profile);

  return {
    ...summary,
    selected_laundry_item_ids: selectedLaundryItemIds,
    dirty_basket: buildDirtyBasketSummary(selectedItems, dirtyBasketRecords),
    frequency_advice: frequencyAdvice,
    completed_laundry: buildCompletedLaundrySummary(readCompletedLaundryRecords()),
    plan: toMobileLaundryPlan(plan),
    drying_plan: dryingPlan,
    report,
  };
}

export async function createWardrobeItem(input: WardrobeInput): Promise<{ status: string; item: WardrobeSummaryItem }> {
  const name = input.name.trim();
  if (!name) throw new Error("name is required");
  const items = readLocalWardrobeItems();
  const itemId = nextWardrobeItemId(items.map((item) => item.item_id));
  const photoFilePath = await saveWardrobePhotoDataUrl(itemId, input.photo_data_url);

  const profile = buildProfileFromInput({
    item_id: itemId,
    name,
    material_text: input.material.trim(),
    colors_text: input.colors.trim(),
    user_note: input.note.trim(),
  });

  const item: WardrobeSummaryItem = {
    item_id: profile.item_id,
    name: profile.name,
    category: normalizeWardrobeCategory(input.category),
    user_note: profile.user_note,
    user_notes: [input.note.trim(), input.image_filename.trim()].filter(Boolean),
    wear_count_since_wash: 0,
    wash_count: 0,
    material_ratios: profile.material_ratios,
    colors: profile.colors,
    risks: Object.fromEntries(
      Object.entries(profile.risks).map(([key, level]) => [key, level]),
    ),
    ...(photoFilePath ? { photo_file_path: photoFilePath } : {}),
  };

  writeLocalWardrobeItems([...items, item]);
  return { status: "created", item: photoFilePath ? { ...item, photo_data_url: input.photo_data_url } : item };
}

export async function updateWardrobeItem(
  itemId: string,
  input: WardrobeInput,
): Promise<{ status: string; item: WardrobeSummaryItem }> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) throw new Error("item_id is required");
  const name = input.name.trim();
  if (!name) throw new Error("name is required");

  const items = readLocalWardrobeItems();
  const existing = items.find((item) => item.item_id === normalizedItemId);
  if (!existing) throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);

  const nextPhotoFilePath = input.photo_data_url
    ? await saveWardrobePhotoDataUrl(normalizedItemId, input.photo_data_url)
    : existing.photo_file_path;
  if (input.photo_data_url && existing.photo_file_path && existing.photo_file_path !== nextPhotoFilePath) {
    await deleteWardrobePhotoFile(existing.photo_file_path);
  }

  const profile = buildProfileFromInput({
    item_id: normalizedItemId,
    name,
    material_text: input.material.trim(),
    colors_text: input.colors.trim(),
    user_note: input.note.trim(),
  });

  const updatedItem: WardrobeSummaryItem = {
    ...existing,
    item_id: normalizedItemId,
    name: profile.name,
    category: normalizeWardrobeCategory(input.category),
    user_note: profile.user_note,
    user_notes: [input.note.trim(), input.image_filename.trim()].filter(Boolean),
    material_ratios: profile.material_ratios,
    colors: profile.colors,
    risks: Object.fromEntries(
      Object.entries(profile.risks).map(([key, level]) => [key, level]),
    ),
    ...(nextPhotoFilePath ? { photo_file_path: nextPhotoFilePath } : {}),
  };

  writeLocalWardrobeItems(items.map((item) => (item.item_id === normalizedItemId ? updatedItem : item)));
  return { status: "updated", item: input.photo_data_url ? { ...updatedItem, photo_data_url: input.photo_data_url } : updatedItem };
}

export async function deleteWardrobeItem(itemId: string): Promise<{ status: string; item_id: string }> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) throw new Error("item_id is required");
  const items = readLocalWardrobeItems();
  const deletedItem = items.find((item) => item.item_id === normalizedItemId);
  const nextItems = items.filter((item) => item.item_id !== normalizedItemId);
  if (nextItems.length === items.length) throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);
  writeLocalWardrobeItems(nextItems);
  await deleteWardrobePhotoFile(deletedItem?.photo_file_path);
  writeDirtyBasketRecords(readDirtyBasketRecords(nextItems));
  return { status: "deleted", item_id: normalizedItemId };
}

export async function recordWardrobeWear(itemId: string): Promise<{ status: string; item_id: string; wear_count_since_wash: number }> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) throw new Error("item_id is required");
  const items = readLocalWardrobeItems();
  let nextWearCount: number | null = null;
  const nextItems = items.map((item) => {
    if (item.item_id !== normalizedItemId) {
      return item;
    }
    nextWearCount = item.wear_count_since_wash + 1;
    return { ...item, wear_count_since_wash: nextWearCount };
  });
  if (nextWearCount == null) throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);
  writeLocalWardrobeItems(nextItems);
  return { status: "updated", item_id: normalizedItemId, wear_count_since_wash: nextWearCount };
}

export async function setWardrobeWearCount(
  itemId: string,
  wearCount: number,
): Promise<{ status: string; item_id: string; wear_count_since_wash: number }> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) throw new Error("item_id is required");
  const nextWearCount = manualWearCount(wearCount);
  const items = readLocalWardrobeItems();
  let found = false;
  const nextItems = items.map((item) => {
    if (item.item_id !== normalizedItemId) {
      return item;
    }
    found = true;
    return { ...item, wear_count_since_wash: nextWearCount };
  });
  if (!found) throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);
  writeLocalWardrobeItems(nextItems);
  return { status: "updated", item_id: normalizedItemId, wear_count_since_wash: nextWearCount };
}

export async function clearWardrobeItems(): Promise<{ status: string; deleted_count: number }> {
  const deletedCount = readLocalWardrobeItems().length;
  writeLocalWardrobeItems([]);
  writeDirtyBasketRecords([]);
  return { status: "cleared", deleted_count: deletedCount };
}

export async function setLaundrySelection(itemIds: string[]): Promise<{ status: string; selected_item_ids: string[] }> {
  const wardrobeItems = readLocalWardrobeItems();
  const validIds = new Set(wardrobeItems.map((item) => item.item_id));
  const existingRecords = new Map(readDirtyBasketRecords(wardrobeItems).map((record) => [record.item_id, record]));
  const selected = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))]
    .filter((id) => validIds.has(id));
  writeDirtyBasketRecords(selected.map((itemId) => existingRecords.get(itemId) ?? {
    item_id: itemId,
    added_at: new Date().toISOString(),
    added_at_source: "known",
  }));
  return { status: "updated", selected_item_ids: selected };
}

export async function clearLaundrySelection(): Promise<{ status: string; selected_item_ids: string[] }> {
  writeDirtyBasketRecords([]);
  return { status: "cleared", selected_item_ids: [] };
}

export async function completeLaundryPlan(
  summary?: MobileSummary | null,
): Promise<{ status: string; completed_item_ids: string[]; record: CompletedLaundryRecord | null }> {
  const items = readLocalWardrobeItems();
  const dirtyBasketRecords = readDirtyBasketRecords(items);
  const completedItemIds = dirtyBasketRecords.map((record) => record.item_id);
  const completedSet = new Set(completedItemIds);
  const selectedItems = items.filter((item) => completedSet.has(item.item_id));
  const record = completedItemIds.length ? buildCompletedLaundryRecord(selectedItems, completedItemIds, summary) : null;

  if (completedSet.size > 0) {
    const nextItems = items.map((item) =>
      completedSet.has(item.item_id)
        ? { ...item, wear_count_since_wash: 0, wash_count: item.wash_count + 1, last_washed_at: record?.completed_at ?? new Date().toISOString() }
        : item,
    );
    writeLocalWardrobeItems(nextItems);
    if (record) {
      writeCompletedLaundryRecords([record, ...readCompletedLaundryRecords()].slice(0, 20));
    }
  }
  writeDirtyBasketRecords([]);

  return { status: "completed", completed_item_ids: completedItemIds, record };
}

export async function undoCompletedLaundry(
  recordId: string,
): Promise<{ status: string; record_id: string; restored_item_ids: string[] }> {
  const normalizedRecordId = recordId.trim();
  if (!normalizedRecordId) throw new Error("record_id is required");
  const records = readCompletedLaundryRecords();
  const record = records.find((item) => item.record_id === normalizedRecordId);
  if (!record) throw new Error(`Unknown completed laundry record: ${normalizedRecordId}`);

  const snapshotById = new Map(record.before_items.map((item) => [item.item_id, item]));
  const nextItems = readLocalWardrobeItems().map((item) => {
    const snapshot = snapshotById.get(item.item_id);
    if (!snapshot) return item;
    const restored = { ...item, wear_count_since_wash: snapshot.wear_count_since_wash, wash_count: snapshot.wash_count };
    if (snapshot.last_washed_at) {
      return { ...restored, last_washed_at: snapshot.last_washed_at };
    }
    const { last_washed_at: _lastWashedAt, ...withoutLastWashedAt } = restored;
    return withoutLastWashedAt;
  });
  writeLocalWardrobeItems(nextItems);
  writeCompletedLaundryRecords(records.filter((item) => item.record_id !== normalizedRecordId));
  const validIds = new Set(nextItems.map((item) => item.item_id));
  writeDirtyBasketRecords(record.completed_item_ids.filter((id) => validIds.has(id)).map((itemId) => ({
    item_id: itemId,
    added_at: new Date().toISOString(),
    added_at_source: "known",
  })));

  return { status: "undone", record_id: normalizedRecordId, restored_item_ids: record.completed_item_ids };
}

function buildCompletedLaundryRecord(
  selectedItems: WardrobeSummaryItem[],
  completedItemIds: string[],
  summary?: MobileSummary | null,
): CompletedLaundryRecord {
  const completedAt = new Date().toISOString();
  return {
    record_id: `laundry-${Date.now().toString(36)}-${completedItemIds.join("-")}`,
    completed_at: completedAt,
    completed_item_ids: completedItemIds,
    item_names: selectedItems.map((item) => item.name),
    estimated_cost_yuan: completedCost(summary),
    estimated_duration_minutes: completedDuration(summary),
    machine_labels: completionMachineLabels(summary),
    plan_summary: summary?.plan.summary ?? `${selectedItems.map((item) => item.name).join("、")} 已完成洗涤。`,
    before_items: selectedItems.map((item) => ({
      item_id: item.item_id,
      wear_count_since_wash: item.wear_count_since_wash,
      wash_count: item.wash_count,
      ...(item.last_washed_at ? { last_washed_at: item.last_washed_at } : {}),
    })),
  };
}

function completedCost(summary?: MobileSummary | null): number | null {
  if (!summary) return null;
  const wash = optionalFiniteNonNegativeNumber(summary.plan.estimated_cost_yuan);
  const dry = optionalFiniteNonNegativeNumber(summary.drying_plan?.estimated_cost_yuan);
  if (wash == null && dry == null) return null;
  return (wash ?? 0) + (dry ?? 0);
}

function completedDuration(summary?: MobileSummary | null): number | null {
  if (!summary) return null;
  const wash = optionalFiniteNonNegativeInteger(summary.plan.estimated_duration_minutes);
  const dry = optionalFiniteNonNegativeInteger(summary.drying_plan?.estimated_duration_minutes);
  if (wash == null && dry == null) return null;
  return (wash ?? 0) + (dry ?? 0);
}

function completionMachineLabels(summary?: MobileSummary | null): string[] {
  if (!summary) return [];
  const labels = [
    ...summary.plan.buckets
      .filter((bucket) => bucket.machine_id || bucket.machine_location)
      .map((bucket) =>
        machineDisplayLabel({
          machine_id: bucket.machine_id,
          machine_location: bucket.machine_location,
          machine_type: bucket.machine_type,
        }),
      ),
    ...(summary.drying_plan?.steps ?? [])
      .filter((step) => step.dryer_machine_id || step.dryer_machine_location)
      .map((step) =>
        machineDisplayLabel({
          machine_id: step.dryer_machine_id,
          machine_location: step.dryer_machine_location,
          machine_type: "dryer",
        }),
      ),
  ];
  return [...new Set(labels.filter(Boolean))];
}

function buildCompletedLaundrySummary(records: CompletedLaundryRecord[]): CompletedLaundrySummary {
  const now = new Date();
  const weeklyRecords = records.filter((record) => sameWeek(new Date(record.completed_at), now));
  const weeklyCosts = weeklyRecords
    .map((record) => record.estimated_cost_yuan)
    .filter((value): value is number => optionalFiniteNonNegativeNumber(value) != null);
  return {
    weekly_count: weeklyRecords.length,
    weekly_cost_yuan: weeklyCosts.length ? weeklyCosts.reduce((sum, value) => sum + value, 0) : null,
    recent_records: records.slice(0, 10),
  };
}

function readCompletedLaundryRecords(): CompletedLaundryRecord[] {
  return readLocalStorageArray<unknown>(LOCAL_COMPLETED_LAUNDRY_STORAGE_KEY, "本地洗衣记录无法读取")
    .map(completedRecordFromStorage)
    .filter((record): record is CompletedLaundryRecord => record !== null)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
}

function writeCompletedLaundryRecords(records: CompletedLaundryRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_COMPLETED_LAUNDRY_STORAGE_KEY, JSON.stringify(records));
}

function completedRecordFromStorage(value: unknown): CompletedLaundryRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<CompletedLaundryRecord>;
  const recordId = String(raw.record_id ?? "").trim();
  const completedAt = validIsoDate(raw.completed_at) ? String(raw.completed_at) : "";
  const completedItemIds = stringArray(raw.completed_item_ids);
  const beforeItems = Array.isArray(raw.before_items)
    ? raw.before_items
        .map(completedSnapshotFromStorage)
        .filter((item): item is CompletedLaundryRecord["before_items"][number] => item !== null)
    : [];
  if (!recordId || !completedAt || !completedItemIds.length) return null;
  return {
    record_id: recordId,
    completed_at: completedAt,
    completed_item_ids: completedItemIds,
    item_names: stringArray(raw.item_names),
    estimated_cost_yuan: optionalFiniteNonNegativeNumber(raw.estimated_cost_yuan),
    estimated_duration_minutes: optionalFiniteNonNegativeInteger(raw.estimated_duration_minutes),
    machine_labels: stringArray(raw.machine_labels),
    plan_summary: String(raw.plan_summary ?? "").trim(),
    before_items: beforeItems,
  };
}

function completedSnapshotFromStorage(value: unknown): CompletedLaundryRecord["before_items"][number] | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<CompletedLaundryRecord["before_items"][number]>;
  const itemId = String(raw.item_id ?? "").trim();
  if (!itemId) return null;
  return {
    item_id: itemId,
    wear_count_since_wash: nonNegativeInteger(raw.wear_count_since_wash),
    wash_count: nonNegativeInteger(raw.wash_count),
    ...(validIsoDate(raw.last_washed_at) ? { last_washed_at: String(raw.last_washed_at) } : {}),
  };
}

function optionalFiniteNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function optionalFiniteNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : null;
}

function sameWeek(left: Date, right: Date): boolean {
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return weekStart(left).getTime() === weekStart(right).getTime();
}

function weekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

// ─── integrated summary builder ─────────────────────────────────────────

async function buildIntegratedMobileSummary(profile?: MobileSummaryProfile): Promise<MobileSummary> {
  const storedItems = await hydrateWardrobePhotoDataUrls(readLocalWardrobeItems());

  let weather: WeatherSnapshot = await fetchTsinghuaWeather();
  let campusContext: CampusContext;
  let campusStatus: CampusContextStatus;
  const dormName = profile?.dormName?.trim() ?? "";

  if (!dormName) {
    campusContext = emptyCampusContext(weather);
    campusStatus = {
      state: "unconfigured",
      dorm_name: "",
      message: "请先在“我的”选择宿舍楼。",
      updated_at: new Date().toISOString(),
    };
  } else {
    try {
      campusContext = await buildCampusContextForDorm(dormName, {
        weather: weather as unknown as Record<string, unknown>,
        dryingContext: { ...DRYING_CONTEXT },
        pricingRules: campusPricingRules(),
      });
      campusStatus = {
        state: "live",
        dorm_name: dormName,
        message: `已读取 ${campusContext.all_machines.length} 台实时机器记录。`,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      campusContext = emptyCampusContext(weather);
      campusStatus = {
        state: "unavailable",
        dorm_name: dormName,
        message: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      };
    }
  }

  const dirtyBasketRecords = readDirtyBasketRecords(storedItems);
  if (dirtyBasketRecords.length > 0) {
    writeDirtyBasketRecords(dirtyBasketRecords);
  }
  const selectedLaundryItemIds = dirtyBasketRecords.map((record) => record.item_id);
  const selectedItems = storedItems.filter((item) => selectedLaundryItemIds.includes(item.item_id));
  const { frequencyAdvice, plan, dryingPlan, report } = buildLaundryArtifacts(storedItems, selectedLaundryItemIds, campusContext, profile);

  // Build the summary for screens
  const allMachines: BackendMachine[] = campusContext.all_machines.map(toBackendMachine);
  const availableMachines: BackendMachine[] = campusContext.available_machines.map(toBackendMachine);

  return {
    source: "backend",
    selected_laundry_item_ids: selectedLaundryItemIds,
    dirty_basket: buildDirtyBasketSummary(selectedItems, dirtyBasketRecords),
    weather,
    campus_towers: listCampusTowerOptions(),
    campus_status: campusStatus,
    wardrobe: { items: storedItems },
    frequency_advice: frequencyAdvice,
    campus_context: {
      all_machines: allMachines,
      available_machines: availableMachines,
      queue_estimates: campusContext.queue_estimates.map(toBackendQueueEstimate),
      weather: campusContext.weather,
      drying_context: campusContext.drying_context,
      pricing_rules: {
        ...campusContext.pricing_rules,
        source: "integrated",
      },
    },
    completed_laundry: buildCompletedLaundrySummary(readCompletedLaundryRecords()),
    plan: toMobileLaundryPlan(plan),
    drying_plan: dryingPlan,
    report,
  };
}

function buildLaundryArtifacts(
  storedItems: WardrobeSummaryItem[],
  selectedLaundryItemIds: string[],
  campusContext: CampusContext,
  profile?: LaundryPreferenceProfile,
): { frequencyAdvice: FrequencyAdvice[]; plan: LaundryPlan; dryingPlan?: DryingPlan; report: WashReport } {
  const usageAwareItems = enrichWardrobeUsageDates(storedItems, readCompletedLaundryRecords(), loadOutfitLogs());
  const planItems = usageAwareItems.map(storedToPlanItem);
  const constraints: LaundryConstraints = {
    selected_item_ids: selectedLaundryItemIds,
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: Boolean(profile?.allowDryer),
    hygiene_sensitive: true,
    max_wait_minutes: profile?.maxWaitMinutes ?? null,
    budget_yuan: profile?.budgetYuan ?? null,
    preferred_machine_floor: profileFloorNumber(profile?.dormFloor),
  };
  const frequencyAdvice = adviseAllFrequencies(planItems, constraints);

  if (selectedLaundryItemIds.length === 0) {
    return {
      frequencyAdvice,
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "请选择本次要清洗的衣物后生成洗护安排。",
        global_warnings: [],
      },
      report: {
        title: "本次洗护报告",
        sections: {
          "洗衣步骤": "请选择本次要清洗的衣物后生成洗护安排。",
          "费用和时间": "费用待确认。",
          "机器环境": `当前可用洗衣设备 ${campusContext.available_machines.length} 台。`,
          "风险提醒": "本次没有额外风险提醒。",
        },
        savings_notes: [],
        risk_notes: [],
      },
    };
  }

  try {
    const selectedPlanItems = planItems.filter((item) =>
      selectedLaundryItemIds.includes(item.profile.item_id),
    );
    const plan = planLaundry(selectedPlanItems, constraints, campusContext);
    const dryingPlan = recommendDrying(plan.buckets, campusContext, {
      allowDryer: Boolean(profile?.allowDryer),
      preferredMachineFloor: profileFloorNumber(profile?.dormFloor),
      items: selectedPlanItems,
    });
    return { frequencyAdvice, plan, dryingPlan, report: generateReport(plan, selectedPlanItems, campusContext, dryingPlan) };
  } catch {
    return {
      frequencyAdvice,
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "当前机器条件不足以生成完整方案，建议稍后刷新。",
        global_warnings: ["未能匹配到可用机器，请检查机器状态或手动选择。"],
      },
      report: {
        title: "本次洗护报告",
        sections: {
          "洗衣步骤": "方案生成需要可用机器，请稍后刷新或手动查看机器状态。",
          "费用和时间": "暂时无法估算。",
          "机器环境": `当前可用洗衣设备 ${campusContext.available_machines.length} 台。`,
          "风险提醒": "未能生成完整方案，请留意深浅色分开洗等基本规则。",
        },
        savings_notes: [],
        risk_notes: [],
      },
    };
  }
}

function enrichWardrobeUsageDates(
  storedItems: WardrobeSummaryItem[],
  completedRecords: CompletedLaundryRecord[],
  outfitLogs: OutfitLog[],
): WardrobeSummaryItem[] {
  const lastWashedByItem = latestCompletedAtByItem(completedRecords, storedItems);
  const wornDatesByItem = wornDatesByItemId(outfitLogs);

  return storedItems.map((item) => {
    const lastWashedAt = lastWashedByItem.get(item.item_id);
    const lastWashedTime = lastWashedAt ? Date.parse(lastWashedAt) : null;
    const wornDates = (wornDatesByItem.get(item.item_id) ?? [])
      .filter((date) => {
        const wornTime = Date.parse(date);
        return Number.isFinite(wornTime) && (lastWashedTime == null || wornTime >= lastWashedTime);
      })
      .sort();
    const firstWornAfterWashAt = wornDates[0];
    const lastWornAt = wornDates[wornDates.length - 1];

    return {
      ...item,
      ...(lastWashedAt ? { last_washed_at: lastWashedAt } : {}),
      ...(firstWornAfterWashAt ? { first_worn_after_wash_at: firstWornAfterWashAt } : {}),
      ...(lastWornAt ? { last_worn_at: lastWornAt } : {}),
    };
  });
}

function latestCompletedAtByItem(
  completedRecords: CompletedLaundryRecord[],
  storedItems: WardrobeSummaryItem[],
): Map<string, string> {
  const result = new Map<string, string>();
  for (const item of storedItems) {
    if (validIsoDate(item.last_washed_at)) {
      result.set(item.item_id, String(item.last_washed_at));
    }
  }
  for (const record of completedRecords) {
    if (!validIsoDate(record.completed_at)) continue;
    for (const itemId of record.completed_item_ids) {
      const current = result.get(itemId);
      if (!current || Date.parse(record.completed_at) > Date.parse(current)) {
        result.set(itemId, record.completed_at);
      }
    }
  }
  return result;
}

function wornDatesByItemId(outfitLogs: OutfitLog[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const log of outfitLogs) {
    if (!validIsoDate(log.date)) continue;
    for (const itemId of outfitLogItemIds(log)) {
      const dates = result.get(itemId) ?? [];
      dates.push(log.date);
      result.set(itemId, dates);
    }
  }
  return result;
}

function outfitLogItemIds(log: OutfitLog): string[] {
  const topIds = Array.isArray(log.top_ids) ? log.top_ids : [];
  const bottomIds = Array.isArray(log.bottom_ids) ? log.bottom_ids : [];
  const outerIds = Array.isArray(log.outer_ids) ? log.outer_ids : [];
  const accessoryIds = Array.isArray(log.accessory_ids) ? log.accessory_ids : [];
  return [...topIds, ...bottomIds, ...outerIds, ...accessoryIds]
    .map((id) => id.trim())
    .filter(Boolean);
}

function toMobileLaundryPlan(plan: LaundryPlan): MobileSummary["plan"] {
  return {
    buckets: plan.buckets.map((b) => ({
      bucket_id: b.bucket_id,
      item_ids: b.item_ids,
      wash_method: b.wash_method,
      machine_type: b.machine_type,
      machine_id: b.machine_id,
      machine_location: b.machine_location,
      machine_floor: b.machine_floor,
      program: b.program,
      detergent_ml: b.detergent_ml,
      use_laundry_bag: b.use_laundry_bag,
      dry_method: b.dry_method,
      estimated_cost_yuan: b.estimated_cost_yuan,
      estimated_duration_minutes: b.estimated_duration_minutes,
      warnings: b.warnings,
    })),
    estimated_cost_yuan: plan.estimated_cost_yuan,
    estimated_duration_minutes: plan.estimated_duration_minutes,
    summary: plan.summary,
    global_warnings: plan.global_warnings,
  };
}

function emptyCampusContext(weather: WeatherSnapshot): CampusContext {
  return {
    all_machines: [],
    available_machines: [],
    queue_estimates: [],
    weather: weather as unknown as Record<string, unknown>,
    drying_context: { ...DRYING_CONTEXT },
    pricing_rules: campusPricingRules(),
  };
}

function campusPricingRules(): CampusContext["pricing_rules"] {
  return {
    wash_programs: PRICING_RULES.wash_programs,
    dryer_programs: PRICING_RULES.dryer_programs,
    shoe_washer_programs: PRICING_RULES.shoe_washer_programs,
    provider_programs: PRICING_RULES.provider_programs,
    washer_types: PRICING_RULES.washer_types,
    dryer_modes: PRICING_RULES.dryer_modes,
  };
}

function mobileSummaryCampusContextToPlanner(context: MobileSummary["campus_context"]): CampusContext {
  const pricingRules = context.pricing_rules as Partial<CampusContext["pricing_rules"]>;
  return {
    all_machines: context.all_machines.map(fromBackendMachine),
    available_machines: context.available_machines.map(fromBackendMachine),
    queue_estimates: context.queue_estimates.map(fromBackendQueueEstimate),
    weather: context.weather,
    drying_context: context.drying_context,
    pricing_rules: {
      wash_programs: pricingRules.wash_programs ?? PRICING_RULES.wash_programs,
      dryer_programs: pricingRules.dryer_programs ?? PRICING_RULES.dryer_programs,
      shoe_washer_programs: pricingRules.shoe_washer_programs,
      provider_programs: pricingRules.provider_programs,
      washer_types: pricingRules.washer_types,
      dryer_modes: pricingRules.dryer_modes,
    },
  };
}

function fromBackendMachine(machine: BackendMachine): MachineInfo {
  return {
    machine_id: machine.machine_id,
    location: machine.location,
    machine_floor: machine.machine_floor ?? null,
    machine_type: machine.machine_type as MachineInfo["machine_type"],
    status: machine.status as MachineInfo["status"],
    remaining_minutes: machine.remaining_minutes,
    price_yuan: machine.price_yuan,
    modes: machine.modes,
    provider: machine.provider,
  };
}

function fromBackendQueueEstimate(estimate: BackendQueueEstimate): MachineQueueEstimate {
  return {
    machine_type: estimate.machine_type as MachineQueueEstimate["machine_type"],
    total_count: estimate.total_count,
    available_count: estimate.available_count,
    running_count: estimate.running_count,
    out_of_service_count: estimate.out_of_service_count,
    unknown_count: estimate.unknown_count,
    estimated_wait_minutes: estimate.estimated_wait_minutes,
  };
}

function profileFloorNumber(value: unknown): number | null {
  const normalized = normalizeDormFloor(value);
  return normalized ? Number(normalized) : null;
}

// ─── local storage ──────────────────────────────────────────────────────

function readLocalWardrobeItems(): WardrobeSummaryItem[] {
  const parsed = readLocalStorageArray<unknown>(LOCAL_WARDROBE_STORAGE_KEY, "本地衣柜数据无法读取");
  const normalized = parsed.map(normalizeStoredWardrobeItem);
  const normalizationChanged = JSON.stringify(parsed) !== JSON.stringify(normalized);
  const repaired = repairDuplicateWardrobeItemIds(normalized);
  if (normalizationChanged || repaired.changed) {
    writeLocalWardrobeItems(repaired.items);
  }
  return repaired.items;
}

function writeLocalWardrobeItems(items: WardrobeSummaryItem[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_WARDROBE_STORAGE_KEY, JSON.stringify(items.map(toStoredWardrobeItem)));
}

function normalizeStoredWardrobeItem(value: unknown): WardrobeSummaryItem {
  const item = typeof value === "object" && value !== null ? (value as Partial<WardrobeSummaryItem>) : {};
  const photoFilePath = String(item.photo_file_path ?? "").trim();
  return {
    item_id: String(item.item_id ?? "").trim(),
    name: String(item.name ?? "未命名衣物").trim() || "未命名衣物",
    category: normalizeWardrobeCategory(item.category),
    user_note: String(item.user_note ?? "").trim(),
    user_notes: stringArray(item.user_notes),
    wear_count_since_wash: nonNegativeInteger(item.wear_count_since_wash),
    wash_count: nonNegativeInteger(item.wash_count),
    ...(validIsoDate(item.last_washed_at) ? { last_washed_at: String(item.last_washed_at) } : {}),
    material_ratios: normalizeMaterialRatioRecord(item.material_ratios),
    colors: stringArray(item.colors),
    risks: normalizeStoredRiskRecord(item.risks),
    ...(photoFilePath ? { photo_file_path: photoFilePath } : {}),
  };
}

function toStoredWardrobeItem(item: WardrobeSummaryItem): WardrobeSummaryItem {
  const {
    photo_data_url: _photoDataUrl,
    first_worn_after_wash_at: _firstWornAfterWashAt,
    last_worn_at: _lastWornAt,
    ...storedItem
  } = item;
  return storedItem;
}

async function hydrateWardrobePhotoDataUrls(items: WardrobeSummaryItem[]): Promise<WardrobeSummaryItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.photo_file_path) return item;
      const photoDataUrl = await loadWardrobePhotoDataUrl(item.photo_file_path);
      return photoDataUrl ? { ...item, photo_data_url: photoDataUrl } : item;
    }),
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function nonNegativeInteger(value: unknown): number {
  const numeric = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) && Number.isInteger(numeric) && numeric >= 0 ? numeric : 0;
}

function manualWearCount(value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("wear_count_since_wash must be a non-negative integer");
  }
  return value;
}

function normalizeMaterialRatioRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, rawRatio] of Object.entries(value as Record<string, unknown>)) {
    const material = key.trim().toLowerCase();
    const ratio = storageRatioNumber(rawRatio);
    if (material && Number.isFinite(ratio) && ratio > 0) {
      result[material] = Math.min(ratio > 1 ? ratio / 100 : ratio, 1);
    }
  }
  return result;
}

function storageRatioNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return Number(trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed);
  }
  return Number.NaN;
}

function normalizeStoredRiskRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, rawLevel] of Object.entries(value as Record<string, unknown>)) {
    const riskKey = key.trim();
    if (!riskKey) continue;
    const level = String(rawLevel).trim().toLowerCase();
    result[riskKey] = ["low", "medium", "high", "unknown"].includes(level) ? level : "unknown";
  }
  return result;
}

function nextWardrobeItemId(existingIds: Iterable<string>): string {
  const existing = new Set(existingIds);
  let candidate = "";
  do {
    wardrobeItemIdCounter += 1;
    candidate = `wm-user-${Date.now().toString(36)}-${wardrobeItemIdCounter.toString(36)}`;
  } while (existing.has(candidate));
  return candidate;
}

function repairDuplicateWardrobeItemIds(items: WardrobeSummaryItem[]): { items: WardrobeSummaryItem[]; changed: boolean } {
  const seen = new Set<string>();
  let changed = false;
  const repairedItems = items.map((item) => {
    const itemId = String(item.item_id ?? "").trim();
    if (!itemId || seen.has(itemId)) {
      const nextId = nextWardrobeItemId(seen);
      seen.add(nextId);
      changed = true;
      return { ...item, item_id: nextId };
    }
    seen.add(itemId);
    return item;
  });
  return { items: repairedItems, changed };
}

function normalizeWardrobeCategory(value: unknown): WardrobeCategory | undefined {
  const category = typeof value === "string" ? value.trim() : "";
  return wardrobeCategories().includes(category as WardrobeCategory) ? (category as WardrobeCategory) : undefined;
}

function wardrobeCategories(): WardrobeCategory[] {
  return ["上衣", "裤装", "裙装", "外套", "内衣袜子", "床品", "鞋包配饰", "其他"];
}

function readDirtyBasketRecords(items: WardrobeSummaryItem[]): DirtyBasketRecord[] {
  const parsed = readLocalStorageArray<unknown>(LOCAL_LAUNDRY_SELECTION_STORAGE_KEY, "本地脏衣篮选择无法读取");
  const validIds = new Set(items.map((item) => item.item_id));
  const seen = new Set<string>();
  const records: DirtyBasketRecord[] = [];

  for (const entry of parsed) {
    const record = dirtyBasketRecordFromStorage(entry);
    if (!record || !validIds.has(record.item_id) || seen.has(record.item_id)) {
      continue;
    }
    seen.add(record.item_id);
    records.push(record);
  }

  return records;
}

function dirtyBasketRecordFromStorage(value: unknown): DirtyBasketRecord | null {
  if (typeof value === "string") {
    const itemId = value.trim();
    return itemId ? { item_id: itemId, added_at: new Date().toISOString(), added_at_source: "estimated" } : null;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as Partial<DirtyBasketRecord>;
  const itemId = String(raw.item_id ?? "").trim();
  if (!itemId) {
    return null;
  }
  const hasValidAddedAt = validIsoDate(raw.added_at);
  const addedAt = hasValidAddedAt ? String(raw.added_at) : new Date().toISOString();
  const addedAtSource =
    raw.added_at_source === "estimated" || !hasValidAddedAt ? "estimated" : "known";
  return { item_id: itemId, added_at: addedAt, added_at_source: addedAtSource };
}

function validIsoDate(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function readLocalStorageArray<T>(key: string, invalidMessage: string): T[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  const saved = localStorage.getItem(key);
  if (!saved) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error(invalidMessage);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(invalidMessage);
  }
  return parsed as T[];
}

function writeDirtyBasketRecords(records: DirtyBasketRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_LAUNDRY_SELECTION_STORAGE_KEY, JSON.stringify(records));
}

function buildDirtyBasketSummary(
  selectedItems: WardrobeSummaryItem[],
  records: DirtyBasketRecord[],
): DirtyBasketSummary {
  const itemCount = selectedItems.length;
  const loadPercent = loadPercentForItems(selectedItems);
  const estimatedLoadCount = estimatedWasherLoadCount(selectedItems);
  const itemMap = new Map(selectedItems.map((item) => [item.item_id, item]));
  const basketItems: DirtyBasketItem[] = records
    .map((record) => {
      const item = itemMap.get(record.item_id);
      if (!item) return null;
      const daysInBasket = daysSince(record.added_at);
      return {
        item_id: item.item_id,
        name: item.name,
        added_at: record.added_at,
        added_at_source: record.added_at_source,
        days_in_basket: daysInBasket,
        warning_label: record.added_at_source === "estimated" ? "加入时间待确认" : dirtyBasketWarningLabel(item, daysInBasket),
      };
    })
    .filter((item): item is DirtyBasketItem => item !== null);
  const oldestDays = Math.max(0, ...basketItems.map((item) => item.days_in_basket));
  const urgentCount = selectedItems.filter(isUrgentItem).length;
  const hasUrgentItem = selectedItems.some(isUrgentItem);

  if (itemCount === 0) {
    return {
      item_count: 0,
      load_percent: 0,
      estimated_load_count: 0,
      oldest_days: 0,
      urgent_count: 0,
      status_label: "空篮",
      recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
      next_action: "去衣柜选择这批要洗的衣物",
      items: [],
    };
  }

  if (oldestDays >= 3) {
    const multipleLoadText = estimatedLoadCount > 1 ? `这批约 ${estimatedLoadCount} 桶，建议分批处理；` : "";
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: estimatedLoadCount > 1 ? "需要分多桶" : "久放需洗",
      recommendation: `${multipleLoadText}有衣物已放 ${oldestDays} 天，建议今天处理，运动衣、贴身衣物或潮湿衣物不要继续攒。`,
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  if (estimatedLoadCount > 1) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: "需要分多桶",
      recommendation: `这批脏衣约 ${estimatedLoadCount} 桶，建议按方案分批清洗，避免一次塞太满导致洗不净。`,
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  if (hasUrgentItem) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: "有急用衣物",
      recommendation: "这批里有明天要穿的衣物，建议今天洗，不必继续等满桶。",
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  if (loadPercent >= 80) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: "基本够一桶",
      recommendation: "这批脏衣已经接近一桶，可以直接生成方案。",
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  return {
    item_count: itemCount,
    load_percent: loadPercent,
    estimated_load_count: estimatedLoadCount,
    oldest_days: oldestDays,
    urgent_count: urgentCount,
    status_label: "还没满桶",
    recommendation: "普通衣物可继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。",
    next_action: "继续攒或先洗急用衣物",
    items: basketItems,
  };
}

function daysSince(value: string): number {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - timestamp) / DAY_MS));
}

function dirtyBasketWarningLabel(item: WardrobeSummaryItem, daysInBasket: number): string {
  if (isUrgentItem(item)) {
    return "急用";
  }
  if (daysInBasket >= 2 && isHygieneSensitiveItem(item)) {
    return "久放易有味";
  }
  if (Object.values(item.risks).includes("high")) {
    return "分开洗";
  }
  if (daysInBasket > 0) {
    return `已放 ${daysInBasket} 天`;
  }
  return "刚加入";
}

function isUrgentItem(item: WardrobeSummaryItem): boolean {
  const text = itemSearchText(item);
  if (["不急", "不用急", "不着急", "not urgent"].some((term) => text.includes(term))) {
    return false;
  }
  return text.includes("明天要穿") || text.includes("急") || text.includes("urgent");
}

function isHygieneSensitiveItem(item: WardrobeSummaryItem): boolean {
  const text = itemSearchText(item);
  if (["没出汗", "未出汗", "不出汗", "不潮湿", "不湿"].some((term) => text.includes(term))) {
    return false;
  }
  return ["运动", "速干", "内衣", "贴身", "袜", "出汗", "潮湿", "湿"].some((term) => text.includes(term));
}

function itemSearchText(item: WardrobeSummaryItem): string {
  return [item.name, item.user_note, ...(item.user_notes ?? [])].join(" ").toLowerCase();
}

// ─── type converters ────────────────────────────────────────────────────

function toBackendMachine(m: MachineInfo): BackendMachine {
  return {
    machine_id: m.machine_id,
    location: m.location,
    machine_floor: m.machine_floor ?? null,
    machine_type: m.machine_type,
    status: m.status,
    remaining_minutes: m.remaining_minutes,
    price_yuan: m.price_yuan,
    modes: m.modes,
    provider: m.provider,
  };
}

function toBackendQueueEstimate(e: { machine_type: string; total_count: number; available_count: number; running_count: number; out_of_service_count: number; unknown_count: number; estimated_wait_minutes: number | null }): BackendQueueEstimate {
  return {
    machine_type: e.machine_type,
    total_count: e.total_count,
    available_count: e.available_count,
    running_count: e.running_count,
    out_of_service_count: e.out_of_service_count,
    unknown_count: e.unknown_count,
    estimated_wait_minutes: e.estimated_wait_minutes,
  };
}
