---
phase: 22-existing-infrastructure-toggle
verified: 2026-03-19T05:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 22: Existing Infrastructure Toggle Verification Report

**Phase Goal:** Users can indicate that core switches (3-tier) or spine switches (Clos) are already deployed, and the BOM adjusts accordingly
**Verified:** 2026-03-19T05:00:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When existingSpinesDeployed is true in Clos topology, BOM spineSwitches is 0 but leafSpineCables unchanged | VERIFIED | resultStore.ts:59-60 zeros spineSwitches; leafSpineCables never touched; resultStore.test.ts lines 106-135 confirm behavior |
| 2 | When existingCoreDeployed is true in Three-Tier topology, BOM coreSwitches is 0 but aggrCoreCables unchanged | VERIFIED | resultStore.ts:51-52 zeros coreSwitches; aggrCoreCables never touched; resultStore.test.ts lines 137-180 confirm behavior |
| 3 | Oversubscription ratios are identical whether existing infra toggle is on or off | VERIFIED | Engine computes full fabric first (sizing.ts/three-tier-sizing.ts unchanged -- 0 references to brownfield fields); post-processing only zeros switch counts; tests verify ratios unchanged |
| 4 | Cable BOM always includes all inter-tier cables regardless of existing infra toggle | VERIFIED | Post-processing in resultStore only modifies spineSwitches/coreSwitches; cable fields never referenced in post-processing block; tests verify cable counts unchanged |
| 5 | User sees "Spines already deployed" toggle when Clos topology is selected | VERIFIED | InputForm.tsx:495-516 renders checkbox with data-testid="existing-spines-toggle" inside `currentTopology === 'leaf-spine'` block; InputForm.test.tsx:205-208 confirms rendering |
| 6 | User sees "Core switches already deployed" toggle when Three-Tier topology is selected | VERIFIED | InputForm.tsx:645-666 renders checkbox with data-testid="existing-core-toggle" inside `currentTopology === 'three-tier'` block; InputForm.test.tsx:211-214 confirms rendering |
| 7 | Toggle is NOT visible when the other topology is selected | VERIFIED | InputForm.test.tsx:217-220 confirms existing-spines-toggle is null in three-tier; InputForm.test.tsx:223-226 confirms existing-core-toggle is null in leaf-spine |
| 8 | BOM panel shows "(existing)" label next to zeroed-out switch row when toggle is on | VERIFIED | BOMPanel.tsx:601-608 renders existing-spines-label with infra.existingLabel; BOMPanel.tsx:267-274 renders existing-core-label; BOMPanel.test.tsx:324-335 confirms label visibility |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/schemas/input.ts` | existingSpinesDeployed + existingCoreDeployed boolean fields | VERIFIED | Lines 72-74: both fields with z.boolean().default(false) |
| `src/domain/schemas/three-tier-input.ts` | existingCoreDeployed boolean field | VERIFIED | Line 66: existingCoreDeployed z.boolean().default(false) |
| `src/store/resultStore.ts` | Post-processing zeros switch counts for existing infra | VERIFIED | Lines 49-63: conditional zeroing of spineSwitches and coreSwitches |
| `src/store/inputStore.ts` | Version 8 store with brownfield defaults | VERIFIED | Line 92: version: 8; lines 43-45: both defaults false |
| `src/features/sizing/InputForm.tsx` | Topology-conditional existing infra toggles | VERIFIED | Lines 495-516 (Clos toggle), 645-666 (Three-Tier toggle), form values + reset handler updated |
| `src/features/sizing/BOMPanel.tsx` | "(existing)" label on zeroed switch rows | VERIFIED | Lines 601-608 (spine label), 267-274 (core label), opacity-60 styling on muted rows |
| `src/i18n/locales/en/translation.json` | infra section with 5 keys | VERIFIED | existingSpinesToggle, existingSpinesHelp, existingCoreToggle, existingCoreHelp, existingLabel |
| `src/i18n/locales/fr/translation.json` | infra section with 5 keys | VERIFIED | French translations present |
| `src/i18n/locales/de/translation.json` | infra section with 5 keys | VERIFIED | German translations present |
| `src/i18n/locales/it/translation.json` | infra section with 5 keys | VERIFIED | Italian translations present |
| `src/domain/schemas/converged-input.ts` | Brownfield fields (deviation fix) | VERIFIED | Lines 62-64: both fields present |
| `src/domain/engine/converged-sizing.ts` | Passthrough in mappers (deviation fix) | VERIFIED | Lines 56-57 (toEthernetInput), line 83 (toThreeTierInput) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| InputForm.tsx | inputStore.ts | form.watch subscription flows existingSpinesDeployed via validRest to setInput | WIRED | InputForm lines 95-96 set defaults, line 498 binds FormField, rest spread at line 181-186 sends to setInput |
| BOMPanel.tsx | inputStore.ts | useInputStore selector reads existingSpinesDeployed and existingCoreDeployed | WIRED | BOMPanel lines 417-423: explicit selector reads both brownfield fields |
| resultStore.ts | sizing.ts (engine) | calculateBOM called first, then post-processing zeros spineSwitches | WIRED | Lines 56-60: bom = calculateBOM(input); if existingSpinesDeployed, bom.spineSwitches = 0 |
| resultStore.ts | three-tier-sizing.ts (engine) | calculateThreeTierBOM called first, then post-processing zeros coreSwitches | WIRED | Lines 47-53: ttBom = calculateThreeTierBOM(ttInput); if existingCoreDeployed, ttBom.coreSwitches = 0 |
| BOMPanel.tsx | ThreeTierBOMContent | existingCoreDeployed passed as prop | WIRED | Line 440: prop passed; Line 212: prop received in function signature |
| toThreeTierInput mapper | ThreeTierSizingInput | existingCoreDeployed mapped through | WIRED | Line 37: existingCoreDeployed: input.existingCoreDeployed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 22-01, 22-02 | 3-tier mode has "Core switches already deployed" toggle -- BOM excludes core switches when enabled | SATISFIED | Schema field (three-tier-input.ts:66), post-processing (resultStore.ts:51-52), UI toggle (InputForm.tsx:645-666), BOM label (BOMPanel.tsx:267-274) |
| INFRA-02 | 22-01, 22-02 | Clos mode has "Spines already deployed" toggle -- BOM excludes spine switches when enabled | SATISFIED | Schema field (input.ts:72), post-processing (resultStore.ts:59-60), UI toggle (InputForm.tsx:495-516), BOM label (BOMPanel.tsx:601-608) |
| INFRA-03 | 22-01 | Cable BOM still includes inter-tier cables to existing switches | SATISFIED | Post-processing only zeros spineSwitches/coreSwitches; cable fields untouched; 7 tests in resultStore.test.ts verify cable counts unchanged |
| INFRA-04 | 22-01 | Oversubscription ratios calculated against full fabric (existing + new) | SATISFIED | Engine files (sizing.ts, three-tier-sizing.ts) have 0 references to brownfield fields; engine computes full fabric; post-processing only modifies switch purchase quantities; tests verify ratios unchanged |

**Orphaned Requirements:** None -- all 4 INFRA requirements mapped to plans and verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO, FIXME, HACK, placeholder, or stub patterns found in any modified file |

### Build and Test Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run` | 548/548 tests pass, 0 failures |
| Git commits | 4 commits verified: f370680, f2eabb0, d9b4559, 9d13742 |

