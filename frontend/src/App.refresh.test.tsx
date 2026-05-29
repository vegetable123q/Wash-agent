import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { fetchMobileSummary, type MobileSummary } from "./api/mobileSummary";

vi.mock("./api/mobileSummary", async () => {
  const actual = await vi.importActual<typeof import("./api/mobileSummary")>("./api/mobileSummary");
  return {
    ...actual,
    fetchMobileSummary: vi.fn(),
    deleteWardrobeItem: vi.fn(),
  };
});

describe("App manual refresh", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetchMobileSummary).mockReset();
  });

  it("keeps the current summary visible when a manual refresh fails", async () => {
    vi.mocked(fetchMobileSummary)
      .mockResolvedValueOnce(summaryWithWeather(24.6))
      .mockRejectedValueOnce(new Error("network down"));

    render(<App />);

    expect(await screen.findByText("24.6°C")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新天气和洗衣机状态" }));

    await waitFor(() => expect(fetchMobileSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("刷新失败，请稍后重试")).toBeInTheDocument();
    expect(screen.getByText("24.6°C")).toBeInTheDocument();
  });
});

function summaryWithWeather(temperature: number): MobileSummary {
  return {
    source: "backend",
    selected_laundry_item_ids: [],
    dirty_basket: {
      item_count: 0,
      load_percent: 0,
      oldest_days: 0,
      urgent_count: 0,
      status_label: "空篮",
      recommendation: "先选择衣物。",
      next_action: "去衣柜选择这批要洗的衣物",
      items: [],
    },
    wardrobe: { items: [] },
    campus_towers: [{ name: "南区21号楼" }],
    campus_status: {
      state: "live",
      dorm_name: "南区21号楼",
      message: "已读取 0 台实时机器记录。",
      updated_at: "2026-05-29T14:30:00.000Z",
    },
    campus_context: {
      all_machines: [],
      available_machines: [],
      queue_estimates: [],
      weather: {},
      drying_context: {},
      pricing_rules: {},
    },
    weather: {
      source: "open-meteo",
      status: "live",
      location: "Tsinghua University",
      current: {
        temperature_2m: temperature,
        relative_humidity_2m: 71,
        precipitation: 0.1,
        weather_code: 61,
      },
      units: {
        temperature_2m: "°C",
        relative_humidity_2m: "%",
        precipitation: "mm",
      },
    },
    plan: {
      buckets: [],
      estimated_cost_yuan: 0,
      estimated_duration_minutes: 0,
      summary: "当前没有需要优先清洗的衣物。",
      global_warnings: [],
    },
    report: {
      title: "本次校园洗衣方案",
      sections: {},
      savings_notes: [],
      risk_notes: [],
    },
  };
}
