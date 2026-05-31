import { AlertTriangle, BadgeCheck, Clock3, Leaf, Shirt, TrendingDown, WashingMachine } from "lucide-react";
import { machineDisplayLabel } from "../api/machineDisplay";
import type { MobileSummary } from "../api/mobileSummary";
import type { LaundryBucket, DryingStep } from "../api/types";
import { Card, Chip, Page, PrimaryPanel, Section } from "../components/AppChrome";

type ReportStatus = "loading" | "unconfigured" | "empty" | "blocked" | "ready";

interface RouteCard {
  id: string;
  title: string;
  items: string;
  itemCount: string;
  method: string;
  machine: string;
  detergent: string;
  dry: string;
  priceLine: string;
  tone: "purple" | "teal" | "orange" | "blue" | "red";
}

function formatPrice(price: number | null | undefined): string {
  return isFiniteNonNegativeNumber(price) ? `¥${formatMoney(price)}` : "价格待确认";
}

export function ReportScreen({ mobileSummary }: { mobileSummary?: MobileSummary | null }) {
  const plan = mobileSummary?.plan;
  const dryingPlan = mobileSummary?.drying_plan;
  const planReport = mobileSummary?.report;
  const hasPlan = Boolean(plan?.buckets.length);
  const reportStatus = reportStatusFor(mobileSummary);
  const isReady = reportStatus === "ready";
  const isBlocked = reportStatus === "blocked";
  const nameMap = new Map(mobileSummary?.wardrobe.items.map((item) => [item.item_id, item.name]) ?? []);

  // Wash-phase cost only.
  const washCost = plan?.estimated_cost_yuan;
  const dryCost = dryingPlan?.estimated_cost_yuan;
  const hasValidWashCost = isFiniteNonNegativeNumber(washCost);
  const hasValidDryCost = dryCost == null || isFiniteNonNegativeNumber(dryCost);
  const totalCost = (hasValidWashCost ? washCost : 0) + (hasValidDryCost ? (dryCost ?? 0) : 0);
  const totalCopy = plan
    ? !hasValidWashCost
      ? { main: "费用待确认", breakdown: null as string | null }
      : dryCost && hasValidDryCost
        ? { main: `¥${formatMoney(totalCost)}`, breakdown: `洗 ¥${formatMoney(washCost)} + 烘 ¥${formatMoney(dryCost)}` }
        : { main: `¥${formatMoney(washCost)}`, breakdown: null as string | null }
    : { main: "待确认", breakdown: null as string | null };
  const durationCopy = durationSummary(plan?.estimated_duration_minutes, dryingPlan?.estimated_duration_minutes);
  const bucketCountText = plan ? `${plan.buckets.length} 个批次` : "待生成";
  const routeCards = hasPlan && plan ? buildRouteCards(plan.buckets, nameMap) : [];
  const reminders = conciseReminders(planReport?.risk_notes, plan?.global_warnings, plan?.buckets.flatMap((bucket) => bucket.warnings));
  const overview = environmentOverview(mobileSummary);
  const statusCopy = reportStatusCopy(reportStatus);
  const quickAction = quickActionText(mobileSummary);
  const completedLaundry = mobileSummary?.completed_laundry;
  const latestCompleted = completedLaundry?.recent_records[0];

  // Drying route cards.
  const dryRouteCards = dryingPlan
    ? buildDryingRouteCards(dryingPlan.steps, nameMap)
    : [];

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">费用与节能</div>
          <h1>{planReport?.title ?? "本次洗护报告"}</h1>
        </div>
        <Chip tone={statusCopy.tone}>{statusCopy.label}</Chip>
      </header>

      <PrimaryPanel className="report-hero-panel">
        <div className="panel-kicker">
          <TrendingDown size={17} />
          <span>本次结论</span>
        </div>
        <h2>本次结论</h2>
        <div className="report-hero-grid">
          <div className="report-hero-total">
            <strong>{totalCopy.main}</strong>
            {totalCopy.breakdown ? <span className="report-cost-breakdown">{totalCopy.breakdown}</span> : null}
            <span>预计费用</span>
          </div>
          <div className="report-hero-stats">
            <div>
              <Clock3 size={17} />
              <strong>{durationCopy.main}</strong>
              {durationCopy.breakdown ? <span className="report-cost-breakdown">{durationCopy.breakdown}</span> : null}
              <span>{durationCopy.label}</span>
            </div>
            <div>
              <Shirt size={17} />
              <strong>{bucketCountText}</strong>
              <span>洗护批次</span>
            </div>
          </div>
        </div>
        <p className="report-verdict">{plan?.summary ?? "选择本次要清洗的衣物后，这里会生成费用、路线和风险摘要。"}</p>
        {plan ? <p className="report-cost-source">费用按校园机器规则配置估算，实际以设备页面为准。</p> : null}
      </PrimaryPanel>

      {quickAction ? (
        <Section title="现在照做">
          <Card accent="teal" className="report-now-card">
            <h3>现在照做</h3>
            <p>{quickAction}</p>
          </Card>
        </Section>
      ) : null}

      {completedLaundry && latestCompleted ? (
        <Section title="本周报告">
          <Card accent="purple" className="report-weekly-card">
            <div className="report-weekly-grid">
              <div>
                <strong>本周已洗 {completedLaundry.weekly_count} 次</strong>
                <span>{weeklyCostText(completedLaundry.weekly_cost_yuan)}</span>
              </div>
              <p>最近一次：{latestCompleted.item_names.join("、") || "本次衣物"}</p>
            </div>
          </Card>
        </Section>
      ) : null}

      <Section title="环境速览">
        <div className="report-metric-grid">
          <div className="report-metric-card report-metric-teal">
            <WashingMachine size={18} />
            <strong>{overview.machineAvailability}</strong>
            <span>可用设备</span>
          </div>
          <div className="report-metric-card report-metric-blue">
            <Clock3 size={18} />
            <strong>{overview.waitTime}</strong>
            <span>最快等待</span>
          </div>
          <div className="report-metric-card report-metric-amber">
            <Leaf size={18} />
            <strong>{overview.drying}</strong>
            <span>晾晒条件</span>
          </div>
        </div>
      </Section>

      <Section title="洗护路线" action={<Chip tone={statusCopy.tone}>{isReady ? "可执行" : isBlocked ? "待机器空闲" : "待生成"}</Chip>}>
        {routeCards.length ? (
          <div className="report-route-list">
            {routeCards.map((route, index) => (
              <Card key={route.id} accent={route.tone} className="report-route-card">
                <div className="report-route-head">
                  <span className={`report-route-index report-route-index-${route.tone}`}>{index + 1}</span>
                  <div>
                    <h3>{route.title}</h3>
                    <p>{route.items}</p>
                  </div>
                  <Chip tone={route.tone}>{route.itemCount}</Chip>
                </div>
                <div className="report-route-facts">
                  <span>{route.method}</span>
                  {route.machine ? <span>{route.machine}</span> : null}
                  <span>{route.detergent}</span>
                  <span>{route.priceLine}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card accent="blue" className="report-empty-card">
            <h3>还没有路线</h3>
            <p>{emptyRouteText(reportStatus)}</p>
          </Card>
        )}
      </Section>

      {dryRouteCards.length > 0 && (
        <Section title="烘干安排" action={<Chip tone="amber">洗完后执行</Chip>}>
          <div className="report-route-list">
            {dryRouteCards.map((route, index) => (
              <Card key={route.id} accent="amber" className="report-route-card">
                <div className="report-route-head">
                  <span className="report-route-index report-route-index-amber">{index + 1}</span>
                  <div>
                    <h3>{route.title}</h3>
                    <p>{route.items}</p>
                  </div>
                  <Chip tone="amber">{route.itemCount}</Chip>
                </div>
                <div className="report-route-facts">
                  <span>{route.method}</span>
                  {route.machine ? <span>{route.machine}</span> : null}
                  <span>{route.priceLine}</span>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section title="重点提醒">
        <div className="report-reminder-list">
          {reminders.length ? reminders.map((note, index) => (
            <Card key={note} accent={index === 0 ? "orange" : "blue"} className="report-reminder-card">
              <AlertTriangle size={18} />
              <span>{note}</span>
            </Card>
          )) : (
            <Card accent="teal" className="report-reminder-card">
              <BadgeCheck size={18} />
              <span>暂无额外风险，按路线执行即可。</span>
            </Card>
          )}
        </div>
      </Section>
    </Page>
  );
}

function buildRouteCards(buckets: LaundryBucket[], nameMap: Map<string, string>): RouteCard[] {
  return buckets.map((bucket) => {
    const itemNames = bucket.item_ids.map((id) => nameMap.get(id) ?? "本批衣物");
    return {
      id: bucket.bucket_id,
      title: bucketTitle(bucket),
      items: itemNames.join("、") || "未列出衣物",
      itemCount: `${bucket.item_ids.length} 件衣物`,
      method: methodLabel(bucket),
      machine: bucketMachineLabel(bucket),
      detergent: bucket.detergent_ml == null ? "洗衣液按需" : `洗衣液 ${bucket.detergent_ml} ml`,
      dry: dryLabel(bucket.dry_method),
      priceLine: bucketPriceLine(bucket),
      tone: bucketTone(bucket),
    };
  });
}

function buildDryingRouteCards(
  steps: DryingStep[],
  nameMap: Map<string, string>,
): RouteCard[] {
  return steps
    .filter((step) => step.dry_method === "low_heat_dryer")
    .map((step) => {
      const itemNames = step.item_ids.map((id) => nameMap.get(id) ?? "本批衣物");
      return {
        id: `dry-${step.bucket_id}`,
        title: `${bucketDisplayName(step.bucket_id)} 烘干`,
        items: itemNames.join("、"),
        itemCount: `${step.item_ids.length} 件`,
        method: dryLabel(step.dry_method),
        machine: dryingMachineLabel(step),
        detergent: "",
        dry: step.dryer_machine_id ? `烘干机 ${step.dryer_machine_id}` : "",
        priceLine: step.estimated_cost_yuan != null ? formatPrice(step.estimated_cost_yuan) : "费用待确认",
        tone: "orange" as const,
      };
    });
}

function bucketMachineLabel(bucket: LaundryBucket): string {
  if (!bucket.machine_id && !bucket.machine_location) return "";
  return machineDisplayLabel({
    machine_id: bucket.machine_id,
    machine_location: bucket.machine_location,
    machine_type: bucket.machine_type,
  });
}

function dryingMachineLabel(step: DryingStep): string {
  if (!step.dryer_machine_id && !step.dryer_machine_location) return "";
  return machineDisplayLabel({
    machine_id: step.dryer_machine_id,
    machine_location: step.dryer_machine_location,
    machine_type: "dryer",
  });
}

function environmentOverview(summary?: MobileSummary | null) {
  if (!summary) {
    return { machineAvailability: "待同步", waitTime: "待确认", drying: "待确认" };
  }
  if (summary.campus_status?.state === "unconfigured") {
    return { machineAvailability: "待配置", waitTime: "待确认", drying: dryingLabel(summary.campus_context.drying_context) };
  }
  if (summary.campus_status?.state === "unavailable") {
    return { machineAvailability: "状态不可用", waitTime: "待确认", drying: dryingLabel(summary.campus_context.drying_context) };
  }
  const total = summary.campus_context.all_machines.length;
  const available = summary.campus_context.available_machines.length;
  const waits = summary.campus_context.queue_estimates
    .map((queue) => queue.estimated_wait_minutes)
    .filter(isPositiveInteger)
    .sort((a, b) => a - b);
  return {
    machineAvailability: total ? `可用 ${available}/${total}` : "暂无设备",
    waitTime: waits.length ? `${waits[0]} 分钟` : total ? "等待待确认" : "待确认",
    drying: dryingLabel(summary.campus_context.drying_context),
  };
}

function conciseReminders(...groups: Array<string[] | undefined>): string[] {
  const raw = groups.flatMap((group) => group ?? []);
  const cleaned = raw
    .map(cleanReminder)
    .filter(Boolean)
    .filter((note) => !note.includes("推荐使用"));
  return [...new Set(cleaned)].slice(0, 3);
}

function cleanReminder(note: string): string {
  return userFacingReminder(note)
    .replace(/，?位置[^，。；]*[，。；]?/g, "")
    .replace(/，?程序\s+[a-z0-9_+-]+[。；]?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42);
}

function userFacingReminder(text: string): string {
  return text
    .replace(/\bstandard_washer\b/g, "洗衣机")
    .replace(/\bshoe_washer\b/g, "洗鞋机")
    .replace(/\bdryer\b/g, "烘干机")
    .replace(/程序\s+standard/g, "程序 标准洗")
    .replace(/程序\s+quick/g, "程序 快洗")
    .replace(/程序\s+large/g, "程序 大件洗")
    .replace(/程序\s+low/g, "程序 低温烘干");
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function durationSummary(
  washMinutes: number | null | undefined,
  dryMinutes: number | null | undefined,
): { main: string; breakdown: string | null; label: string } {
  const hasWash = isPositiveInteger(washMinutes);
  const hasDry = isPositiveInteger(dryMinutes) && dryMinutes > 0;
  if (hasWash && hasDry) {
    return {
      main: `${washMinutes + dryMinutes} 分钟`,
      breakdown: `洗 ${washMinutes} 分 + 烘 ${dryMinutes} 分`,
      label: "全程用时",
    };
  }
  if (hasWash) {
    return { main: `${washMinutes} 分钟`, breakdown: null, label: "机器占用" };
  }
  if (hasDry) {
    return { main: `${dryMinutes} 分钟`, breakdown: null, label: "烘干用时" };
  }
  return { main: "待确认", breakdown: null, label: "全程用时" };
}

function formatMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function quickActionText(summary?: MobileSummary | null): string | null {
  const buckets = summary?.plan.buckets ?? [];
  if (!summary || !buckets.length) return null;
  const nameMap = new Map(summary.wardrobe.items.map((item) => [item.item_id, item.name]));
  const itemNames = [...new Set(buckets.flatMap((bucket) => bucket.item_ids))]
    .map((id) => nameMap.get(id) ?? id)
    .filter(Boolean);
  if (!itemNames.length) return null;
  const machine = firstAssignedMachineLabel(summary) ?? "洗衣房按机器列表确认";
  const cost = summaryTotalCost(summary);
  const duration = summaryTotalDuration(summary);
  const costText = cost == null ? "花：费用待确认" : `花：约 ¥${formatMoney(cost)}`;
  const timeText = duration == null
    ? "时间待确认"
    : `${formatClock(new Date())} 开始，${formatClock(new Date(Date.now() + duration * 60 * 1000))} 前结束`;
  return `带：${itemNames.join("、")}；去：${machine}；${costText}；${timeText}。`;
}

function firstAssignedMachineLabel(summary: MobileSummary): string | null {
  for (const bucket of summary.plan.buckets) {
    const label = bucketMachineLabel(bucket);
    if (label) return label;
  }
  for (const step of summary.drying_plan?.steps ?? []) {
    const label = dryingMachineLabel(step);
    if (label) return label;
  }
  return null;
}

function summaryTotalCost(summary: MobileSummary): number | null {
  const wash = isFiniteNonNegativeNumber(summary.plan.estimated_cost_yuan) ? summary.plan.estimated_cost_yuan : null;
  const dry = isFiniteNonNegativeNumber(summary.drying_plan?.estimated_cost_yuan) ? summary.drying_plan.estimated_cost_yuan : null;
  if (wash == null && dry == null) return null;
  return (wash ?? 0) + (dry ?? 0);
}

function summaryTotalDuration(summary: MobileSummary): number | null {
  const wash = isPositiveInteger(summary.plan.estimated_duration_minutes) ? summary.plan.estimated_duration_minutes : null;
  const dry = isPositiveInteger(summary.drying_plan?.estimated_duration_minutes) ? summary.drying_plan.estimated_duration_minutes : null;
  if (wash == null && dry == null) return null;
  return (wash ?? 0) + (dry ?? 0);
}

function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function weeklyCostText(value: number | null | undefined): string {
  return isFiniteNonNegativeNumber(value) ? `本周花费 ¥${formatMoney(value)}` : "本周花费待确认";
}

function reportStatusFor(summary?: MobileSummary | null): ReportStatus {
  if (!summary) return "loading";
  if (summary.campus_status?.state === "unconfigured" || summary.campus_status?.state === "unavailable") return "unconfigured";
  if (!summary.selected_laundry_item_ids.length || !summary.plan.buckets.length) return "empty";
  if (summary.plan.buckets.some((bucket) => bucket.wash_method === "machine_wash" && !bucket.machine_id)) return "blocked";
  return "ready";
}

function reportStatusCopy(status: ReportStatus): { label: string; tone: "teal" | "orange" } {
  if (status === "ready") return { label: "已生成", tone: "teal" };
  if (status === "blocked") return { label: "待机器空闲", tone: "orange" };
  if (status === "unconfigured") return { label: "待配置", tone: "orange" };
  if (status === "empty") return { label: "待选择", tone: "orange" };
  return { label: "加载中", tone: "orange" };
}

function emptyRouteText(status: ReportStatus): string {
  if (status === "unconfigured") return "请先在我的页面选择宿舍楼，系统读取机器状态后再生成路线。";
  if (status === "empty") return "先在脏衣篮选择本次要洗的衣物，报告会自动生成路线。";
  return "加载完成后会显示本次洗护路线。";
}

function bucketPriceLine(bucket: LaundryBucket): string {
  if (bucket.wash_method !== "machine_wash") return "无需机洗计费";
  if (!bucket.machine_id) return "待机器空闲";
  return formatPrice(bucket.estimated_cost_yuan);
}

function bucketTitle(bucket: LaundryBucket): string {
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗",
    "dry-clean": "干洗衣物",
    "hand-wash": "手洗衣物",
    "large-bedding": "床品单独洗",
    "dark-standard": "深色标准洗",
    "light-standard": "浅色标准洗",
    "mixed-standard": "混色标准洗",
  };
  return labels[baseBucketId(bucket.bucket_id)] ?? "本批衣物";
}

function methodLabel(bucket: LaundryBucket): string {
  if (bucket.wash_method === "machine_wash") return `机洗 · ${programLabel(bucket.program)}`;
  if (bucket.wash_method === "hand_wash") return "手洗";
  if (bucket.wash_method === "dry_clean") return "干洗";
  if (bucket.wash_method === "do_not_wash") return "不水洗";
  return "方式待确认";
}

function programLabel(program: string): string {
  const labels: Record<string, string> = {
    standard: "标准洗",
    quick: "快洗",
    large: "大件洗",
    spin: "单脱水",
    tub_clean: "筒自洁",
    standard_40c: "40 度标准洗",
    standard_60c_uv: "60 度紫外标准洗",
  };
  return labels[program] ?? "合适程序";
}

function dryLabel(method: string): string {
  if (method === "air_dry") return "自然晾干";
  if (method === "low_heat_dryer") return "低温烘干";
  if (method === "normal_dryer") return "普通烘干";
  if (method === "do_not_dry") return "不烘干";
  return "干燥待确认";
}

function dryingLabel(context: Record<string, unknown>): string {
  if (context.balcony_available === true) return "有阳台";
  if (context.balcony_available === false) return "无阳台";
  if (typeof context.ventilation === "string") return `通风 ${context.ventilation}`;
  return "待确认";
}

function bucketTone(bucket: LaundryBucket): RouteCard["tone"] {
  if (bucket.wash_method === "dry_clean" || bucket.wash_method === "do_not_wash") return "red";
  if (bucket.wash_method === "hand_wash") return "orange";
  if (baseBucketId(bucket.bucket_id) === "dark-standard") return "purple";
  if (baseBucketId(bucket.bucket_id) === "large-bedding") return "orange";
  return "blue";
}

function baseBucketId(bucketId: string): string {
  return bucketId.replace(/-\d+$/, "");
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
