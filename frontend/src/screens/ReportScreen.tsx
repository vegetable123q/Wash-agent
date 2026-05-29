import { BadgeCheck, TrendingDown } from "lucide-react";
import type { MobileSummary } from "../api/mobileSummary";
import { Card, Chip, Page, PrimaryPanel, Section } from "../components/AppChrome";
import { report, reportSections } from "../data/washMateContent";

function formatPrice(price: number | null | undefined): string {
  return price != null ? `¥${price}` : "¥—";
}

export function ReportScreen({ mobileSummary }: { mobileSummary?: MobileSummary | null }) {
  const backendReport = mobileSummary?.report;
  const totalCost = mobileSummary?.plan.estimated_cost_yuan;
  const totalText = totalCost === undefined || totalCost === null ? report.total : `¥${totalCost}`;
  const subtitle = mobileSummary?.plan.estimated_duration_minutes
    ? `后端计划 · 机器占用 ${mobileSummary.plan.estimated_duration_minutes} 分钟`
    : report.subtitle;
  const backendSections = backendReport
    ? Object.entries(backendReport.sections).map(([title, copy]) => ({ title, copy }))
    : reportSections;
  const hasPlan = Boolean(mobileSummary?.plan.buckets.length);
  const pricingRules = mobileSummary?.campus_context.pricing_rules;

  const breakdown = hasPlan && mobileSummary?.plan && pricingRules
    ? mobileSummary.plan.buckets
        .filter((b) => b.wash_method === "machine_wash" || b.dry_method === "low_heat_dryer")
        .flatMap((b) => {
          const items: Array<[string, string]> = [];
          if (b.wash_method === "machine_wash") {
            const washPrice = (pricingRules as Record<string, Record<string, { price_yuan?: number }>>).wash_programs?.[b.program]?.price_yuan;
            items.push([`${b.bucket_id} ${b.program}洗`, formatPrice(washPrice)]);
          }
          if (b.dry_method === "low_heat_dryer") {
            const dryerPrice = (pricingRules as Record<string, Record<string, { price_yuan?: number }>>).dryer_programs?.["low"]?.price_yuan;
            items.push([`${b.bucket_id} 低温烘干`, formatPrice(dryerPrice)]);
          }
          return items;
        })
    : report.breakdown;

  // Show savings notes from the backend report, or static fallback
  const savingsNotes = backendReport?.savings_notes.length
    ? backendReport.savings_notes
    : [report.valueCopy];
  const avoided = backendReport?.risk_notes.length ? backendReport.risk_notes.slice(0, 4) : report.avoided;

  return (
    <Page>
      <header className="hero-header">
        <div>
          <div className="eyebrow">费用与节能报告</div>
          <h1>{backendReport?.title ?? "本次报告"}</h1>
          <p>把洗护决策转成费用、时间和风险结果</p>
        </div>
        <Chip tone="teal">{backendReport ? "后端报告" : "已生成"}</Chip>
      </header>

      <PrimaryPanel className="report-panel">
        <div className="panel-kicker">
          <TrendingDown size={17} />
          <span>预计总费用</span>
        </div>
        <div className="report-total">
          <div>
            <strong>{totalText}</strong>
            <p>{subtitle}</p>
          </div>
          {hasPlan && backendReport?.savings_notes.length
            ? <Chip tone="amber">{backendReport.savings_notes[0]}</Chip>
            : null}
        </div>
      </PrimaryPanel>

      <Section title="费用拆分">
        <Card>
          <div className="price-list">
            {breakdown.map(([label, value]) => (
              <div className="price-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="报告结构" action={<Chip tone="purple">WashReport</Chip>}>
        <div className="report-section-grid">
          {backendSections.map((section) => (
            <div className="report-section-cell" key={section.title}>
              <strong>{section.title}</strong>
              <span>{section.copy}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="节水节电价值">
        <Card>
          <div className="progress-block">
            <div className="row-between">
              <h3>{report.valueTitle}</h3>
              <strong>{report.valueLabel}</strong>
            </div>
            <div className="progress-bar">
              <span style={{ width: "76%" }} />
            </div>
            {savingsNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="本次避免的问题">
        <Card>
          <div className="row-between">
            <h3>风险控制</h3>
            <Chip tone="teal">
              <BadgeCheck size={14} />
              完成
            </Chip>
          </div>
          <div className="chip-row">
            {avoided.map((item, index) => (
              <Chip key={item} tone={index < 2 ? "orange" : "blue"}>
                {item}
              </Chip>
            ))}
          </div>
        </Card>
      </Section>
    </Page>
  );
}
