import { Clock3, MapPin, RefreshCw } from "lucide-react";
import { useState } from "react";
import { machineDisplayLabel } from "../api/machineDisplay";
import { machinePriceText } from "../api/machinePricing";
import type { BackendMachine, BackendQueueEstimate, MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import { dryerOptions, type ScreenId } from "../data/washMateContent";
import { dormWithFloor, normalizeDormFloor, type UserProfile } from "../userProfile";

interface LaundryRoomScreenProps {
  mobileSummary?: MobileSummary | null;
  userProfile?: UserProfile;
  isRefreshing?: boolean;
  refreshError?: string | null;
  onNavigate: (screen: ScreenId) => void;
  onViewMachine?: (machineId: string) => void;
  onRefresh?: () => void;
}

type MachineFilter = "all" | "floor" | "available" | "washer" | "dryer";

const machineFilters: Array<{ id: MachineFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "floor", label: "本层" },
  { id: "available", label: "空闲" },
  { id: "washer", label: "洗衣机" },
  { id: "dryer", label: "烘干机" },
];

export function LaundryRoomScreen({
  mobileSummary,
  userProfile,
  isRefreshing = false,
  refreshError,
  onNavigate,
  onViewMachine,
  onRefresh,
}: LaundryRoomScreenProps) {
  const [machineFilter, setMachineFilter] = useState<MachineFilter>("all");
  const backendMachines = mobileSummary?.campus_context.all_machines ?? [];
  const backendQueues = mobileSummary?.campus_context.queue_estimates ?? [];
  const campusStatus = mobileSummary?.campus_status;
  const hasBackend = campusStatus?.state === "live" && backendMachines.length > 0;
  const dormName = dormWithFloor(userProfile) || "请选择宿舍楼";
  const dormFloor = normalizeDormFloor(userProfile?.dormFloor);
  const dormFloorNumber = dormFloor ? Number(dormFloor) : null;
  const dormFloorText = dormFloor ? `${dormFloor}层 · ` : "";
  const latestPickup = userProfile?.latestPickupTime || "22:30";
  const availableCount = mobileSummary?.campus_context.available_machines.length ?? 0;
  const queueRows = backendQueues.map(queueFromBackend);
  const pricingRules = mobileSummary?.campus_context.pricing_rules;
  const displayedMachines = filterMachines(backendMachines, machineFilter, dormFloorNumber);
  const recommendedMachineIds = recommendedMachineIdSet(mobileSummary);
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
              ? `个人默认楼栋 · ${dormFloorText}最晚 ${latestPickup} 取衣`
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

      <Section title="机器列表" action={<Chip tone="blue">{displayedMachines.length} 台</Chip>}>
        <div className="segmented machine-filter" aria-label="机器筛选">
          {machineFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={machineFilter === filter.id ? "active" : ""}
              aria-pressed={machineFilter === filter.id}
              onClick={() => setMachineFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="machine-list">
          {hasBackend && displayedMachines.length ? displayedMachines.map((machine) => {
            const recommended = recommendedMachineIds.has(machine.machine_id);
            const statusTone = toneForMachineStatus(machine.status);
            return (
              <Card
                key={machine.machine_id}
                className={`machine-card machine-card-equal ${recommended ? "machine-card-recommended" : ""}`}
                accent={recommended ? "purple" : statusTone}
                onClick={() => (onViewMachine ? onViewMachine(machine.machine_id) : onNavigate("machineDetail"))}
              >
                <div>
                  <div className="machine-title">
                    <span className={`status-dot status-${recommended ? "purple" : statusTone}`} />
                    <h3>{machineCardTitle(machine)}</h3>
                  </div>
                  <p>{machinePriceText(machine, pricingRules)}</p>
                  <p className="machine-submeta">{machineCardMeta(machine)}</p>
                </div>
                <Chip tone={recommended ? "purple" : statusTone}>{recommended ? "推荐使用" : statusText(machine.status)}</Chip>
              </Card>
            );
          }) : hasBackend ? (
            <Card className="machine-card" accent="amber">
              <div>
                <div className="machine-title">
                  <span className="status-dot status-amber" />
                  <h3>当前筛选下暂无机器</h3>
                </div>
                <p>切回全部，或刷新后再看本层和空闲机器。</p>
              </div>
            </Card>
          ) : (
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
    wait: queueWaitText(queue.estimated_wait_minutes),
    tone: toneForMachineStatus(queue.available_count > 0 ? "available" : queue.running_count > 0 ? "running" : "out_of_service"),
  };
}

function recommendedMachineIdSet(summary?: MobileSummary | null): Set<string> {
  return new Set([
    ...(summary?.plan.buckets.map((bucket) => bucket.machine_id).filter((id): id is string => Boolean(id)) ?? []),
    ...(summary?.drying_plan?.steps.map((step) => step.dryer_machine_id).filter((id): id is string => Boolean(id)) ?? []),
  ]);
}

function filterMachines(machines: BackendMachine[], filter: MachineFilter, dormFloor: number | null): BackendMachine[] {
  return machines
    .filter((machine) => {
      if (filter === "floor") return isOnDormFloor(machine, dormFloor);
      if (filter === "available") return machine.status === "available";
      if (filter === "washer") return machine.machine_type === "standard_washer";
      if (filter === "dryer") return machine.machine_type === "dryer";
      return true;
    })
    .sort((a, b) => machineSortScore(a, dormFloor) - machineSortScore(b, dormFloor));
}

function machineSortScore(machine: BackendMachine, dormFloor: number | null): number {
  const floorScore = isOnDormFloor(machine, dormFloor) ? 0 : 100;
  const statusScore = machine.status === "available" ? 0 : machine.status === "running" ? 20 : 40;
  const remainingScore = isFiniteNonNegativeInteger(machine.remaining_minutes) ? machine.remaining_minutes : 0;
  return floorScore + statusScore + remainingScore;
}

function isOnDormFloor(machine: BackendMachine, dormFloor: number | null): boolean {
  if (dormFloor == null) return false;
  if (machine.machine_floor === dormFloor) return true;
  const location = machine.location ?? "";
  return floorTextVariants(dormFloor).some((text) => location.includes(text));
}

function floorTextVariants(floor: number): string[] {
  const chineseDigits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  const chinese =
    floor <= 10
      ? chineseDigits[floor]
      : floor < 20
        ? `十${chineseDigits[floor - 10]}`
        : `${chineseDigits[Math.floor(floor / 10)]}十${floor % 10 ? chineseDigits[floor % 10] : ""}`;
  return [`${floor}层`, `${chinese}层`];
}

function queueWaitText(minutes: number | null): string {
  return isFiniteNonNegativeInteger(minutes) ? `${minutes} 分钟` : "未知";
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
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
  if (machine.location.includes(machineTypeLabel(machine.machine_type))) {
    return machineDisplayLabel({
      machine_id: machine.machine_id,
      machine_location: machine.location,
      machine_type: machine.machine_type,
    });
  }
  return `${machineTypeLabel(machine.machine_type)} · ${machine.location}`;
}

function machineCardMeta(machine: BackendMachine) {
  const parts = [statusText(machine.status), `设备 ${machine.machine_id}`];
  if (isFiniteNonNegativeInteger(machine.remaining_minutes)) {
    parts.push(`剩余 ${machine.remaining_minutes} 分钟`);
  }
  parts.push(machine.modes.length ? machine.modes.map(programLabel).join(" / ") : "模式待同步");
  return parts.join(" · ");
}

function programLabel(program: string) {
  const labels: Record<string, string> = {
    standard: "标准洗",
    quick: "快洗",
    large: "大件洗",
    low: "低温",
    medium: "中温",
    high: "高温",
  };
  return labels[program] ?? program;
}

function formatUpdateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function weatherSummary(mobileSummary: MobileSummary): string {
  const w = mobileSummary.weather;
  if (!w) return "天气数据不可用";
  if (w.status !== "live" || !w.current) return w.error ?? "天气数据不可用";
  const parts: string[] = [];
  if (isFiniteNumber(w.current.temperature_2m)) parts.push(`${w.current.temperature_2m}°C`);
  if (isFiniteNumber(w.current.relative_humidity_2m)) parts.push(`湿度 ${w.current.relative_humidity_2m}%`);
  if (isFiniteNumber(w.current.precipitation)) parts.push(`降水 ${w.current.precipitation}mm`);
  return parts.join(" · ") || "天气数据不可用";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
