import { Plus } from "lucide-react";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, IconAction, MetricCard, Page, Section } from "../components/AppChrome";
import { ClothingArt } from "../components/ClothingArt";
import { type ClothingArtKind, type ScreenId, type Tone, wardrobeItems } from "../data/washMateContent";

interface WardrobeScreenProps {
  mobileSummary?: MobileSummary | null;
  onNavigate: (screen: ScreenId) => void;
}

export function WardrobeScreen({ mobileSummary, onNavigate }: WardrobeScreenProps) {
  const backendItems = mobileSummary?.wardrobe.items ?? [];
  const cards =
    backendItems.length > 0
      ? backendItems.map((item) => ({
          id: item.item_id,
          name: item.name,
          description: item.user_note || item.user_notes?.[0] || `${item.wash_count} 次洗涤记录`,
          art: artForName(item.name),
          tag: tagForItem(item),
        }))
      : wardrobeItems.slice(0, 4).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          art: item.art,
          tag: item.tags[0],
        }));
  const itemCount = backendItems.length > 0 ? String(backendItems.length) : "12";
  const suggestedCount = backendItems.length > 0 ? String(Math.min(4, backendItems.length)) : "4";

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">个人衣柜记忆</div>
          <h1>我的衣柜</h1>
          <p>记录穿着、洗涤历史和已知问题</p>
        </div>
        <IconAction label="添加衣物" onClick={() => onNavigate("addClothing")} />
      </header>

      <div className="two-grid">
        <MetricCard value={itemCount} label="件已保存衣物" />
        <MetricCard value={suggestedCount} label="件建议本次处理" />
      </div>

      <Section title="衣物卡片" action={<Chip tone="teal">本次可选</Chip>}>
        <div className="wardrobe-grid">
          {cards.slice(0, 6).map((item) => (
            <Card key={item.id} className="wardrobe-card" onClick={() => onNavigate("clothingDetail")}>
              <div className="wardrobe-art-row">
                <ClothingArt kind={item.art} />
                <Chip tone={item.tag.tone}>{item.tag.label}</Chip>
              </div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="优先级">
        <Card>
          <div className="dense-row">
            <span className="round-icon round-icon-orange">
              <Plus size={17} />
            </span>
            <div>
              <h3>运动 T 恤建议本次清洗</h3>
              <p>运动后穿着，明天早课可能要穿。</p>
            </div>
            <Chip tone="orange">急</Chip>
          </div>
        </Card>
      </Section>
    </Page>
  );
}

function artForName(name: string): ClothingArtKind {
  if (name.includes("裤")) {
    return "jeans";
  }
  if (name.includes("羊毛") || name.includes("开衫")) {
    return "wool";
  }
  if (name.includes("床") || name.includes("被")) {
    return "bedding";
  }
  if (name.includes("运动")) {
    return "sport";
  }
  if (name.includes("卫衣") || name.includes("帽")) {
    return "hoodie";
  }
  return "tee";
}

function tagForItem(item: MobileSummary["wardrobe"]["items"][number]): { label: string; tone: Tone } {
  if (Object.values(item.risks).includes("high")) {
    return { label: "高风险", tone: "red" };
  }
  if (Object.values(item.risks).includes("medium")) {
    return { label: "需注意", tone: "orange" };
  }
  if (item.colors.some((color) => color.includes("黑") || color.includes("深"))) {
    return { label: "深色", tone: "purple" };
  }
  return { label: "可机洗", tone: "teal" };
}
