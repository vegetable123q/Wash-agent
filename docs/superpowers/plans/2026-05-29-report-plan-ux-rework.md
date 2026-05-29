# Report Plan UX Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the mobile "本次方案" and "报告" sections so they read like a polished user-facing product surface, not backend/debug output.

**Architecture:** Keep business decisions in the existing TypeScript service layer and screen code as orchestration/display. Convert internal IDs to labels at the report-generation boundary, then render compact cards with resilient wrapping and no technical contract names.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Vite, existing CSS components.

---

## File Structure

- Modify: `frontend/src/api/reportGenerator.ts`
  - Add user-facing label helpers for bucket IDs, wash programs, machine types, and charged batches.
  - Remove raw `bucket_id` / `program` output from generated report text.
- Create: `frontend/src/api/reportGenerator.test.ts`
  - Verify generated report text does not leak internal IDs or raw program names.
- Modify: `frontend/src/screens/ReportScreen.tsx`
  - Rename local display concepts away from "backend".
  - Rebuild sections into compact user-facing groups: cost, plan explanation, value, risk.
  - Use friendly bucket/program labels for price breakdown.
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
  - Assert user-facing section names and absence of `后端`, `WashReport`, raw bucket IDs.
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
  - Replace "后端批次" and `LaundryPlan` with "洗护批次" / "已生成".
  - Use item names for exclusion titles, friendly labels for bucket titles, and non-technical fallback text.
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`
  - Assert plan detail hides internal terms and still maps machine types to Chinese labels.
- Modify: `frontend/src/screens/TodayScreen.tsx`
  - Rename "后端方案摘要" and `LaundryPlan` chip to "本次方案概览" / "已整理".
- Modify: `frontend/src/screens/TodayScreen.test.tsx`
  - Update expected heading and ensure no user-visible technical contract labels.
- Modify: `frontend/src/data/washMateContent.ts`
  - Replace static fallback note that mentions `LaundryPlan`.
- Modify: `frontend/src/styles.css`
  - Add wrapping and min-width safeguards for chips, rows, report grid cells, summary cards, and narrow screens.

---

### Task 1: Report Generator User-Facing Text

**Files:**
- Modify: `frontend/src/api/reportGenerator.ts`
- Create: `frontend/src/api/reportGenerator.test.ts`

- [ ] **Step 1: Add focused failing test**

```ts
expect(report.sections["费用和时间"]).toContain("床品单独洗");
expect(report.sections["费用和时间"]).not.toMatch(/large-bedding|standard\b/);
expect(report.sections["洗衣步骤"]).toContain("标准洗");
expect(report.sections["洗衣步骤"]).not.toContain("程序：standard");
```

- [ ] **Step 2: Run generator test to verify it fails**

Run: `npm test -- reportGenerator`
Expected: FAIL because no test file exists yet or raw IDs are still present.

- [ ] **Step 3: Implement label helpers**

Add helpers in `reportGenerator.ts`:

```ts
function bucketTitle(bucket: LaundryBucket): string {
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗衣物",
    "dry-clean": "干洗衣物",
    "hand-wash": "手洗衣物",
    "large-bedding": "床品单独洗",
    "dark-standard": "深色标准洗",
    "light-standard": "浅色标准洗",
  };
  return labels[bucket.bucket_id] ?? "本批衣物";
}

function programText(program: string): string {
  const labels: Record<string, string> = {
    standard: "标准洗",
    quick: "快洗",
    large: "大件洗",
    spin: "单脱水",
    tub_clean: "筒自洁",
    standard_40c: "40 度标准洗",
    standard_60c_uv: "60 度紫外标准洗",
  };
  return labels[program] ?? "合适程序";
}
```

- [ ] **Step 4: Replace raw output**

Use `bucketTitle(bucket)` and `programText(bucket.program)` in `stepsSection`, `bucketReason`, and `chargedBatches`.

- [ ] **Step 5: Run generator test**

Run: `npm test -- reportGenerator`
Expected: PASS.

---

### Task 2: Report Screen Rework

**Files:**
- Modify: `frontend/src/screens/ReportScreen.tsx`
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Update tests**

```ts
expect(screen.getByRole("heading", { name: "结果概览" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "洗护说明" })).toBeInTheDocument();
expect(screen.queryByText(/后端|WashReport|large-bedding|standard_washer/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run screen test to verify it fails**

Run: `npm test -- ReportScreen`
Expected: FAIL because the old headings and technical chip are still present.

- [ ] **Step 3: Rebuild display model**

In `ReportScreen.tsx`:
- Use `planReport` / `displaySections` names instead of `backendReport` / `backendSections`.
- Use heading "结果概览", "费用明细", "洗护说明", "节能与风险".
- Use chip text "已生成" / "待选择".
- Format breakdown with friendly labels such as `床品单独洗 · 标准洗`.

- [ ] **Step 4: Add CSS resilience**

Add/adjust:

```css
.chip { white-space: normal; overflow-wrap: anywhere; }
.report-total { align-items: flex-start; flex-wrap: wrap; }
.price-row { align-items: flex-start; }
.price-row span { min-width: 0; overflow-wrap: anywhere; }
.report-section-grid { grid-template-columns: 1fr; }
```

- [ ] **Step 5: Run report screen test**

Run: `npm test -- ReportScreen`
Expected: PASS.

---

### Task 3: Plan Detail and Dashboard Entry Copy

**Files:**
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`
- Modify: `frontend/src/screens/TodayScreen.tsx`
- Modify: `frontend/src/screens/TodayScreen.test.tsx`
- Modify: `frontend/src/data/washMateContent.ts`

- [ ] **Step 1: Update failing tests**

```ts
expect(screen.getByRole("heading", { name: "本次方案概览" })).toBeInTheDocument();
expect(screen.queryByText(/后端|LaundryPlan/)).not.toBeInTheDocument();
expect(screen.getByText("1 个洗护批次")).toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests to verify failures**

Run: `npm test -- PlanDetailScreen TodayScreen`
Expected: FAIL because old technical copy is still rendered.

- [ ] **Step 3: Replace user-visible technical copy**

In `PlanDetailScreen.tsx`:
- `backendBuckets` may remain an internal variable only if not rendered; rendered text becomes "洗护批次".
- No-warning tag becomes "已整理".
- Summary chip becomes "已生成".
- Exclusion title uses item names from `nameMap`, not raw item IDs.

In `TodayScreen.tsx` and `washMateContent.ts`:
- Heading becomes "本次方案概览".
- Chip becomes "已整理".
- Static note becomes a concise user-facing sentence.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- PlanDetailScreen TodayScreen`
Expected: PASS.

---

### Task 4: Final Styling and Verification

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Tighten wrapping for dense mobile rows**

Add:

```css
.hero-header > div,
.summary-card > div,
.dense-row > div,
.row-between > div {
  min-width: 0;
}

.row-between {
  align-items: flex-start;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Run all focused tests**

Run: `npm test -- ReportScreen PlanDetailScreen TodayScreen reportGenerator`
Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS with TypeScript and Vite build complete.

- [ ] **Step 4: Scan for remaining visible technical terms in target files**

Run: `rg -n "后端报告|后端方案摘要|后端批次|WashReport|LaundryPlan|large-bedding|standard_washer" frontend/src/screens frontend/src/data frontend/src/api/reportGenerator.ts`
Expected: no user-facing occurrences; type/test fixture occurrences are acceptable only when not rendered.

