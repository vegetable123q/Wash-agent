# WashMate Campus Mobile Frontend Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished mobile-first WashMate Campus frontend design that can run in browser preview and be wrapped by Capacitor for an eventual APK.

**Architecture:** Keep all mobile frontend work isolated under `frontend/` so the existing Python backend remains untouched. The app will use static design data and local navigation state to present the full product flow: Today, Wardrobe, Laundry Room, Report, and four detail screens. Capacitor configuration will target Android packaging, but local APK generation requires Java and Android SDK, which are not currently installed on this machine.

**Tech Stack:** Vite, React, TypeScript, CSS custom properties, lucide-react icons, Capacitor Android wrapper.

---

## File Structure

- Create `frontend/package.json`: frontend scripts and dependencies.
- Create `frontend/index.html`: Vite HTML entry.
- Create `frontend/tsconfig.json`: TypeScript compiler options.
- Create `frontend/tsconfig.node.json`: Vite config TypeScript options.
- Create `frontend/vite.config.ts`: Vite React build config.
- Create `frontend/capacitor.config.ts`: Capacitor Android app metadata.
- Create `frontend/src/main.tsx`: React bootstrap.
- Create `frontend/src/App.tsx`: screen registry, navigation state, and app shell.
- Create `frontend/src/data/washMateContent.ts`: static demo content derived from the plan document and sample data.
- Create `frontend/src/components/AppChrome.tsx`: status bar, top bar, bottom nav, reusable cards and chips.
- Create `frontend/src/components/ClothingArt.tsx`: small visual garment symbols for cards.
- Create `frontend/src/screens/TodayScreen.tsx`: bottom-tab Today dashboard.
- Create `frontend/src/screens/PlanDetailScreen.tsx`: secondary plan detail page.
- Create `frontend/src/screens/WardrobeScreen.tsx`: bottom-tab wardrobe page.
- Create `frontend/src/screens/AddClothingScreen.tsx`: secondary clothing intake page.
- Create `frontend/src/screens/ClothingDetailScreen.tsx`: secondary clothing memory page.
- Create `frontend/src/screens/LaundryRoomScreen.tsx`: bottom-tab laundry-room machine page.
- Create `frontend/src/screens/MachineDetailScreen.tsx`: secondary machine detail page.
- Create `frontend/src/screens/ReportScreen.tsx`: bottom-tab report page.
- Create `frontend/src/styles.css`: Tsinghua-purple visual system, phone-scale responsive layout, components, and states.
- Create `frontend/README.md`: preview, build, Capacitor sync, and APK prerequisites.

No backend module should be modified for this task.

---

### Task 1: Scaffold The Frontend Toolchain

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/capacitor.config.ts`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Create package and config files**

Use Vite + React + TypeScript, add Capacitor dependencies and scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "cap:sync": "npm run build && cap sync android",
    "apk:debug": "npm run cap:sync && cd android && gradlew assembleDebug"
  }
}
```

- [ ] **Step 2: Create React bootstrap**

`frontend/src/main.tsx` should render `<App />` into `#root`.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 4: Run initial build**

Run: `npm run build`

Expected: It may fail until `App.tsx` exists; if so, continue to Task 2 and rerun after the app shell exists.

---

### Task 2: Add Static Product Content

**Files:**
- Create: `frontend/src/data/washMateContent.ts`

- [ ] **Step 1: Define screen ids and navigation labels**

Create typed ids for `today`, `wardrobe`, `laundryRoom`, `report`, `planDetail`, `addClothing`, `clothingDetail`, and `machineDetail`.

- [ ] **Step 2: Add Today dashboard content**

Include the demo constraints from the Word plan: rainy night, high humidity, no balcony, sleep by 22:30, clothes must be dry tonight.

- [ ] **Step 3: Add wardrobe content**

Use sample items: white cotton T-shirt, gray hoodie, black jeans, bedding, sports T-shirt, and wool cardigan. Include wear counts, wash counts, risk tags, care evidence, and priority reasons.

- [ ] **Step 4: Add machine content**

Add mock machines: standard washers A01/A02 available, large washer C01 waiting 12 minutes, standard washer A04 out of service, plus 30/60/90 minute drying options.

- [ ] **Step 5: Add report content**

Add fee breakdown, savings notes, risk-control tags, and environmental value copy grounded in less rewash, low-heat drying, and natural drying choices.

- [ ] **Step 6: Type-check content**

Run: `npm run build`

Expected: It may still fail until screens exist; content itself should have no TypeScript syntax errors.

---

