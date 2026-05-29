import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { TodayScreen } from "./TodayScreen";

describe("TodayScreen weather integration", () => {
  it("shows live weather values when the backend provides them", () => {
    const mobileSummary = {
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
          temperature_2m: 24.6,
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
        estimated_cost_yuan: 14,
        estimated_duration_minutes: 80,
        summary: "backend plan",
        global_warnings: [],
      },
      report: {
        title: "report",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } as MobileSummary;

    render(<TodayScreen backendStatus="connected" mobileSummary={mobileSummary} onNavigate={vi.fn()} />);

    expect(screen.getByText("实时天气")).toBeInTheDocument();
    expect(screen.getByText("24.6°C")).toBeInTheDocument();
    expect(screen.getByText("湿度 71%")).toBeInTheDocument();
    expect(screen.getByText("降水 0.1mm")).toBeInTheDocument();
  });
});
