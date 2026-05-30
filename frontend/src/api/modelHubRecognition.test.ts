import { beforeEach, describe, expect, it, vi } from "vitest";
import { recognizeClothingImage, recognizeClothingText } from "./modelHubRecognition";

const modelHubConfig = {
  baseUrl: "https://modelhub.ailemac.com/v1beta",
  apikey: "test-modelhub-key",
  model_name: "gemini-3.1-pro-preview",
};

function modelHubResponse(payload: object) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  };
}

function modelHubTextResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

describe("ModelHub clothing recognition", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unrelated images with a user-facing no-clothing message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelHubResponse({ is_clothing: false })));

    const file = new File(["not clothing"], "desk.png", { type: "image/png" });

    await expect(recognizeClothingImage(file, modelHubConfig)).rejects.toThrow("没有识别到衣物");
  });

  it("reports invalid recognition JSON explicitly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelHubTextResponse("not json")));

    await expect(recognizeClothingText("white cotton tee", modelHubConfig)).rejects.toThrow(
      "ModelHub returned invalid recognition JSON",
    );
  });

  it("parses recognition JSON wrapped in a markdown code fence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubTextResponse('```json\n{"is_clothing":true,"name":"white tee","material_ratios":{"cotton":1},"colors":["white"]}\n```'),
      ),
    );

    await expect(recognizeClothingText("white tee", modelHubConfig)).resolves.toMatchObject({
      name: "white tee",
      material: "棉 100%",
      colors: "白色",
    });
  });

  it("parses recognition JSON from a fenced block surrounded by prose", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubTextResponse('识别结果如下：\n```json\n{"is_clothing":true,"name":"white tee","material_ratios":{"cotton":1},"colors":["white"]}\n```\n请确认。'),
      ),
    );

    await expect(recognizeClothingText("white tee", modelHubConfig)).resolves.toMatchObject({
      name: "white tee",
      material: "棉 100%",
      colors: "白色",
    });
  });

  it("parses recognition JSON embedded in prose without a fence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubTextResponse('识别结果：{"is_clothing":true,"name":"white tee","material_ratios":{"cotton":1},"colors":["white"]} 请确认。'),
      ),
    );

    await expect(recognizeClothingText("white tee", modelHubConfig)).resolves.toMatchObject({
      name: "white tee",
      material: "棉 100%",
      colors: "白色",
    });
  });

  it("extracts clothing fields from a long text description without image data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "灰色连帽卫衣",
        material_ratios: { cotton: 0.8, polyester: 0.2 },
        colors: ["gray"],
        recommended_wash: "冷水机洗，低温烘干",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await recognizeClothingText("这件灰色连帽卫衣大概是棉混纺，之前高温烘干有点缩水。", modelHubConfig);

    expect(result).toMatchObject({
      name: "灰色连帽卫衣",
      material: "棉 80%、聚酯纤维 20%",
      colors: "灰色",
      note: "冷水机洗，低温烘干",
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(JSON.stringify(body)).not.toContain("inline_data");
  });

  it("constrains ModelHub output with a JSON response schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "white cotton tee",
        material_ratios: { cotton: 1 },
        colors: ["white"],
        category: "tops",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await recognizeClothingText("white cotton tee", modelHubConfig);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toMatchObject({
      type: "object",
      properties: {
        is_clothing: { type: "boolean" },
        category: {
          type: "string",
          enum: ["tops", "bottoms", "dresses", "outerwear", "underwear_socks", "bedding", "shoes_accessories", "other"],
        },
      },
      required: ["is_clothing"],
    });
  });

  it("infers jpeg mime type from filename when the browser file type is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "white cotton tee",
        material_ratios: { cotton: 1 },
        colors: ["white"],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["abc"], "shirt.jpg", { type: "" });
    await recognizeClothingImage(file, modelHubConfig);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.contents[0].parts[1].inline_data.mime_type).toBe("image/jpeg");
  });

  it("normalizes recognized clothing category for wardrobe grouping", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "黑色羽绒服",
          material_ratios: { polyester: 1 },
          colors: ["black"],
          category: "outerwear",
        }),
      ),
    );

    const file = new File(["coat"], "coat.png", { type: "image/png" });
    const result = await recognizeClothingImage(file, modelHubConfig);

    expect(result.category).toBe("外套");
  });

  it("normalizes English material, color, and care terms into Chinese display text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "blue white cotton tee",
          material_ratios: { cotton: 0.7, polyester: 0.3 },
          colors: ["blue", "white"],
          recommended_wash: "gentle_cycle",
          care_warnings: ["do_not_bleach", "do_not_tumble_dry"],
        }),
      ),
    );

    const result = await recognizeClothingText("blue white cotton tee", modelHubConfig);

    expect(result).toMatchObject({
      material: "棉 70%、聚酯纤维 30%",
      colors: "蓝色、白色",
      note: "轻柔洗；不可漂白、不可烘干",
    });
  });

  it("splits semicolon-separated color strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "blue white tee",
          material_ratios: { cotton: 1 },
          colors: "blue; white",
        }),
      ),
    );

    const result = await recognizeClothingText("blue white tee", modelHubConfig);

    expect(result.colors).toBe("蓝色、白色");
  });

  it("splits newline-separated color strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "blue white tee",
          material_ratios: { cotton: 1 },
          colors: "blue\nwhite",
        }),
      ),
    );

    const result = await recognizeClothingText("blue white tee", modelHubConfig);

    expect(result.colors).toBe("蓝色、白色");
  });

  it("normalizes object color payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "blue white tee",
          material_ratios: { cotton: 1 },
          colors: { primary: "blue", secondary: "white" },
        }),
      ),
    );

    const result = await recognizeClothingText("blue white tee", modelHubConfig);

    expect(result.colors).toBe("蓝色、白色");
  });

  it("accepts common ModelHub material field variants instead of showing unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "灰色卫衣",
          material: "cotton 80%, polyester 20%",
          colors: ["gray"],
        }),
      ),
    );

    await expect(recognizeClothingText("灰色卫衣，棉混纺。", modelHubConfig)).resolves.toMatchObject({
      material: "棉 80%、聚酯纤维 20%",
    });
  });

  it("normalizes string percent material ratios", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "cotton polyester hoodie",
          material_ratios: { cotton: "80%", polyester: "20%" },
          colors: ["gray"],
        }),
      ),
    );

    const result = await recognizeClothingText("cotton polyester hoodie", modelHubConfig);

    expect(result.material).toBe("棉 80%、聚酯纤维 20%");
  });

  it("does not treat nonnumeric material ratios as 100 percent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "cotton wool sweater",
          material_ratios: { cotton: true, wool: "50%" },
          colors: ["beige"],
        }),
      ),
    );

    const result = await recognizeClothingText("cotton wool sweater", modelHubConfig);

    expect(result.material).not.toContain("100%");
    expect(result.material).toContain("50%");
  });

  it("filters invalid explicit material ratio entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "wool sweater",
          material_ratios: { zeroFiber: 0, badFiber: true, wool: 1 },
          colors: ["beige"],
        }),
      ),
    );

    const result = await recognizeClothingText("wool sweater", modelHubConfig);

    expect(result.material).not.toContain("zeroFiber");
    expect(result.material).not.toContain("badFiber");
    expect(result.material).toContain("100%");
  });

  it("normalizes colon-separated material ratio strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "cotton polyester hoodie",
          material: "cotton: 80%, polyester: 20%",
          colors: ["gray"],
        }),
      ),
    );

    const result = await recognizeClothingText("cotton polyester hoodie", modelHubConfig);

    expect(result.material).toBe("棉 80%、聚酯纤维 20%");
  });

  it("splits newline-separated material ratio strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "cotton polyester hoodie",
          material: "cotton 80%\npolyester 20%",
          colors: ["gray"],
        }),
      ),
    );

    const result = await recognizeClothingText("cotton polyester hoodie", modelHubConfig);

    expect(result.material).toBe("棉 80%、聚酯纤维 20%");
  });

  it("splits slash-separated care label strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "wool cardigan",
          material_ratios: { wool: 1 },
          colors: ["beige"],
          care_warnings: "hand_wash_only/do_not_tumble_dry",
        }),
      ),
    );

    const result = await recognizeClothingText("wool cardigan", modelHubConfig);

    expect(result.note).toContain("只能手洗");
    expect(result.note).toContain("不可烘干");
  });

  it("normalizes spaced no-tumble-dry care phrases", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "wool cardigan",
          material_ratios: { wool: 1 },
          colors: ["beige"],
          care_warnings: ["no tumble dry"],
        }),
      ),
    );

    const result = await recognizeClothingText("wool cardigan care label says no tumble dry", modelHubConfig);

    expect(result.note).toContain("不可烘干");
    expect(result.note).not.toContain("no tumble dry");
  });

  it("normalizes dry-clean prohibition care phrases", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "linen jacket",
          material_ratios: { linen: 1 },
          colors: ["beige"],
          care_warnings: ["do_not_dry_clean", "no dry clean"],
        }),
      ),
    );

    const result = await recognizeClothingText("linen jacket care label says no dry clean", modelHubConfig);

    expect(result.note).toContain("不可干洗");
    expect(result.note).not.toContain("do_not_dry_clean");
    expect(result.note).not.toContain("no dry clean");
  });

  it("keeps care label variants in the editable note", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "羊毛开衫",
          material_ratios: { wool: 1 },
          colors: ["beige"],
          care_symbols: ["hand_wash_only", "do_not_tumble_dry"],
          care_instructions: "平摊晾干，不可漂白",
        }),
      ),
    );

    const result = await recognizeClothingText("羊毛开衫，洗标写着手洗，不能烘干。", modelHubConfig);

    expect(result.note).toContain("只能手洗");
    expect(result.note).toContain("不可烘干");
    expect(result.note).toContain("平摊晾干");
    expect(result.note).toContain("不可漂白");
  });
});
