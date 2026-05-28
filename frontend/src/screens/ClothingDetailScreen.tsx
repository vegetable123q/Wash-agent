import { Edit3 } from "lucide-react";
import { Card, Chip, MetricCard, Page, Section, TopBar } from "../components/AppChrome";
import { ClothingArt } from "../components/ClothingArt";
import { wardrobeItems } from "../data/washMateContent";

interface ClothingDetailScreenProps {
  onBack: () => void;
}

export function ClothingDetailScreen({ onBack }: ClothingDetailScreenProps) {
  const item = wardrobeItems[1];

  return (
    <Page compact>
      <TopBar
        title="衣物详情"
        onBack={onBack}
        action={
          <button className="icon-button" aria-label="编辑衣物">
            <Edit3 size={18} />
          </button>
        }
      />

      <Card className="profile-card">
        <ClothingArt kind={item.art} size="lg" />
        <div>
          <h2>{item.name}</h2>
          <p>{item.material} · 深色 · 秋冬厚衣物</p>
          <div className="chip-row">
            {item.tags.map((tag) => (
              <Chip key={tag.label} tone={tag.tone}>
                {tag.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Section title="洗护记忆">
        <div className="two-grid">
          <MetricCard value={String(item.wearCount)} label="穿着次数" />
          <MetricCard value={String(item.washCount)} label="洗涤次数" />
        </div>
      </Section>

      <Section title="风险画像">
        <Card accent="orange" className="warning-surface">
          <div className="progress-block">
            <div className="row-between">
              <h3>{item.riskTitle}</h3>
              <strong>{item.riskLevel}</strong>
            </div>
            <div className="progress-bar">
              <span style={{ width: "82%" }} />
            </div>
            <p>历史备注显示曾缩水，本次建议低温 60 分钟或延长悬挂晾干。</p>
          </div>
        </Card>
      </Section>

      <Section title="本次建议">
        <Card>
          <div className="list-stack">
            <div className="dense-row">
              <span className="step-token">1</span>
              <div>
                <h3>与深色衣物同桶</h3>
                <p>不要和白 T、床单混洗。</p>
              </div>
            </div>
            <div className="dense-row">
              <span className="step-token step-token-amber">2</span>
              <div>
                <h3>标准洗 + 低温烘干</h3>
                <p>拉好拉链，翻面减少磨损。</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <button className="primary-button">加入本次洗衣</button>
    </Page>
  );
}
