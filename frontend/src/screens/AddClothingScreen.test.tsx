import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddClothingScreen } from "./AddClothingScreen";

const apiConfig = {
  apiBaseUrl: "http://127.0.0.1:8000",
  apiToken: "test-token",
};

describe("AddClothingScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits manual wardrobe input to the backend and reports success", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "created",
        item: {
          item_id: "wm-user-purple-hoodie",
          name: "清华紫连帽卫衣",
          material_ratios: { 棉: 1 },
          colors: ["紫色"],
          risks: {},
          user_notes: ["之前烘干后轻微缩水"],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen apiConfig={apiConfig} onBack={() => undefined} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "清华紫连帽卫衣" } });
    fireEvent.change(screen.getByLabelText("主要材质"), { target: { value: "棉" } });
    fireEvent.change(screen.getByLabelText("颜色"), { target: { value: "紫色" } });
    fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "之前烘干后轻微缩水" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/wardrobe/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "清华紫连帽卫衣",
          material: "棉",
          colors: "紫色",
          note: "之前烘干后轻微缩水",
          image_filename: "",
        }),
      }),
    );
    const requestHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(requestHeaders.get("Content-Type")).toBe("application/json");
    expect(requestHeaders.get("Authorization")).toBe("Bearer test-token");
    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("does not present image selection as completed recognition", () => {
    render(<AddClothingScreen apiConfig={apiConfig} onBack={() => undefined} />);

    expect(screen.getByRole("button", { name: "图片记录" })).toBeInTheDocument();
    expect(screen.getByText("当前移动端只保存图片文件名，洗护抽取以文字字段和后端结果为准")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拍照识别" })).not.toBeInTheDocument();
  });

  it("keeps save disabled while a slow request is in flight", async () => {
    let resolveSave: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen apiConfig={apiConfig} onBack={() => undefined} />);

    const saveButton = screen.getByRole("button", { name: /保存到衣柜/ });
    fireEvent.click(saveButton);

    expect(await screen.findByRole("button", { name: /正在保存/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /正在保存/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveSave({
      ok: true,
      json: async () => ({ status: "created" }),
    });
    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
  });

  it("requires API connection settings before saving", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen apiConfig={{ apiBaseUrl: "", apiToken: "" }} onBack={() => undefined} />);

    expect(screen.getByRole("button", { name: /保存到衣柜/ })).toBeDisabled();
    expect(screen.getByText("请先在“我的”页面输入 API 地址和 token")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