### Task 3: Build The Mobile App Shell

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/AppChrome.tsx`
- Create: `frontend/src/components/ClothingArt.tsx`
- Create: `frontend/src/styles.css`

- [ ] **Step 1: Create `App.tsx` screen registry**

Use local React state for the active screen. Main bottom tabs should switch among Today, Wardrobe, Laundry Room, and Report. Secondary screens should use a back action to return to the relevant parent.

- [ ] **Step 2: Create app chrome components**

Implement reusable `StatusBar`, `TopBar`, `BottomNav`, `Chip`, `Card`, `MetricCard`, `Section`, and `PrimaryPanel` components.

- [ ] **Step 3: Create garment art component**

Implement small CSS-friendly garment markers for T-shirt, hoodie, jeans, wool cardigan, and bedding.

- [ ] **Step 4: Create base styles**

Set Tsinghua-purple tokens, readable Chinese typography, fixed mobile canvas constraints, 8px card radius, bottom nav spacing, and safe scrolling behavior.

- [ ] **Step 5: Verify shell build**

Run: `npm run build`

Expected: Build fails only because screen files are still missing, or passes if placeholder screens are in place.

---

### Task 4: Implement The Four Bottom-Tab Screens

**Files:**
- Create: `frontend/src/screens/TodayScreen.tsx`
- Create: `frontend/src/screens/WardrobeScreen.tsx`
- Create: `frontend/src/screens/LaundryRoomScreen.tsx`
- Create: `frontend/src/screens/ReportScreen.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implement Today dashboard**

Show tonight's recommendation time, constraints, bucket summary, selected clothes, excluded high-risk item, and CTA to `planDetail`.

- [ ] **Step 2: Implement Wardrobe screen**

Show wardrobe stats, two-column clothing cards, priority recommendation, care-memory notes, and plus button to `addClothing`. Clothing cards should navigate to `clothingDetail`.

- [ ] **Step 3: Implement Laundry Room screen**

Show current location, recommended start-now card, machine list, dryer slots, and machine cards navigating to `machineDetail`.

- [ ] **Step 4: Implement Report screen**

Show total estimated fee, cost breakdown, energy/savings score, avoided problems, and risk-control completion state.

- [ ] **Step 5: Verify main screen build**

Run: `npm run build`

Expected: TypeScript and Vite build pass, or only missing secondary screen imports remain.

---

### Task 5: Implement The Four Secondary Screens

**Files:**
- Create: `frontend/src/screens/PlanDetailScreen.tsx`
- Create: `frontend/src/screens/AddClothingScreen.tsx`
- Create: `frontend/src/screens/ClothingDetailScreen.tsx`
- Create: `frontend/src/screens/MachineDetailScreen.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implement plan detail**

Show executable split plan: three buckets, machine/mode, detergent amount, drying strategy, queue timing, and exclusion reminder.

- [ ] **Step 2: Implement add clothing**

Show segmented photo/text entry, upload area, description fields, extracted category/material/risk/care result, confidence chips, and save CTA. This remains visual only.

- [ ] **Step 3: Implement clothing detail**

Show single item profile, wash memory stats, shrink/color/pilling risk, history note, and current-session recommendations.

- [ ] **Step 4: Implement machine detail**

Show machine status, price/time/capacity, matching buckets, selectable modes, and unsuitable clothing warnings.

- [ ] **Step 5: Verify detail screen build**

Run: `npm run build`

Expected: Build passes and `frontend/dist/` is generated.

---

### Task 6: Polish Tsinghua-Purple Visual Design

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: screen files as needed for class names only

- [ ] **Step 1: Tune color system**

Use Tsinghua purple as primary, with teal for executable states, blue for information, amber for waiting/drying, orange/red for risk.

- [ ] **Step 2: Tune mobile layout**

Ensure all text fits inside cards/buttons on 390px and 360px widths. Keep cards to 8px radius and avoid nested cards.

- [ ] **Step 3: Add interaction states**

Add button hover/active states, selected tab states, and visually clear disabled or warning states.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

---

### Task 7: Add Capacitor Android Wrapper And Documentation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/capacitor.config.ts`
- Create: `frontend/README.md`
- Potential Create: `frontend/android/` after `npx cap add android`

- [ ] **Step 1: Add Android platform**

Run: `npx cap add android`

Expected: `frontend/android/` is generated. If Android tooling is missing, document the blocker and keep Capacitor config ready.

- [ ] **Step 2: Sync web assets**

Run: `npm run cap:sync`

Expected: Web assets copy into the Android project. This may stop if Android SDK is missing.

- [ ] **Step 3: Try debug APK build**

Run: `npm run apk:debug`

Expected: On a machine with Java and Android SDK, outputs `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. On this machine, expected blocker is missing Java/Android SDK.

- [ ] **Step 4: Write frontend README**

Include exact commands:

```powershell
cd frontend
npm install
npm run dev
npm run build
npm run cap:sync
npm run apk:debug
```

- [ ] **Step 5: Final verification**

Run: `npm run build`

Expected: PASS. Also run browser preview and capture visual checks for 390x844 and 360x780.

---

## Completion Criteria

- `frontend/` contains a complete, polished mobile frontend visual design.
- Four bottom tabs and four secondary screens are reachable through local state.
- Design matches the requested product scope and uses Tsinghua purple as the dominant brand color.
- No backend function, API call, secret, telemetry, analytics, or upload behavior is added.
- `npm run build` passes.
- APK build path is documented; actual APK generation is attempted and any missing local Android tooling is reported clearly.
