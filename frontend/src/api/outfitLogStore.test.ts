import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteOutfitLog,
  getLogsInRange,
  getRecentLogs,
  getTodayLog,
  loadClothingPairs,
  loadOutfitLogs,
  saveOutfitLog,
  todayDateString,
  updateClothingPairs,
} from "./outfitLogStore";

beforeEach(() => {
  localStorage.clear();
});

describe("outfitLogStore", () => {
  it("starts with empty logs", () => {
    expect(loadOutfitLogs()).toEqual([]);
    expect(loadClothingPairs()).toEqual([]);
  });

  it("saves and loads an outfit log", () => {
    const log = {
      date: "2026-05-30",
      top_ids: ["top-1"],
      bottom_ids: ["bottom-1"],
      outer_ids: [],
      accessory_ids: [],
    };
    saveOutfitLog(log);
    const logs = loadOutfitLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].date).toBe("2026-05-30");
    expect(logs[0].top_ids).toEqual(["top-1"]);
    expect(logs[0].bottom_ids).toEqual(["bottom-1"]);
  });

  it("replaces log for the same date", () => {
    saveOutfitLog({
      date: "2026-05-30",
      top_ids: ["top-1"],
      bottom_ids: ["bottom-1"],
      outer_ids: [],
      accessory_ids: [],
    });
    saveOutfitLog({
      date: "2026-05-30",
      top_ids: ["top-2"],
      bottom_ids: ["bottom-2"],
      outer_ids: [],
      accessory_ids: [],
    });
    const logs = loadOutfitLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].top_ids).toEqual(["top-2"]);
  });

  it("sorts logs by date descending", () => {
    saveOutfitLog({
      date: "2026-05-28",
      top_ids: ["top-1"],
      bottom_ids: ["bottom-1"],
      outer_ids: [],
      accessory_ids: [],
    });
    saveOutfitLog({
      date: "2026-05-30",
      top_ids: ["top-2"],
      bottom_ids: ["bottom-2"],
      outer_ids: [],
      accessory_ids: [],
    });
    const logs = loadOutfitLogs();
    expect(logs[0].date).toBe("2026-05-30");
    expect(logs[1].date).toBe("2026-05-28");
  });

  it("deletes a log by date", () => {
    saveOutfitLog({
      date: "2026-05-30",
      top_ids: ["top-1"],
      bottom_ids: ["bottom-1"],
      outer_ids: [],
      accessory_ids: [],
    });
    deleteOutfitLog("2026-05-30");
    expect(loadOutfitLogs()).toHaveLength(0);
  });

  it("gets today log", () => {
    const today = todayDateString();
    saveOutfitLog({
      date: today,
      top_ids: ["top-1"],
      bottom_ids: ["bottom-1"],
      outer_ids: [],
      accessory_ids: [],
    });
    const result = getTodayLog();
    expect(result).not.toBeNull();
    expect(result!.top_ids).toEqual(["top-1"]);
  });

  it("returns null when no today log", () => {
    expect(getTodayLog()).toBeNull();
  });

  it("gets logs in date range", () => {
    saveOutfitLog({
      date: "2026-05-28",
      top_ids: ["top-1"],
      bottom_ids: ["bottom-1"],
      outer_ids: [],
      accessory_ids: [],
    });
    saveOutfitLog({
      date: "2026-05-30",
      top_ids: ["top-2"],
      bottom_ids: ["bottom-2"],
      outer_ids: [],
      accessory_ids: [],
    });
    const result = getLogsInRange("2026-05-29", "2026-05-31");
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-05-30");
  });

  it("gets recent logs with limit", () => {
    for (let i = 1; i <= 5; i++) {
      saveOutfitLog({
        date: `2026-05-${String(i).padStart(2, "0")}`,
        top_ids: [`top-${i}`],
        bottom_ids: [`bottom-${i}`],
        outer_ids: [],
        accessory_ids: [],
      });
    }
    const result = getRecentLogs(3);
    expect(result).toHaveLength(3);
  });

  describe("clothing pairs", () => {
    it("computes top-bottom pairs from logs", () => {
      saveOutfitLog({
        date: "2026-05-30",
        top_ids: ["top-1"],
        bottom_ids: ["bottom-1"],
        outer_ids: [],
        accessory_ids: [],
      });
      saveOutfitLog({
        date: "2026-05-29",
        top_ids: ["top-1"],
        bottom_ids: ["bottom-1"],
        outer_ids: [],
        accessory_ids: [],
      });
      const pairs = loadClothingPairs();
      expect(pairs).toHaveLength(1);
      expect(pairs[0].co_wear_count).toBe(2);
      expect(pairs[0].pair_type).toBe("top-bottom");
    });

    it("computes outer-top pairs", () => {
      saveOutfitLog({
        date: "2026-05-30",
        top_ids: ["top-1"],
        bottom_ids: ["bottom-1"],
        outer_ids: ["outer-1"],
        accessory_ids: [],
      });
      const pairs = loadClothingPairs();
      const outerPairs = pairs.filter((p) => p.pair_type === "outer-top");
      expect(outerPairs.length).toBeGreaterThanOrEqual(1);
    });

    it("updateClothingPairs rebuilds from given logs", () => {
      const logs = [
        {
          date: "2026-05-30",
          top_ids: ["top-a", "top-b"],
          bottom_ids: ["bottom-a"],
          outer_ids: [],
          accessory_ids: [],
        },
      ];
      const pairs = updateClothingPairs(logs);
      expect(pairs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
