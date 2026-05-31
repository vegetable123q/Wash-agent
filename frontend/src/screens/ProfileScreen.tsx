import { Database, Save, Settings2, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  hasCompleteModelHubConfig,
  normalizeModelHubConfig,
  supportedModelNames,
  type ModelHubConfig,
} from "../api/modelHubConfig";
import { seedDemoData } from "../api/demoData";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import type { CampusTowerOption } from "../api/mobileSummary";
import { dormWithFloor, isValidPickupTime, normalizeDormFloor, type UserProfile } from "../userProfile";

type BackendStatus = "loading" | "connected" | "offline";

interface ProfileScreenProps {
  profile: UserProfile;
  modelHubConfig: ModelHubConfig;
  backendStatus: BackendStatus;
  towerOptions?: CampusTowerOption[];
  onSave: (profile: UserProfile) => void;
  onSaveModelHubConfig: (config: ModelHubConfig) => ModelHubConfig;
  onClearModelHubConfig: () => void;
  onSeedDemoData?: (profile: UserProfile) => void;
}

export function ProfileScreen({
  profile,
  modelHubConfig,
  backendStatus,
  towerOptions = [],
  onSave,
  onSaveModelHubConfig,
  onClearModelHubConfig,
  onSeedDemoData,
}: ProfileScreenProps) {
  const [draft, setDraft] = useState(profile);
  const [modelHubDraft, setModelHubDraft] = useState(modelHubConfig);
  const [saved, setSaved] = useState(false);
  const [floorError, setFloorError] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [modelHubSaved, setModelHubSaved] = useState(false);
  const [demoSeeding, setDemoSeeding] = useState(false);
  const [demoResult, setDemoResult] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedDormIsListed = towerOptions.some((tower) => tower.name === draft.dormName);
  const normalizedModelHubDraft = normalizeModelHubConfig(modelHubDraft);
  const hasModelDraft = hasCompleteModelHubConfig(normalizedModelHubDraft);
  const modelHubStatus = modelHubConnectionStatus(backendStatus, hasCompleteModelHubConfig(modelHubConfig));

  const updateDraft = (patch: Partial<UserProfile>) => {
    setSaved(false);
    if ("dormFloor" in patch) {
      setFloorError(null);
    }
    if ("latestPickupTime" in patch) {
      setPickupError(null);
    }
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const dormFloor = normalizeDormFloor(draft.dormFloor);
    if (dormFloor === null) {
      setSaved(false);
      setFloorError("请输入 1-30 之间的楼层");
      return;
    }
    if (!isValidPickupTime(draft.latestPickupTime)) {
      setSaved(false);
      setPickupError("请输入有效的取衣时间");
      return;
    }
    const normalizedDraft = { ...draft, dormFloor };
    setDraft(normalizedDraft);
    onSave(normalizedDraft);
    setSaved(true);
  };

  const handleApiSubmit = (event: FormEvent) => {
    event.preventDefault();
    setModelHubDraft(onSaveModelHubConfig(modelHubDraft));
    setModelHubSaved(true);
  };

  const handleApiClear = () => {
    setModelHubDraft({ baseUrl: "https://modelhub.ailemac.com/v1beta", apikey: "", model_name: "gemini-3.1-pro-preview" });
    setModelHubSaved(false);
    onClearModelHubConfig();
  };

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">个人洗护配置</div>
          <h1>我的</h1>
          <p>保存宿舍楼、取衣时间、预算和烘干偏好</p>
        </div>
        <Chip tone={draft.dormName ? "teal" : "amber"}>{draft.dormName ? "已配置" : "待配置"}</Chip>
      </header>

      <Card accent="purple" className="profile-summary-card">
        <span className="round-icon round-icon-purple">
          <UserRound size={18} />
        </span>
        <div>
          <h2>{draft.displayName || "未填写昵称"}</h2>
          <p>{dormWithFloor(draft) || "请选择宿舍楼，洗衣房不会再默认紫荆 1 号楼"}</p>
        </div>
      </Card>

      <form className="form-stack" onSubmit={handleSubmit}>
        <Section title="基础信息">
          <div className="form-stack">
            <label>
              <span>昵称</span>
              <input
                className="input-like"
                value={draft.displayName}
                onChange={(event) => updateDraft({ displayName: event.target.value })}
                placeholder="例如 小徐"
              />
            </label>
            <label>
              <span>宿舍楼</span>
              <select
                className="input-like"
                aria-label="宿舍楼"
                value={draft.dormName}
                onChange={(event) => updateDraft({ dormName: event.target.value })}
              >
                <option value="">请选择宿舍楼</option>
                {draft.dormName && !selectedDormIsListed ? <option value={draft.dormName}>{draft.dormName}</option> : null}
                {towerOptions.map((tower) => (
                  <option key={tower.name} value={tower.name}>
                    {tower.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>所在楼层</span>
              <input
                className="input-like"
                aria-label="所在楼层"
                inputMode="numeric"
                maxLength={2}
                value={draft.dormFloor ?? ""}
                onChange={(event) => updateDraft({ dormFloor: event.target.value })}
                placeholder="1-30"
              />
            </label>
            {floorError ? <p className="form-status form-status-error">{floorError}</p> : null}
          </div>
        </Section>

        <Section title="洗衣偏好">
          <div className="form-stack">
            <label>
              <span>最晚取衣</span>
              <input
                className="input-like"
                type="time"
                aria-label="最晚取衣"
                value={draft.latestPickupTime}
                onChange={(event) => updateDraft({ latestPickupTime: event.target.value })}
              />
            </label>
            {pickupError ? <p className="form-status form-status-error">{pickupError}</p> : null}
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.allowDryer}
                onChange={(event) => updateDraft({ allowDryer: event.target.checked })}
              />
              <span>允许使用烘干机</span>
            </label>
            <label>
              <span>本次预算（元）</span>
              <input
                className="input-like"
                type="number"
                min={0}
                step={0.5}
                value={draft.budgetYuan ?? ""}
                onChange={(event) => updateDraft({ budgetYuan: optionalNumber(event.target.value) })}
                placeholder="不限制"
              />
            </label>
            <label>
              <span>最大等待（分钟）</span>
              <input
                className="input-like"
                type="number"
                min={0}
                step={1}
                value={draft.maxWaitMinutes ?? ""}
                onChange={(event) => updateDraft({ maxWaitMinutes: optionalNumber(event.target.value) })}
                placeholder="不限制"
              />
            </label>
          </div>
        </Section>

        {saved ? <p className="form-status form-status-ok">个人信息已保存</p> : null}

        <button className="primary-button" type="submit">
          <Save size={18} />
          保存个人信息
        </button>
      </form>

      <button
        className="secondary-button advanced-toggle-button"
        type="button"
        onClick={() => setShowAdvanced((current) => !current)}
      >
        <Settings2 size={16} />
        高级设置
      </button>

      {showAdvanced ? (
        <div className="advanced-settings">
      <form className="form-stack api-config-form" onSubmit={handleApiSubmit}>
        <Section title="识图模型" action={<Chip tone={modelHubStatus.tone}>{modelHubStatus.label}</Chip>}>
          <div className="form-stack">
            <label>
              <span>ModelHub baseUrl</span>
              <input
                className="input-like"
                value={modelHubDraft.baseUrl}
                onChange={(event) => {
                  setModelHubSaved(false);
                  setModelHubDraft((current) => ({ ...current, baseUrl: event.target.value }));
                }}
                placeholder="https://modelhub.ailemac.com/v1beta"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label>
              <span>apikey</span>
              <input
                className="input-like"
                type="password"
                value={modelHubDraft.apikey}
                onChange={(event) => {
                  setModelHubSaved(false);
                  setModelHubDraft((current) => ({ ...current, apikey: event.target.value }));
                }}
                placeholder="sk-your-api-key-here"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label>
              <span>model_name</span>
              <select
                className="input-like"
                aria-label="model_name"
                value={modelHubDraft.model_name}
                onChange={(event) => {
                  setModelHubSaved(false);
                  setModelHubDraft((current) => ({ ...current, model_name: event.target.value }));
                }}
              >
                {supportedModelNames.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        {modelHubSaved && hasModelDraft ? (
          <p className="form-status form-status-ok">识图配置已保存到本机；只在本设备使用，可随时清除</p>
        ) : null}

        <div className="button-row">
          <button className="primary-button" type="submit">
            <Save size={18} />
            应用识图配置
          </button>
          <button className="secondary-button" type="button" onClick={handleApiClear}>
            清除
          </button>
        </div>
      </form>

      {onSeedDemoData ? (
        <Section title="演示数据">
          <Card accent="blue" className="demo-data-card">
            <div>
              <h3>一键加载演示数据</h3>
              <p>
                填入 14 件衣柜衣物、5 件脏衣篮、7 天穿搭记录和搭配关系，
                所有页面立即展示完整交互内容。
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={demoSeeding}
              onClick={() => {
                setDemoSeeding(true);
                setDemoResult(null);
                try {
                  const result = seedDemoData();
                  setDraft(result.profile);
                  onSeedDemoData(result.profile);
                  setDemoResult(
                    `已加载：${result.wardrobeCount} 件衣物 · ${result.basketCount} 件脏衣 · ${result.logCount} 天穿搭`,
                  );
                } catch (error) {
                  setDemoResult(error instanceof Error ? error.message : "加载失败");
                } finally {
                  setDemoSeeding(false);
                }
              }}
            >
              <Database size={16} />
              {demoSeeding ? "加载中…" : "加载演示数据"}
            </button>
            {demoResult ? (
              <p className={demoResult.startsWith("已加载") ? "form-status form-status-ok" : "form-status form-status-error"}>
                {demoResult}
              </p>
            ) : null}
          </Card>
        </Section>
      ) : null}
        </div>
      ) : null}
    </Page>
  );
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function modelHubConnectionStatus(backendStatus: BackendStatus, hasSavedConfig: boolean) {
  if (hasSavedConfig) {
    return { label: "识图已配置", tone: "teal" as const };
  }
  if (backendStatus === "connected") {
    return { label: "APK 内置", tone: "blue" as const };
  }
  if (backendStatus === "loading") {
    return { label: "加载中", tone: "blue" as const };
  }
  return { label: "本地数据异常", tone: "red" as const };
}
