import { AlertTriangle, Info, WashingMachine } from "lucide-react";
import type { BackendMachine } from "../api/mobileSummary";
import { Card, Chip, Page, PrimaryPanel, Section, TopBar } from "../components/AppChrome";
import { type MachineView } from "../data/washMateContent";

interface MachineDetailScreenProps {
  onBack: () => void;
  backendMachine?: BackendMachine | null;
  staticMachine?: MachineView | null;
}

export function MachineDetailScreen({ onBack, backendMachine, staticMachine }: MachineDetailScreenProps) {
  if (!backendMachine && !staticMachine) {
    return (
      <Page compact>
        <TopBar title="机器详情" onBack={onBack} />
        <Card accent="orange" className="warning-surface">
          <h2>未找到机器记录</h2>
          <p>请从洗衣房机器列表重新选择机器。</p>
        </Card>
      </Page>
    );
  }

  const machine = backendMachine ? detailFromBackend(backendMachine) : detailFromStatic(staticMachine as MachineView);
  const modes = machine.modes.length ? machine.modes.map(modeLabel).join(" / ") : "暂无可用模式";

  return (
    <Page compact>
      <TopBar title={machine.name} onBack={onBack} />

      <PrimaryPanel>
        <div className="panel-kicker">
          <WashingMachine size={17} />
          <span>当前状态</span>
        </div>
        <div className="hero-number-row">
          <div>
            <strong className="hero-number">{machine.status}</strong>
            <p><span>{machine.capacity}</span> {machine.typeLabel} · {machine.location}</p>
          </div>
          <div className="panel-metrics">
            <span>{machine.price} 参考价</span>
            <span>{machine.remaining} 等待</span>
          </div>
        </div>
      </PrimaryPanel>

      <Section title="机器信息" action={<Chip tone="purple">详情</Chip>}>
        <Card accent="purple" className="contract-list">
          <div className="contract-row">
            <span>设备编号</span>
            <strong>{machine.backendId}</strong>
          </div>
          <div className="contract-row">
            <span>设备类型</span>
            <strong>{machine.typeLabel}</strong>
          </div>
          <div className="contract-row">
            <span>当前状态</span>
            <strong>{machine.backendStatus}</strong>
          </div>
          <div className="contract-row">
            <span>可选模式</span>
            <strong>{modes}</strong>
          </div>
        </Card>
      </Section>

      <Section title="适合本次">
        <Card>
          <div className="list-stack">
            <div className="dense-row">
              <span className="text-icon text-icon-purple">深</span>
              <div>
                <h3>深色厚衣物桶</h3>
                <p>灰卫衣、黑牛仔裤，容量约 55%。</p>
              </div>
              <Chip tone="teal">推荐</Chip>
            </div>
            <div className="dense-row">
              <span className="text-icon text-icon-blue">浅</span>
              <div>
                <h3>浅色快速洗也可用</h3>
                <p>若 A01 被占用，可切换到 A02。</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="可选模式">
        <div className="mode-grid">
          {machine.modes.map((mode) => (
            <div key={mode} className={`mode-option ${mode === "standard" ? "selected" : ""}`}>
              <strong>{modeLabel(mode)}</strong>
              <span>{modeDescription(mode)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="价格信息">
        <Card accent="blue" className="machine-detail-card">
          <div>
            <Info size={18} />
            <h3>{machine.price}</h3>
          </div>
          <p>以洗衣房实时状态和页面提示为准。</p>
        </Card>
      </Section>

      <Section title="不建议放入">
        <Card accent="orange" className="warning-surface">
          <div className="row-between">
            <div>
              <h3>羊毛、真丝、正装</h3>
              <p>共享机洗摩擦强，材质风险高，应走手洗或干洗。</p>
            </div>
            <Chip tone="red">
              <AlertTriangle size={14} />
              排除
            </Chip>
          </div>
        </Card>
      </Section>

      <button className="primary-button" type="button" disabled title="机器选择由后端 LaundryPlan 决定">
        用于深色衣物桶
      </button>
    </Page>
  );
}

function detailFromBackend(machine: BackendMachine) {
  const typeLabel = machineTypeLabel(machine.machine_type);
  return {
    backendId: machine.machine_id,
    name: `${typeLabel} · ${machine.location}`,
    location: machine.location,
    typeLabel,
    capacity: capacityText(machine),
    status: statusText(machine.status),
    backendStatus: statusText(machine.status),
    remaining: machine.remaining_minutes === null ? "等待未知" : `${machine.remaining_minutes} 分钟`,
    price: priceText(machine),
    modes: machine.modes,
  };
}

function detailFromStatic(machine: MachineView) {
  return {
    backendId: machine.backendId,
    name: machine.name,
    location: machine.location,
    typeLabel: machineTypeLabel(machine.backendType),
    capacity: machine.capacity,
    status: machine.status,
    backendStatus: machine.status,
    remaining: machine.remaining,
    price: machine.price,
    modes: machine.modes,
  };
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

function machineTypeLabel(machineType: string) {
  if (machineType === "standard_washer" || machineType === "small_washer") return "标准洗衣机";
  if (machineType === "shoe_washer") return "洗鞋机";
  if (machineType === "dryer") return "烘干机";
  return "未知设备";
}

function capacityText(machine: BackendMachine) {
  return machine.capacity_kg === null ? "容量：接口未提供" : `容量：${machine.capacity_kg}kg`;
}

function priceText(machine: BackendMachine) {
  return machine.price_yuan === null ? "价格：接口未提供" : `价格：¥${machine.price_yuan}`;
}

function modeLabel(mode: string) {
  if (mode === "quick") return "快洗";
  if (mode === "standard") return "标准";
  if (mode === "heavy") return "强力";
  if (mode === "low") return "低温";
  return mode;
}

function modeDescription(mode: string) {
  if (mode === "quick") return "34 分 · 轻薄";
  if (mode === "heavy") return "58 分 · 厚衣";
  if (mode === "low") return "低温烘干";
  return "45 分 · 日常";
}
