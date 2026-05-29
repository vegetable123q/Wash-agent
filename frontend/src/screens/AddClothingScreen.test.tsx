import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddClothingScreen } from "./AddClothingScreen";

const modelHubConfig = {
  baseUrl: "https://modelhub.ailemac.com/v1beta",
  apikey: "test-modelhub-key",
  model_name: "gemini-3.1-pro-preview",
};

describe("AddClothingScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("saves manual wardrobe input inside the APK without ModelHub settings", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "清华紫连帽卫衣" } });
    fireEvent.change(screen.getByLabelText("主要材质"), { target: { value: "棉" } });
    fireEvent.change(screen.getByLabelText("颜色"), { target: { value: "紫色" } });
    fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "之前烘干后轻微缩水" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires ModelHub settings before image recognition", () => {
    render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} />);

    expect(screen.getByRole("button", { name: "图片记录" })).toBeInTheDocument();
    expect(screen.getByText("识图需要先在“我的”页面输入 ModelHub baseUrl 和 apikey")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /拍照识别/ })).toBeDisabled();
  });

  it("keeps recognition disabled while a slow ModelHub request is in flight", async () => {
    let resolveRecognition: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
          resolveRecognition = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const file = new File(["abc"], "shirt.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("上传衣物图片"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /拍照识别/ }));

    expect(await screen.findByRole("button", { name: /识别中/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /识别中/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRecognition({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "蓝色衬衫" }) }] } }],
      }),
    });
    expect(await screen.findByText("识图完成，已填入可编辑字段")).toBeInTheDocument();
  });

  it("recognizes a selected image through ModelHub and fills the form", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    name: "蓝色棉质衬衫",
                    material_ratios: { cotton: 1 },
                    colors: ["blue"],
                    recommended_wash: "冷水机洗，悬挂晾干",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const file = new File(["abc"], "shirt.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("上传衣物图片"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /拍照识别/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://modelhub.ailemac.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("x-goog-api-key")).toBe("test-modelhub-key");
    expect(await screen.findByDisplayValue("蓝色棉质衬衫")).toBeInTheDocument();
    expect(screen.getByDisplayValue("cotton 100%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("blue")).toBeInTheDocument();
  });

});
