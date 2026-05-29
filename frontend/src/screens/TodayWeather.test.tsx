import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { TodayScreen } from "./TodayScreen";

describe("TodayScreen weather integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows live weather values when the backend provides them", () => {
    const mobileSummary = {
      source: "backend",
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

  it("requests a unified refresh from the live weather section", () => {
    const onRefresh = vi.fn();
    render(
      <TodayScreen
        backendStatus="connected"
        mobileSummary={liveWeatherSummary()}
        onNavigate={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "刷新天气和洗衣机状态" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables the weather refresh button while refreshing", () => {
    render(
      <TodayScreen
        backendStatus="connected"
        mobileSummary={liveWeatherSummary()}
        onNavigate={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={true}
      />,
    );

    expect(screen.getByRole("button", { name: "刷新天气和洗衣机状态" })).toBeDisabled();
  });
});

function liveWeatherSummary(): MobileSummary {
  return {
    source: "backend",
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
}
