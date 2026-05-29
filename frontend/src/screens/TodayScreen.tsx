import { ArrowRight, Clock3, CloudRain, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModelHubConfig } from "../api/modelHubConfig";
import { computeRecommendedStartTime, generateTodayAdvice } from "../api/llmSummary";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, MetricCard, Page, PrimaryPanel, Section } from "../components/AppChrome";
import { backendPlanSummary, bucketPlans, todaySummary, type ScreenId } from "../data/washMateContent";
import type { UserProfile } from "../userProfile";

interface TodayScreenProps {
  backendStatus?: "unconfigured" | "loading" | "connected" | "offline";
  mobileSummary?: MobileSummary | null;
  userProfile?: UserProfile;
  modelHubConfig?: ModelHubConfig;
  isRefreshing?: boolean;
  refreshError?: string | null;
  onNavigate: (screen: ScreenId) => void;
  onRefresh?: () => void;
}

export function TodayScreen({
  backendStatus = "offline",
  mobileSummary,
  userProfile,
  modelHubConfig,
  isRefreshing = false,
  refreshError,
  onNavigate,
  onRefresh,
}: TodayScreenProps) {
  const connected = backendStatus === "connected" && mobileSummary;
  const weather = connected ? liveWeather(mobileSummary) : null;
  const hasPersonalContext = Boolean(
    userProfile?.displayName ||
      userProfile?.dormName ||
      userProfile?.allowDryer ||
      (userProfile?.latestPickupTime && userProfile.latestPickupTime !== "22:30"),
  );
  const subtitle = userProfile?.dormName
    ? `${userProfile.dormName} · 最晚 ${userProfile.latestPickupTime} 取衣`
    : "请先在「我的」配置宿舍楼和偏好";
  const constraints = userProfile && hasPersonalContext
    ? [
        userProfile.dormName || "请选择宿舍楼",
        userProfile.allowDryer ? "允许烘干" : "优先低温/晾干",
        `最晚 ${userProfile.latestPickupTime}`,
      ]
    : ["请先配置宿舍楼", "可在「我的」设置偏好"];
  const panelMetrics = connected && mobileSummary
    ? {
        buckets: `${mobileSummary.plan.buckets.length} 桶分洗`,
        costDryer:
          mobileSummary.plan.estimated_cost_yuan != null
            ? `¥${mobileSummary.plan.estimated_cost_yuan}${mobileSummary.plan.buckets.some((b) => b.dry_method === "low_heat_dryer") ? " · 含烘干" : ""}`
            : "费用待确认",
      }
    : { buckets: "待生成方案", costDryer: "配置后显示" };

  const planSummary = connected
    ? {
        buckets:
          mobileSummary.plan.buckets.length > 0
            ? `${mobileSummary.plan.buckets.length} 个洗护批次`
            : "暂无待洗衣物",
        cost:
          mobileSummary.plan.estimated_cost_yuan === null
            ? "费用待确认"
            : `预计 ¥${mobileSummary.plan.estimated_cost_yuan}`,
        duration:
          mobileSummary.plan.estimated_duration_minutes === null
            ? "时长待确认"
            : `机器占用约 ${mobileSummary.plan.estimated_duration_minutes} 分钟`,
        risk: mobileSummary.plan.buckets.length > 0 ? "已按风险自动分桶" : "暂无方案",
        note: mobileSummary.plan.summary,
      }
    : backendPlanSummary;

  // Dynamic recommended start time
  const recommendedTime = useMemo(
    () => computeRecommendedStartTime(
      mobileSummary?.plan.estimated_duration_minutes ?? null,
      userProfile?.latestPickupTime ?? null,
    ),
    [mobileSummary?.plan.estimated_duration_minutes, userProfile?.latestPickupTime],
  );

  const recommendedLabel = useMemo(() => {
    if (!mobileSummary?.plan.buckets.length) return "暂无待洗衣物";
    const duration = mobileSummary.plan.estimated_duration_minutes;
    if (duration != null) return `全部洗完约 ${duration} 分钟`;
    return "全部洗完并低温烘干";
  }, [mobileSummary?.plan.buckets.length, mobileSummary?.plan.estimated_duration_minutes]);

  // LLM-enhanced today advice
  const [llmAdvice, setLlmAdvice] = useState<string | null>(null);
  useEffect(() => {
    if (!mobileSummary?.plan || !modelHubConfig) return;
    let cancelled = false;
    generateTodayAdvice(
      mobileSummary.plan,
      mobileSummary.weather,
      mobileSummary.frequency_advice,
      modelHubConfig,
    ).then((result) => {
      if (!cancelled && result.source === "llm") setLlmAdvice(result.text);
    });
    return () => { cancelled = true; };
  }, [mobileSummary, modelHubConfig]);

  // Dynamic clothing items from plan when connected
  const todayItems = useMemo(() => {
    if (!connected || !mobileSummary?.plan.buckets.length) return todaySummary.items;
    const nameMap = new Map(mobileSummary.wardrobe.items.map((i) => [i.item_id, i.name]));
    return mobileSummary.plan.buckets.map((b) => {
      const names = b.item_ids.map((id) => nameMap.get(id) || id);
      return {
        id: b.bucket_id,
        label: names.join("、"),
        description: washMethodDesc(b.wash_method, b.dry_method),
        tone: b.wash_method === "hand_wash" || b.wash_method === "dry_clean" || b.wash_method === "do_not_wash" ? ("red" as const) : b.bucket_id === "dark-standard" ? ("purple" as const) : ("blue" as const),
        badge: {
          label: b.wash_method === "machine_wash" ? "可机洗" : b.wash_method === "hand_wash" ? "手洗" : "排除",
          tone: b.wash_method === "machine_wash" ? ("teal" as const) : ("orange" as const),
        },
      };
    });
  }, [connected, mobileSummary]);

  // Dynamic bucket preview from plan when connected
  const todayBuckets = useMemo(() => {
    if (!connected || !mobileSummary?.plan.buckets.length) return bucketPlans;
    const nameMap = new Map(mobileSummary.wardrobe.items.map((i) => [i.item_id, i.name]));
    return mobileSummary.plan.buckets.map((b) => {
      const names = b.item_ids.map((id) => nameMap.get(id) || id);
      const label = bucketLabelFromId(b.bucket_id);
      const machineLabel = b.wash_method === "machine_wash"
        ? friendlyMachineType(b.machine_type)
        : washMethodLabel(b.wash_method);
      return {
        id: b.bucket_id,
        title: label,
        machine: machineLabel,
        detail: `${names.join("、")} · ${dryLabel(b.dry_method)}`,
        accent: b.wash_method === "hand_wash" || b.wash_method === "dry_clean" || b.wash_method === "do_not_wash" ? ("orange" as const) : b.bucket_id === "dark-standard" ? ("purple" as const) : ("blue" as const),
      };
    });
  }, [connected, mobileSummary]);

  // Dynamic stats from campus context when connected
  const todayStats = useMemo(() => {
    if (!connected || !mobileSummary) return todaySummary.stats;
    const available = mobileSummary.campus_context.available_machines.length;
    const waits = mobileSummary.campus_context.queue_estimates
      .filter((q) => q.estimated_wait_minutes != null && q.estimated_wait_minutes > 0)
      .sort((a, b) => (a.estimated_wait_minutes ?? 0) - (b.estimated_wait_minutes ?? 0));
    const minWait = waits[0]?.estimated_wait_minutes;
    return [
      { value: `${available} 台`, label: available > 0 ? "空闲可用，可先开洗" : "当前无空闲机器" },
      { value: minWait != null ? `${minWait} 分` : "0 分", label: minWait != null && minWait > 0 ? "最短等待后可用" : "无需等待" },
    ];
  }, [connected, mobileSummary]);
  const refreshAction = onRefresh ? (
    <button
      className="icon-button refresh-button"
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label="刷新天气和洗衣机状态"
      title="刷新天气和洗衣机状态"
    >
      <RefreshCw size={17} className={isRefreshing ? "refresh-icon-spinning" : undefined} />
    </button>
  ) : null;

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">WashMate Campus</div>
          <h1>{timeOfDayTitle()}</h1>
          <p>{subtitle}</p>
        </div>
      </header>

      <PrimaryPanel>
        <div className="panel-kicker">
          <CloudRain size={17} />
          <span>建议执行时间</span>
        </div>
        <div className="hero-number-row">
          <div>
            <strong className="hero-number">{recommendedTime}</strong>
            <p>{recommendedLabel}</p>
          </div>
          <div className="panel-metrics">
            <span>{panelMetrics.buckets}</span>
            <span>{panelMetrics.costDryer}</span>
          </div>
        </div>
      </PrimaryPanel>

      <div className="constraint-row" aria-label="本次约束">
        {constraints.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {connected ? (
        <Section title="实时天气" action={refreshAction}>
          {weather ? (
            <Card className="weather-card" accent="teal">
              <div>
                <strong>{weather.temperature}</strong>
                <span>清华园当前</span>
              </div>
              <div className="chip-row">
                <Chip tone="teal">{weather.humidity}</Chip>
                <Chip tone="blue">{weather.precipitation}</Chip>
              </div>
            </Card>
          ) : (
            <Card className="weather-card" accent="amber">
              <div>
                <strong>天气数据不可用</strong>
                <span>请稍后刷新</span>
              </div>
            </Card>
          )}
          {refreshError ? <p className="refresh-error" role="status">{refreshError}</p> : null}
        </Section>
      ) : null}

      <div className="two-grid">
        {todayStats.map((stat) => (
          <MetricCard key={stat.value} value={stat.value} label={stat.label} />
        ))}
      </div>

      <Section title="后端方案摘要" action={<Chip tone="purple">LaundryPlan</Chip>}>
        <Card accent="purple" className="backend-summary-card">
          <div className="backend-signal-grid">
            <div>
              <span>批次</span>
              <strong>{planSummary.buckets}</strong>
            </div>
            <div>
              <span>费用</span>
              <strong>{planSummary.cost}</strong>
            </div>
            <div>
              <span>时长</span>
              <strong>{planSummary.duration}</strong>
            </div>
          </div>
          <div className="signal-note">
            <Clock3 size={16} />
            <span>{planSummary.risk}</span>
          </div>
          <p>{llmAdvice ?? planSummary.note}</p>
        </Card>
      </Section>

      <Section title="本次衣物">
        <Card>
          <div className="list-stack">
            {todayItems.map((item) => (
              <div className="dense-row" key={item.id}>
                <span className={`text-icon text-icon-${item.tone}`}>{item.label.slice(0, 1)}</span>
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                </div>
                <Chip tone={item.badge.tone}>{item.badge.label}</Chip>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="分桶摘要" action={<Chip tone="purple">可执行</Chip>}>
        <div className="bucket-preview">
          {todayBuckets.map((bucket) => (
            <div key={bucket.id} className={`bucket-chip bucket-${bucket.accent}`}>
              <span>{bucket.machine}</span>
              <strong>{bucket.title}</strong>
            </div>
          ))}
        </div>
      </Section>

      <Section title="下一步">
        <button className="primary-button" type="button" onClick={() => onNavigate("planDetail")}>
          <Sparkles size={18} />
          查看本次方案
          <ArrowRight size={18} />
        </button>
      </Section>
    </Page>
  );
}

function liveWeather(summary: MobileSummary) {
  const snapshot = summary.weather;
  if (snapshot?.status !== "live" || !snapshot.current) {
    return null;
  }
  const temperature = snapshot.current.temperature_2m;
  const humidity = snapshot.current.relative_humidity_2m;
  const precipitation = snapshot.current.precipitation;
  return {
    temperature: `${formatNumber(temperature)}${snapshot.units?.temperature_2m ?? "°C"}`,
    humidity: `湿度 ${formatNumber(humidity)}${snapshot.units?.relative_humidity_2m ?? "%"}`,
    precipitation: `降水 ${formatNumber(precipitation)}${snapshot.units?.precipitation ?? "mm"}`,
  };
}

function timeOfDayTitle(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜间洗衣";
  if (hour < 12) return "早晨洗衣";
  if (hour < 18) return "下午洗衣";
  return "今晚洗衣";
}

function formatNumber(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function washMethodDesc(washMethod: string, dryMethod: string): string {
  const wash = washMethod === "machine_wash" ? "机洗" : washMethod === "hand_wash" ? "手洗" : washMethod === "dry_clean" ? "干洗" : "不水洗";
  const dry = dryMethod === "low_heat_dryer" ? "，低温烘干" : dryMethod === "air_dry" ? "，自然晾干" : "";
  return wash + dry;
}

function bucketLabelFromId(bucketId: string): string {
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗",
    "dry-clean": "干洗",
    "hand-wash": "手洗",
    "large-bedding": "大件洗",
    "dark-standard": "深色标准洗",
    "light-standard": "浅色快洗",
  };
  return labels[bucketId] ?? bucketId;
}

function washMethodLabel(method: string): string {
  if (method === "hand_wash") return "手洗";
  if (method === "dry_clean") return "干洗";
  if (method === "do_not_wash") return "不水洗";
  return method;
}

function dryLabel(method: string): string {
  if (method === "air_dry") return "自然晾干";
  if (method === "low_heat_dryer") return "低温烘干";
  if (method === "do_not_dry") return "不烘干";
  return method;
}

function friendlyMachineType(machineType: string): string {
  if (machineType === "standard_washer") return "洗衣机";
  if (machineType === "dryer") return "烘干机";
  if (machineType === "shoe_washer") return "洗鞋机";
  return machineType || "未分配";
}
