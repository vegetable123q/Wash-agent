# Report Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the report page into a concise visual dashboard that highlights cost, time, route, and risk without backend wording or dense paragraphs.

**Architecture:** Keep generated plan data as the source of truth and build a display-only view model inside `ReportScreen.tsx`. The screen should render cards from `plan.buckets`, not raw `report.sections`, and CSS should make chips/cards wrap safely on narrow mobile widths.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, existing app chrome components and CSS.

---

## File Structure

- Modify: `frontend/src/screens/ReportScreen.test.tsx`
  - Add regression tests for visual report sections, no technical labels, no machine IDs, and no static demo price when live cost is unknown.
- Modify: `frontend/src/screens/ReportScreen.tsx`
  - Replace raw paragraph report rendering with a visual dashboard: conclusion, environment metrics, route cards, and reminders.
  - Convert bucket IDs, wash methods, programs, and drying methods into Chinese labels.
- Modify: `frontend/src/styles.css`
  - Add responsive report-card styles, larger numbers, compact facts, wrapping, and narrow-screen safeguards.

---

### Task 1: Test the New Report Contract

**Files:**
- Modify: `frontend/src/screens/ReportScreen.test.tsx`

- [x] **Step 1: Add visual structure test**

Assert headings `本次结论`, `环境速览`, `洗护路线`, `重点提醒`.

- [x] **Step 2: Add no-technical-output checks**

Assert visible report text does not contain `后端`, `WashReport`, `LaundryPlan`, raw bucket IDs, or machine IDs like `790781`.

- [x] **Step 3: Add live unknown-cost regression**

Assert a live summary with `estimated_cost_yuan: null` shows `待确认` and never falls back to static `¥24`.

- [x] **Step 4: Run failing focused test**

Run: `npm test -- ReportScreen`
Expected: FAIL before implementation because the old report page renders raw sections and old headings.

---

### Task 2: Build the Visual Report View

**Files:**
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [x] **Step 1: Build hero conclusion panel**

Render a large cost value, duration, bucket count, and one concise summary sentence.

- [x] **Step 2: Build environment metric cards**

Render availability as `可用 A/T`, fastest wait time, and drying condition.

- [x] **Step 3: Build route cards from buckets**

Each bucket card shows friendly title, item count, item names, method/program label, detergent, drying method, and price.

- [x] **Step 4: Build concise reminders**

Use risk notes and warnings, strip location/program fragments, filter machine recommendations, de-duplicate, and cap to three reminders.

- [x] **Step 5: Run focused test**

Run: `npm test -- ReportScreen`
Expected: PASS after test assertions are aligned to the new dashboard contract.

---

### Task 3: Style for Readability and Mobile Resilience

**Files:**
- Modify: `frontend/src/styles.css`

- [x] **Step 1: Add dashboard layout styles**

Add styles for `.report-hero-panel`, `.report-metric-grid`, `.report-route-card`, and `.report-reminder-card`.

- [x] **Step 2: Increase visual hierarchy**

Use large hero numbers, clear metric cards, and compact fact pills instead of paragraph blocks.

- [x] **Step 3: Add wrapping safeguards**

Ensure `.chip`, route facts, headings, and dense rows use `min-width: 0`, `overflow-wrap: anywhere`, and mobile single-column fallbacks.

- [x] **Step 4: Run build**

Run: `npm run build`
Expected: PASS.

---

### Task 4: Browser Verification

**Files:**
- No source edits expected.

- [x] **Step 1: Start the Vite server**

Run: `npm run dev -- --host 127.0.0.1`
Expected: local URL such as `http://127.0.0.1:5174/`.

- [x] **Step 2: Open the app**

Use the in-app browser at the local URL and navigate to the report page.

- [x] **Step 3: Visual sanity check**

Confirm the page shows the visual dashboard, no dense raw report paragraphs, no backend labels, no machine IDs, and no obvious overflow on the mobile viewport.
