import { Edit3, Footprints, ShoppingBasket } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { ModelHubConfig } from "../api/modelHubConfig";
import { fallbackRiskDescription, generateRiskDescription, riskKeyLabel } from "../api/llmSummary";
import type { WardrobeCategory, WardrobeInput, WardrobeSummaryItem } from "../api/mobileSummary";
import { hasNonMachineWashCare, splitWardrobeCareMemory } from "../api/wardrobeCareText";
import { Card, Chip, MetricCard, Page, Section, TopBar } from "../components/AppChrome";
import { ClothingArt } from "../components/ClothingArt";
import { type WardrobeItemView } from "../data/washMateContent";

interface ClothingDetailScreenProps {
  onBack: () => void;
  backendItem?: WardrobeSummaryItem | null;
  staticItem?: WardrobeItemView | null;
  modelHubConfig?: ModelHubConfig;
  onRecordWear?: (itemId: string) => void | Promise<void>;
  onSetWearCount?: (itemId: string, wearCount: number) => void | Promise<void>;
  onAddToBasket?: (itemId: string) => void | Promise<void>;
  onUpdateItem?: (itemId: string, input: WardrobeInput) => void | Promise<void>;
  isInDirtyBasket?: boolean;
}

interface ClothingEditDraft {
  name: string;
  material: string;
  colors: string;
  category: WardrobeCategory;
  note: string;
}

const wardrobeCategoryOptions: WardrobeCategory[] = ["上衣", "裤装", "裙装", "外套", "内衣袜子", "床品", "鞋包配饰", "其他"];
const emptyEditDraft: ClothingEditDraft = {
  name: "",
  material: "",
  colors: "",
  category: "其他",
  note: "",
};

