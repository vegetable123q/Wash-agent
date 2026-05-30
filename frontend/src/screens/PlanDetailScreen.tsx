import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ModelHubConfig } from "../api/modelHubConfig";
import { generatePlanSummary } from "../api/llmSummary";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";

interface PlanDetailScreenProps {
  onBack: () => void;
  mobileSummary?: MobileSummary | null;
  modelHubConfig?: ModelHubConfig;
  onCompletePlan?: () => void | Promise<void>;
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

export function PlanDetailScreen({ onBack, mobileSummary, modelHubConfig, onCompletePlan }: PlanDetailScreenProps) {
  const planBuckets = mobileSummary?.plan.buckets ?? [];
  const dryingPlan = mobileSummary?.drying_plan;
  const hasSummary = Boolean(mobileSummary);
  const hasBuckets = planBuckets.length > 0;
  const hasSelectedItems = (mobileSummary?.selected_laundry_item_ids.length ?? 0) > 0;
  const hasSelectedEmptyPlan = hasSummary && hasSelectedItems && !hasBuckets;
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (mobileSummary?.wardrobe.items) {
      for (const item of mobileSummary.wardrobe.items) {
        map.set(item.item_id, item.name);
      }
    }
    return map;
  }, [mobileSummary?.wardrobe.items]);
  const emptyPlanTags = mobileSummary?.plan.global_warnings.length
    ? mobileSummary.plan.global_warnings.map((warning) => ({ label: userFacingWarning(warning), tone: "orange" as const }))
    : [{ label: hasSelectedEmptyPlan ? "方案暂未生成" : "未选择衣物", tone: "orange" as const }];
  const bucketRows = hasBuckets
    ? planBuckets.map((bucket) => {
        const missingWasher = bucketUnavailableWasherReason(bucket);
        const method = methodLabel(bucket.wash_method);
        const dryMethod = bucketDryMethod(dryingPlan, bucket.bucket_id, bucket.dry_method);
        const isManual = bucket.wash_method === "hand_wash" || bucket.wash_method === "dry_clean" || bucket.wash_method === "do_not_wash";
        return {
          id: bucket.bucket_id,
          title: `${bucketDisplayName(bucket.bucket_id)} · ${bucket.wash_method === "machine_wash" && bucket.program ? programLabel(bucket.program) : method}`,
          machine: bucket.wash_method === "machine_wash"
            ? missingWasher ?? machineTypeLabel(bucket.machine_type)
            : method,
          detail: `衣物：${bucket.item_ids.map((id) => nameMap.get(id) || "本批衣物").join("、") || "未列出衣物"} · ${method} · ${dryLabel(dryMethod)}`,
          tags: bucket.warnings.length
            ? bucket.warnings.map((warning) => ({ label: userFacingWarning(warning), tone: "orange" as const }))
            : [{ label: "已整理", tone: "teal" as const }],
          accent: missingWasher || isManual ? ("orange" as const) : ("purple" as const),
        };
      })
      : hasSummary
        ? [{
          id: "empty-plan",
          title: hasSelectedEmptyPlan ? "暂无可执行分桶" : "暂无本次分桶",
          machine: hasSelectedEmptyPlan ? "待处理" : "待选择",
          detail: hasSelectedEmptyPlan
            ? mobileSummary?.plan.summary ?? "已选择衣物，但当前机器或约束条件暂时无法生成可执行分桶。"
            : "请先在衣柜勾选本次要清洗的衣物。",
          tags: emptyPlanTags,
          accent: "purple" as const,
        }]
      : [{
          id: "loading-plan",
          title: "等待本次方案",
          machine: "待生成",
          detail: "选择衣物并读取机器状态后，这里会显示真实洗衣顺序。",
          tags: [{ label: "等待数据", tone: "orange" as const }],
          accent: "purple" as const,
        }];

  const preparationSteps: PreparationStep[] = useMemo(() => {
    if (!hasSummary) return [{ icon: "blue", title: "等待数据", description: "本地衣柜和机器状态加载完成后，再生成执行准备。" }];
    if (!hasBuckets) {
      if (hasSelectedItems) {
        return [{ icon: "amber", title: "查看机器状态", description: "当前衣物已选中，但还没有可执行分桶；请刷新机器状态或手动确认可用洗衣机。" }];
      }
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

    return steps.length > 0
      ? steps
      : [{ icon: "teal", title: "按桶核对衣物", description: `${planBuckets.map((b) => bucketDisplayName(b.bucket_id)).join("、")}已生成，执行前核对衣物和机器状态。` }];
  }, [planBuckets, hasBuckets, hasSummary, hasSelectedItems]);

  // Drying-phase preparation steps.
  const dryingSteps: PreparationStep[] = useMemo(() => {
    if (!dryingPlan || !dryingPlan.steps.length) return [];
    const drySteps = dryingPlan.steps.filter((s) => s.dry_method === "low_heat_dryer");
    const airSteps = dryingPlan.steps.filter((s) => s.dry_method === "air_dry");
    const steps: PreparationStep[] = [];
    if (drySteps.length) {
      steps.push({
        icon: "amber",
        title: "烘干安排",
        description: `${drySteps.map((s) => bucketDisplayName(s.bucket_id)).join("、")}洗完后使用低温烘干。`,
      });
    }
    if (airSteps.length && !drySteps.length) {
      steps.push({
        icon: "teal",
        title: "自然晾干",
        description: "本批次全部自然晾干，建议选择通风位置或阳台。",
      });
    }
    return steps;
  }, [dryingPlan]);

  const exclusionItems: ExclusionItem[] = useMemo(() => {
    if (!hasSummary) return [];
    if (!hasBuckets) return [];
    const items = planBuckets
      .filter((b) => b.wash_method !== "machine_wash")
      .map((b) => ({
        title: `${b.item_ids.map((id) => nameMap.get(id) || "本批衣物").join("、")}不进共享机`,
        description: exclusionReason(b),
        method: methodLabel(b.wash_method),
      }));
    return items;
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

  const handleExecutePlan = () => {
    if (!onCompletePlan) return;
    if (!window.confirm("执行后会记录本次洗涤并清空脏衣篮中这批衣物，确定继续吗？")) {
      return;
    }
    void onCompletePlan();
  };

  return (
    <Page compact>
      <TopBar title="本次方案" onBack={onBack} />

      <Card accent="purple" className="summary-card">
        <div>
          <h2>{hasBuckets ? `${planBuckets.length} 个洗护批次` : hasSelectedEmptyPlan ? "方案暂未生成" : hasSummary ? "暂无本次方案" : "等待生成方案"}</h2>
          <p>{llmSummary ?? mobileSummary?.plan.summary ?? "选择衣物并读取机器状态后，这里会显示真实分桶、费用和执行提醒。"}</p>
        </div>
        <Chip tone={hasBuckets ? "teal" : "orange"}>{hasBuckets ? "已生成" : hasSelectedEmptyPlan ? "待确认" : hasSummary ? "待选择" : "加载中"}</Chip>
      </Card>

      {hasBuckets && hasSelectedItems ? (
        <button className="primary-button plan-execute-button" type="button" onClick={handleExecutePlan} disabled={!onCompletePlan}>
          按此方案执行
        </button>
      ) : null}

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

      {dryingSteps.length > 0 && (
        <Section title="洗完后烘干">
          <Card>
            <div className="list-stack">
              {dryingSteps.map((step) => (
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
      )}

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

function machineTypeLabel(machineType: string) {
  if (machineType === "standard_washer") return "洗衣机";
  if (machineType === "shoe_washer") return "洗鞋机";
  if (machineType === "dryer") return "烘干机";
  return "设备待确认";
}

function bucketUnavailableWasherReason(bucket: { warnings: string[] }): string | null {
  return bucket.warnings.find((warning) => warning === "没有空闲洗衣机" || warning === "没有空闲洗鞋机") ?? null;
}

function bucketDryMethod(
  dryingPlan: MobileSummary["drying_plan"] | undefined,
  bucketId: string,
  fallback: MobileSummary["plan"]["buckets"][number]["dry_method"],
): MobileSummary["plan"]["buckets"][number]["dry_method"] {
  return dryingPlan?.steps.find((step) => step.bucket_id === bucketId)?.dry_method ?? fallback;
}

function bucketDisplayName(bucketId: string): string {
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗衣物",
    "dry-clean": "干洗衣物",
    "hand-wash": "手洗衣物",
    "large-bedding": "床品单独洗",
    "dark-standard": "深色标准洗",
    "light-standard": "浅色标准洗",
    "mixed-standard": "混色标准洗",
  };
  const base = bucketId.replace(/-\d+$/, "");
  return labels[base] ?? labels[bucketId] ?? "本批衣物";
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
