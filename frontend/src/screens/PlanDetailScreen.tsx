import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";
import { bucketPlans } from "../data/washMateContent";

interface PlanDetailScreenProps {
  onBack: () => void;
}

export function PlanDetailScreen({ onBack }: PlanDetailScreenProps) {
  return (
    <Page compact>
      <TopBar title="本次方案" onBack={onBack} />

      <Card accent="purple" className="summary-card">
        <div>
          <h2>3 桶分开洗</h2>
          <p>先开两台标准筒，床单等大件机 12 分钟。</p>
        </div>
        <Chip tone="teal">可执行</Chip>
      </Card>

      <Section title="洗衣顺序">
        <div className="timeline">
          {bucketPlans.map((bucket, index) => (
            <div className="timeline-row" key={bucket.id}>
              <span className="timeline-index">{index + 1}</span>
              <Card accent={bucket.accent}>
                <div className="row-between">
                  <h3>{bucket.title}</h3>
                  <Chip tone={bucket.accent}>{bucket.machine}</Chip>
                </div>
                <p>{bucket.detail}</p>
                <div className="chip-row">
                  {bucket.tags.map((tag) => (
                    <Chip key={tag.label} tone={tag.tone}>
                      {tag.label}
                    </Chip>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Section>

      <Section title="执行准备">
        <Card>
          <div className="list-stack">
            <div className="dense-row">
              <span className="round-icon round-icon-teal">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <h3>洗衣液按桶分配</h3>
                <p>浅色 1 瓶盖，深色 1 瓶盖，床单 1.5 瓶盖。</p>
              </div>
            </div>
            <div className="dense-row">
              <span className="round-icon round-icon-blue">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <h3>贴身衣物装袋</h3>
                <p>白 T 和运动衣进入浅色桶，降低摩擦和公共卫生顾虑。</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="排除与提醒">
        <Card accent="orange" className="warning-surface">
          <div className="row-between">
            <div>
              <h3>羊毛开衫不进共享机</h3>
              <p>材质易缩水变形，本次从机洗分桶中排除。</p>
            </div>
            <Chip tone="red">
              <AlertTriangle size={14} />
              手洗/干洗
            </Chip>
          </div>
        </Card>
      </Section>
    </Page>
  );
}
