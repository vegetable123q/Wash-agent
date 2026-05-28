import { AlertTriangle, Database, WashingMachine } from "lucide-react";
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
  const modes = machine.modes.length ? machine.modes.join(" / ") : "无可用模式";

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
            <p>{machine.capacity} {machine.backendType} · {machine.location}</p>
          </div>
          <div className="panel-metrics">
            <span>{machine.price} 标准洗</span>
            <span>{machine.remaining} 等待</span>
          </div>
        </div>
      </PrimaryPanel>

      <Section title="后端字段" action={<Chip tone="purple">MachineInfo</Chip>}>
        <Card accent="purple" className="contract-list">
          <div className="contract-row">
            <span>machine_id</span>
            <strong>{machine.backendId}</strong>
          </div>
          <div className="contract-row">
            <span>machine_type</span>
            <strong>{machine.backendType}</strong>
          </div>
          <div className="contract-row">
            <span>status</span>
            <strong>{machine.backendStatus}</strong>
          </div>
          <div className="contract-row">
            <span>modes</span>
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
              <strong>{mode}</strong>
              <span>{mode === "quick" ? "34 分 · 轻薄" : mode === "heavy" ? "58 分 · 厚衣" : "45 分 · 日常"}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="价格规则">
        <Card accent="blue" className="machine-detail-card">
          <div>
            <Database size={18} />
            <h3>{machine.ruleKey}</h3>
          </div>
          <p>前端只展示规则口径，不在页面内计算或请求真实机器接口。</p>
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
  return {
    backendId: machine.machine_id,
    name: machine.machine_id,
    location: machine.location,
    backendType: machine.machine_type,
    capacity: machine.capacity_kg === null ? "容量未知" : `${machine.capacity_kg}kg`,
    status: statusText(machine.status),
    backendStatus: machine.status,
    remaining: machine.remaining_minutes === null ? "等待未知" : `${machine.remaining_minutes} 分钟`,
    price: machine.price_yuan === null ? "价格待定" : `¥${machine.price_yuan}`,
    modes: machine.modes,
    ruleKey: `machine_types.${machine.machine_type}`,
  };
}

function detailFromStatic(machine: MachineView) {
  return {
    backendId: machine.backendId,
    name: machine.name,
    location: machine.location,
    backendType: machine.backendType,
    capacity: machine.capacity,
    status: machine.status,
    backendStatus: machine.backendStatus,
    remaining: machine.remaining,
    price: machine.price,
    modes: machine.modes,
    ruleKey: machine.ruleKey,
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
