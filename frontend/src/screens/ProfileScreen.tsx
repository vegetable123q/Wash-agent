import { Save, UserRound, Wifi } from "lucide-react";
import { FormEvent, useState } from "react";
import { hasCompleteApiConnectionConfig, normalizeApiConnectionConfig, type ApiConnectionConfig } from "../api/apiConnection";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import type { CampusTower } from "../api/mobileSummary";
import type { UserProfile } from "../userProfile";

type BackendStatus = "unconfigured" | "loading" | "connected" | "offline";

interface ProfileScreenProps {
  profile: UserProfile;
  apiConfig: ApiConnectionConfig;
  backendStatus: BackendStatus;
  towerOptions?: CampusTower[];
  onSave: (profile: UserProfile) => void;
  onSaveApiConfig: (config: ApiConnectionConfig, options?: { skipAutoRefresh?: boolean }) => ApiConnectionConfig;
  onClearApiConfig: () => void;
  onTestApiConnection: (config: ApiConnectionConfig) => Promise<void> | void;
}

export function ProfileScreen({
  profile,
  apiConfig,
  backendStatus,
  towerOptions = [],
  onSave,
  onSaveApiConfig,
  onClearApiConfig,
  onTestApiConnection,
}: ProfileScreenProps) {
  const [draft, setDraft] = useState(profile);
  const [apiDraft, setApiDraft] = useState(apiConfig);
  const [saved, setSaved] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);
  const [apiTesting, setApiTesting] = useState(false);
  const selectedDormIsListed = towerOptions.some((tower) => tower.name === draft.dormName);
  const normalizedApiDraft = normalizeApiConnectionConfig(apiDraft);
  const hasApiDraft = hasCompleteApiConnectionConfig(normalizedApiDraft);
  const apiStatus = apiConnectionStatus(backendStatus, hasCompleteApiConnectionConfig(apiConfig));

  const updateDraft = (patch: Partial<UserProfile>) => {
    setSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
    setSaved(true);
  };

  const handleApiSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSaveApiConfig(apiDraft);
    setApiSaved(true);
  };

  const handleApiTest = async () => {
    if (!hasApiDraft) {
      return;
    }
    setApiTesting(true);
    setApiSaved(false);
    try {
      const savedConfig = onSaveApiConfig(apiDraft, { skipAutoRefresh: true });
      await onTestApiConnection(savedConfig);
      setApiSaved(true);
    } finally {
      setApiTesting(false);
    }
  };

  const handleApiClear = () => {
    setApiDraft({ baseUrl: "", apikey: "" });
    setApiSaved(false);
    setApiTesting(false);
    onClearApiConfig();
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
                onChange={(event) => {
                  const tower = towerOptions.find((option) => option.name === event.target.value);
                  updateDraft({
                    dormName: event.target.value,
                    towerKey: tower?.tower_key ?? "",
                  });
                }}
              >
                <option value="">请选择宿舍楼</option>
                {draft.dormName && !selectedDormIsListed ? <option value={draft.dormName}>{draft.dormName}</option> : null}
                {towerOptions.map((tower) => (
                  <option key={`${tower.provider}:${tower.tower_key}`} value={tower.name}>
                    {tower.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>楼栋编码</span>
              <input
                className="input-like"
                value={draft.towerKey}
                onChange={(event) => updateDraft({ towerKey: event.target.value })}
                placeholder="不知道可以先留空"
              />
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
          </div>
        </Section>

        {saved ? <p className="form-status form-status-ok">个人信息已保存</p> : null}

        <button className="primary-button" type="submit">
          <Save size={18} />
          保存个人信息
        </button>
      </form>

      <form className="form-stack api-config-form" onSubmit={handleApiSubmit}>
        <Section title="API 连接" action={<Chip tone={apiStatus.tone}>{apiStatus.label}</Chip>}>
          <div className="form-stack">
            <label>
              <span>baseUrl</span>
              <input
                className="input-like"
                value={apiDraft.baseUrl}
                onChange={(event) => {
                  setApiSaved(false);
                  setApiDraft((current) => ({ ...current, baseUrl: event.target.value }));
                }}
                placeholder="例如 http://10.0.2.2:8000"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label>
              <span>apikey</span>
              <input
                className="input-like"
                type="password"
                value={apiDraft.apikey}
                onChange={(event) => {
                  setApiSaved(false);
                  setApiDraft((current) => ({ ...current, apikey: event.target.value }));
                }}
                placeholder="与后端 WASH_API_KEY 一致"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
          </div>
        </Section>

        {apiSaved ? <p className="form-status form-status-ok">API 配置仅在本次打开期间生效，请测试连接</p> : null}
        {apiSaved && backendStatus === "connected" ? <p className="form-status form-status-ok">API 已连接，完整功能可用</p> : null}
        {apiSaved && backendStatus === "offline" ? (
          <p className="form-status form-status-error">API 连接失败，请检查 baseUrl、apikey 或网络</p>
        ) : null}

        <div className="button-row">
          <button className="primary-button" type="submit">
            <Save size={18} />
            应用 API 配置
          </button>
          <button className="secondary-button" type="button" onClick={handleApiTest} disabled={!hasApiDraft || apiTesting}>
            <Wifi size={18} />
            {apiTesting ? "连接中" : "测试连接"}
          </button>
          <button className="secondary-button" type="button" onClick={handleApiClear}>
            清除
          </button>
        </div>
      </form>
    </Page>
  );
}

function apiConnectionStatus(backendStatus: BackendStatus, hasSavedConfig: boolean) {
  if (!hasSavedConfig || backendStatus === "unconfigured") {
    return { label: "未配置", tone: "amber" as const };
  }
  if (backendStatus === "connected") {
    return { label: "已连接", tone: "teal" as const };
  }
  if (backendStatus === "loading") {
    return { label: "连接中", tone: "blue" as const };
  }
  return { label: "连接失败", tone: "red" as const };
}
