import { Edit3 } from "lucide-react";
import type { WardrobeSummaryItem } from "../api/mobileSummary";
import { Card, Chip, MetricCard, Page, Section, TopBar } from "../components/AppChrome";
import { ClothingArt } from "../components/ClothingArt";
import { type WardrobeItemView } from "../data/washMateContent";

interface ClothingDetailScreenProps {
  onBack: () => void;
  backendItem?: WardrobeSummaryItem | null;
  staticItem?: WardrobeItemView | null;
}

export function ClothingDetailScreen({ onBack, backendItem, staticItem }: ClothingDetailScreenProps) {
  if (!backendItem && !staticItem) {
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

  const item = backendItem ? detailFromBackend(backendItem) : detailFromStatic(staticItem as WardrobeItemView);

  return (
    <Page compact>
      <TopBar
        title="衣物详情"
        onBack={onBack}
        action={
          <button className="icon-button" type="button" aria-label="编辑衣物" disabled title="当前详情页仅展示衣物记忆">
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

      <Section title="洗护记忆">
        <div className="two-grid">
          <MetricCard value={String(item.wearCount)} label="穿着次数" />
          <MetricCard value={String(item.washCount)} label="洗涤次数" />
        </div>
      </Section>

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
            <p>{item.riskDescription}</p>
          </div>
        </Card>
      </Section>

      <Section title="本次建议">
        <Card>
          <div className="list-stack">
            <div className="dense-row">
              <span className="step-token">1</span>
              <div>
                <h3>与深色衣物同桶</h3>
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

      <button className="primary-button" type="button" disabled title="本次洗衣清单由今日方案生成">
        加入本次洗衣
      </button>
    </Page>
  );
}

function detailFromBackend(item: WardrobeSummaryItem) {
  const riskValues = Object.values(item.risks);
  const highRisk = riskValues.includes("high");
  const mediumRisk = riskValues.includes("medium");
  const userNote = item.user_note || item.user_notes?.[0] || "没有额外备注";
  return {
    name: item.name,
    art: artForName(item.name),
    material: materialText(item.material_ratios),
    colorText: item.colors.length > 0 ? item.colors.join("、") : "颜色未记录",
    wearCount: item.wear_count_since_wash,
    washCount: item.wash_count,
    tags: [
      highRisk
        ? { label: "高风险", tone: "red" as const }
        : mediumRisk
          ? { label: "需注意", tone: "orange" as const }
          : { label: "可机洗", tone: "teal" as const },
    ],
    riskTitle: riskTitle(item.risks),
    riskLevel: highRisk ? "高" : mediumRisk ? "中" : "低",
    riskProgress: highRisk ? "82%" : mediumRisk ? "54%" : "24%",
    riskDescription: riskValues.length > 0 ? `后端风险字段：${JSON.stringify(item.risks)}` : "后端未记录额外风险。",
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
    recommendation: item.recommendation,
    historyText: `已穿 ${item.wearCount} 次，累计洗涤 ${item.washCount} 次。`,
  };
}

function materialText(materialRatios: Record<string, number>) {
  const entries = Object.entries(materialRatios);
  if (entries.length === 0) {
    return "材质未记录";
  }
  return entries.map(([material, ratio]) => `${material} ${Math.round(ratio * 100)}%`).join("、");
}

function riskTitle(risks: Record<string, string>) {
  const keys = Object.keys(risks);
  return keys.length > 0 ? keys.join("、") : "后端风险画像";
}

function artForName(name: string) {
  if (name.includes("裤")) {
    return "jeans" as const;
  }
  if (name.includes("羊毛") || name.includes("开衫")) {
    return "wool" as const;
  }
  if (name.includes("床") || name.includes("被")) {
    return "bedding" as const;
  }
  if (name.includes("运动")) {
    return "sport" as const;
  }
  if (name.includes("卫衣") || name.includes("帽")) {
    return "hoodie" as const;
  }
  return "tee" as const;
}
