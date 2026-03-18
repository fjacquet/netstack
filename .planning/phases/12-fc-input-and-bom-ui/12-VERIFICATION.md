---
phase: 12-fc-input-and-bom-ui
verified: 2026-03-18T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "In FC mode, a dedicated input form accepts HBA ports per server, storage target ports, FC switch model selection, and preferred generation"
    status: failed
    reason: "No 'preferred generation' field exists in FCInputForm.tsx, FCSizingInputSchema, or any i18n key. FC-10 explicitly lists 'preferred generation' as a required input. The switch model dropdown implicitly encodes generation (G720 = Gen7, G820 = Gen8) but provides no dedicated generation filter or selector."
    artifacts:
      - path: "src/features/sizing/fc/FCInputForm.tsx"
        issue: "No preferredGeneration select field — only fcSwitchModel dropdown"
      - path: "src/domain/schemas/fc-input.ts"
        issue: "FCSizingInputSchema has no preferredGeneration field"
      - path: "src/i18n/locales/en/translation.json"
        issue: "fc.* namespace has no preferredGeneration key"
    missing:
      - "Add preferredGeneration: z.enum(['gen7', 'gen8', 'any']) (or equivalent) to FCSizingInputSchema"
      - "Add a generation filter/selector to FCInputForm.tsx that narrows the fcSwitchModel dropdown to models matching the selected generation"
      - "Add fc.preferredGeneration and fc.preferredGenerationHelp i18n keys"
---

# Phase 12: FC Input and BOM UI Verification Report

**Phase Goal:** Users can switch to Fibre Channel mode, enter FC sizing inputs, and see a complete FC BOM with per-fabric counts and POD license requirements
**Verified:** 2026-03-18
**Status:** gaps_found — 4/5 success criteria verified
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Mode selector toggle switches between Ethernet and FC views — only one subtree renders at a time | VERIFIED | `App.tsx` line 45: `{mode === 'fc' ? <FCSizingPage /> : <SizingPage />}` — ternary guarantees mutual exclusion at the JSX level |
| 2 | FC input form accepts HBA ports per server, storage target ports, FC switch model, and **preferred generation** | FAILED | HBA ports, storage target ports, switch model all present. No `preferredGeneration` field exists anywhere — schema, form, or i18n |
| 3 | FC BOM panel displays per-fabric switch counts (A and B separately), ISL cable count, SFP optics, and fan-in ratio | VERIFIED | `FCBOMPanel.tsx` lines 149-175 render `fabricASwitches`, `fabricBSwitches`, `islCables`, `fcOpticsCount`, and a severity-badged `fanInRatio` |
| 4 | POD license requirement appears as a top-level line item in the FC BOM panel — not hidden in tooltip/footnote — with unit count labeled | VERIFIED | `FCBOMPanel.tsx` lines 165-173: conditional `TableRow` with `fcbom.podLicenseLabel` label and `fcbom.podLicenseUnit` suffix renders when `podLicensesRequired > 0`; test at FCBOMPanel.test.tsx:127 explicitly asserts this |
| 5 | FC constraint violation banners (`FC_PORT_SATURATION`, `FC_OVERSUBSCRIPTION_EXCEEDED`) render in FC BOM panel using the same Alert component pattern as Ethernet violations | VERIFIED | `FCBOMPanel.tsx` `FCViolationAlert` uses `<Alert variant="destructive" role="alert">` pattern for both codes; tests at lines 154 and 167 pass |

