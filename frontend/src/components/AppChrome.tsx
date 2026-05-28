import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  ChevronRight,
  LucideIcon,
  Plus,
  Shirt,
  UserRound,
  WashingMachine,
} from "lucide-react";
import type { ReactNode } from "react";
import type { TabId, Tone } from "../data/washMateContent";

interface StatusBarProps {
  time?: string;
}

export function StatusBar({ time = "21:08" }: StatusBarProps) {
  return (
    <div className="status-bar" aria-hidden="true">
      <span>{time}</span>
      <span className="phone-signal">
        <span />
        <span />
        <span />
        82%
      </span>
    </div>
  );
}

interface TopBarProps {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}

export function TopBar({ title, onBack, action }: TopBarProps) {
  return (
    <div className="top-bar">
      {onBack ? (
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <span />
      )}
      <h1>{title}</h1>
      {action ?? <span />}
    </div>
  );
}

interface BottomNavProps {
  active: TabId;
  onNavigate: (tab: TabId) => void;
}

const navItems: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "today", label: "今日", icon: CheckSquare },
  { id: "wardrobe", label: "衣柜", icon: Shirt },
  { id: "laundryRoom", label: "洗衣房", icon: WashingMachine },
  { id: "report", label: "报告", icon: BarChart3 },
  { id: "profile", label: "我的", icon: UserRound },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="底部导航">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={21} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Chip({
  children,
  tone = "soft",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={`chip chip-${tone} ${className}`}>{children}</span>;
}

export function Card({
  children,
  className = "",
  accent,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  accent?: Tone;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`card ${accent ? `card-accent card-accent-${accent}` : ""} ${className}`}
      onClick={onClick}
    >
      {children}
      {onClick ? <ChevronRight className="card-chevron" size={18} /> : null}
    </Tag>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PrimaryPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`primary-panel ${className}`}>{children}</section>;
}

export function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function IconAction({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="icon-button" onClick={onClick} aria-label={label}>
      <Plus size={20} />
    </button>
  );
}

export function Page({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <main className={`page ${compact ? "page-compact" : ""}`}>{children}</main>;
}
