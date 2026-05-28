import { Camera, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { hasCompleteApiConnectionConfig, type ApiConnectionConfig } from "../api/apiConnection";
import { createWardrobeItem } from "../api/mobileSummary";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";

interface AddClothingScreenProps {
  apiConfig: ApiConnectionConfig;
  onBack: () => void;
  onSaved?: () => void | Promise<void>;
}

export function AddClothingScreen({ apiConfig, onBack, onSaved }: AddClothingScreenProps) {
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [name, setName] = useState("优衣库灰色连帽卫衣");
  const [material, setMaterial] = useState("棉混纺");
  const [colors, setColors] = useState("深色");
  const [note, setNote] = useState("之前高温烘干后有点缩水，今晚想穿干净的。");
  const [imageFilename, setImageFilename] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const hasApiConfig = hasCompleteApiConnectionConfig(apiConfig);
  const canSubmit = hasApiConfig && name.trim().length > 0 && status !== "saving";

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
        },
        apiConfig,
      );
      setStatus("saved");
      await onSaved?.();
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "保存失败");
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

      <label className="upload-panel">
        <Camera size={32} />
        <strong>{imageFilename || "上传衣物、吊牌或洗护标签"}</strong>
        <span>{mode === "photo" ? "当前移动端只保存图片文件名，洗护抽取以文字字段和后端结果为准" : "文字输入也可以直接保存"}</span>
        <input
          className="file-input"
          type="file"
          accept="image/*"
          aria-label="上传衣物图片"
          onChange={(event) => setImageFilename(event.currentTarget.files?.[0]?.name ?? "")}
        />
      </label>

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

        {!hasApiConfig ? <p className="form-status form-status-error">请先在“我的”页面输入 API 地址和 token</p> : null}
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
