import { Camera, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { hasCompleteModelHubConfig, type ModelHubConfig } from "../api/modelHubConfig";
import { recognizeClothingImage } from "../api/modelHubRecognition";
import { createWardrobeItem } from "../api/mobileSummary";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";

interface AddClothingScreenProps {
  modelHubConfig: ModelHubConfig;
  onBack: () => void;
  onSaved?: () => void | Promise<void>;
}

export function AddClothingScreen({ modelHubConfig, onBack, onSaved }: AddClothingScreenProps) {
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [colors, setColors] = useState("");
  const [note, setNote] = useState("");
  const [imageFilename, setImageFilename] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [recognitionStatus, setRecognitionStatus] = useState<"idle" | "recognizing" | "recognized" | "error">("idle");
  const [error, setError] = useState("");
  const [recognitionError, setRecognitionError] = useState("");

  const hasModelHubConfig = hasCompleteModelHubConfig(modelHubConfig);
  const canSubmit = name.trim().length > 0 && status !== "saving";
  const canRecognize = hasModelHubConfig && Boolean(imageFile) && recognitionStatus !== "recognizing";

  const resultRows = [
    ["类别", name.trim() || "待填写"],
    ["材质", material.trim() || "未知"],
    ["颜色风险", colors.trim() ? `${colors.trim()}，保存后参与分桶` : "待补充"],
    ["烘干", note.includes("缩水") ? "建议低温，避免高温" : "按衣标或默认低温"],
  ];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setStatus("saving");
    setError("");
    try {
      await createWardrobeItem(
        {
          name: name.trim(),
          material: material.trim(),
          colors: colors.trim(),
          note: note.trim(),
          image_filename: imageFilename,
        }
      );
      setStatus("saved");
      await onSaved?.();
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    }
  };

  const handleRecognize = async () => {
    if (!imageFile || !canRecognize) {
      return;
    }
    setRecognitionStatus("recognizing");
    setRecognitionError("");
    try {
      const result = await recognizeClothingImage(imageFile, modelHubConfig);
      if (result.name) {
        setName(result.name);
      }
      if (result.material) {
        setMaterial(result.material);
      }
      if (result.colors) {
        setColors(result.colors);
      }
      if (result.note) {
        setNote(result.note);
      }
      setRecognitionStatus("recognized");
    } catch (recognizeError) {
      setRecognitionStatus("error");
      setRecognitionError(recognizeError instanceof Error ? recognizeError.message : "识图失败");
    }
  };

  return (
    <Page compact>
      <TopBar title="添加衣物" onBack={onBack} />

      <div className="segmented">
        <button type="button" className={mode === "photo" ? "active" : ""} onClick={() => setMode("photo")}>
          图片记录
        </button>
        <button type="button" className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>
          文字输入
        </button>
      </div>

      {mode === "photo" ? (
        <>
          <label className="upload-panel">
            <Camera size={32} />
            <strong>{imageFilename || "上传衣物、吊牌或洗护标签"}</strong>
            <span>选择图片后可调用 ModelHub 识别；不识图也可以手动保存</span>
            <input
              className="file-input"
              type="file"
              accept="image/*"
              aria-label="上传衣物图片"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                setImageFile(file);
                setImageFilename(file?.name ?? "");
                setRecognitionStatus("idle");
                setRecognitionError("");
              }}
            />
          </label>

          <button className="secondary-button" type="button" onClick={handleRecognize} disabled={!canRecognize}>
            <Camera size={18} />
            {recognitionStatus === "recognizing" ? "识别中" : "拍照识别"}
          </button>
        </>
      ) : null}

      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          <span>衣物名称</span>
          <input className="input-like" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>主要材质</span>
          <input className="input-like" value={material} onChange={(event) => setMaterial(event.target.value)} />
        </label>
        <label>
          <span>颜色</span>
          <input className="input-like" value={colors} onChange={(event) => setColors(event.target.value)} />
        </label>
        <label>
          <span>个人备注</span>
          <textarea className="input-like textarea-like" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>

        <Section title="抽取结果">
          <Card accent="purple">
            <div className="result-grid">
              {resultRows.map(([label, value]) => (
                <div className="result-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="chip-row">
              <Chip tone="teal">{material || colors ? "用户补全" : "待补全"}</Chip>
              {note.includes("缩水") ? <Chip tone="orange">有缩水史</Chip> : null}
              {imageFilename ? <Chip tone="purple">已选图片</Chip> : null}
            </div>
          </Card>
        </Section>

        {!hasModelHubConfig ? <p className="form-status form-status-error">识图需要先在“我的”页面输入 ModelHub baseUrl 和 apikey</p> : null}
        {recognitionStatus === "recognized" ? <p className="form-status form-status-ok">识图完成，已填入可编辑字段</p> : null}
        {recognitionStatus === "error" ? <p className="form-status form-status-error">{recognitionError}</p> : null}
        {status === "saved" ? <p className="form-status form-status-ok">保存成功，已加入衣柜</p> : null}
        {status === "error" ? <p className="form-status form-status-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={!canSubmit}>
          <Save size={18} />
          {status === "saving" ? "正在保存" : "保存到衣柜"}
        </button>
      </form>
    </Page>
  );
}
