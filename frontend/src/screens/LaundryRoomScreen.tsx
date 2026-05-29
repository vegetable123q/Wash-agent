import { Clock3, MapPin, RefreshCw } from "lucide-react";
import { machinePriceText } from "../api/machinePricing";
import type { BackendMachine, BackendQueueEstimate, MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import { dryerOptions, type ScreenId } from "../data/washMateContent";
import type { UserProfile } from "../userProfile";

interface LaundryRoomScreenProps {
  mobileSummary?: MobileSummary | null;
  userProfile?: UserProfile;
  isRefreshing?: boolean;
  refreshError?: string | null;
  onNavigate: (screen: ScreenId) => void;
  onViewMachine?: (machineId: string) => void;
  onRefresh?: () => void;
}

export function LaundryRoomScreen({
  mobileSummary,
  userProfile,
  isRefreshing = false,
  refreshError,
  onNavigate,
  onViewMachine,
  onRefresh,
}: LaundryRoomScreenProps) {
  const backendMachines = mobileSummary?.campus_context.all_machines ?? [];
  const backendQueues = mobileSummary?.campus_context.queue_estimates ?? [];
  const campusStatus = mobileSummary?.campus_status;
  const hasBackend = campusStatus?.state === "live" && backendMachines.length > 0;
  const dormName = userProfile?.dormName || "请选择宿舍楼";
  const latestPickup = userProfile?.latestPickupTime || "22:30";
  const availableCount = mobileSummary?.campus_context.available_machines.length ?? 0;
  const queueRows = backendQueues.map(queueFromBackend);
  const pricingRules = mobileSummary?.campus_context.pricing_rules;
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
          <div className="eyebrow">校园洗衣机状态</div>
          <h1>{dormName}</h1>
          <p>
            {userProfile?.dormName
              ? `个人默认楼栋 · 最晚 ${latestPickup} 取衣`
              : "请先在“我的”保存宿舍楼，洗衣房不会再默认紫荆 1 号楼"}
          </p>
        </div>
        <Chip tone="teal">{availableCount} 空闲</Chip>
      </header>

      <Card accent="purple" className="summary-card">
        <div>
          <h2>推荐现在开洗</h2>
          <p>{campusStatus?.message ?? "请先在“我的”保存宿舍楼，洗衣房不会再默认紫荆 1 号楼"}</p>
        </div>
        <div className="summary-actions">
          <Chip tone="blue">
            <Clock3 size={14} />
            {campusStatus?.updated_at ? `更新于 ${formatUpdateTime(campusStatus.updated_at)}` : "待刷新"}
          </Chip>
          {refreshAction}
        </div>
      </Card>
      {refreshError ? <p className="refresh-error" role="status">{refreshError}</p> : null}

      <Section title="楼栋与实时状态" action={<Chip tone={statusTone(campusStatus?.state)}>{statusLabel(campusStatus?.state)}</Chip>}>
        <Card accent="purple" className="context-card">
          <div className="context-card-head">
            <MapPin size={18} />
            <div>
              <h3>{dormName}</h3>
              <p>{mobileSummary ? weatherSummary(mobileSummary) : "天气数据不可用"}</p>
            </div>
          </div>
          <div className="contract-grid">
            <div>
              <span>机器记录</span>
              <strong>{backendMachines.length} 台</strong>
            </div>
            <div>
              <span>偏好</span>
              <strong>{userProfile?.allowDryer ? "允许烘干" : "优先低温/晾干"}</strong>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="队列估算">
        <div className="queue-grid">
          {queueRows.map((estimate) => (
            <div key={estimate.machineType} className={`queue-cell queue-${estimate.tone}`}>
              <div className="queue-cell-title">
                <strong>{estimate.label}</strong>
                <span>{estimate.wait === "0 分钟" ? "可用" : `等 ${estimate.wait}`}</span>
              </div>
              <div className="queue-number">{estimate.available}/{estimate.total}</div>
              <p>
                运行 {estimate.running} · 故障 {estimate.outOfService} · 等 {estimate.wait}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="机器列表">
        <div className="machine-list">
          {hasBackend ? backendMachines.map((machine) => (
            <Card
              key={machine.machine_id}
              className="machine-card"
              accent={toneForMachineStatus(machine.status)}
              onClick={() => (onViewMachine ? onViewMachine(machine.machine_id) : onNavigate("machineDetail"))}
            >
              <div>
                <div className="machine-title">
                  <span className={`status-dot status-${toneForMachineStatus(machine.status)}`} />
                  <h3>{machineCardTitle(machine)}</h3>
                </div>
                <p>{machinePriceText(machine, pricingRules)}</p>
                <p className="machine-submeta">设备编号 {machine.machine_id}</p>
              </div>
              <Chip tone={toneForMachineStatus(machine.status)}>{statusText(machine.status)}</Chip>
            </Card>
          )) : (
            <Card className="machine-card" accent="amber">
              <div>
                <div className="machine-title">
                  <span className="status-dot status-amber" />
                  <h3>暂无实时机器数据</h3>
                </div>
                <p>{campusStatus?.message ?? "请先在“我的”选择宿舍楼。"}</p>
              </div>
            </Card>
          )}
        </div>
      </Section>

      <Section title="烘干档位">
        <div className="dryer-grid">
          {dryerOptions.map((option) => (
            <div className="dryer-cell" key={option.minutes}>
              <strong>{option.minutes}</strong>
              <span>{option.label}</span>
              <em>{option.price}</em>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

function queueFromBackend(queue: BackendQueueEstimate) {
  return {
    machineType: queue.machine_type,
    label: machineTypeLabel(queue.machine_type),
    total: queue.total_count,
    available: queue.available_count,
    running: queue.running_count,
    outOfService: queue.out_of_service_count,
    wait: queue.estimated_wait_minutes === null ? "未知" : `${queue.estimated_wait_minutes} 分钟`,
    tone: toneForMachineStatus(queue.available_count > 0 ? "available" : queue.running_count > 0 ? "running" : "out_of_service"),
  };
}

function machineTypeLabel(machineType: string) {
  if (machineType === "standard_washer") {
    return "洗衣机";
  }
  if (machineType === "dryer") {
    return "烘干机";
  }
  if (machineType === "shoe_washer") {
    return "洗鞋机";
  }
  return "未知设备";
}

function statusLabel(status: string | undefined) {
  if (status === "live") return "实时";
  if (status === "unavailable") return "不可用";
  return "待配置";
}

function statusTone(status: string | undefined) {
  if (status === "live") return "teal" as const;
  if (status === "unavailable") return "red" as const;
  return "amber" as const;
}

function toneForMachineStatus(status: string) {
  if (status === "available") {
    return "teal" as const;
  }
  if (status === "running") {
    return "amber" as const;
  }
  if (status === "out_of_service") {
    return "red" as const;
  }
  return "purple" as const;
}

function statusText(status: string) {
  if (status === "available") {
    return "空闲";
  }
  if (status === "running") {
    return "运行中";
  }
  if (status === "out_of_service") {
    return "故障";
  }
  return "未知";
}

function machineCardTitle(machine: BackendMachine) {
  return `${machineTypeLabel(machine.machine_type)} · ${machine.location}`;
}

function formatUpdateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function weatherSummary(mobileSummary: MobileSummary): string {
  const w = mobileSummary.weather;
  if (!w || w.status !== "live" || !w.current) return "天气数据不可用";
  const parts: string[] = [];
  if (w.current.temperature_2m != null) parts.push(`${w.current.temperature_2m}°C`);
  if (w.current.relative_humidity_2m != null) parts.push(`湿度 ${w.current.relative_humidity_2m}%`);
  if (w.current.precipitation != null) parts.push(`降水 ${w.current.precipitation}mm`);
  return parts.join(" · ") || "天气数据不可用";
}
