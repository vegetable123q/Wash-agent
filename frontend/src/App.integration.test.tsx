import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App in-APK backend integration", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("loads the mobile summary from the in-APK backend without a separate HTTP service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("APK 内置")).toBeInTheDocument();
    expect(screen.getByText("预计 ¥14")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps ModelHub settings in memory and exposes only the allowed model", async () => {
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

    expect(await screen.findByText("识图配置仅在本次打开期间生效，apikey 不会保存")).toBeInTheDocument();
    expect(allLocalStorageValues()).not.toContain("sk-test-key");
  });

  it("adds and deletes wardrobe items through the in-APK backend without network requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("APK 内置")).toBeInTheDocument();
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
    expect(fetchMock).not.toHaveBeenCalled();
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
