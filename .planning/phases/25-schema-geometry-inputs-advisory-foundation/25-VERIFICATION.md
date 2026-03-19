---
phase: 25-schema-geometry-inputs-advisory-foundation
verified: 2026-03-19T00:00:00Z
status: passed
score: 9/9 must-haves verified
gaps: []
---

# Phase 25: Schema, Geometry Inputs & Advisory Foundation — Verification Report

**Phase Goal:** New input fields and output types are defined and stored; existing data migrates cleanly; DAC catalog is corrected
**Verified:** 2026-03-19
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SizingInputSchema, ThreeTierSizingInputSchema, and ConvergedSizingInputSchema all accept rackPitchMm, racksAdjacent, patchPanelDistanceM with correct defaults | VERIFIED | All three schemas contain the three geometry fields with `.default(600)`, `.default(true)`, `.default(1)` |
| 2 | NetworkBOMSchema and ThreeTierBOMSchema both contain an advisories[] array of AdvisorySchema | VERIFIED | `advisories: z.array(AdvisorySchema).default([])` present in both bom.ts and three-tier-bom.ts |
| 3 | CABLE_CATALOG.DAC has maxDistanceBySpeed with 25G=3m and 100G=5m, and maxDistanceM=3 for backwards compat | VERIFIED | cables.ts: `maxDistanceM: 3`, `maxDistanceBySpeed: { 25: 3, 100: 5 }` |
| 4 | DAC_DISTANCE_ADVISORY variant in both ConstraintViolationSchema and ThreeTierConstraintViolationSchema has optional computedDistanceM field | VERIFIED | Both schemas have `computedDistanceM: z.number().optional()` on DAC_DISTANCE_ADVISORY variant |
| 5 | inputStore is version 9 with all three geometry fields in DEFAULT_INPUT | VERIFIED | `version: 9` confirmed; DEFAULT_INPUT sourced from DEFAULT_ETH_INPUT which contains all three geometry fields |
| 6 | toThreeTierInput passes geometry fields through to ThreeTierSizingInput | VERIFIED | resultStore.ts lines 39-41: `rackPitchMm: input.rackPitchMm`, `racksAdjacent: input.racksAdjacent`, `patchPanelDistanceM: input.patchPanelDistanceM` |
| 7 | Loading a profile saved before v9 (missing geometry fields) fills in rackPitchMm=600, racksAdjacent=true, patchPanelDistanceM=1 | VERIFIED | normalizeEthInputState spreads DEFAULT_ETH_INPUT under saved state; TDD tests confirm this behavior |
| 8 | Loading a profile saved with v9 fields preserves those values unchanged | VERIFIED | Spread pattern `{ ...DEFAULT, ...saved }` preserves saved values; tests confirm |
| 9 | profileService.ts does NOT import from src/store/ (domain layer purity) | VERIFIED | Zero store imports found in profileService.ts; only imports from `'../schemas/defaults'` and `'../schemas/profile'` |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/schemas/defaults.ts` | DEFAULT_ETH_INPUT, DEFAULT_THREE_TIER_INPUT, DEFAULT_CONVERGED_INPUT constants | VERIFIED | All three exports present with geometry fields (rackPitchMm: 600, racksAdjacent: true, patchPanelDistanceM: 1) |
| `src/domain/schemas/bom.ts` | AdvisorySchema discriminated union and advisories[] on NetworkBOMSchema | VERIFIED | AdvisorySchema with PATCH_PANEL_RECOMMENDED code, Advisory type, advisories[] field on NetworkBOMSchema |
| `src/domain/schemas/three-tier-bom.ts` | advisories[] on ThreeTierBOMSchema | VERIFIED | `advisories: z.array(AdvisorySchema).default([])` present; imports AdvisorySchema from bom.ts |
| `src/domain/schemas/input.ts` | rackPitchMm, racksAdjacent, patchPanelDistanceM fields | VERIFIED | All three geometry fields with correct types, bounds, and defaults |
| `src/domain/schemas/three-tier-input.ts` | rackPitchMm, racksAdjacent, patchPanelDistanceM fields | VERIFIED | All three geometry fields with correct types, bounds, and defaults |
| `src/domain/schemas/converged-input.ts` | rackPitchMm, racksAdjacent, patchPanelDistanceM fields | VERIFIED | All three geometry fields placed between brownfield toggles and FC fields |
| `src/domain/catalog/types.ts` | maxDistanceBySpeed optional field on CableSpec | VERIFIED | `maxDistanceBySpeed?: Record<number, number>` added to CableSpec interface |
| `src/domain/catalog/cables.ts` | DAC entry with maxDistanceBySpeed and maxDistanceM=3 | VERIFIED | DAC entry corrected per IEEE 802.3by/802.3bj |
| `src/store/inputStore.ts` | version 9, imports DEFAULT_ETH_INPUT, v8-to-v9 migration comment | VERIFIED | version: 9; import from '@/domain/schemas/defaults'; migration comment documents v8→v9 |
| `src/store/resultStore.ts` | toThreeTierInput passes all three geometry fields | VERIFIED | All three geometry fields explicitly mapped in toThreeTierInput |
| `src/domain/profiles/profileService.ts` | normalizeEthInputState, normalizeFCInputState, normalizeConvergedInputState | VERIFIED | All three functions exported; implemented with correct spread pattern |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/store/inputStore.ts` | `src/domain/schemas/defaults.ts` | import DEFAULT_ETH_INPUT | WIRED | Line 5: `import { DEFAULT_ETH_INPUT } from '@/domain/schemas/defaults'`; Line 17: `const DEFAULT_INPUT: SizingInput = DEFAULT_ETH_INPUT` |
| `src/store/resultStore.ts` | `src/domain/schemas/three-tier-input.ts` | toThreeTierInput passes rackPitchMm | WIRED | Lines 39-41 pass all three geometry fields explicitly |
| `src/domain/profiles/profileService.ts` | `src/domain/schemas/defaults.ts` | import DEFAULT_ETH_INPUT, DEFAULT_CONVERGED_INPUT | WIRED | Line 15: `import { DEFAULT_ETH_INPUT, DEFAULT_CONVERGED_INPUT } from '../schemas/defaults'` |
| `src/domain/schemas/three-tier-bom.ts` | `src/domain/schemas/bom.ts` | AdvisorySchema shared import | WIRED | Line 14: `import { AdvisorySchema } from './bom'`; used in advisories[] field |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PHYS-01 | 25-01 | New advisories[] output array distinct from violations[] | SATISFIED | AdvisorySchema with PATCH_PANEL_RECOMMENDED code; advisories[] on NetworkBOMSchema and ThreeTierBOMSchema |
| PHYS-02 | 25-01 | inputStore bumped to version 9 with automatic migration | SATISFIED | version: 9 in inputStore; spread-based merge auto-backfills new fields; migration comment documents v8→v9 |
| PHYS-03 | 25-02 | Profile load normalises against current schema | SATISFIED | Three normalize functions in profileService.ts; TDD confirms old profiles get geometry defaults filled |
| DAC-03 | 25-01 | Fix CABLE_CATALOG.DAC.maxDistanceM to reflect speed-specific limits | SATISFIED | maxDistanceM corrected to 3 (25G IEEE 802.3by); maxDistanceBySpeed: { 25: 3, 100: 5 } added |
| RACK-01 | 25-01 | User can configure rack pitch in mm (default 600mm) | SATISFIED | rackPitchMm: z.number().int().min(100).max(2000).default(600) in all three input schemas |
| RACK-02 | 25-01 | User can toggle "all racks adjacent" (default true) | SATISFIED | racksAdjacent: z.boolean().default(true) in all three input schemas |
| RACK-03 | 25-01 | When non-adjacent, user inputs rack-to-patch-panel distance | SATISFIED | patchPanelDistanceM: z.number().min(0).max(100).default(1) in all three input schemas |

