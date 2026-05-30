import { Check, Save } from "lucide-react";
import { useState } from "react";
import type { OutfitLog } from "../api/outfitLogStore";
import { todayDateString } from "../api/outfitLogStore";
import { classifyWardrobeItems } from "../api/outfitWiki";
import type { WardrobeSummaryItem } from "../api/mobileSummary";
import type { WeatherSnapshot } from "../api/types";
import { Chip, Page, Section, TopBar } from "../components/AppChrome";

interface RecordOutfitScreenProps {
  wardrobeItems: WardrobeSummaryItem[];
  weather?: WeatherSnapshot | null;
  existingLog?: OutfitLog | null;
  onBack: () => void;
  onSave: (log: OutfitLog) => void;
}

export function RecordOutfitScreen({
  wardrobeItems,
  weather,
  existingLog,
  onBack,
  onSave,
}: RecordOutfitScreenProps) {
  const { tops, bottoms, outers } = classifyWardrobeItems(wardrobeItems);

  const [selectedTops, setSelectedTops] = useState<Set<string>>(() => {
    if (existingLog?.top_ids?.length) return new Set(existingLog.top_ids);
    return new Set();
  });
  const [selectedBottoms, setSelectedBottoms] = useState<Set<string>>(() => {
    if (existingLog?.bottom_ids?.length) return new Set(existingLog.bottom_ids);
    return new Set();
  });
  const [selectedOuters, setSelectedOuters] = useState<Set<string>>(() => {
    if (existingLog?.outer_ids?.length) return new Set(existingLog.outer_ids);
    return new Set();
  });
  const [note, setNote] = useState(existingLog?.note ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const temperature = weather?.current?.temperature_2m;
  const weatherCode = weather?.current?.weather_code;
  const precipitation = weather?.current?.precipitation;

  const weatherLabel = (() => {
    if (weather?.status !== "live" || temperature == null) return null;
    const tempStr = `${temperature}°C`;
    const desc = weatherCode != null ? weatherCodeLabel(weatherCode) : "";
    const precipStr = precipitation != null && precipitation > 0 ? ` · 降水 ${precipitation}mm` : "";
    return `${tempStr}${desc ? ` · ${desc}` : ""}${precipStr}`;
  })();

  const canSave = selectedTops.size > 0 && selectedBottoms.size > 0 && status !== "saving";

  const toggleItem = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  };

  const handleSave = () => {
    if (!canSave) return;
    setStatus("saving");
    const log: OutfitLog = {
      date: todayDateString(),
      top_ids: [...selectedTops],
      bottom_ids: [...selectedBottoms],
      outer_ids: [...selectedOuters],
      accessory_ids: [],
      note: note.trim() || undefined,
      weather_snapshot:
        temperature != null && weatherCode != null && precipitation != null
          ? { temperature_2m: temperature, weather_code: weatherCode, precipitation }
          : undefined,
    };
    onSave(log);
    setStatus("saved");
  };

  return (
    <Page compact>
      <TopBar title="记录穿搭" onBack={onBack} />

      {weatherLabel ? (
        <div className="constraint-row" aria-label="今日天气">
          <span>{weatherLabel}</span>
        </div>
      ) : null}

      <Section title="上衣">
        <div className="outfit-select-list">
          {tops.length > 0 ? (
            tops.map((item) => (
              <OutfitSelectItem
                key={item.item_id}
                name={item.name}
                colors={item.colors}
                photoDataUrl={item.photo_data_url}
                selected={selectedTops.has(item.item_id)}
                onToggle={() => setSelectedTops((prev) => toggleItem(prev, item.item_id))}
              />
            ))
          ) : (
            <p className="outfit-empty-hint">衣柜中还没有上衣，请先添加衣物。</p>
          )}
        </div>
      </Section>

      <Section title="下衣">
        <div className="outfit-select-list">
          {bottoms.length > 0 ? (
            bottoms.map((item) => (
              <OutfitSelectItem
                key={item.item_id}
                name={item.name}
                colors={item.colors}
                photoDataUrl={item.photo_data_url}
                selected={selectedBottoms.has(item.item_id)}
                onToggle={() => setSelectedBottoms((prev) => toggleItem(prev, item.item_id))}
              />
            ))
          ) : (
            <p className="outfit-empty-hint">衣柜中还没有下衣（裤装/裙装），请先添加衣物。</p>
          )}
        </div>
      </Section>

      {outers.length > 0 ? (
        <Section title="外套（可选）">
          <div className="outfit-select-list">
            {outers.map((item) => (
              <OutfitSelectItem
                key={item.item_id}
                name={item.name}
                colors={item.colors}
                photoDataUrl={item.photo_data_url}
                selected={selectedOuters.has(item.item_id)}
                onToggle={() => setSelectedOuters((prev) => toggleItem(prev, item.item_id))}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="备注">
        <textarea
          className="input-like textarea-like"
          placeholder="今天有什么特别的吗？如：面试、体育课、约会…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Section>

      {status === "saved" ? <p className="form-status form-status-ok">已记录今天的穿搭</p> : null}

      <button
        className="primary-button"
        type="button"
        disabled={!canSave}
        onClick={status === "saved" ? onBack : handleSave}
      >
        {status === "saving" ? (
          "正在保存"
        ) : status === "saved" ? (
          "返回"
        ) : (
          <>
            <Save size={18} />
            确认记录
          </>
        )}
      </button>
    </Page>
  );
}

function OutfitSelectItem({
  name,
  colors,
  photoDataUrl,
  selected,
  onToggle,
}: {
  name: string;
  colors: string[];
  photoDataUrl?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const colorText = colors.filter(Boolean).join("、");
  return (
    <button
      type="button"
      className={`outfit-select-item ${selected ? "outfit-select-item-active" : ""}`}
      onClick={onToggle}
    >
      <div className="outfit-select-item-photo">
        {photoDataUrl ? (
          <img className="wardrobe-photo" src={photoDataUrl} alt={name} />
        ) : (
          <span className="outfit-select-icon">{name.slice(0, 1)}</span>
        )}
      </div>
      <div className="outfit-select-item-info">
        <strong>{name}</strong>
        {colorText ? <span>{colorText}</span> : null}
      </div>
      {selected ? (
        <span className="outfit-select-check">
          <Check size={18} />
        </span>
      ) : null}
    </button>
  );
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
