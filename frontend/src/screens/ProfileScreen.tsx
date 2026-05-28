import { Save, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ApiConnectionConfig } from "../api/apiConnection";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import type { CampusTower } from "../api/mobileSummary";
import type { UserProfile } from "../userProfile";

interface ProfileScreenProps {
  profile: UserProfile;
  apiConfig: ApiConnectionConfig;
  towerOptions?: CampusTower[];
  onSave: (profile: UserProfile) => void;
  onSaveApiConfig: (config: ApiConnectionConfig) => void;
  onClearApiConfig: () => void;
}

export function ProfileScreen({
  profile,
  apiConfig,
  towerOptions = [],
  onSave,
  onSaveApiConfig,
  onClearApiConfig,
}: ProfileScreenProps) {
  const [draft, setDraft] = useState(profile);
  const [apiDraft, setApiDraft] = useState(apiConfig);
  const [saved, setSaved] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);
  const selectedDormIsListed = towerOptions.some((tower) => tower.name === draft.dormName);

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

  const handleApiClear = () => {
    setApiDraft({ apiBaseUrl: "", apiToken: "" });
    setApiSaved(false);
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
        <Section title="API 连接">
          <div className="form-stack">
            <label>
              <span>API 地址</span>
              <input
                className="input-like"
                value={apiDraft.apiBaseUrl}
                onChange={(event) => {
                  setApiSaved(false);
                  setApiDraft((current) => ({ ...current, apiBaseUrl: event.target.value }));
                }}
                placeholder="例如 https://wash-api.example.com"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label>
              <span>API token</span>
              <input
                className="input-like"
                type="password"
                value={apiDraft.apiToken}
                onChange={(event) => {
                  setApiSaved(false);
                  setApiDraft((current) => ({ ...current, apiToken: event.target.value }));
                }}
                placeholder="由 API 服务管理员提供"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
          </div>
        </Section>

        {apiSaved ? <p className="form-status form-status-ok">API 配置已保存，请回到首页检查连接状态</p> : null}

        <div className="button-row">
          <button className="primary-button" type="submit">
            <Save size={18} />
            保存 API 配置
          </button>
          <button className="secondary-button" type="button" onClick={handleApiClear}>
            清除
          </button>
        </div>
      </form>
    </Page>
  );
}
