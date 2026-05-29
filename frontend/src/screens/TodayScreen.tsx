import { ArrowRight, Clock3, CloudRain, Sparkles } from "lucide-react";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, MetricCard, Page, PrimaryPanel, Section } from "../components/AppChrome";
import { backendPlanSummary, bucketPlans, todaySummary, type ScreenId } from "../data/washMateContent";
import type { UserProfile } from "../userProfile";

interface TodayScreenProps {
  backendStatus?: "unconfigured" | "loading" | "connected" | "offline";
  mobileSummary?: MobileSummary | null;
  userProfile?: UserProfile;
  onNavigate: (screen: ScreenId) => void;
}

export function TodayScreen({ backendStatus = "offline", mobileSummary, userProfile, onNavigate }: TodayScreenProps) {
  const connected = backendStatus === "connected" && mobileSummary;
  const weather = connected ? liveWeather(mobileSummary) : null;
  const hasPersonalContext = Boolean(
    userProfile?.displayName ||
      userProfile?.dormName ||
      userProfile?.towerKey ||
      userProfile?.allowDryer ||
      (userProfile?.latestPickupTime && userProfile.latestPickupTime !== "22:30"),
  );
  const subtitle = userProfile?.dormName
    ? `${userProfile.dormName} · 最晚 ${userProfile.latestPickupTime} 取衣`
    : todaySummary.subtitle;
  const constraints = userProfile && hasPersonalContext
    ? [
        userProfile.dormName || "请选择宿舍楼",
        userProfile.allowDryer ? "允许烘干" : "优先低温/晾干",
        `最晚 ${userProfile.latestPickupTime}`,
      ]
    : todaySummary.constraints;
  const planSummary = connected
    ? {
        buckets:
          mobileSummary.plan.buckets.length > 0
            ? `${mobileSummary.plan.buckets.length} 个洗护批次`
            : "已生成洗护批次",
        cost:
          mobileSummary.plan.estimated_cost_yuan === null
            ? "费用待确认"
            : `预计 ¥${mobileSummary.plan.estimated_cost_yuan}`,
        duration:
          mobileSummary.plan.estimated_duration_minutes === null
            ? "时长待确认"
            : `机器占用约 ${mobileSummary.plan.estimated_duration_minutes} 分钟`,
        risk: mobileSummary.plan.global_warnings[0] ?? "真实后端已生成本次方案",
        note: mobileSummary.plan.summary,
      }
    : backendPlanSummary;
  const statusLabel =
    backendStatus === "connected"
      ? "APK 内置"
      : backendStatus === "loading"
        ? "加载本地数据"
        : backendStatus === "unconfigured"
          ? "APK 内置"
          : "本地数据异常";

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">WashMate Campus</div>
          <h1>{todaySummary.title}</h1>
          <p>{subtitle}</p>
        </div>
        <Chip tone={connected ? "teal" : "amber"}>{statusLabel}</Chip>
      </header>

      <PrimaryPanel>
        <div className="panel-kicker">
          <CloudRain size={17} />
          <span>建议执行时间</span>
        </div>
        <div className="hero-number-row">
          <div>
            <strong className="hero-number">{todaySummary.recommendedTime}</strong>
            <p>{todaySummary.recommendedLabel}</p>
          </div>
          <div className="panel-metrics">
            <span>3 桶分洗</span>
            <span>¥24 · 2 次烘干</span>
          </div>
        </div>
      </PrimaryPanel>

      <div className="constraint-row" aria-label="本次约束">
        {constraints.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {weather ? (
        <Section title="实时天气">
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
        </Section>
      ) : null}

      <div className="two-grid">
        {todaySummary.stats.map((stat) => (
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
          <p>{planSummary.note}</p>
        </Card>
      </Section>

      <Section title="本次衣物">
        <Card>
          <div className="list-stack">
            {todaySummary.items.map((item) => (
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
          {bucketPlans.map((bucket) => (
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

function formatNumber(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
