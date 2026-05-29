import { Save, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  hasCompleteModelHubConfig,
  normalizeModelHubConfig,
  supportedModelNames,
  type ModelHubConfig,
} from "../api/modelHubConfig";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import type { CampusTowerOption } from "../api/mobileSummary";
import type { UserProfile } from "../userProfile";

type BackendStatus = "loading" | "connected" | "offline";

interface ProfileScreenProps {
  profile: UserProfile;
  modelHubConfig: ModelHubConfig;
  backendStatus: BackendStatus;
  towerOptions?: CampusTowerOption[];
  onSave: (profile: UserProfile) => void;
  onSaveModelHubConfig: (config: ModelHubConfig) => ModelHubConfig;
  onClearModelHubConfig: () => void;
}

export function ProfileScreen({
  profile,
  modelHubConfig,
  backendStatus,
  towerOptions = [],
  onSave,
  onSaveModelHubConfig,
  onClearModelHubConfig,
}: ProfileScreenProps) {
  const [draft, setDraft] = useState(profile);
  const [modelHubDraft, setModelHubDraft] = useState(modelHubConfig);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [modelHubSaved, setModelHubSaved] = useState(false);
  const selectedDormIsListed = towerOptions.some((tower) => tower.name === draft.dormName);
  const normalizedModelHubDraft = normalizeModelHubConfig(modelHubDraft);
  const hasModelDraft = hasCompleteModelHubConfig(normalizedModelHubDraft);
  const modelHubStatus = modelHubConnectionStatus(backendStatus, hasCompleteModelHubConfig(modelHubConfig));

  const updateDraft = (patch: Partial<UserProfile>) => {
    setSaved(false);
    setProfileError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateNumberDraft = (field: "budgetYuan" | "maxWaitMinutes", value: string) => {
    updateDraft({ [field]: positiveNumberOrNull(value) });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPickupTime(draft.latestPickupTime)) {
      setSaved(false);
      setProfileError("请填写有效的最晚取衣时间");
      return;
    }
    setProfileError(null);
    onSave(draft);
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
          <p>保存宿舍楼、取衣时间和烘干偏好</p>
        </div>
        <Chip tone={draft.dormName ? "teal" : "amber"}>{draft.dormName ? "已配置" : "待配置"}</Chip>
      </header>

      <Card accent="purple" className="profile-summary-card">
        <span className="round-icon round-icon-purple">
          <UserRound size={18} />
        </span>
        <div>
          <h2>{draft.displayName || "未填写昵称"}</h2>
          <p>{draft.dormName || "请选择宿舍楼，洗衣房不会再默认紫荆 1 号楼"}</p>
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
          </div>
        </Section>

        <Section title="洗衣偏好">
          <div className="form-stack">
            <label>
              <span>最晚取衣</span>
              <input
                className="input-like"
                type="time"
                value={draft.latestPickupTime}
                onChange={(event) => updateDraft({ latestPickupTime: event.target.value })}
              />
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.allowDryer}
                onChange={(event) => updateDraft({ allowDryer: event.target.checked })}
              />
              <span>允许使用烘干机</span>
            </label>
            <label>
              <span>本次预算上限（元）</span>
              <input
                className="input-like"
                type="number"
                min="0.1"
                step="0.1"
                value={numberInputValue(draft.budgetYuan)}
                onChange={(event) => updateNumberDraft("budgetYuan", event.target.value)}
                placeholder="例如 12"
              />
            </label>
            <label>
              <span>最大等待时间（分钟）</span>
              <input
                className="input-like"
                type="number"
                min="1"
                step="1"
                value={numberInputValue(draft.maxWaitMinutes)}
                onChange={(event) => updateNumberDraft("maxWaitMinutes", event.target.value)}
                placeholder="例如 8"
              />
            </label>
          </div>
        </Section>

        {profileError ? <p className="form-status form-status-error">{profileError}</p> : null}
        {saved ? <p className="form-status form-status-ok">个人信息已保存</p> : null}

        <button className="primary-button" type="submit">
          <Save size={18} />
          保存个人信息
        </button>
      </form>

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
    </Page>
  );
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

function numberInputValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function isValidPickupTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function positiveNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
