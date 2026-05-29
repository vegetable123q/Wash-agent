import { Plus, Trash2 } from "lucide-react";
import type { MobileSummary } from "../api/mobileSummary";
import type { WardrobeCategory } from "../api/types";
import { Card, Chip, IconAction, MetricCard, Page, Section } from "../components/AppChrome";
import { ClothingArt } from "../components/ClothingArt";
import { type ClothingArtKind, type ScreenId, type Tone } from "../data/washMateContent";
import { useState } from "react";

interface WardrobeScreenProps {
  mobileSummary?: MobileSummary | null;
  onNavigate: (screen: ScreenId) => void;
  onViewItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
}

interface WardrobeCardModel {
  id: string;
  name: string;
  description: string;
  art: ClothingArtKind;
  tag: { label: string; tone: Tone };
  category: WardrobeCategory;
  photoDataUrl: string;
}

export function WardrobeScreen({ mobileSummary, onNavigate, onViewItem, onDeleteItem }: WardrobeScreenProps) {
  const [deletingId, setDeletingId] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const backendItems = mobileSummary?.wardrobe.items ?? [];
  const isEmptyWardrobe = backendItems.length === 0;
  const cards: WardrobeCardModel[] = backendItems.map((item) => ({
    id: item.item_id,
    name: item.name,
    description: item.user_note || item.user_notes?.[0] || `${item.wash_count} 次洗涤记录`,
    art: artForName(item.name),
    tag: tagForItem(item),
    category: categoryForItem(item),
    photoDataUrl: item.photo_data_url ?? "",
  }));
  const categoryGroups = groupWardrobeCards(cards);
  const itemCount = String(backendItems.length);
  const categoryCount = String(categoryGroups.length);

  // Build real priority list from frequency advice
  const priorityItems = buildPriorityItems(mobileSummary);

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
        <MetricCard value={categoryCount} label="类衣物分类" />
      </div>

      <Section title="衣物分类" action={<Chip tone="teal">{categoryGroups.length} 类</Chip>}>
        {deleteMessage ? <p className="form-status form-status-ok">{deleteMessage}</p> : null}
        {deleteError ? <p className="form-status form-status-error">{deleteError}</p> : null}
        {isEmptyWardrobe ? (
          <Card accent="blue" className="empty-state-card">
            <div>
              <h3>还没有衣物记录</h3>
              <p>添加第一件衣物后，衣柜会显示材质、风险、穿着和洗涤次数。</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => onNavigate("addClothing")}>
              添加第一件衣物
            </button>
          </Card>
        ) : (
          <div className="wardrobe-category-stack">
            {categoryGroups.map((group) => (
              <section key={group.title} className="wardrobe-category">
                <div className="wardrobe-category-head">
                  <h2>{group.title}</h2>
                  <span>{group.items.length} 件</span>
                </div>
                <div className="wardrobe-grid">
                  {group.items.map((item) => (
                    <Card key={item.id} className="wardrobe-card">
                      <div className="wardrobe-art-row">
                        {item.photoDataUrl ? (
                          <img className="wardrobe-photo" src={item.photoDataUrl} alt={`${item.name} 照片`} />
                        ) : (
                          <ClothingArt kind={item.art} />
                        )}
                        <Chip tone={item.tag.tone}>{item.tag.label}</Chip>
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                      </div>
                      <div className="wardrobe-card-actions inventory-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => (onViewItem ? onViewItem(item.id) : onNavigate("clothingDetail"))}
                        >
                          查看详情
                        </button>
                        <button
                          type="button"
                          className="icon-button danger-icon-button"
                          aria-label={`删除 ${item.name}`}
                          disabled={deletingId === item.id}
                          onClick={async () => {
                            if (!onDeleteItem) {
                              return;
                            }
                            setDeletingId(item.id);
                            setDeleteMessage("");
                            setDeleteError("");
                            try {
                              await onDeleteItem(item.id);
                              setDeleteMessage(`已删除 ${item.name}`);
                            } catch (error) {
                              setDeleteError(error instanceof Error ? error.message : "删除失败");
                            } finally {
                              setDeletingId("");
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Section>

      {!isEmptyWardrobe && priorityItems.length > 0 ? (
        <Section title="优先级">
          <div className="list-stack">
            {priorityItems.map((p) => (
              <Card key={p.itemId}>
                <div className="dense-row">
                  <span className="round-icon round-icon-orange">
                    <Plus size={17} />
                  </span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                  </div>
                  <Chip tone={p.tone}>{p.badge}</Chip>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  );
}

function buildPriorityItems(summary: MobileSummary | null | undefined) {
  const advice = summary?.frequency_advice;
  const wardrobeItems = summary?.wardrobe.items ?? [];
  if (!advice || !advice.length) {
    return [];
  }

  const nameMap = new Map(wardrobeItems.map((i) => [i.item_id, i.name]));
  return advice
    .filter((a) => a.priority_score >= 45)
    .slice(0, 3)
    .map((a) => ({
      itemId: a.item_id,
      title: `${nameMap.get(a.item_id) ?? a.item_id}${a.recommendation}`,
      description: a.reasons[0] ?? "",
      badge: a.priority_score >= 75 ? "急" : a.priority_score >= 45 ? "建议" : "可选",
      tone: (a.priority_score >= 75 ? "orange" : "teal") as Tone,
    }));
}

function groupWardrobeCards(cards: WardrobeCardModel[]) {
  const order: WardrobeCategory[] = ["上衣", "裤装", "裙装", "外套", "内衣袜子", "床品", "鞋包配饰", "其他"];
  return order
    .map((title) => ({
      title,
      items: cards.filter((card) => card.category === title),
    }))
    .filter((group) => group.items.length > 0);
}

function categoryForItem(item: MobileSummary["wardrobe"]["items"][number]): WardrobeCategory {
  if (isWardrobeCategory(item.category)) {
    return item.category;
  }
  return "其他";
}

function isWardrobeCategory(value: unknown): value is WardrobeCategory {
  return typeof value === "string" && ["上衣", "裤装", "裙装", "外套", "内衣袜子", "床品", "鞋包配饰", "其他"].includes(value);
}

function artForName(name: string): ClothingArtKind {
  if (name.includes("裤")) return "jeans";
  if (name.includes("羊毛") || name.includes("开衫")) return "wool";
  if (name.includes("床") || name.includes("被")) return "bedding";
  if (name.includes("运动")) return "sport";
  if (name.includes("卫衣") || name.includes("帽")) return "hoodie";
  return "tee";
}

function tagForItem(item: MobileSummary["wardrobe"]["items"][number]): { label: string; tone: Tone } {
  if (Object.values(item.risks).includes("high")) {
    return { label: "高风险", tone: "red" };
  }
  if (Object.values(item.risks).includes("medium")) {
    return { label: "需注意", tone: "orange" };
  }
  if (item.colors.some((color) => color.includes("黑") || color.includes("深") || color.includes("black") || color.includes("dark") || color.includes("navy"))) {
    return { label: "深色", tone: "purple" };
  }
  return { label: "可机洗", tone: "teal" };
}
