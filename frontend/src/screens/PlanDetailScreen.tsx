import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModelHubConfig } from "../api/modelHubConfig";
import { bucketLabel, generatePlanSummary } from "../api/llmSummary";
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
  const backendBuckets = mobileSummary?.plan.buckets ?? [];
  const hasBackendBuckets = backendBuckets.length > 0;
  const bucketRows = hasBackendBuckets
    ? backendBuckets.map((bucket) => ({
        id: bucket.bucket_id,
        title: `${methodLabel(bucket.wash_method)} · ${bucket.program || bucketLabel(bucket.bucket_id)}`,
        machine: bucket.machine_type,
        detail: `${bucket.item_ids.join("、") || "未列出衣物"} · ${dryLabel(bucket.dry_method)}`,
        tags: bucket.warnings.length
          ? bucket.warnings.map((warning) => ({ label: warning, tone: "orange" as const }))
          : [{ label: "后端批次", tone: "teal" as const }],
        accent: bucket.wash_method === "hand_wash" || bucket.wash_method === "dry_clean" ? ("orange" as const) : ("purple" as const),
      }))
    : bucketPlans;

  const preparationSteps: PreparationStep[] = useMemo(() => {
    if (!hasBackendBuckets) return defaultPreparationSteps();
    const steps: PreparationStep[] = [];

    const detergentBuckets = backendBuckets.filter((b) => b.detergent_ml != null);
    if (detergentBuckets.length > 0) {
      const details = detergentBuckets
        .map((b) => `${bucketLabel(b.bucket_id)} ${b.detergent_ml}ml`)
        .join("，");
      steps.push({ icon: "teal", title: "洗衣液按桶分配", description: details });
    }

    const bagBuckets = backendBuckets.filter((b) => b.use_laundry_bag);
    if (bagBuckets.length > 0) {
      steps.push({
        icon: "blue",
        title: "洗衣袋准备",
        description: `${bagBuckets.map((b) => bucketLabel(b.bucket_id)).join("、")}需要使用洗衣袋，降低摩擦和变形风险。`,
      });
    }

    const dryBuckets = backendBuckets.filter((b) => b.dry_method === "low_heat_dryer");
    if (dryBuckets.length > 0) {
      steps.push({
        icon: "amber",
        title: "烘干安排",
        description: `${dryBuckets.map((b) => bucketLabel(b.bucket_id)).join("、")}使用低温烘干，注意不可高温的衣物已改为晾干。`,
      });
    }

    const airDryBuckets = backendBuckets.filter((b) => b.dry_method === "air_dry");
    if (airDryBuckets.length > 0 && dryBuckets.length === 0) {
      steps.push({
        icon: "teal",
        title: "自然晾干",
        description: "本批次全部自然晾干，建议选择通风位置或阳台。",
      });
    }

    return steps.length > 0 ? steps : defaultPreparationSteps();
  }, [backendBuckets, hasBackendBuckets]);

  const exclusionItems: ExclusionItem[] = useMemo(() => {
    if (!hasBackendBuckets) return defaultExclusionItems();
    const items = backendBuckets
      .filter((b) => b.wash_method !== "machine_wash")
      .map((b) => ({
        title: `${b.item_ids.join("、")}不进共享机`,
        description: exclusionReason(b),
        method: methodLabel(b.wash_method),
      }));
    return items.length > 0 ? items : defaultExclusionItems();
  }, [backendBuckets, hasBackendBuckets]);

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
          <h2>{hasBackendBuckets ? `${backendBuckets.length} 个后端批次` : "3 桶分开洗"}</h2>
          <p>{llmSummary ?? mobileSummary?.plan.summary ?? "先开两台标准筒，床单等大件机 12 分钟。"}</p>
        </div>
        <Chip tone="teal">{hasBackendBuckets ? "LaundryPlan" : "可执行"}</Chip>
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
  return method;
}

function dryLabel(method: string) {
  if (method === "air_dry") return "自然晾干";
  if (method === "low_heat_dryer") return "低温烘干";
  if (method === "do_not_dry") return "不烘干";
  return method;
}

function exclusionReason(bucket: { wash_method: string; warnings: string[] }) {
  if (bucket.warnings.length > 0) return bucket.warnings[0];
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
