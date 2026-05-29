import { AlertTriangle, WashingMachine } from "lucide-react";
import { machineProgramOptions, type MachineProgramOption } from "../api/machinePricing";
import type { BackendMachine } from "../api/mobileSummary";
import { Card, Chip, Page, PrimaryPanel, Section, TopBar } from "../components/AppChrome";
import { type MachineView } from "../data/washMateContent";

interface MachineDetailScreenProps {
  onBack: () => void;
  backendMachine?: BackendMachine | null;
  staticMachine?: MachineView | null;
  pricingRules?: Record<string, unknown> | null;
}

export function MachineDetailScreen({ onBack, backendMachine, staticMachine, pricingRules }: MachineDetailScreenProps) {
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

  const machine = backendMachine ? detailFromBackend(backendMachine, pricingRules) : detailFromStatic(staticMachine as MachineView);
  const modes = machine.modeOptions.length
    ? machine.modeOptions.map((mode) => mode.label).join(" / ")
    : machine.modes.length ? machine.modes.map(modeLabel).join(" / ") : "暂无可用模式";

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
            <p>{machine.typeLabel} · {machine.location}</p>
          </div>
          <div className="panel-metrics">
            <span>{machine.timing}</span>
          </div>
        </div>
      </PrimaryPanel>

      <Section title="机器信息">
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
            {machine.backendType === "dryer" ? (
              <>
                <div className="dense-row">
                  <span className="text-icon text-icon-purple">烘</span>
                  <div>
                    <h3>低温烘干</h3>
                    <p>适合烘干不可晾晒或急需使用的衣物。</p>
                  </div>
                  <Chip tone="teal">推荐</Chip>
                </div>
              </>
            ) : (
              <>
                <div className="dense-row">
                  <span className="text-icon text-icon-purple">深</span>
                  <div>
                    <h3>深色衣物桶</h3>
                    <p>深色或掉色风险衣物集中处理，防串色。</p>
                  </div>
                  <Chip tone="teal">推荐</Chip>
                </div>
                <div className="dense-row">
                  <span className="text-icon text-icon-blue">浅</span>
                  <div>
                    <h3>浅色快速洗</h3>
                    <p>白色和浅色衣物可快速清洗。</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </Section>

      <Section title="可选模式">
        <div className="mode-grid">
          {machine.modeOptions.length ? machine.modeOptions.map((mode) => (
            <div key={mode.id} className="mode-option">
              <strong>{mode.label}</strong>
              <span>{mode.summaryText}</span>
            </div>
          )) : machine.modes.map((mode) => (
            <div key={mode} className="mode-option">
              <strong>{modeLabel(mode)}</strong>
              <span>{modeDescription(mode)}</span>
            </div>
          ))}
        </div>
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

      <button className="primary-button" type="button" disabled title="机器会根据本次方案自动匹配">
        用于深色衣物桶
      </button>
    </Page>
  );
}

function detailFromBackend(machine: BackendMachine, pricingRules?: Record<string, unknown> | null) {
  const typeLabel = machineTypeLabel(machine.machine_type);
  return {
    backendId: machine.machine_id,
    name: `${typeLabel} · ${machine.location}`,
    location: machine.location,
    backendType: machine.machine_type,
    typeLabel,
    status: statusText(machine.status),
    backendStatus: statusText(machine.status),
    timing: timingText(machine.status, machine.remaining_minutes),
    modes: machine.modes,
    modeOptions: machineProgramOptions(machine, pricingRules),
  };
}

function detailFromStatic(machine: MachineView) {
  return {
    backendId: machine.backendId,
    name: machine.name,
    location: machine.location,
    backendType: machine.backendType,
    typeLabel: machineTypeLabel(machine.backendType),
    status: machine.status,
    backendStatus: machine.status,
    timing: staticTimingText(machine),
    modes: machine.modes,
    modeOptions: [] as MachineProgramOption[],
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
  if (machineType === "standard_washer") return "洗衣机";
  if (machineType === "shoe_washer") return "洗鞋机";
  if (machineType === "dryer") return "烘干机";
  return "未知设备";
}

function timingText(status: string, remainingMinutes: number | null) {
  if (status === "available") return "无需等待";
  if (status === "running") {
    return remainingMinutes === null ? "运行中" : `剩余 ${remainingMinutes} 分钟`;
  }
  if (status === "out_of_service") return "暂不可用";
  return "状态未知";
}

function staticTimingText(machine: MachineView) {
  if (machine.backendStatus === "available") return "无需等待";
  if (machine.backendStatus === "out_of_service") return "暂不可用";
  if (machine.remaining === "0 分钟") return "无需等待";
  return machine.remaining;
}

function modeLabel(mode: string) {
  if (mode === "quick") return "快洗";
  if (mode === "standard") return "标准";
  if (mode === "large") return "大物";
  if (mode === "spin") return "单脱";
  if (mode === "tub_clean") return "桶自洁";
  if (mode === "standard_40c") return "标准+40度";
  if (mode === "standard_60c_uv") return "标准+60度+紫外";
  if (mode === "high") return "高温";
  if (mode === "medium") return "中温";
  if (mode === "low") return "低温";
  return "其他模式";
}

function modeDescription(mode: string) {
  if (mode === "quick") return "30 分 · 轻薄";
  if (mode === "standard") return "40 分 · 常规衣物";
  if (mode === "large") return "50 分 · 大物";
  if (mode === "spin") return "6 分 · 单脱";
  if (mode === "tub_clean") return "桶清洁";
  if (mode === "standard_40c") return "60 分 · 温水";
  if (mode === "standard_60c_uv") return "70 分 · 高温紫外";
  if (mode === "high") return "90 分 · 高温烘干";
  if (mode === "medium") return "60 分 · 中温烘干";
  if (mode === "low") return "50 分 · 低温烘干";
  return "以机器页面为准";
}
