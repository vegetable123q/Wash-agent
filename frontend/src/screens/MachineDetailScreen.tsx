import { AlertTriangle, Database, WashingMachine } from "lucide-react";
import { Card, Chip, Page, PrimaryPanel, Section, TopBar } from "../components/AppChrome";
import { machines } from "../data/washMateContent";

interface MachineDetailScreenProps {
  onBack: () => void;
}

export function MachineDetailScreen({ onBack }: MachineDetailScreenProps) {
  const machine = machines.find((item) => item.id === "A02") ?? machines[0];
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
            <button key={mode} className={mode === "standard" ? "selected" : ""}>
              <strong>{mode}</strong>
              <span>{mode === "quick" ? "34 分 · 轻薄" : mode === "heavy" ? "58 分 · 厚衣" : "45 分 · 日常"}</span>
            </button>
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

      <button className="primary-button">用于深色衣物桶</button>
    </Page>
  );
}