**Score:** 4/5 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/App.tsx` | VERIFIED | `useState<'ethernet' \| 'fc'>`, `TopBar` receives `mode`/`onModeChange`, `FCSizingPage` imported and rendered conditionally |
| `src/components/ModeSelector.tsx` | VERIFIED | Two-button toggle, `aria-label` from i18n, fires `onModeChange`; wired in `TopBar.tsx` line 61 |
| `src/features/sizing/fc/FCInputForm.tsx` | PARTIAL | All required numeric and model-selection fields present; `preferredGeneration` field absent |
| `src/features/sizing/fc/FCSizingPage.tsx` | VERIFIED | Composes `FCInputForm` and `FCBOMPanel` side-by-side; imported in `App.tsx` line 7 |
| `src/features/sizing/fc/FCBOMPanel.tsx` | VERIFIED | Per-fabric counts, ISL cables, optics, fan-in badge, POD license row, violation alerts — all rendered |
| `src/store/fcInputStore.ts` | VERIFIED | Persisted Zustand store with `setInput`/`resetInput`; default values match form |
| `src/store/fcResultStore.ts` | VERIFIED | Derived store; subscribes to `fcInputStore`, calls `calculateFCBOM`, initial computation on module load |
| `src/domain/engine/fc-sizing.ts` | VERIFIED | Pure `calculateFCBOM` function with 7-step logic; produces all required BOM fields including `podLicensesRequired` and `fanInRatio` |
| `src/domain/catalog/brocade.ts` | VERIFIED | 9 Brocade switch models with `generation`, `speedGbps`, `basePorts`, `totalPorts`, `podLicenseUnit` fields |
| `src/domain/schemas/fc-input.ts` | PARTIAL | `FCSizingInputSchema` covers all engine-needed fields; `preferredGeneration` absent |
| `src/domain/schemas/fc-bom.ts` | VERIFIED | `FCNetworkBOMSchema` and `FCConstraintViolationSchema` discriminated union; all required fields present |
| `src/i18n/locales/en/translation.json` | PARTIAL | `fc.*` keys cover heading, HBA, storage, switch model, ISL, reset. `fcbom.*` covers all BOM panel labels. No `fc.preferredGeneration` key |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `FCSizingPage` | `{mode === 'fc' ? <FCSizingPage /> : <SizingPage />}` | WIRED | Line 45 — exclusive conditional render |
| `TopBar.tsx` | `ModeSelector` | `<ModeSelector mode={mode} onModeChange={onModeChange} />` | WIRED | Line 61 — props flow from `AppContent` state |
| `FCSizingPage` | `FCInputForm` + `FCBOMPanel` | direct JSX composition | WIRED | Both imported and rendered in side-by-side layout |
| `FCInputForm` | `useFCInputStore` | `setInput` calls on `form.watch` | WIRED | `useEffect` + debounce pattern propagates every field change |
| `fcInputStore` | `fcResultStore` | `useFCInputStore.subscribe(...)` | WIRED | Module-level subscription in `fcResultStore.ts` lines 19-27 |
| `fcResultStore` | `calculateFCBOM` | `calculateFCBOM(state.input)` | WIRED | Both subscribe and initial computation paths |
| `FCBOMPanel` | `useFCResultStore` | `useShallow` selector | WIRED | Lines 98-100 pull `bom` and `violations` |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| FC-09 | Mode selector at app level (mutually exclusive) | SATISFIED | `ModeSelector` in `TopBar`, ternary in `App.tsx` |
| FC-10 | FC-specific input form (server count, HBA ports, FC speed, **preferred generation**) | BLOCKED | `FCInputForm.tsx` has all fields except `preferredGeneration`; FC speed implicit via model, preferred generation absent entirely |
| FC-11 | FC BOM panel with switches, optics, ISL links, and POD license requirements | SATISFIED | `FCBOMPanel.tsx` renders all items; POD license is a visible labeled row |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/domain/catalog/brocade.ts` | 160 | `TODO: Verify exact maxPowerW against Broadcom X8-4 datasheet` | Info | Power spec unverified; does not affect BOM correctness |
| `src/domain/catalog/brocade.ts` | 182 | `TODO: Verify exact maxPowerW against Broadcom X8-8 datasheet` | Info | Same as above for X8-8 |
| `src/features/sizing/fc/FCBOMPanel.tsx` | 166 | `{bom.podLicensesRequired > 0 && ...}` — conditional POD row | Info | Correct behavior (directors have 0 POD licenses by design); not a stub |

No blockers. The two TODOs concern power wattage in catalog comments only — they do not affect any BOM computation path.

---

## Human Verification Required

### 1. Mode Switcher — Visual Toggle State

**Test:** Load the app, verify the TopBar shows "Ethernet" and "Fibre Channel" buttons. Click "Fibre Channel" — verify the active button highlights and the FC input form replaces the Ethernet form.
**Expected:** Active mode button has `variant="default"` styling (filled/highlighted), inactive has `variant="ghost"` (outline). Switching back to Ethernet restores the original form immediately.
**Why human:** Button variant rendering and transition behavior cannot be verified by grep.

### 2. POD License Row — Zero-License Models

**Test:** In FC mode, select switch model X7-4 (Gen 7 Director) and enter any server count. Check the BOM panel.
**Expected:** No POD license row appears (directors are fully port-licensed with no POD model). This is correct product behavior, not a missing feature.
**Why human:** The `podLicensesRequired > 0` conditional suppresses the row for directors; confirming the user experience requires visual inspection.

### 3. FC BOM Reactivity

**Test:** Change HBA ports per server from 2 to 4. Verify the BOM panel updates within ~200ms (debounce) without requiring a submit click.
**Expected:** Fabric switch counts, optics count, fan-in ratio all update live.
**Why human:** Reactive store subscription behavior requires runtime observation.

---

## Gaps Summary

One gap blocks full goal achievement: the **preferred generation** field specified in FC-10 and success criterion 2.

The `FCInputForm.tsx` lets users select an FC switch model from a flat list of 9 models (G710 through X8-8). The Brocade catalog records a `generation` field (7 or 8) on each model, but users cannot filter the model list by generation (Gen 7 = 64G, Gen 8 = 128G). The FC-10 requirement explicitly lists "preferred generation" as a distinct input alongside FC speed.

The fix is to add a `preferredGeneration` field (e.g., `'gen7' | 'gen8' | 'any'`) to:
1. `FCSizingInputSchema` — add optional/required enum field
2. `FCInputForm.tsx` — add a Select that filters `fcSwitchModels` based on the selected generation
3. `en/translation.json` (and other locale files) — add `fc.preferredGeneration` and `fc.preferredGenerationLabel` keys

This is a UI feature gap — it does not affect the engine's correctness (the engine already computes correctly given any model selection). The gap is in discoverability and the stated UX contract.

---

_Verified: 2026-03-18_
_Verifier: Claude (gsd-verifier)_