---

## Anti-Patterns Found

None. No TODO/FIXME/HACK/PLACEHOLDER markers found in any key files. No stub implementations detected. All return values in key paths are substantive.

---

## Test Suite Results

- **575 tests PASS, 0 FAIL** (verified by running `rtk vitest run`)
- **TypeScript:** 0 errors (verified by running `rtk tsc --noEmit`)

---

## Human Verification Required

### 1. localStorage v8 Snapshot Migration

**Test:** Open browser devtools. Set `localStorage.netstack-input` to a JSON snapshot that does NOT contain rackPitchMm/racksAdjacent/patchPanelDistanceM fields (an old v8 format). Reload the app.
**Expected:** No console errors; rack pitch defaults to 600mm; application operates normally.
**Why human:** Requires seeding real browser localStorage state — not testable in jsdom.

### 2. patchPanelDistanceM Conditional Visibility

**Test:** In the input form UI, find the "All racks adjacent" toggle. Set it to false.
**Expected:** A "Rack-to-patch-panel distance" field appears in the form.
**Why human:** DOM conditional rendering behaviour requires a running browser.

---

## Gaps Summary

No gaps. All 9 observable truths verified, all 11 artifacts confirmed substantive and wired, all 7 requirement IDs satisfied. Two items require human verification in a browser but do not indicate code defects.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_
