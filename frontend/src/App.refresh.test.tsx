import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => {
    cleanup();
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

  it("recomputes bucket machine availability after the laundry machine refresh", async () => {
    vi.mocked(fetchMobileSummary)
      .mockResolvedValueOnce(summaryWithBucket("blocked"))
      .mockResolvedValueOnce(summaryWithBucket("available"));

    render(<App />);

    expect((await screen.findAllByText("没有空闲洗衣机")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "洗衣房" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新天气和洗衣机状态" }));

    await waitFor(() => expect(fetchMobileSummary).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "今日" }));
    await waitFor(() => expect(screen.queryByText("没有空闲洗衣机")).not.toBeInTheDocument());
    expect(screen.getByText("可机洗")).toBeInTheDocument();
    expect(screen.getByText("机洗，自然晾干")).toBeInTheDocument();
  });

  it("updates bucket dryer availability after the laundry machine refresh", async () => {
    vi.mocked(fetchMobileSummary)
      .mockResolvedValueOnce(summaryWithDryer("blocked"))
      .mockResolvedValueOnce(summaryWithDryer("available"));

    render(<App />);

    expect(await screen.findByText("机洗，自然晾干")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "洗衣房" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新天气和洗衣机状态" }));

    await waitFor(() => expect(fetchMobileSummary).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "今日" }));
    await waitFor(() => expect(screen.getByText("机洗，低温烘干")).toBeInTheDocument());
    expect(screen.getByText("¥5.5 · 含烘干")).toBeInTheDocument();
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

function summaryWithBucket(state: "blocked" | "available"): MobileSummary {
  const hasMachine = state === "available";
  return {
    source: "backend",
    selected_laundry_item_ids: ["tee-1"],
    dirty_basket: {
      item_count: 1,
      load_percent: 30,
      oldest_days: 0,
      urgent_count: 0,
      status_label: "还没满桶",
      recommendation: "普通衣物可继续攒。",
      next_action: "查看本次方案",
      items: [],
    },
    wardrobe: {
      items: [
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ],
    },
    campus_towers: [{ name: "南区21号楼" }],
    campus_status: {
      state: "live",
      dorm_name: "南区21号楼",
      message: hasMachine ? "已读取 1 台实时机器记录。" : "已读取 0 台实时机器记录。",
      updated_at: hasMachine ? "2026-05-29T15:00:00.000Z" : "2026-05-29T14:30:00.000Z",
    },
    campus_context: {
      all_machines: hasMachine
        ? [
            {
              machine_id: "washer-1",
              location: "南区21号楼 一层",
              machine_type: "standard_washer",
              status: "available",
              remaining_minutes: null,
              price_yuan: null,
              modes: ["standard"],
            },
          ]
        : [],
      available_machines: hasMachine
        ? [
            {
              machine_id: "washer-1",
              location: "南区21号楼 一层",
              machine_type: "standard_washer",
              status: "available",
              remaining_minutes: null,
              price_yuan: null,
              modes: ["standard"],
            },
          ]
        : [],
      queue_estimates: [],
      weather: {},
      drying_context: {},
      pricing_rules: {},
    },
    weather: {
      source: "open-meteo",
      status: "live",
      current: {
        temperature_2m: 24.6,
        relative_humidity_2m: 71,
        precipitation: 0.1,
      },
      units: {
        temperature_2m: "°C",
        relative_humidity_2m: "%",
        precipitation: "mm",
      },
    },
    plan: {
      buckets: [
        {
          bucket_id: "light-standard",
          item_ids: ["tee-1"],
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          machine_id: hasMachine ? "washer-1" : undefined,
          machine_location: hasMachine ? "南区21号楼 一层" : undefined,
          program: "standard",
          detergent_ml: 24,
          use_laundry_bag: false,
          dry_method: "air_dry",
          warnings: hasMachine ? ["推荐使用 washer-1，位置 南区21号楼 一层，程序 standard。"] : ["没有空闲洗衣机"],
        },
      ],
      estimated_cost_yuan: hasMachine ? 3.5 : null,
      estimated_duration_minutes: hasMachine ? 40 : null,
      summary: hasMachine ? "刷新后已有空闲洗衣机。" : "刷新前没有空闲洗衣机。",
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

function summaryWithDryer(state: "blocked" | "available"): MobileSummary {
  const hasDryer = state === "available";
  const summary = summaryWithBucket("available");
  summary.campus_context.all_machines = [
    ...summary.campus_context.all_machines,
    ...(hasDryer
      ? [
          {
            machine_id: "dryer-1",
            location: "南区21号楼 一层",
            machine_type: "dryer",
            status: "available",
            remaining_minutes: null,
            price_yuan: null,
            modes: ["low"],
          } satisfies MobileSummary["campus_context"]["all_machines"][number],
        ]
      : []),
  ];
  summary.campus_context.available_machines = [
    ...summary.campus_context.available_machines,
    ...(hasDryer
      ? [
          {
            machine_id: "dryer-1",
            location: "南区21号楼 一层",
            machine_type: "dryer",
            status: "available",
            remaining_minutes: null,
            price_yuan: null,
            modes: ["low"],
          } satisfies MobileSummary["campus_context"]["available_machines"][number],
        ]
      : []),
  ];
  summary.drying_plan = {
    steps: [
      {
        bucket_id: "light-standard",
        item_ids: ["tee-1"],
        dry_method: hasDryer ? "low_heat_dryer" : "air_dry",
        warnings: hasDryer
          ? ["推荐使用 dryer-1，位置 南区21号楼 一层，程序 low。"]
          : ["没有空闲烘干机"],
        ...(hasDryer
          ? {
              dryer_machine_id: "dryer-1",
              dryer_machine_location: "南区21号楼 一层",
              estimated_cost_yuan: 2,
              estimated_duration_minutes: 25,
            }
          : {}),
      },
    ],
    estimated_cost_yuan: hasDryer ? 2 : null,
    estimated_duration_minutes: hasDryer ? 25 : null,
    cost_breakdown: hasDryer
      ? [
          {
            bucket_id: "light-standard",
            label: "light-standard 低温烘干",
            amount_yuan: 2,
            duration_minutes: 25,
            machine_id: "dryer-1",
            machine_type: "dryer",
            program: "low",
          },
        ]
      : [],
    warnings: [],
  };
  summary.plan.summary = hasDryer ? "刷新后已有空闲烘干机。" : "刷新前没有空闲烘干机。";
  return summary;
}
