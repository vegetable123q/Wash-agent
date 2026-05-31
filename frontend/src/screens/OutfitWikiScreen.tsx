import { Calendar, Layers, PenLine, ShoppingBasket, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getRecentLogs, getTopPairs, loadClothingPairs, loadOutfitLogs, todayDateString, type OutfitLog } from "../api/outfitLogStore";
import { classifyWardrobeItems, generateOutfitRecommendation, generateStyleSummary } from "../api/outfitWiki";
import type { ModelHubConfig } from "../api/modelHubConfig";
import type { WardrobeSummaryItem } from "../api/mobileSummary";
import type { ClothingPair, OutfitRecommendation, WeatherSnapshot } from "../api/types";
import { Card, Chip, MetricCard, Page, Section } from "../components/AppChrome";
import type { ScreenId } from "../data/washMateContent";

interface OutfitWikiScreenProps {
  wardrobeItems: WardrobeSummaryItem[];
  weather?: WeatherSnapshot | null;
  modelHubConfig?: ModelHubConfig;
  dirtyItemIds?: string[];
  onNavigate: (screen: ScreenId) => void;
  onAddToBasket?: (itemId: string) => void | Promise<void>;
  onAddItemsToBasket?: (itemIds: string[]) => void | Promise<void>;
}

export function OutfitWikiScreen({
  wardrobeItems,
  weather,
  modelHubConfig,
  dirtyItemIds,
  onNavigate,
  onAddToBasket,
  onAddItemsToBasket,
}: OutfitWikiScreenProps) {
  const [logs] = useState<OutfitLog[]>(() => loadOutfitLogs());
  const [pairs] = useState<ClothingPair[]>(() => loadClothingPairs());
  const [recommendation, setRecommendation] = useState<OutfitRecommendation | null>(null);
  const [recSource, setRecSource] = useState<"llm" | "fallback">("fallback");
  const [styleSummary, setStyleSummary] = useState<string>("");
  const [styleSource, setStyleSource] = useState<"llm" | "fallback">("fallback");

  const recentLogs = useMemo(() => getRecentLogs(7), [logs]);
  const topPairs = useMemo(() => getTopPairs(5), [pairs]);
  const todayLog = useMemo(() => logs.find((l) => l.date === todayDateString()) ?? null, [logs]);

  const nameMap = useMemo(
    () => new Map(wardrobeItems.map((i) => [i.item_id, i.name])),
    [wardrobeItems],
  );

  const dirtySet = useMemo(() => new Set(dirtyItemIds ?? []), [dirtyItemIds]);

  // Items that need washing (high wear count)
  const needsWashItems = useMemo(() => {
    return wardrobeItems.filter((item) => item.wear_count_since_wash >= 4 && !dirtySet.has(item.item_id));
  }, [wardrobeItems, dirtySet]);

  // Fetch LLM recommendation (filtered by dirty basket)
  useEffect(() => {
    if (!wardrobeItems.length) return;
    let cancelled = false;
    generateOutfitRecommendation(
      wardrobeItems,
      weather ?? undefined,
      getRecentLogs(30),
      pairs,
      modelHubConfig ?? { baseUrl: "", apikey: "", model_name: "" },
      dirtyItemIds,
    ).then((result) => {
      if (!cancelled) {
        setRecommendation(result.recommendation);
        setRecSource(result.source);
      }
    });
    return () => { cancelled = true; };
  }, [wardrobeItems, weather, modelHubConfig, pairs, dirtyItemIds]);

  // Fetch style summary
  useEffect(() => {
    let cancelled = false;
    generateStyleSummary(
      getRecentLogs(30),
      wardrobeItems,
      topPairs,
      modelHubConfig ?? { baseUrl: "", apikey: "", model_name: "" },
    ).then((result) => {
      if (!cancelled) {
        setStyleSummary(result.text);
        setStyleSource(result.source);
      }
    });
    return () => { cancelled = true; };
  }, [wardrobeItems, modelHubConfig, topPairs, logs]);

  const { tops, bottoms, outers } = useMemo(
    () => classifyWardrobeItems(wardrobeItems),
    [wardrobeItems],
  );

  const isEmpty = wardrobeItems.length === 0;
  const missingBottoms = !isEmpty && bottoms.length === 0;

  // Check if today's worn items are already in dirty basket
  const todayAllWornIds = todayLog
    ? [...todayLog.top_ids, ...todayLog.bottom_ids, ...todayLog.outer_ids]
    : [];
  const todayAllInBasket = todayAllWornIds.length > 0 && todayAllWornIds.every((id) => dirtySet.has(id));

  const handleAddTodayToBasket = async () => {
    if (todayAllInBasket) return;
    const idsToAdd = todayAllWornIds.filter((id) => !dirtySet.has(id));
    if (idsToAdd.length === 0) return;
    if (onAddItemsToBasket) {
      await onAddItemsToBasket(idsToAdd);
    } else if (onAddToBasket) {
      for (const itemId of idsToAdd) {
        await onAddToBasket(itemId);
      }
    }
  };

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">穿搭 Wiki</div>
          <h1>每日穿搭</h1>
          <p>记录穿搭，智能推荐今日组合</p>
        </div>
      </header>

      <div className="two-grid">
        <MetricCard value={String(logs.length)} label="天穿搭记录" />
        <MetricCard value={String(topPairs.length)} label="组常用搭配" />
      </div>

      {/* ── Needs Wash Alert ── */}
      {needsWashItems.length > 0 ? (
        <Section title="待洗衣物提醒" action={<Chip tone="orange">{needsWashItems.length} 件</Chip>}>
          <Card accent="orange" className="warning-surface">
            <div className="list-stack">
              {needsWashItems.map((item) => (
                <div className="dense-row" key={item.item_id}>
                  <span className="text-icon text-icon-orange">{item.name.slice(0, 1)}</span>
                  <div>
                    <h3>{item.name}</h3>
                    <p>已穿 {item.wear_count_since_wash} 次，建议尽快清洗</p>
                  </div>
                  {onAddToBasket && !dirtySet.has(item.item_id) ? (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`将 ${item.name} 加入脏衣篮`}
                      onClick={() => void onAddToBasket(item.item_id)}
                    >
                      <ShoppingBasket size={16} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </Section>
      ) : null}

      {/* ── Today Recommendation ── */}
      <Section
        title="今日推荐"
        action={
          recommendation ? (
            <Chip tone={recSource === "llm" ? "purple" : "teal"}>
              {recSource === "llm" ? "AI 推荐" : "智能推荐"}
            </Chip>
          ) : null
        }
      >
        {isEmpty ? (
          <Card accent="blue" className="empty-state-card">
            <div>
              <h3>还没有衣物记录</h3>
              <p>先去「衣柜」添加衣物，才能推荐穿搭。</p>
            </div>
          </Card>
        ) : missingBottoms ? (
          <Card accent="amber" className="empty-state-card">
            <div>
              <h3>还缺下衣</h3>
              <p>缺少裤装/裙装，暂时无法推荐完整穿搭。</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => onNavigate("addClothing")}>
              添加下衣
            </button>
          </Card>
        ) : recommendation && recommendation.top_ids.length > 0 ? (
          <Card accent="purple" className="recommendation-card">
            <div className="recommendation-body">
              <div className="recommendation-section">
                <span className="recommendation-label">上衣</span>
                <div className="recommendation-items">
                  {recommendation.top_ids.map((id) => (
                    <RecommendationItem key={id} name={nameMap.get(id) ?? id} />
                  ))}
                </div>
              </div>
              <div className="recommendation-section">
                <span className="recommendation-label">下衣</span>
                <div className="recommendation-items">
                  {recommendation.bottom_ids.map((id) => (
                    <RecommendationItem key={id} name={nameMap.get(id) ?? id} />
                  ))}
                </div>
              </div>
              {recommendation.outer_ids.length > 0 ? (
                <div className="recommendation-section">
                  <span className="recommendation-label">外套</span>
                  <div className="recommendation-items">
                    {recommendation.outer_ids.map((id) => (
                      <RecommendationItem key={id} name={nameMap.get(id) ?? id} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="recommendation-reason">
              <Sparkles size={14} />
              <span>{recommendation.reason}</span>
            </div>
            <div className="recommendation-footer">
              <div className="recommendation-score">
                <span>搭配指数</span>
                <strong>{recommendation.match_score}</strong>
              </div>
              <Chip
                tone={
                  recommendation.confidence === "high"
                    ? "teal"
                    : recommendation.confidence === "medium"
                      ? "amber"
                      : "orange"
                }
              >
                {recommendation.confidence === "high" ? "高置信" : recommendation.confidence === "medium" ? "中置信" : "低置信"}
              </Chip>
            </div>
          </Card>
        ) : (
          <Card accent="amber">
            <p>正在生成推荐…</p>
          </Card>
        )}
      </Section>

      {/* ── Today Record ── */}
      <Section title="今日记录">
        {todayLog ? (
          <Card className="today-record-card">
            <div className="today-record-header">
              <Calendar size={16} />
              <strong>今天已记录</strong>
            </div>
            <div className="today-record-detail">
              <div>
                <span className="recommendation-label">上衣</span>
                <span>{todayLog.top_ids.map((id) => nameMap.get(id) ?? id).join("、") || "—"}</span>
              </div>
              <div>
                <span className="recommendation-label">下衣</span>
                <span>{todayLog.bottom_ids.map((id) => nameMap.get(id) ?? id).join("、") || "—"}</span>
              </div>
              {todayLog.outer_ids.length > 0 ? (
                <div>
                  <span className="recommendation-label">外套</span>
                  <span>{todayLog.outer_ids.map((id) => nameMap.get(id) ?? id).join("、")}</span>
                </div>
              ) : null}
            </div>
            <div className="today-record-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onNavigate("recordOutfit")}
              >
                <PenLine size={16} />
                修改记录
              </button>
              {onAddToBasket && !todayAllInBasket ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleAddTodayToBasket()}
                >
                  <ShoppingBasket size={16} />
                  加入脏衣篮
                </button>
              ) : todayAllInBasket ? (
                <Chip tone="teal">已在脏衣篮</Chip>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card accent="teal" className="empty-state-card">
            <div>
              <h3>今天还没有穿搭记录</h3>
              <p>记录你穿了什么，让 AI 更了解你的穿搭习惯。</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("recordOutfit")}
              disabled={isEmpty}
            >
              <PenLine size={16} />
              记录今天的穿搭
            </button>
          </Card>
        )}
      </Section>

      {/* ── Style Summary ── */}
      {styleSummary ? (
        <Section title="穿搭风格" action={<Chip tone={styleSource === "llm" ? "purple" : "teal"}>{styleSource === "llm" ? "AI 分析" : "统计"}</Chip>}>
          <Card>
            <div className="style-summary-text">
              <TrendingUp size={16} />
              <span>{styleSummary}</span>
            </div>
          </Card>
        </Section>
      ) : null}

      {/* ── Clothing Pairs ── */}
      {topPairs.length > 0 ? (
        <Section title="搭配关系" action={<Chip tone="teal">{topPairs.length} 组</Chip>}>
          <Card>
            <div className="pair-list">
              {topPairs.map((pair) => (
                <PairRow
                  key={`${pair.item_a}-${pair.item_b}`}
                  pair={pair}
                  nameMap={nameMap}
                  maxCount={topPairs[0].co_wear_count}
                />
              ))}
            </div>
          </Card>
        </Section>
      ) : null}

      {/* ── Recent Outfit History ── */}
      {recentLogs.length > 0 ? (
        <Section title="近7天穿搭" action={<Chip tone="soft">{recentLogs.length} 条</Chip>}>
          <div className="list-stack">
            {recentLogs.map((log) => (
              <Card key={log.date}>
                <div className="history-row">
                  <div className="history-date">
                    <Calendar size={14} />
                    <span>{formatDateShort(log.date)}</span>
                    {log.weather_snapshot ? (
                      <span className="history-weather">{formatWeatherShort(log.weather_snapshot)}</span>
                    ) : null}
                  </div>
                  <div className="history-items">
                    <div>
                      <span className="recommendation-label">上衣</span>
                      <span>{log.top_ids.map((id) => nameMap.get(id) ?? id).join("、") || "—"}</span>
                    </div>
                    <div>
                      <span className="recommendation-label">下衣</span>
                      <span>{log.bottom_ids.map((id) => nameMap.get(id) ?? id).join("、") || "—"}</span>
                    </div>
                    {log.outer_ids.length > 0 ? (
                      <div>
                        <span className="recommendation-label">外套</span>
                        <span>{log.outer_ids.map((id) => nameMap.get(id) ?? id).join("、")}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ── Wardrobe Stats ── */}
      <Section title="衣柜概况">
        <div className="two-grid">
          <MetricCard value={String(tops.length)} label="件上衣" />
          <MetricCard value={String(bottoms.length)} label="件下衣" />
        </div>
        {outers.length > 0 ? (
          <div className="two-grid" style={{ marginTop: 8 }}>
            <MetricCard value={String(outers.length)} label="件外套" />
            <MetricCard value={String(wardrobeItems.length)} label="件总计" />
          </div>
        ) : null}
      </Section>
    </Page>
  );
}

function RecommendationItem({ name }: { name: string }) {
  return <span className="recommendation-item-tag">{name}</span>;
}

function PairRow({
  pair,
  nameMap,
  maxCount,
}: {
  pair: ClothingPair;
  nameMap: Map<string, string>;
  maxCount: number;
}) {
  const nameA = nameMap.get(pair.item_a) ?? pair.item_a;
  const nameB = nameMap.get(pair.item_b) ?? pair.item_b;
  const percent = maxCount > 0 ? Math.round((pair.co_wear_count / maxCount) * 100) : 0;
  return (
    <div className="pair-row">
      <div className="pair-names">
        <Layers size={14} />
        <span>{nameA}</span>
        <span className="pair-plus">+</span>
        <span>{nameB}</span>
      </div>
      <div className="pair-bar-row">
        <div className="progress-bar pair-bar">
          <span style={{ width: `${percent}%` }} />
        </div>
        <strong>{pair.co_wear_count}次</strong>
      </div>
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}

function formatWeatherShort(snapshot: { temperature_2m: number; weather_code: number; precipitation: number }): string {
  const temp = `${snapshot.temperature_2m}°C`;
  const label = weatherCodeLabel(snapshot.weather_code);
  return `${temp}${label ? ` ${label}` : ""}`;
}

function weatherCodeLabel(code: number): string {
  if (code === 0) return "晴";
  if (code <= 3) return "多云";
  if (code <= 48) return "雾";
  if (code <= 57) return "细雨";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "阵雨";
  if (code <= 86) return "阵雪";
  if (code <= 99) return "雷暴";
  return "";
}