### Human Verification Required

### 1. Toggle Visual Appearance

**Test:** Open the app, select Ethernet mode with Clos topology. Verify the "Spines already deployed" checkbox appears below the Spine Switch Model selector. Switch to Three-Tier topology. Verify "Core switches already deployed" appears below the Core Switch Model selector.
**Expected:** Checkbox with label and help text, bordered card-style layout, visible only for the correct topology.
**Why human:** Visual layout, checkbox alignment, and border styling cannot be verified programmatically.

### 2. BOM Panel "(existing)" Label

**Test:** Enable the "Spines already deployed" toggle in Clos mode. Check the BOM panel spine row.
**Expected:** Spine switch quantity shows 0 with "(existing)" label in muted text, row has reduced opacity (opacity-60). Cable quantities remain unchanged.
**Why human:** Visual opacity effect and label positioning require visual inspection.

### 3. Reset Button Behavior

**Test:** Enable a brownfield toggle, then click the Reset button at the bottom of the form.
**Expected:** Toggle resets to unchecked, BOM panel shows normal spine/core switch counts without "(existing)" label.
**Why human:** End-to-end UI flow involving form reset and BOM recomputation.

### Gaps Summary

No gaps found. All 8 observable truths verified. All 4 INFRA requirements satisfied. All artifacts exist, are substantive (no stubs), and are properly wired. TypeScript compiles cleanly and all 548 tests pass. The engines remain pure functions computing full fabric; brownfield post-processing is correctly isolated in resultStore. i18n translations are present in all 4 locales (EN, FR, DE, IT).

---

_Verified: 2026-03-19T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
