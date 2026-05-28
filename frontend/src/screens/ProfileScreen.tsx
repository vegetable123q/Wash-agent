import { Save, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Card, Chip, Page, Section } from "../components/AppChrome";
import type { UserProfile } from "../userProfile";

interface ProfileScreenProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export function ProfileScreen({ profile, onSave }: ProfileScreenProps) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  const updateDraft = (patch: Partial<UserProfile>) => {
    setSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
    setSaved(true);
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
              <input
                className="input-like"
                value={draft.dormName}
                onChange={(event) => updateDraft({ dormName: event.target.value })}
                placeholder="例如 南区 21 号楼"
              />
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

        <button className="primary-button">
          <Save size={18} />
          保存个人信息
        </button>
      </form>
    </Page>
  );
}
