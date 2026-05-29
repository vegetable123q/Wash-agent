import { Camera, Files, FileText, Save } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { hasCompleteModelHubConfig, type ModelHubConfig } from "../api/modelHubConfig";
import { recognizeClothingImage, recognizeClothingText, type ClothingRecognitionResult } from "../api/modelHubRecognition";
import { createWardrobeItem, type WardrobeCategory, type WardrobeInput } from "../api/mobileSummary";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";

interface AddClothingScreenProps {
  modelHubConfig: ModelHubConfig;
  onBack: () => void;
  onSaved?: () => void | Promise<void>;
}

type EntryMode = "single" | "batch" | "text";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type RecognitionStatus = "idle" | "recognizing" | "recognized" | "error";

interface BatchRecognitionProgress {
  total: number;
  completed: number;
}

interface ClothingDraft {
  name: string;
  material: string;
  colors: string;
  note: string;
  image_filename: string;
  category: WardrobeCategory;
  photo_data_url: string;
}

const emptyDraft: ClothingDraft = {
  name: "",
  material: "",
  colors: "",
  note: "",
  image_filename: "",
  category: "其他",
  photo_data_url: "",
};

const wardrobeCategoryOptions: WardrobeCategory[] = ["上衣", "裤装", "裙装", "外套", "内衣袜子", "床品", "鞋包配饰", "其他"];

const batchRecognitionTips = [
  "先识别衣物本身，再把吊牌/洗标补成备注。",
  "颜色和材质会影响分桶，深浅色先分开更稳。",
  "贴身衣物和运动衣别久放，识别后可以先加进脏衣篮。",
  "识别结果保存前都能再编辑，不用担心一次就定稿。",
];

