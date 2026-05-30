import { AlertTriangle, WashingMachine } from "lucide-react";
import { machineProgramOptions, type MachineProgramOption } from "../api/machinePricing";
import type { BackendMachine, MobileSummary } from "../api/mobileSummary";
import type { LaundryBucket } from "../api/types";
import { Card, Chip, Page, PrimaryPanel, Section, TopBar } from "../components/AppChrome";
import { type MachineView, type Tone } from "../data/washMateContent";

interface MachineDetailScreenProps {
  onBack: () => void;
  backendMachine?: BackendMachine | null;
  staticMachine?: MachineView | null;
  pricingRules?: Record<string, unknown> | null;
  mobileSummary?: MobileSummary | null;
}

interface MachineFitRow {
  title: string;
  description: string;
  icon: string;
  iconTone: "purple" | "blue" | "amber";
  chip: string;
  chipTone: Tone;
  actionLabel?: string;
}

interface MachineExclusionRow {
  title: string;
  description: string;
  method: string;
}

export function MachineDetailScreen({ onBack, backendMachine, staticMachine, pricingRules, mobileSummary }: MachineDetailScreenProps) {
  if (!backendMachine && !staticMachine) {
    return (
      <Page compact>
        <TopBar title="机器详情" onBack={onBack} />
        <Card accent="orange" className="warning-surface">
          <h2>未找到机器记录</h2>
          <p>请从洗衣房机器列表重新选择机器。</p>
        </Card>
      </Page>
    );
  }

  const machine = backendMachine ? detailFromBackend(backendMachine, pricingRules) : detailFromStatic(staticMachine as MachineView);
  const modes = machine.modeOptions.length
    ? machine.modeOptions.map((mode) => mode.label).join(" / ")
    : machine.modes.length ? machine.modes.map(modeLabel).join(" / ") : "暂无可用模式";
  const nameMap = new Map(mobileSummary?.wardrobe.items.map((item) => [item.item_id, item.name]) ?? []);
  const fitRows = machineFitRows(machine, mobileSummary, nameMap);
  const exclusionRows = machineExclusionRows(mobileSummary, nameMap);
  const actionLabel = fitRows.find((row) => row.actionLabel)?.actionLabel ?? (mobileSummary ? "本机未分配到本次方案" : "等待本次方案");

  return (
    <Page compact>
      <TopBar title={machine.name} onBack={onBack} />

      <PrimaryPanel>
        <div className="panel-kicker">
          <WashingMachine size={17} />
          <span>当前状态</span>
        </div>
        <div className="hero-number-row">
          <div>
            <strong className="hero-number">{machine.status}</strong>
            <p>{machine.typeLabel} · {machine.location}</p>
          </div>
          <div className="panel-metrics">
            <span>{machine.timing}</span>
          </div>
        </div>
      </PrimaryPanel>

      <Section title="机器信息">
        <Card accent="purple" className="contract-list">
          <div className="contract-row">
            <span>设备编号</span>
            <strong>{machine.backendId}</strong>
          </div>
          <div className="contract-row">
            <span>设备类型</span>
            <strong>{machine.typeLabel}</strong>
          </div>
          <div className="contract-row">
            <span>当前状态</span>
            <strong>{machine.backendStatus}</strong>
          </div>
          <div className="contract-row">
            <span>可选模式</span>
            <strong>{modes}</strong>
          </div>
        </Card>
      </Section>

      <Section title="适合本次">
        <Card>
          <div className="list-stack">
            {fitRows.map((row) => (
              <div className="dense-row" key={row.title}>
                <span className={`text-icon text-icon-${row.iconTone}`}>{row.icon}</span>
                <div>
                  <h3>{row.title}</h3>
                  <p>{row.description}</p>
                </div>
                <Chip tone={row.chipTone}>{row.chip}</Chip>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="可选模式">
        <div className="mode-grid">
          {machine.modeOptions.length ? machine.modeOptions.map((mode) => (
            <div key={mode.id} className="mode-option">
              <strong>{mode.label}</strong>
              <span>{mode.summaryText}</span>
            </div>
          )) : machine.modes.map((mode) => (
            <div key={mode} className="mode-option">
              <strong>{modeLabel(mode)}</strong>
              <span>{modeDescription(mode)}</span>
            </div>
          ))}
        </div>
      </Section>

      {exclusionRows.length > 0 ? (
        <Section title="不建议放入">
          <div className="list-stack">
            {exclusionRows.map((row) => (
              <Card key={row.title} accent="orange" className="warning-surface">
                <div className="row-between">
                  <div>
                    <h3>{row.title}</h3>
                    <p>{row.description}</p>
                  </div>
                  <Chip tone="red">
                    <AlertTriangle size={14} />
                    {row.method}
                  </Chip>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      <button className="primary-button" type="button" disabled title="机器会根据本次方案自动匹配">
        {actionLabel}
      </button>
    </Page>
  );
}

function machineFitRows(
  machine: ReturnType<typeof detailFromBackend> | ReturnType<typeof detailFromStatic>,
  mobileSummary: MobileSummary | null | undefined,
  nameMap: Map<string, string>,
): MachineFitRow[] {
  if (!mobileSummary) {
    return [{
      title: "等待本次方案",
      description: "先在脏衣篮选择本次要洗的衣物，系统会自动匹配合适机器。",
      icon: machine.backendType === "dryer" ? "烘" : "待",
      iconTone: "blue",
      chip: "待生成",
      chipTone: "orange",
    }];
  }

  if (machine.backendType === "dryer") {
    const assignedDryingSteps = mobileSummary.drying_plan?.steps.filter((step) => step.dryer_machine_id === machine.backendId) ?? [];
    if (!assignedDryingSteps.length) {
      return [noAssignmentRow("烘")];
    }
    return assignedDryingSteps.map((step) => {
      const title = `${bucketDisplayName(step.bucket_id)} 烘干`;
      return {
        title,
        description: itemNames(step.item_ids, nameMap),
        icon: "烘",
        iconTone: "amber",
        chip: dryLabel(step.dry_method),
        chipTone: "teal",
        actionLabel: `用于${title}`,
      };
    });
  }

  const assignedBuckets = mobileSummary.plan.buckets.filter((bucket) => bucket.machine_id === machine.backendId);
  if (!assignedBuckets.length) {
    return [noAssignmentRow(machine.backendType === "shoe_washer" ? "鞋" : "待")];
  }
  return assignedBuckets.map((bucket) => {
    const title = bucketDisplayName(bucket.bucket_id);
    return {
      title,
      description: itemNames(bucket.item_ids, nameMap),
      icon: title.slice(0, 1) || "洗",
      iconTone: baseBucketId(bucket.bucket_id) === "dark-standard" ? "purple" : "blue",
      chip: bucket.program ? programLabel(bucket.program) : machine.typeLabel,
      chipTone: "teal",
      actionLabel: `用于${title}`,
    };
  });
}

function noAssignmentRow(icon: string): MachineFitRow {
  return {
    title: "未分配到本次方案",
    description: "当前方案已经匹配其他机器；可返回洗衣房查看本次推荐设备。",
    icon,
    iconTone: "blue",
    chip: "未分配",
    chipTone: "orange",
  };
}

function machineExclusionRows(
  mobileSummary: MobileSummary | null | undefined,
  nameMap: Map<string, string>,
): MachineExclusionRow[] {
  if (!mobileSummary) {
    return [];
  }
  return mobileSummary.plan.buckets
    .filter((bucket) => bucket.wash_method !== "machine_wash")
    .map((bucket) => ({
      title: `${itemNames(bucket.item_ids, nameMap)}不进共享机`,
      description: exclusionReason(bucket),
      method: methodLabel(bucket.wash_method),
    }));
}

function itemNames(itemIds: string[], nameMap: Map<string, string>): string {
  return itemIds.map((id) => nameMap.get(id) ?? "本批衣物").join("、") || "未列出衣物";
}

function baseBucketId(bucketId: string): string {
  return bucketId.replace(/-\d+$/, "");
}

function bucketDisplayName(bucketId: string) {
  const base = baseBucketId(bucketId);
  if (base === "light-standard") return "浅色标准洗";
  if (base === "light-quick") return "浅色快洗";
  if (base === "dark-standard") return "深色标准洗";
  if (base === "mixed-standard") return "混色标准洗";
  if (base === "large-bedding") return "床品单独洗";
  if (base === "hand-wash") return "手洗衣物";
  if (base === "dry-clean") return "干洗衣物";
  return "本批衣物";
}

function methodLabel(method: string) {
  if (method === "hand_wash") return "手洗";
  if (method === "dry_clean") return "干洗";
  if (method === "do_not_wash") return "不水洗";
  if (method === "machine_wash") return "机洗";
  return "待确认";
}

function dryLabel(method: string) {
  if (method === "low_heat_dryer") return "低温烘干";
  if (method === "normal_dryer") return "普通烘干";
  if (method === "air_dry") return "自然晾干";
  if (method === "do_not_dry") return "不烘干";
  return "烘干待确认";
}

function programLabel(program: string) {
  if (program === "quick") return "快速洗";
  if (program === "standard") return "标准洗";
  if (program === "large") return "大件洗";
  return "合适程序";
}

function exclusionReason(bucket: LaundryBucket) {
  if (bucket.warnings.length) {
    return bucket.warnings[0];
  }
  if (bucket.wash_method === "hand_wash") return "材质或洗标提示更适合手洗。";
  if (bucket.wash_method === "dry_clean") return "该批次需要专业干洗。";
  if (bucket.wash_method === "do_not_wash") return "洗护标签提示不可水洗。";
  return "本批衣物不适合共享机洗。";
}

function detailFromBackend(machine: BackendMachine, pricingRules?: Record<string, unknown> | null) {
  const typeLabel = machineTypeLabel(machine.machine_type);
  return {
    backendId: machine.machine_id,
    name: `${typeLabel} · ${machine.location}`,
    location: machine.location,
    backendType: machine.machine_type,
    typeLabel,
    status: statusText(machine.status),
    backendStatus: statusText(machine.status),
    timing: timingText(machine.status, machine.remaining_minutes),
    modes: machine.modes,
    modeOptions: machineProgramOptions(machine, pricingRules),
  };
}

function detailFromStatic(machine: MachineView) {
  return {
    backendId: machine.backendId,
    name: machine.name,
    location: machine.location,
    backendType: machine.backendType,
    typeLabel: machineTypeLabel(machine.backendType),
    status: machine.status,
    backendStatus: machine.status,
    timing: staticTimingText(machine),
    modes: machine.modes,
    modeOptions: [] as MachineProgramOption[],
  };
}

function statusText(status: string) {
  if (status === "available") {
    return "空闲";
  }
  if (status === "running") {
    return "运行中";
  }
  if (status === "out_of_service") {
    return "故障";
  }
  return "未知";
}

function machineTypeLabel(machineType: string) {
  if (machineType === "standard_washer") return "洗衣机";
  if (machineType === "shoe_washer") return "洗鞋机";
  if (machineType === "dryer") return "烘干机";
  return "未知设备";
}

function timingText(status: string, remainingMinutes: number | null) {
  if (status === "available") return "无需等待";
  if (status === "running") {
    return isFiniteNonNegativeInteger(remainingMinutes) ? `剩余 ${remainingMinutes} 分钟` : "运行中";
  }
  if (status === "out_of_service") return "暂不可用";
  return "状态未知";
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return isFiniteNonNegativeNumber(value) && Number.isInteger(value);
}

function staticTimingText(machine: MachineView) {
  if (machine.backendStatus === "available") return "无需等待";
  if (machine.backendStatus === "out_of_service") return "暂不可用";
  if (machine.remaining === "0 分钟") return "无需等待";
  return machine.remaining;
}

function modeLabel(mode: string) {
  if (mode === "quick") return "快洗";
  if (mode === "standard") return "标准";
  if (mode === "large") return "大物";
  if (mode === "spin") return "单脱";
  if (mode === "tub_clean") return "桶自洁";
  if (mode === "standard_40c") return "标准+40度";
  if (mode === "standard_60c_uv") return "标准+60度+紫外";
  if (mode === "high") return "高温";
  if (mode === "medium") return "中温";
  if (mode === "low") return "低温";
  return "其他模式";
}

function modeDescription(mode: string) {
  if (mode === "quick") return "30 分 · 轻薄";
  if (mode === "standard") return "40 分 · 常规衣物";
  if (mode === "large") return "50 分 · 大物";
  if (mode === "spin") return "6 分 · 单脱";
  if (mode === "tub_clean") return "桶清洁";
  if (mode === "standard_40c") return "60 分 · 温水";
  if (mode === "standard_60c_uv") return "70 分 · 高温紫外";
  if (mode === "high") return "90 分 · 高温烘干";
  if (mode === "medium") return "60 分 · 中温烘干";
  if (mode === "low") return "50 分 · 低温烘干";
  return "以机器页面为准";
}
