import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const backendSummary = {
  source: "backend",
  campus_towers: [
    {
      name: "紫荆1号楼",
      tower_key: "ncrkiz1",
      provider: "cleverschool",
      provider_keys: { cleverschool: "ncrkiz1" },
    },
    {
      name: "南区21号楼",
      tower_key: "nq21",
      provider: "cleverschool",
      provider_keys: { cleverschool: "nq21" },
    },
  ],
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
    buckets: [
      {
        bucket_id: "backend-light",
        item_ids: ["wm-white-tee-001"],
        wash_method: "machine_wash",
        machine_type: "standard_washer",
        program: "standard",
        dry_method: "air_dry",
        warnings: ["后端风险提示"],
      },
    ],
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

const apiConfig = {
  apiBaseUrl: "http://127.0.0.1:8000",
  apiToken: "test-token",
};

function storeApiConfig() {
  localStorage.setItem("washmate.apiConnection", JSON.stringify(apiConfig));
}

describe("App backend integration", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("loads the mobile summary from the backend API and marks the UI as connected", async () => {
    storeApiConfig();
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
    storeApiConfig();
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
    expect(screen.getByText("1 个后端批次")).toBeInTheDocument();
    expect(screen.getByText("wm-white-tee-001 · air_dry")).toBeInTheDocument();
  });

  it("opens detail screens with the selected backend wardrobe item and machine", async () => {
    storeApiConfig();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => backendSummary,
      }),
    );

    render(<App />);

    expect(await screen.findByText("后端已连接")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /衣柜/ }));
    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    expect(screen.getByRole("heading", { name: "白色纯棉 T 恤" })).toBeInTheDocument();
    expect(screen.getByText("棉 100% · white")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    fireEvent.click(screen.getByRole("button", { name: /洗衣房/ }));
    fireEvent.click(screen.getByRole("button", { name: /washer-standard-1/ }));
    expect(screen.getByRole("heading", { name: "washer-standard-1" })).toBeInTheDocument();
    expect(screen.getAllByText("washer-standard-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("standard_washer").length).toBeGreaterThan(0);
  });

  it("shows the offline preview state when the backend API is unavailable", async () => {
    storeApiConfig();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<App />);

    expect(await screen.findByText("前端预览")).toBeInTheDocument();
    expect(screen.getByText("今晚洗衣")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /衣柜/ }));
    expect(screen.getByText("白色纯棉 T 恤")).toBeInTheDocument();
  });

  it("saves personal laundry context and uses the dorm on the laundry room screen", async () => {
    storeApiConfig();
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
    fireEvent.change(screen.getByLabelText("宿舍楼"), { target: { value: "南区21号楼" } });
    fireEvent.change(screen.getByLabelText("最晚取衣"), { target: { value: "23:10" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(await screen.findByText("个人信息已保存")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /洗衣房/ }));
    expect(screen.getByRole("heading", { name: "南区21号楼" })).toBeInTheDocument();
    expect(screen.getByText(/23:10/)).toBeInTheDocument();
  });

  it("deletes wardrobe items from the backend instead of only allowing additions", async () => {
    storeApiConfig();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => backendSummary,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "deleted", item_id: "wm-white-tee-001" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...backendSummary, wardrobe: { items: [] } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("后端已连接")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /衣柜/ }));
    expect(await screen.findByText("白色纯棉 T 恤")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /删除 白色纯棉 T 恤/ }));

    expect(await screen.findByText("已删除 白色纯棉 T 恤")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/wardrobe/items/wm-white-tee-001",
      expect.objectContaining({ method: "DELETE" }),
    );
    const deleteHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(deleteHeaders.get("Authorization")).toBe("Bearer test-token");
  });

  it("does not call the backend until API settings are entered manually", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("待配置 API")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /我的/ }));
    fireEvent.change(screen.getByLabelText("API 地址"), { target: { value: "http://127.0.0.1:8000/" } });
    fireEvent.change(screen.getByLabelText("API token"), { target: { value: "test-token" } });
    fireEvent.click(screen.getByRole("button", { name: /保存 API 配置/ }));

    expect(await screen.findByText("API 配置已保存，请回到首页检查连接状态")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/mobile/summary",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const summaryHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(summaryHeaders.get("Authorization")).toBe("Bearer test-token");
  });
});
