import { Clock3, MapPin } from "lucide-react";
import type { BackendMachine, BackendQueueEstimate, MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import {
  campusContext,
  dryerOptions,
  machines,
  queueEstimates,
  type ScreenId,
} from "../data/washMateContent";
import type { UserProfile } from "../userProfile";

interface LaundryRoomScreenProps {
  mobileSummary?: MobileSummary | null;
  userProfile?: UserProfile;
  onNavigate: (screen: ScreenId) => void;
  onViewMachine?: (machineId: string) => void;
}

export function LaundryRoomScreen({ mobileSummary, userProfile, onNavigate, onViewMachine }: LaundryRoomScreenProps) {
  const backendMachines = mobileSummary?.campus_context.all_machines ?? [];
  const backendQueues = mobileSummary?.campus_context.queue_estimates ?? [];
  const hasBackend = backendMachines.length > 0;
  const dormName = userProfile?.dormName || "请选择宿舍楼";
  const towerKey = userProfile?.towerKey || "待选择";
  const latestPickup = userProfile?.latestPickupTime || "22:30";
  const availableCount = hasBackend
    ? (mobileSummary?.campus_context.available_machines.length ?? 0)
    : machines.filter((machine) => machine.backendStatus === "available").length;
  const queueRows = hasBackend ? backendQueues.map(queueFromBackend) : queueEstimates;

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
          <p>{hasBackend ? `读取到 ${backendMachines.length} 台后端机器记录。` : campusContext.recommendation}</p>
        </div>
        <Chip tone="blue">
          <Clock3 size={14} />
          {campusContext.updatedAt}
        </Chip>
      </Card>

      <Section title="楼栋与数据源" action={<Chip tone="purple">CampusContext</Chip>}>
        <Card accent="purple" className="context-card">
          <div className="context-card-head">
            <MapPin size={18} />
            <div>
              <h3>{campusContext.providerLabel}</h3>
              <p>{campusContext.weather} · {campusContext.dryingContext}</p>
            </div>
          </div>
          <div className="contract-grid">
            <div>
              <span>tower_key</span>
              <strong>{towerKey}</strong>
            </div>
            <div>
              <span>偏好</span>
              <strong>{userProfile?.allowDryer ? "允许烘干" : "优先低温/晾干"}</strong>
            </div>
          </div>
          <div className="provider-row">
            {campusContext.towerKeys.map(([provider, key]) => (
              <Chip key={provider} tone={provider === "haier" ? "blue" : "teal"}>
                {provider}: {key}
              </Chip>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="队列估算">
        <div className="queue-grid">
          {queueRows.map((estimate) => (
            <div key={estimate.machineType} className={`queue-cell queue-${estimate.tone}`}>
              <div className="queue-cell-title">
                <strong>{estimate.label}</strong>
                <span>{estimate.machineType}</span>
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
          {hasBackend
            ? backendMachines.map((machine) => (
                <Card
                  key={machine.machine_id}
                  className="machine-card"
                  accent={toneForMachineStatus(machine.status)}
                  onClick={() => (onViewMachine ? onViewMachine(machine.machine_id) : onNavigate("machineDetail"))}
                >
                  <div>
                    <div className="machine-title">
                      <span className={`status-dot status-${toneForMachineStatus(machine.status)}`} />
                      <h3>{machine.machine_id}</h3>
                    </div>
                    <p>
                      {capacityText(machine)} · {machine.machine_type} · {priceText(machine)}
                    </p>
                    <p className="machine-submeta">{machine.location} · backend</p>
                  </div>
                  <Chip tone={toneForMachineStatus(machine.status)}>{statusText(machine.status)}</Chip>
                </Card>
              ))
            : machines.map((machine) => (
                <Card
                  key={machine.id}
                  className="machine-card"
                  accent={machine.tone}
                  onClick={() => (onViewMachine ? onViewMachine(machine.id) : onNavigate("machineDetail"))}
                >
                  <div>
                    <div className="machine-title">
                      <span className={`status-dot status-${machine.tone}`} />
                      <h3>{machine.name}</h3>
                    </div>
                    <p>
                      {machine.capacity} · {machine.backendType} · {machine.price}
                    </p>
                    <p className="machine-submeta">
                      {machine.location} · {machine.provider}
                    </p>
                  </div>
                  <Chip tone={machine.tone}>{machine.status}</Chip>
                </Card>
              ))}
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
    machineType: queue.machine_type as (typeof queueEstimates)[number]["machineType"],
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
  if (machineType === "large_washer") {
    return "大件机";
  }
  if (machineType === "dryer") {
    return "烘干机";
  }
  if (machineType === "shoe_washer") {
    return "洗鞋机";
  }
  return "标准筒";
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

function capacityText(machine: BackendMachine) {
  return machine.capacity_kg === null ? "容量未知" : `${machine.capacity_kg}kg`;
}

function priceText(machine: BackendMachine) {
  return machine.price_yuan === null ? "价格待定" : `¥${machine.price_yuan}`;
}