export function AddClothingScreen({ modelHubConfig, onBack, onSaved }: AddClothingScreenProps) {
  const [mode, setMode] = useState<EntryMode>("single");
  const [draft, setDraft] = useState<ClothingDraft>(emptyDraft);
  const [textDescription, setTextDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchDrafts, setBatchDrafts] = useState<ClothingDraft[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
  const [error, setError] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [batchProgress, setBatchProgress] = useState<BatchRecognitionProgress | null>(null);
  const saveInFlightRef = useRef(false);

  const hasModelHubConfig = hasCompleteModelHubConfig(modelHubConfig);
  const canSubmit = draft.name.trim().length > 0 && (status === "idle" || status === "error") && mode !== "batch";
  const canRecognizeSingle = hasModelHubConfig && Boolean(imageFile) && recognitionStatus !== "recognizing";
  const canRecognizeText = hasModelHubConfig && textDescription.trim().length > 0 && recognitionStatus !== "recognizing";
  const canRecognizeBatch = hasModelHubConfig && batchFiles.length > 0 && recognitionStatus !== "recognizing";
  const canSaveBatch = batchDrafts.length > 0 && (status === "idle" || status === "error");

  const resultRows = [
    ["名称", draft.name.trim() || "待填写"],
    ["分类", draft.category],
    ["材质", draft.material.trim() || "未知"],
    ["颜色风险", draft.colors.trim() ? `${draft.colors.trim()}，保存后参与分桶` : "待补充"],
    ["烘干", draft.note.includes("缩水") ? "建议低温，避免高温" : "按衣标或默认低温"],
  ];

  const changeMode = (nextMode: EntryMode) => {
    setMode(nextMode);
    setStatus("idle");
    setError("");
    setRecognitionStatus("idle");
    setRecognitionError("");
    setBatchProgress(null);
  };

  const updateDraft = (patch: Partial<ClothingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setStatus((current) => (current === "saved" ? "idle" : current));
    setError("");
  };

  const fillDraftFromRecognition = (result: ClothingRecognitionResult, imageFilename = "") => {
    setDraft((current) => ({
      ...current,
      name: result.name || current.name,
      material: result.material || current.material,
      colors: result.colors || current.colors,
      note: result.note || current.note,
      category: result.category || current.category,
      image_filename: imageFilename || current.image_filename,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saveInFlightRef.current) {
      return;
    }
    saveInFlightRef.current = true;
    setStatus("saving");
    setError("");
    try {
      await createWardrobeItem(toWardrobeInput(draft));
      setStatus("saved");
      await onSaved?.();
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const handleRecognizeSingle = async () => {
    if (!imageFile || !canRecognizeSingle) {
      return;
    }
    setRecognitionStatus("recognizing");
    setRecognitionError("");
    try {
      const result = await recognizeClothingImage(imageFile, modelHubConfig);
      fillDraftFromRecognition(result, imageFile.name);
      setRecognitionStatus("recognized");
    } catch (recognizeError) {
      setRecognitionStatus("error");
      setRecognitionError(recognizeError instanceof Error ? recognizeError.message : "识图失败");
    }
  };

  const handleRecognizeText = async () => {
    if (!canRecognizeText) {
      return;
    }
    setRecognitionStatus("recognizing");
    setRecognitionError("");
    try {
      const result = await recognizeClothingText(textDescription, modelHubConfig);
      fillDraftFromRecognition(result);
      setRecognitionStatus("recognized");
    } catch (recognizeError) {
      setRecognitionStatus("error");
      setRecognitionError(recognizeError instanceof Error ? recognizeError.message : "文字提取失败");
    }
  };

  const handleRecognizeBatch = async () => {
    if (!canRecognizeBatch) {
      return;
    }
    setRecognitionStatus("recognizing");
    setRecognitionError("");
    setBatchDrafts([]);
    setBatchProgress({ total: batchFiles.length, completed: 0 });
    const recognized: ClothingDraft[] = [];
    const failedNames: string[] = [];
    let completedCount = 0;

    for (const file of batchFiles) {
      try {
        const result = await recognizeClothingImage(file, modelHubConfig);
        recognized.push({
          ...emptyDraft,
          name: result.name ?? "",
          material: result.material ?? "",
          colors: result.colors ?? "",
          note: result.note ?? "",
          category: result.category ?? emptyDraft.category,
          image_filename: file.name,
          photo_data_url: await fileToDataUrl(file),
        });
      } catch {
        failedNames.push(file.name);
      } finally {
        completedCount += 1;
        setBatchProgress({ total: batchFiles.length, completed: completedCount });
      }
    }

    setBatchDrafts(recognized);
    setBatchProgress(null);
    if (recognized.length > 0) {
      setRecognitionStatus("recognized");
      setRecognitionError(failedNames.length ? `${failedNames.length} 张图片未识别到衣物：${failedNames.join("、")}` : "");
    } else {
      setRecognitionStatus("error");
      setRecognitionError("没有识别到衣物，请上传包含衣物、吊牌或洗护标签的图片。");
    }
  };

  const handleSaveBatch = async () => {
    if (!canSaveBatch || saveInFlightRef.current) {
      return;
    }
    saveInFlightRef.current = true;
    setStatus("saving");
    setError("");
    try {
      for (const item of batchDrafts) {
        await createWardrobeItem(toWardrobeInput(item));
      }
      setStatus("saved");
      await onSaved?.();
      onBack();
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      saveInFlightRef.current = false;
    }
  };

  return (
    <Page compact>
      <TopBar title="添加衣物" onBack={onBack} />

      <div className="segmented">
        <button type="button" className={mode === "single" ? "active" : ""} onClick={() => changeMode("single")}>
          单件录入
        </button>
        <button type="button" className={mode === "batch" ? "active" : ""} onClick={() => changeMode("batch")}>
          批量录入
        </button>
        <button type="button" className={mode === "text" ? "active" : ""} onClick={() => changeMode("text")}>
          文字输入
        </button>
      </div>

      {mode === "single" ? (
        <>
          <label className="upload-panel">
            <Camera size={32} />
            <strong>{draft.image_filename || "上传衣物、吊牌或洗护标签"}</strong>
            <span>选择图片后可调用 ModelHub 识别；不识图也可以手动保存</span>
            <input
              className="file-input"
              type="file"
              accept="image/*"
              aria-label="上传衣物图片"
              disabled={recognitionStatus === "recognizing"}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                setImageFile(file);
                updateDraft({ image_filename: file?.name ?? "", photo_data_url: "" });
                if (file) {
                  void fileToDataUrl(file).then((photoDataUrl) => {
                    updateDraft({ photo_data_url: photoDataUrl });
                  });
                }
                setRecognitionStatus("idle");
                setRecognitionError("");
              }}
            />
          </label>

          <button className="secondary-button" type="button" onClick={handleRecognizeSingle} disabled={!canRecognizeSingle}>
            <Camera size={18} />
            {recognitionStatus === "recognizing" ? "识别中" : "拍照识别"}
          </button>
        </>
      ) : null}

      {mode === "text" ? (
        <>
          <label>
            <span>衣物描述</span>
            <textarea
              className="input-like textarea-like text-extraction-box"
              value={textDescription}
              placeholder="例如：这件灰色连帽卫衣大概是棉混纺，之前高温烘干以后有点缩水，今晚想穿。"
              disabled={recognitionStatus === "recognizing"}
              onChange={(event) => {
                setTextDescription(event.target.value);
                setRecognitionStatus("idle");
                setRecognitionError("");
              }}
            />
          </label>
          <button className="secondary-button" type="button" onClick={handleRecognizeText} disabled={!canRecognizeText}>
            <FileText size={18} />
            {recognitionStatus === "recognizing" ? "提取中" : "智能提取文字"}
          </button>
        </>
      ) : null}

      {mode === "batch" ? (
        <BatchEntry
          files={batchFiles}
          drafts={batchDrafts}
          hasModelHubConfig={hasModelHubConfig}
          recognitionStatus={recognitionStatus}
          recognitionError={recognitionError}
          status={status}
          error={error}
          canRecognizeBatch={canRecognizeBatch}
          canSaveBatch={canSaveBatch}
          onFilesChange={(files) => {
            setBatchFiles(files);
            setBatchDrafts([]);
            setStatus("idle");
            setError("");
            setRecognitionStatus("idle");
            setRecognitionError("");
            setBatchProgress(null);
          }}
          onRecognize={handleRecognizeBatch}
          onSave={handleSaveBatch}
        />
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            <span>衣物名称</span>
            <input className="input-like" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
          </label>
          <label>
            <span>主要材质</span>
            <input className="input-like" value={draft.material} onChange={(event) => updateDraft({ material: event.target.value })} />
          </label>
          <label>
            <span>颜色</span>
            <input className="input-like" value={draft.colors} onChange={(event) => updateDraft({ colors: event.target.value })} />
          </label>
          <label>
            <span>分类</span>
            <select
              className="input-like"
              aria-label="分类"
              value={draft.category}
              onChange={(event) => updateDraft({ category: event.target.value as WardrobeCategory })}
            >
              {wardrobeCategoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span>个人备注</span>
            <textarea className="input-like textarea-like" value={draft.note} onChange={(event) => updateDraft({ note: event.target.value })} />
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
                <Chip tone="teal">{draft.material || draft.colors ? "用户补全" : "待补全"}</Chip>
                {draft.note.includes("缩水") ? <Chip tone="orange">有缩水史</Chip> : null}
                {draft.image_filename ? <Chip tone="purple">已选图片</Chip> : null}
              </div>
            </Card>
          </Section>

          {!hasModelHubConfig ? <p className="form-status form-status-error">识图需要先在“我的”页面输入 ModelHub baseUrl 和 apikey</p> : null}
          {recognitionStatus === "recognized" ? <p className="form-status form-status-ok">识别完成，已填入可编辑字段</p> : null}
          {recognitionStatus === "error" ? <p className="form-status form-status-error">{recognitionError}</p> : null}
          {status === "saved" ? <p className="form-status form-status-ok">保存成功，已加入衣柜</p> : null}
          {status === "error" ? <p className="form-status form-status-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={!canSubmit}>
            <Save size={18} />
            {status === "saving" ? "正在保存" : "保存到衣柜"}
          </button>
        </form>
      )}
      {mode === "batch" && batchProgress ? <BatchRecognitionDialog progress={batchProgress} /> : null}
    </Page>
  );
}

function BatchRecognitionDialog({ progress }: { progress: BatchRecognitionProgress }) {
  const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const currentItem = Math.min(progress.completed + 1, progress.total);
  const tip = batchRecognitionTips[progress.completed % batchRecognitionTips.length];

  return (
    <div className="recognition-modal-backdrop">
      <div className="recognition-modal" role="dialog" aria-modal="true" aria-labelledby="batch-recognition-title">
        <div className="recognition-modal-icon">
          <Camera size={22} />
        </div>
        <div>
          <h2 id="batch-recognition-title">批量识别进度</h2>
          <p>正在识别 {currentItem} / {progress.total}</p>
        </div>
        <div
          className="progress-bar recognition-progress-bar"
          role="progressbar"
          aria-label="批量识别进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="recognition-progress-meta">
          <strong>{progressPercent}%</strong>
          <span>{progress.completed} 张已完成</span>
        </div>
        <p className="recognition-tip">{tip}</p>
      </div>
    </div>
  );
}

function BatchEntry({
  files,
  drafts,
  hasModelHubConfig,
  recognitionStatus,
  recognitionError,
  status,
  error,
  canRecognizeBatch,
  canSaveBatch,
  onFilesChange,
  onRecognize,
  onSave,
}: {
  files: File[];
  drafts: ClothingDraft[];
  hasModelHubConfig: boolean;
  recognitionStatus: RecognitionStatus;
  recognitionError: string;
  status: SaveStatus;
  error: string;
  canRecognizeBatch: boolean;
  canSaveBatch: boolean;
  onFilesChange: (files: File[]) => void;
  onRecognize: () => void;
  onSave: () => void;
}) {
  return (
    <div className="form-stack">
      <label className="upload-panel">
        <Files size={32} />
        <strong>{files.length ? `已选择 ${files.length} 张图片` : "批量上传衣物图片"}</strong>
        <span>可一次选择多张衣物、吊牌或洗护标签图片，识别后统一录入衣柜</span>
        <input
          className="file-input"
          type="file"
          accept="image/*"
          multiple
          aria-label="批量上传衣物图片"
          disabled={recognitionStatus === "recognizing" || status === "saving"}
          onChange={(event) => onFilesChange(Array.from(event.currentTarget.files ?? []))}
        />
      </label>

      <button className="secondary-button" type="button" onClick={onRecognize} disabled={!canRecognizeBatch}>
        <Camera size={18} />
        {recognitionStatus === "recognizing" ? "批量识别中" : "批量识别"}
      </button>

      {!hasModelHubConfig ? <p className="form-status form-status-error">识图需要先在“我的”页面输入 ModelHub baseUrl 和 apikey</p> : null}
      {recognitionStatus === "recognized" ? <p className="form-status form-status-ok">已识别 {drafts.length} 件衣物，可统一保存。</p> : null}
      {recognitionError ? <p className="form-status form-status-error">{recognitionError}</p> : null}

      {drafts.length > 0 ? (
        <Section title="批量识别结果">
          <div className="list-stack">
            {drafts.map((item) => (
              <Card key={`${item.image_filename}-${item.name || item.material}`}>
                <div className="dense-row">
                  <span className="round-icon round-icon-teal">
                    <FileText size={17} />
                  </span>
                  <div>
                    <h3>{item.name || "未命名衣物"}</h3>
                    <p>{[item.material, item.colors, item.note].filter(Boolean).join(" · ") || item.image_filename}</p>
                  </div>
                  <Chip tone="teal">{item.category}</Chip>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      <button className="primary-button" type="button" disabled={!canSaveBatch} onClick={onSave}>
        <Save size={18} />
        {status === "saving" ? "正在保存" : `统一保存 ${drafts.length} 件衣物`}
      </button>
      {status === "saved" ? <p className="form-status form-status-ok">已统一保存 {drafts.length} 件衣物</p> : null}
      {status === "error" ? <p className="form-status form-status-error">{error}</p> : null}
    </div>
  );
}

function toWardrobeInput(draft: ClothingDraft): WardrobeInput {
  return {
    name: draft.name.trim(),
    material: draft.material.trim(),
    colors: draft.colors.trim(),
    note: draft.note.trim(),
    image_filename: draft.image_filename.trim(),
    category: draft.category,
    photo_data_url: draft.photo_data_url,
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${imageDataUrlMimeType(file)};base64,${btoa(binary)}`;
}

function imageDataUrlMimeType(file: File): string {
  const explicitType = file.type.trim().toLowerCase();
  if (explicitType.startsWith("image/")) return explicitType;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}
