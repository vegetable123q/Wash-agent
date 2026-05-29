import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ModelHubConfig } from "../api/modelHubConfig";
import { generatePlanSummary } from "../api/llmSummary";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";
import { bucketPlans } from "../data/washMateContent";

interface PlanDetailScreenProps {
  onBack: () => void;
  mobileSummary?: MobileSummary | null;
  modelHubConfig?: ModelHubConfig;
}

interface PreparationStep {
  icon: "teal" | "blue" | "amber";
  title: string;
  description: string;
}

interface ExclusionItem {
  title: string;
  description: string;
  method: string;
}

export function PlanDetailScreen({ onBack, mobileSummary, modelHubConfig }: PlanDetailScreenProps) {
  const planBuckets = mobileSummary?.plan.buckets ?? [];
  const hasSummary = Boolean(mobileSummary);
  const hasBuckets = planBuckets.length > 0;
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (mobileSummary?.wardrobe.items) {
      for (const item of mobileSummary.wardrobe.items) {
        map.set(item.item_id, item.name);
      }
    }
    return map;
  }, [mobileSummary?.wardrobe.items]);
  const bucketRows = hasBuckets
    ? planBuckets.map((bucket) => ({
        id: bucket.bucket_id,
        title: `${bucketDisplayName(bucket.bucket_id)} · ${bucket.program ? programLabel(bucket.program) : methodLabel(bucket.wash_method)}`,
        machine: machineTypeLabel(bucket.machine_type),
        detail: `衣物：${bucket.item_ids.map((id) => nameMap.get(id) || "本批衣物").join("、") || "未列出衣物"} · ${methodLabel(bucket.wash_method)} · ${dryLabel(bucket.dry_method)}`,
        tags: bucket.warnings.length
          ? bucket.warnings.map((warning) => ({ label: userFacingWarning(warning), tone: "orange" as const }))
          : [{ label: "已整理", tone: "teal" as const }],
        accent: bucket.wash_method === "hand_wash" || bucket.wash_method === "dry_clean" || bucket.wash_method === "do_not_wash" ? ("orange" as const) : ("purple" as const),
      }))
    : hasSummary
      ? [{
          id: "empty-plan",
          title: "暂无本次分桶",
          machine: "待选择",
          detail: "请先在衣柜勾选这批要清洗的衣物。",
          tags: [{ label: "未选择衣物", tone: "orange" as const }],
          accent: "purple" as const,
        }]
      : bucketPlans;

  const preparationSteps: PreparationStep[] = useMemo(() => {
    if (!hasSummary) return defaultPreparationSteps();
    if (!hasBuckets) {
      return [{ icon: "blue", title: "先选择衣物", description: "回到衣柜勾选本次要清洗的衣物后，再查看分桶、费用和时长。" }];
    }
    const steps: PreparationStep[] = [];

    const detergentBuckets = planBuckets.filter((b) => b.detergent_ml != null);
    if (detergentBuckets.length > 0) {
      const details = detergentBuckets
        .map((b) => `${bucketDisplayName(b.bucket_id)} ${b.detergent_ml} ml`)
        .join("，");
      steps.push({ icon: "teal", title: "洗衣液按桶分配", description: details });
    }

    const bagBuckets = planBuckets.filter((b) => b.use_laundry_bag);
    if (bagBuckets.length > 0) {
      steps.push({
        icon: "blue",
        title: "洗衣袋准备",
        description: `${bagBuckets.map((b) => bucketDisplayName(b.bucket_id)).join("、")}需要使用洗衣袋，降低摩擦和变形风险。`,
      });
    }

    const dryBuckets = planBuckets.filter((b) => b.dry_method === "low_heat_dryer");
    if (dryBuckets.length > 0) {
      steps.push({
        icon: "amber",
        title: "烘干安排",
        description: `${dryBuckets.map((b) => bucketDisplayName(b.bucket_id)).join("、")}使用低温烘干，注意不可高温的衣物已改为晾干。`,
      });
    }

    const airDryBuckets = planBuckets.filter((b) => b.dry_method === "air_dry");
    if (airDryBuckets.length > 0 && dryBuckets.length === 0) {
      steps.push({
        icon: "teal",
        title: "自然晾干",
        description: "本批次全部自然晾干，建议选择通风位置或阳台。",
      });
    }

    return steps.length > 0 ? steps : defaultPreparationSteps();
  }, [planBuckets, hasBuckets, hasSummary]);

  const exclusionItems: ExclusionItem[] = useMemo(() => {
    if (!hasSummary) return defaultExclusionItems();
    if (!hasBuckets) return [];
    const items = planBuckets
      .filter((b) => b.wash_method !== "machine_wash")
      .map((b) => ({
        title: `${b.item_ids.map((id) => nameMap.get(id) || "本批衣物").join("、")}不进共享机`,
        description: exclusionReason(b),
        method: methodLabel(b.wash_method),
      }));
    return items.length > 0 ? items : defaultExclusionItems();
  }, [nameMap, planBuckets, hasBuckets, hasSummary]);

  // LLM-enhanced summary
  const [llmSummary, setLlmSummary] = useState<string | null>(null);
  useEffect(() => {
    if (!mobileSummary?.plan || !modelHubConfig) return;
    let cancelled = false;
    generatePlanSummary(mobileSummary.plan, modelHubConfig).then((result) => {
      if (!cancelled && result.source === "llm") setLlmSummary(result.text);
    });
    return () => { cancelled = true; };
  }, [mobileSummary?.plan, modelHubConfig]);

  return (
    <Page compact>
      <TopBar title="本次方案" onBack={onBack} />

      <Card accent="purple" className="summary-card">
        <div>
          <h2>{hasBuckets ? `${planBuckets.length} 个洗护批次` : hasSummary ? "暂无本次方案" : "3 桶分开洗"}</h2>
          <p>{llmSummary ?? mobileSummary?.plan.summary ?? "床品单独占用标准筒，不和普通衣物混洗。"}</p>
        </div>
        <Chip tone={hasBuckets ? "teal" : "orange"}>{hasBuckets ? "已生成" : hasSummary ? "待选择" : "可执行"}</Chip>
      </Card>

      <Section title="洗衣顺序">
        <div className="timeline">
          {bucketRows.map((bucket, index) => (
            <div className="timeline-row" key={bucket.id}>
              <span className="timeline-index">{index + 1}</span>
              <Card accent={bucket.accent}>
                <div className="row-between">
                  <h3>{bucket.title}</h3>
                  <Chip tone={bucket.accent}>{bucket.machine}</Chip>
                </div>
                <p>{bucket.detail}</p>
                <div className="chip-row">
                  {bucket.tags.map((tag) => (
                    <Chip key={tag.label} tone={tag.tone}>
                      {tag.label}
                    </Chip>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Section>

      <Section title="执行准备">
        <Card>
          <div className="list-stack">
            {preparationSteps.map((step) => (
              <div className="dense-row" key={step.title}>
                <span className={`round-icon round-icon-${step.icon}`}>
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {exclusionItems.length > 0 ? (
        <Section title="排除与提醒">
          <div className="list-stack">
            {exclusionItems.map((item) => (
              <Card key={item.title} accent="orange" className="warning-surface">
                <div className="row-between">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <Chip tone="red">
                    <AlertTriangle size={14} />
                    {item.method}
                  </Chip>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  );
}

function methodLabel(method: string) {
  if (method === "hand_wash") return "手洗";
  if (method === "dry_clean") return "干洗";
  if (method === "machine_wash") return "机洗";
  if (method === "do_not_wash") return "不水洗";
  return "待确认";
}

function programLabel(program: string) {
  if (program === "standard") return "标准";
  if (program === "quick") return "快洗";
  if (program === "large") return "大物";
  if (program === "spin") return "单脱";
  if (program === "tub_clean") return "桶自洁";
  if (program === "standard_40c") return "标准+40度";
  if (program === "standard_60c_uv") return "标准+60度+紫外";
  if (!program) return "未定";
  return "合适程序";
}

function dryLabel(method: string) {
  if (method === "air_dry") return "自然晾干";
  if (method === "low_heat_dryer") return "低温烘干";
  if (method === "normal_dryer") return "普通烘干";
  if (method === "do_not_dry") return "不烘干";
  return "干燥待确认";
}

function exclusionReason(bucket: { wash_method: string; warnings: string[] }) {
  if (bucket.warnings.length > 0) return userFacingWarning(bucket.warnings[0]);
  if (bucket.wash_method === "hand_wash") return "材质或风险提示不适合共享洗衣机。";
  if (bucket.wash_method === "dry_clean") return "该批次需要专业干洗，不进入共享洗衣机。";
  if (bucket.wash_method === "do_not_wash") return "洗护标签提示不可水洗。";
  return "建议单独处理。";
}

function defaultPreparationSteps(): PreparationStep[] {
  return [
    { icon: "teal", title: "洗衣液按桶分配", description: "浅色 1 瓶盖，深色 1 瓶盖，床单 1.5 瓶盖。" },
    { icon: "blue", title: "贴身衣物装袋", description: "白 T 和运动衣进入浅色桶，降低摩擦和公共卫生顾虑。" },
  ];
}

function defaultExclusionItems(): ExclusionItem[] {
  return [{ title: "羊毛开衫不进共享机", description: "材质易缩水变形，本次从机洗分桶中排除。", method: "手洗/干洗" }];
}

function machineTypeLabel(machineType: string) {
  if (machineType === "standard_washer") return "洗衣机";
  if (machineType === "shoe_washer") return "洗鞋机";
  if (machineType === "dryer") return "烘干机";
  return "设备待确认";
}

function bucketDisplayName(bucketId: string): string {
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗衣物",
    "dry-clean": "干洗衣物",
    "hand-wash": "手洗衣物",
    "large-bedding": "床品单独洗",
    "dark-standard": "深色标准洗",
    "light-standard": "浅色标准洗",
  };
  return labels[bucketId] ?? "本批衣物";
}

function userFacingWarning(text: string): string {
  return text
    .replace(/\bstandard_washer\b/g, "洗衣机")
    .replace(/\bshoe_washer\b/g, "洗鞋机")
    .replace(/\bdryer\b/g, "烘干机")
    .replace(/程序\s+standard/g, "程序 标准")
    .replace(/程序\s+quick/g, "程序 快洗")
    .replace(/程序\s+large/g, "程序 大物")
    .replace(/程序\s+low/g, "程序 低温烘干");
}
