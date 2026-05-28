import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const backendSummary = {
  source: "backend",
  wardrobe: {
    items: [
      {
        item_id: "wm-white-tee-001",
        name: "白色纯棉 T 恤",
        wear_count_since_wash: 2,
        wash_count: 5,
        material_ratios: { 棉: 1 },
        colors: ["white"],
        risks: {},
      },
    ],
  },
  campus_context: {
    all_machines: [
      {
        machine_id: "washer-standard-1",
        location: "Dorm A 1F",
        machine_type: "standard_washer",
        status: "available",
        capacity_kg: 7,
        remaining_minutes: null,
        price_yuan: 4,
        modes: ["standard", "gentle"],
      },
    ],
    available_machines: [
      {
        machine_id: "washer-standard-1",
        location: "Dorm A 1F",
        machine_type: "standard_washer",
        status: "available",
        capacity_kg: 7,
        remaining_minutes: null,
        price_yuan: 4,
        modes: ["standard", "gentle"],
      },
    ],
    queue_estimates: [
      {
        machine_type: "standard_washer",
        total_count: 1,
        available_count: 1,
        running_count: 0,
        out_of_service_count: 0,
        unknown_count: 0,
        estimated_wait_minutes: 0,
      },
    ],
    weather: {},
    drying_context: {},
    pricing_rules: {},
  },
  plan: {
    buckets: [],
    estimated_cost_yuan: 14,
    estimated_duration_minutes: 80,
    summary: "真实后端生成的洗衣方案",
    global_warnings: [],
  },
  report: {
    title: "本次校园洗衣方案",
    sections: {
      洗衣步骤: "真实后端步骤",
      费用和时间: "预计费用 14.0 元，预计机器占用时间 80 分钟。",
      机器环境: "当前可用机器记录 1 台。",
      风险提醒: "本次计划没有额外风险提醒。",
    },
    savings_notes: ["真实后端节能提示"],
    risk_notes: [],
  },
};

describe("App backend integration", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("loads the mobile summary from the backend API and marks the UI as connected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => backendSummary,
      }),
    );

    render(<App />);

    expect(await screen.findByText("后端已连接")).toBeInTheDocument();
    expect(screen.getByText("真实后端生成的洗衣方案")).toBeInTheDocument();
    expect(screen.getByText("预计 ¥14")).toBeInTheDocument();
  });

  it("keeps the main mobile navigation and primary actions clickable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => backendSummary,
      }),
    );

    render(<App />);

    expect(await screen.findByText("后端已连接")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /洗衣房/ }));
    expect(screen.getByRole("heading", { name: "请选择宿舍楼" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /今日/ }));
    fireEvent.click(screen.getByRole("button", { name: /查看本次方案/ }));
    expect(screen.getByRole("heading", { name: "本次方案" })).toBeInTheDocument();
  });

  it("saves personal laundry context and uses the dorm on the laundry room screen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => backendSummary,
      }),
    );

    render(<App />);

    expect(await screen.findByText("后端已连接")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /我的/ }));
    fireEvent.change(screen.getByLabelText("昵称"), { target: { value: "小徐" } });
    fireEvent.change(screen.getByLabelText("宿舍楼"), { target: { value: "南区 21 号楼" } });
    fireEvent.change(screen.getByLabelText("最晚取衣"), { target: { value: "23:10" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(await screen.findByText("个人信息已保存")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /洗衣房/ }));
    expect(screen.getByRole("heading", { name: "南区 21 号楼" })).toBeInTheDocument();
    expect(screen.getByText(/23:10/)).toBeInTheDocument();
  });
});
