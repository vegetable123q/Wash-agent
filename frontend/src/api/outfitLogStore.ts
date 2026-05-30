/**
 * Outfit log storage — manages daily outfit records and clothing pair
 * co-occurrence statistics in localStorage.
 */

import type { ClothingPair, OutfitLog } from "./types";

export type { ClothingPair, OutfitLog };

const OUTFIT_LOGS_KEY = "washmate.outfitLogs";
const CLOTHING_PAIRS_KEY = "washmate.clothingPairs";

// ─── outfit log CRUD ────────────────────────────────────────────────────

export function loadOutfitLogs(): OutfitLog[] {
  const raw = localStorage.getItem(OUTFIT_LOGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidOutfitLog);
  } catch {
    return [];
  }
}

export function saveOutfitLog(log: OutfitLog): void {
  const logs = loadOutfitLogs();
  const index = logs.findIndex((entry) => entry.date === log.date);
  if (index >= 0) {
    logs[index] = log;
  } else {
    logs.push(log);
  }
  logs.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(OUTFIT_LOGS_KEY, JSON.stringify(logs));
  updateClothingPairs(logs);
}

export function deleteOutfitLog(date: string): void {
  const logs = loadOutfitLogs().filter((entry) => entry.date !== date);
  localStorage.setItem(OUTFIT_LOGS_KEY, JSON.stringify(logs));
  updateClothingPairs(logs);
}

export function getTodayLog(): OutfitLog | null {
  const today = todayDateString();
  return loadOutfitLogs().find((entry) => entry.date === today) ?? null;
}

export function getLogsInRange(start: string, end: string): OutfitLog[] {
  return loadOutfitLogs().filter((entry) => entry.date >= start && entry.date <= end);
}

export function getRecentLogs(count: number): OutfitLog[] {
  return loadOutfitLogs().slice(0, count);
}

// ─── clothing pair statistics ───────────────────────────────────────────

export function loadClothingPairs(): ClothingPair[] {
  const raw = localStorage.getItem(CLOTHING_PAIRS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidClothingPair);
  } catch {
    return [];
  }
}

export function getTopPairs(limit: number): ClothingPair[] {
  return loadClothingPairs()
    .sort((a, b) => b.co_wear_count - a.co_wear_count)
    .slice(0, limit);
}

export function updateClothingPairs(logs?: OutfitLog[]): ClothingPair[] {
  const source = logs ?? loadOutfitLogs();
  const pairMap = new Map<string, ClothingPair>();

  for (const log of source) {
    // top-bottom pairs
    for (const topId of log.top_ids) {
      for (const bottomId of log.bottom_ids) {
        incrementPair(pairMap, topId, bottomId, "top-bottom");
      }
    }
    // outer-top pairs
    for (const outerId of log.outer_ids) {
      for (const topId of log.top_ids) {
        incrementPair(pairMap, outerId, topId, "outer-top");
      }
    }
    // outer-bottom pairs (as outer-top type, grouped under outer)
    for (const outerId of log.outer_ids) {
      for (const bottomId of log.bottom_ids) {
        incrementPair(pairMap, outerId, bottomId, "outer-top");
      }
    }
  }

  const pairs = Array.from(pairMap.values())
    .filter((pair) => pair.co_wear_count >= 1)
    .sort((a, b) => b.co_wear_count - a.co_wear_count);

  localStorage.setItem(CLOTHING_PAIRS_KEY, JSON.stringify(pairs));
  return pairs;
}

// ─── helpers ────────────────────────────────────────────────────────────

function incrementPair(
  map: Map<string, ClothingPair>,
  idA: string,
  idB: string,
  pairType: ClothingPair["pair_type"],
): void {
  const key = pairKey(idA, idB, pairType);
  const existing = map.get(key);
  if (existing) {
    existing.co_wear_count += 1;
  } else {
    map.set(key, { item_a: idA, item_b: idB, co_wear_count: 1, pair_type: pairType });
  }
}

function pairKey(idA: string, idB: string, pairType: ClothingPair["pair_type"]): string {
  const sorted = [idA, idB].sort();
  return `${sorted[0]}::${sorted[1]}::${pairType}`;
}

function isValidOutfitLog(value: unknown): value is OutfitLog {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const log = value as Record<string, unknown>;
  return (
    typeof log.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(log.date) &&
    Array.isArray(log.top_ids) &&
    Array.isArray(log.bottom_ids)
  );
}

function isValidClothingPair(value: unknown): value is ClothingPair {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pair = value as Record<string, unknown>;
  return (
    typeof pair.item_a === "string" &&
    typeof pair.item_b === "string" &&
    typeof pair.co_wear_count === "number" &&
    ["top-bottom", "top-top", "outer-top"].includes(pair.pair_type as string)
  );
}

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
