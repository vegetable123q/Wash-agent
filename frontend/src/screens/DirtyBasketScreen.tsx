import { ArrowRight, Clock3, ListChecks, Trash2 } from "lucide-react";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, Section, TopBar } from "../components/AppChrome";
import type { ScreenId, Tone } from "../data/washMateContent";

interface DirtyBasketScreenProps {
  mobileSummary?: MobileSummary | null;
  onBack: () => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleItem?: (itemId: string) => void | Promise<void>;
  onClearBasket?: () => void | Promise<void>;
  onSelectAll?: () => void | Promise<void>;
}

export function DirtyBasketScreen({
  mobileSummary,
  onBack,
  onNavigate,
  onToggleItem,
  onClearBasket,
  onSelectAll,
}: DirtyBasketScreenProps) {
  const wardrobeItems = mobileSummary?.wardrobe.items ?? [];
  const selectedIds = new Set(mobileSummary?.selected_laundry_item_ids ?? []);
  const dirtyBasket = mobileSummary?.dirty_basket ?? {
    item_count: 0,
    load_percent: 0,
    oldest_days: 0,
    urgent_count: 0,
    status_label: "空篮",
    recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
    next_action: "去衣柜选择这批要洗的衣物",
    items: [],
  };
  const dirtyById = new Map(dirtyBasket.items.map((item) => [item.item_id, item]));
  const allWardrobeItemsSelected =
    wardrobeItems.length > 0 && wardrobeItems.every((item) => selectedIds.has(item.item_id));
  const canSelectAll = Boolean(onSelectAll && wardrobeItems.length > 0 && !allWardrobeItemsSelected);
  const canClearBasket = Boolean(onClearBasket && dirtyBasket.item_count > 0);
  const hasSelectedLaundryItems = selectedIds.size > 0;

  return (
    <Page compact>
      <TopBar title="脏衣篮" onBack={onBack} />

      <Card accent="teal" className="dirty-basket-card dirty-basket-card-sticky">
        <div className="dirty-basket-head">
          <div>
            <h3>{dirtyBasket.item_count} 件在盆里</h3>
            <p>{dirtyBasket.recommendation}</p>
          </div>
          <strong>{dirtyBasketLoadLabel(dirtyBasket)}</strong>
        </div>
        <div className="progress-bar dirty-basket-progress" aria-label="脏衣篮容量">
          <span style={{ width: `${dirtyBasket.load_percent}%` }} />
        </div>
        <div className="dirty-basket-metrics">
          <span>
            <Clock3 size={14} />
            最久 {dirtyBasket.oldest_days} 天
          </span>
          <span>{dirtyBasket.status_label}</span>
        </div>
      </Card>

      <Section
        title="选择脏衣服"
        action={
          canSelectAll || canClearBasket ? (
            <div className="section-action-row">
              {canSelectAll ? (
                <button type="button" className="secondary-button" onClick={() => void onSelectAll?.()}>
                  <ListChecks size={15} />
                  全选
                </button>
              ) : null}
              {canClearBasket ? (
                <button type="button" className="secondary-button danger-secondary-button" onClick={() => void onClearBasket?.()}>
                  <Trash2 size={15} />
                  清空脏衣篮
                </button>
              ) : null}
            </div>
          ) : (
            <Chip tone={dirtyBasket.item_count ? "teal" : "amber"}>{dirtyBasket.status_label}</Chip>
          )
        }
      >
        {wardrobeItems.length ? (
          <div className="basket-check-list">
            {wardrobeItems.map((item) => {
              const selected = selectedIds.has(item.item_id);
              const basketItem = dirtyById.get(item.item_id);
              return (
                <label key={item.item_id} className={`basket-check-row ${selected ? "basket-check-row-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!onToggleItem}
                    aria-label={`${selected ? "移出" : "加入"}脏衣篮 ${item.name}`}
                    onChange={() => {
                      void onToggleItem?.(item.item_id);
                    }}
                  />
                  <span className="basket-check-main">
                    <strong>{item.name}</strong>
                    <em>{item.user_note || item.user_notes?.[0] || `${item.wash_count} 次洗涤记录`}</em>
                  </span>
                  <span className="basket-check-side">
                    <Chip tone={basketTone(basketItem?.warning_label)}>{basketItem?.warning_label ?? itemRiskLabel(item)}</Chip>
                    <small>{basketItem ? dirtyBasketAgeLabel(basketItem) : "未加入"}</small>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <Card accent="blue" className="empty-state-card">
            <div>
              <h3>还没有衣服可选</h3>
              <p>先去衣柜添加衣服，再把脏衣服加入脏衣篮。</p>
            </div>
          </Card>
        )}
      </Section>

      <Section title="下一步">
        <button
          className="primary-button"
          type="button"
          disabled={!hasSelectedLaundryItems}
          onClick={() => {
            if (hasSelectedLaundryItems) {
              onNavigate("planDetail");
            }
          }}
        >
          {hasSelectedLaundryItems ? "查看本次方案" : "先选择衣物"}
          {hasSelectedLaundryItems ? <ArrowRight size={18} /> : null}
        </button>
      </Section>
    </Page>
  );
}

function basketTone(label: string | undefined): Tone {
  if (label === "加入时间待确认") return "amber";
  if (label === "久放易有味" || label === "急用") return "orange";
  if (label === "分开洗") return "red";
  return "teal";
}

function dirtyBasketAgeLabel(item: MobileSummary["dirty_basket"]["items"][number]): string {
  if (item.added_at_source === "estimated") {
    return "加入时间待确认";
  }
  return `已放 ${item.days_in_basket} 天`;
}

function dirtyBasketLoadLabel(dirtyBasket: MobileSummary["dirty_basket"]): string {
  if ((dirtyBasket.estimated_load_count ?? 0) > 1) {
    return `约 ${dirtyBasket.estimated_load_count} 桶`;
  }
  return `约 ${dirtyBasket.load_percent}% 桶`;
}

function itemRiskLabel(item: MobileSummary["wardrobe"]["items"][number]): string {
  if (Object.values(item.risks).includes("high")) return "高风险";
  if (Object.values(item.risks).includes("medium")) return "需注意";
  return "可加入";
}
