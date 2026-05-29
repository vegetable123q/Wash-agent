import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearModelHubConfig } from "./api/modelHubConfig";
import App from "./App";

describe("App in-APK backend integration", () => {
  afterEach(() => {
    cleanup();
    clearModelHubConfig();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("loads the mobile summary from the in-APK backend with real planner and report", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    // Without a configured dorm, the app should not invent machine availability or costs.
    expect(screen.getAllByText("费用待确认").length).toBeGreaterThan(0);
    // Only Open-Meteo weather fetch is allowed — no private backend service
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toContain("open-meteo");
    }
  });

  it("saves ModelHub settings locally and exposes only the allowed model", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /我的/ }));
    expect(await screen.findByText("识图模型")).toBeInTheDocument();

    const modelSelect = screen.getByLabelText("model_name") as HTMLSelectElement;
    expect(Array.from(modelSelect.options).map((option) => option.value)).toEqual(["gemini-3.1-pro-preview"]);

    fireEvent.change(screen.getByLabelText("ModelHub baseUrl"), {
      target: { value: "https://modelhub.ailemac.com/v1beta/" },
    });
    fireEvent.change(screen.getByLabelText("apikey"), { target: { value: "sk-test-key" } });
    fireEvent.change(modelSelect, { target: { value: "gemini-3.1-pro-preview" } });
    fireEvent.click(screen.getByRole("button", { name: /应用识图配置/ }));

    expect(await screen.findByText("识图配置已保存到本机；只在本设备使用，可随时清除")).toBeInTheDocument();
    expect(allLocalStorageValues()).toContain("sk-test-key");
  });

  it("uses the saved dorm name to request real machine APIs", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("/cleverschool-api/")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                tower: "南区21号楼",
                macUnionCode: "洗衣机 455514",
                floorName: "一层",
                status: "状态:待机中 更新时间:2026-05-29 13:20:00",
              },
            ],
          }),
        };
      }
      if (href.includes("/haier-api/")) {
        return {
          ok: true,
          json: async () => ({ code: 0, data: { items: [] } }),
        };
      }
      return {
        ok: false,
        status: 503,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /我的/ }));
    fireEvent.change(await screen.findByLabelText("宿舍楼"), { target: { value: "南区21号楼" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/cleverschool-api/"))).toBe(true);
    });
    const cleverCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/cleverschool-api/"));
    expect(JSON.parse(String(cleverCall?.[1]?.body))).toMatchObject({ towerKey: "97zas64" });
  });

  it("adds and deletes wardrobe items through the in-APK backend without private backend requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /衣柜/ }));
    fireEvent.click(screen.getByLabelText("添加衣物"));
    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "清华紫连帽卫衣" } });
    fireEvent.change(screen.getByLabelText("主要材质"), { target: { value: "棉" } });
    fireEvent.change(screen.getByLabelText("颜色"), { target: { value: "紫色" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByText("清华紫连帽卫衣")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /删除 清华紫连帽卫衣/ }));
    expect(await screen.findByText("已删除 清华紫连帽卫衣")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("清华紫连帽卫衣")).not.toBeInTheDocument());
    // Only weather fetch calls are expected — no private backend API calls
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toContain("open-meteo");
    }
  });

  it("handles the browser or phone back key by returning to the parent screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "今晚洗衣" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /衣柜/ }));
    fireEvent.click(await screen.findByRole("button", { name: "添加第一件衣物" }));
    expect(await screen.findByRole("heading", { name: "添加衣物" })).toBeInTheDocument();

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByRole("heading", { name: "我的衣柜" })).toBeInTheDocument();
  });
});

function allLocalStorageValues(): string {
  const values: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) {
      values.push(localStorage.getItem(key) ?? "");
    }
  }
  return values.join("\n");
}