export function ClothingDetailScreen({
  onBack,
  backendItem,
  staticItem,
  modelHubConfig,
  onRecordWear,
  onSetWearCount,
  onAddToBasket,
  onUpdateItem,
  isInDirtyBasket = false,
}: ClothingDetailScreenProps) {
  // LLM-enhanced risk description (backend items only)
  const [llmRiskText, setLlmRiskText] = useState<string | null>(null);
  const [wearCountDraft, setWearCountDraft] = useState(() => String(backendItem?.wear_count_since_wash ?? 0));
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<ClothingEditDraft>(() => backendItem ? editDraftFromBackend(backendItem) : emptyEditDraft);
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [editError, setEditError] = useState("");

  const item = backendItem ? detailFromBackend(backendItem) : staticItem ? detailFromStatic(staticItem) : null;
  const trimmedWearCountDraft = wearCountDraft.trim();
  const manualWearCount = Number(trimmedWearCountDraft);
  const isWearCountDraftValid = trimmedWearCountDraft !== "" && Number.isInteger(manualWearCount) && manualWearCount >= 0;
  const canSaveWearCount = Boolean(
    backendItem &&
      onSetWearCount &&
      isWearCountDraftValid &&
      manualWearCount !== backendItem.wear_count_since_wash,
  );
  const canEditItem = Boolean(backendItem && onUpdateItem);
  const canSaveEdit = Boolean(backendItem && onUpdateItem && editDraft.name.trim() && editStatus !== "saving");

  useEffect(() => {
    setLlmRiskText(null);
    if (!backendItem || !modelHubConfig) return;
    let cancelled = false;
    generateRiskDescription(backendItem.risks, backendItem.name, backendItem.material_ratios, modelHubConfig).then((result) => {
      if (!cancelled && result.source === "llm") setLlmRiskText(result.text);
    });
    return () => { cancelled = true; };
  }, [backendItem, modelHubConfig]);

  useEffect(() => {
    if (backendItem) {
      setWearCountDraft(String(backendItem.wear_count_since_wash));
    }
  }, [backendItem?.item_id, backendItem?.wear_count_since_wash]);

  useEffect(() => {
    setIsEditing(false);
    setEditDraft(backendItem ? editDraftFromBackend(backendItem) : emptyEditDraft);
    setEditStatus("idle");
    setEditError("");
  }, [backendItem?.item_id]);

  const handleWearCountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!backendItem || !canSaveWearCount) {
      return;
    }
    void onSetWearCount?.(backendItem.item_id, manualWearCount);
  };

  const updateEditDraft = (patch: Partial<ClothingEditDraft>) => {
    setEditDraft((current) => ({ ...current, ...patch }));
    setEditStatus("idle");
    setEditError("");
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!backendItem || !onUpdateItem || !canSaveEdit) {
      return;
    }
    setEditStatus("saving");
    setEditError("");
    try {
      await onUpdateItem(backendItem.item_id, {
        name: editDraft.name.trim(),
        material: editDraft.material.trim(),
        colors: editDraft.colors.trim(),
        note: editDraft.note.trim(),
        image_filename: backendItem.user_notes?.[1] ?? "",
        category: editDraft.category,
      });
      setIsEditing(false);
      setEditStatus("idle");
    } catch (error) {
      setEditStatus("error");
      setEditError(error instanceof Error ? error.message : "保存失败");
    }
  };

  if (!item) {
    return (
      <Page compact>
        <TopBar title="衣物详情" onBack={onBack} />
        <Card accent="orange" className="warning-surface">
          <h2>未找到衣物记录</h2>
          <p>请从衣柜列表重新选择衣物。</p>
        </Card>
      </Page>
    );
  }

  const riskDescription = llmRiskText ?? item.riskDescription;

  return (
    <Page compact>
      <TopBar
        title="衣物详情"
        onBack={onBack}
        action={
          <button
            className="icon-button"
            type="button"
            aria-label="编辑衣物"
            disabled={!canEditItem}
            title={canEditItem ? "编辑衣物信息" : "当前衣物暂不可编辑"}
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={18} />
          </button>
        }
      />

      <Card className="profile-card">
        <ClothingArt kind={item.art} size="lg" />
        <div>
          <h2>{item.name}</h2>
          <p>{item.material} · {item.colorText}</p>
          <div className="chip-row">
            {item.tags.map((tag) => (
              <Chip key={tag.label} tone={tag.tone}>
                {tag.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      {isEditing && backendItem ? (
        <Section title="编辑衣物">
          <Card>
            <form className="form-stack" onSubmit={handleEditSubmit}>
              <label>
                <span>衣物名称</span>
                <input
                  className="input-like"
                  value={editDraft.name}
                  onChange={(event) => updateEditDraft({ name: event.target.value })}
                />
              </label>
              <label>
                <span>主要材质</span>
                <input
                  className="input-like"
                  value={editDraft.material}
                  onChange={(event) => updateEditDraft({ material: event.target.value })}
                />
              </label>
              <label>
                <span>颜色</span>
                <input
                  className="input-like"
                  value={editDraft.colors}
                  onChange={(event) => updateEditDraft({ colors: event.target.value })}
                />
              </label>
              <label>
                <span>分类</span>
                <select
                  className="input-like"
                  aria-label="分类"
                  value={editDraft.category}
                  onChange={(event) => updateEditDraft({ category: event.target.value as WardrobeCategory })}
                >
                  {wardrobeCategoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>个人备注</span>
                <textarea
                  className="input-like textarea-like"
                  value={editDraft.note}
                  onChange={(event) => updateEditDraft({ note: event.target.value })}
                />
              </label>
              {editStatus === "error" ? <p className="form-status form-status-error">{editError}</p> : null}
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={() => setIsEditing(false)}>
                  取消
                </button>
                <button className="primary-button" type="submit" disabled={!canSaveEdit}>
                  保存修改
                </button>
              </div>
            </form>
          </Card>
        </Section>
      ) : null}

      <Section title="洗护记忆">
        <div className="two-grid">
          <MetricCard value={String(item.wearCount)} label="穿着次数" />
          <MetricCard value={String(item.washCount)} label="洗涤次数" />
        </div>
        {backendItem ? (
          <>
            <form className="wear-count-editor" onSubmit={handleWearCountSubmit}>
              <label htmlFor={`wear-count-${backendItem.item_id}`}>手动修改穿着次数</label>
              <div className="wear-count-editor-row">
                <input
                  id={`wear-count-${backendItem.item_id}`}
                  className="input-like"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={wearCountDraft}
                  onChange={(event) => setWearCountDraft(event.target.value)}
                  aria-invalid={trimmedWearCountDraft !== "" && !isWearCountDraftValid}
                />
                <button className="secondary-button" type="submit" disabled={!canSaveWearCount}>
                  保存次数
                </button>
              </div>
            </form>
            <div className="button-row detail-action-row">
              <button className="secondary-button" type="button" onClick={() => void onRecordWear?.(backendItem.item_id)}>
                <Footprints size={18} />
                记录穿着
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void onAddToBasket?.(backendItem.item_id)}
                disabled={isInDirtyBasket}
              >
                <ShoppingBasket size={18} />
                {isInDirtyBasket ? "已在脏衣篮" : "加入脏衣篮"}
              </button>
            </div>
          </>
        ) : null}
      </Section>

      {item.careTags ? (
        <Section title="洗护标签">
          <Card>
            <p className="care-label-text">{item.careTags}</p>
          </Card>
        </Section>
      ) : null}

      <Section title="风险画像">
        <Card accent="orange" className="warning-surface">
          <div className="progress-block">
            <div className="row-between">
              <h3>{item.riskTitle}</h3>
              <strong>{item.riskLevel}</strong>
            </div>
            <div className="progress-bar">
              <span style={{ width: item.riskProgress }} />
            </div>
            <p>{riskDescription}</p>
          </div>
        </Card>
      </Section>

      <Section title="本次建议">
        <Card>
          <div className="list-stack">
            <div className="dense-row">
              <span className="step-token">1</span>
              <div>
                <h3>{item.recommendationTitle}</h3>
                <p>{item.recommendation}</p>
              </div>
            </div>
            <div className="dense-row">
              <span className="step-token step-token-amber">2</span>
              <div>
                <h3>洗护记录</h3>
                <p>{item.historyText}</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>
    </Page>
  );
}

function detailFromBackend(item: WardrobeSummaryItem) {
  const riskValues = Object.values(item.risks);
  const highRisk = riskValues.includes("high");
  const mediumRisk = riskValues.includes("medium");
  const rawCareMemory = item.user_note || item.user_notes?.[0] || "";
  const careMemory = splitWardrobeCareMemory(rawCareMemory);
  const nonMachineWash = hasNonMachineWashCare(careMemory.sourceText, item.user_note, ...(item.user_notes ?? []));
  const userNote = careMemory.suggestion || rawCareMemory || "没有额外备注";
  return {
    name: item.name,
    art: artForName(item.name),
    material: materialText(item.material_ratios),
    colorText: item.colors.length > 0 ? item.colors.join("、") : "颜色未记录",
    wearCount: item.wear_count_since_wash,
    washCount: item.wash_count,
    tags: [
      nonMachineWash
        ? { label: "不可机洗", tone: "orange" as const }
        : highRisk
        ? { label: "高风险", tone: "red" as const }
        : mediumRisk
          ? { label: "需注意", tone: "orange" as const }
          : { label: "可机洗", tone: "teal" as const },
    ],
    riskTitle: riskTitle(item.risks),
    riskLevel: highRisk ? "高" : mediumRisk ? "中" : "低",
    riskProgress: highRisk ? "82%" : mediumRisk ? "54%" : "24%",
    riskDescription: fallbackRiskDescription(item.risks, item.name, item.material_ratios),
    careTags: careMemory.careTags,
    recommendationTitle: recommendationTitleForBackend(item, nonMachineWash),
    recommendation: userNote,
    historyText: `已穿 ${item.wear_count_since_wash} 次，累计洗涤 ${item.wash_count} 次。`,
  };
}

function detailFromStatic(item: WardrobeItemView) {
  return {
    name: item.name,
    art: item.art,
    material: item.material,
    colorText: item.description,
    wearCount: item.wearCount,
    washCount: item.washCount,
    tags: item.tags,
    riskTitle: item.riskTitle,
    riskLevel: item.riskLevel,
    riskProgress: item.riskLevel === "高" ? "82%" : item.riskLevel === "中" ? "54%" : "24%",
    riskDescription: item.recommendation,
    careTags: "",
    recommendationTitle: "查看洗护建议",
    recommendation: item.recommendation,
    historyText: `已穿 ${item.wearCount} 次，累计洗涤 ${item.washCount} 次。`,
  };
}

function editDraftFromBackend(item: WardrobeSummaryItem): ClothingEditDraft {
  return {
    name: item.name,
    material: materialInputText(item.material_ratios),
    colors: item.colors.join(", "),
    category: item.category ?? "其他",
    note: item.user_note || item.user_notes?.[0] || "",
  };
}

function materialInputText(materialRatios: Record<string, number>) {
  const entries = Object.entries(materialRatios).filter(([, ratio]) => isPositiveFiniteNumber(ratio));
  return entries.map(([material, ratio]) => `${material} ${Math.round(ratio * 100)}%`).join(", ");
}

function recommendationTitleForBackend(item: WardrobeSummaryItem, nonMachineWash = false): string {
  if (nonMachineWash || hasNonMachineWashCare(item.user_note, ...(item.user_notes ?? []))) {
    return "不可机洗，单独手洗";
  }
  const colorText = item.colors.join(" ").toLowerCase();
  const colorBleedRisk = item.risks.color_bleed;
  if (colorBleedRisk === "high" || colorBleedRisk === "medium") {
    return "深浅色分开洗";
  }
  if (["黑", "深", "black", "dark", "navy"].some((term) => colorText.includes(term))) {
    return "深色衣物分开洗";
  }
  return "按浅色衣物清洗";
}

function materialText(materialRatios: Record<string, number>) {
  const entries = Object.entries(materialRatios).filter(([, ratio]) => isPositiveFiniteNumber(ratio));
  if (entries.length === 0) {
    return "材质未记录";
  }
  return entries.map(([material, ratio]) => `${material} ${Math.round(ratio * 100)}%`).join("、");
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function riskTitle(risks: Record<string, string>) {
  const keys = Object.keys(risks);
  if (!keys.length) return "风险画像";
  return keys.map((k) => riskKeyLabel(k)).join("、");
}

function artForName(name: string) {
  if (name.includes("裤")) return "jeans" as const;
  if (name.includes("羊毛") || name.includes("开衫")) return "wool" as const;
  if (name.includes("床") || name.includes("被")) return "bedding" as const;
  if (name.includes("运动")) return "sport" as const;
  if (name.includes("卫衣") || name.includes("帽")) return "hoodie" as const;
  return "tee" as const;
}
