---
phase: 11-switch-positioning-ethernet
plan: "01"
subsystem: domain
tags: [schemas, engine, tdd, positioning, violations]
dependency_graph:
  requires: []
  provides:
    - SizingInput.switchPositioning field (ToR/MoR/BoR)
    - NetworkBOM.switchPositioning and recommendedCableLengthM fields
    - ConstraintViolation.DAC_POSITIONING_INCOMPATIBLE discriminant
    - switchOverheadU(positioning) engine function
    - calculateBOM DAC_POSITIONING_INCOMPATIBLE violation logic
  affects:
    - src/domain/schemas/input.ts
    - src/domain/schemas/bom.ts
    - src/domain/engine/sizing.ts
    - All test fixtures using SizingInput or NetworkBOM types
tech_stack:
  added: []
  patterns:
    - Zod discriminated union extended with new violation member
    - Pure function with positioning-aware cable length map
    - TDD: 8 new test cases for POS-03/POS-04 requirements
key_files:
  created: []
  modified:
    - src/domain/schemas/input.ts
    - src/domain/schemas/bom.ts
    - src/domain/engine/sizing.ts
    - src/domain/engine/sizing.test.ts
    - src/domain/schemas/schemas.test.ts
    - src/store/inputStore.ts
    - src/store/resultStore.test.ts
    - src/store/store-isolation.test.ts
    - src/features/sizing/InputForm.test.tsx
    - src/features/sizing/BOMPanel.test.tsx
    - src/features/export/exportPdf.test.ts
    - src/features/export/exportCsv.test.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts
    - src/features/topology/utils/buildTopologyGraph.test.ts
key_decisions:
  - "switchOverheadU as inner function inside calculateBOM — avoids module-level pollution while remaining fully testable via engine outputs"
  - "DAC_POSITIONING_INCOMPATIBLE fires independently from DAC_DISTANCE_ADVISORY — they address different concerns (cable physics vs. deployment span)"
  - "All test fixtures across the codebase updated with switchPositioning: 'ToR' — Rule 3 auto-fix required by TypeScript strict mode"
metrics:
  duration_seconds: 395
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_modified: 14
requirements_satisfied:
  - POS-01
  - POS-03
  - POS-04
---

# Phase 11 Plan 01: Switch Positioning Domain Foundation Summary

**One-liner:** switchPositioning (ToR/MoR/BoR) domain layer — schema fields, switchOverheadU function, cable length map, and DAC_POSITIONING_INCOMPATIBLE violation with 8 new tests passing.

## What Was Built

Extended the Ethernet sizing domain with switch positioning mode support. This is the foundational domain layer that all downstream plans (store, UI, rack elevation) depend on.

### Schema Changes

**`src/domain/schemas/input.ts`**
- Added `switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR')` as last field in `SizingInputSchema`

**`src/domain/schemas/bom.ts`**
- Added `DAC_POSITIONING_INCOMPATIBLE` to `ConstraintViolationSchema` discriminated union with `positioning` (MoR|BoR) and `recommendedCableLengthM` fields
- Added `switchPositioning` and `recommendedCableLengthM` as required fields to `NetworkBOMSchema`

### Engine Changes

**`src/domain/engine/sizing.ts`**
- Replaced `SWITCH_U_PER_SERVER_RACK = 3` constant with `switchOverheadU(positioning)` function: ToR=3U, MoR=1U, BoR=1U
- Added `cableLengthMap`: ToR→3m, MoR→15m, BoR→30m
- Added `DAC_POSITIONING_INCOMPATIBLE` violation when `cableType === 'DAC' && switchPositioning !== 'ToR'`
- Extended return object with `switchPositioning` and `recommendedCableLengthM`

### Test Changes

**`src/domain/engine/sizing.test.ts`**
- `makeInput()` helper now includes `switchPositioning: 'ToR' as const`
- 8 new test cases in `POS-03 + POS-04: Switch Positioning` describe block:
  1. ToR returns cableLength=3, no DAC_POSITIONING_INCOMPATIBLE
  2. MoR returns cableLength=15
  3. BoR returns cableLength=30
  4. MoR+DAC fires violation with positioning=MoR, cableLength=15
  5. BoR+DAC fires violation with positioning=BoR, cableLength=30
  6. MoR+fiber does NOT fire violation
  7. MoR overhead=1U: 40 servers in 42U → no RACK_CAPACITY_EXCEEDED (41U)
  8. ToR overhead=3U: 40 servers in 42U → RACK_CAPACITY_EXCEEDED (43U)

## Verification Results

- `npx vitest run src/domain/engine/sizing.test.ts`: 76 tests PASS
- `npx vitest run` (full suite): 326 tests PASS, 0 FAIL
- `npx tsc --noEmit`: zero errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript errors in 11 downstream test/store files after schema change**
- **Found during:** Task 1 verification (tsc check)
- **Issue:** Adding required fields `switchPositioning` to `SizingInput` and `switchPositioning`/`recommendedCableLengthM` to `NetworkBOM` caused TS2741/TS2322 errors in all files with hardcoded typed objects
- **Fix:** Added `switchPositioning: 'ToR'` (and `recommendedCableLengthM: 3` for BOM fixtures) to all 11 affected test/store files
- **Files modified:** `inputStore.ts`, `resultStore.test.ts`, `store-isolation.test.ts`, `InputForm.test.tsx`, `BOMPanel.test.tsx`, `exportPdf.test.ts`, `exportCsv.test.ts`, `buildRackDevices.test.ts`, `buildTopologyGraph.test.ts`, `schemas.test.ts`
- **Commits:** 146eadc, b0dc95c

**2. [Rule 1 - Bug] schemas.test.ts NetworkBOMSchema fixtures missing new required fields**
- **Found during:** Task 2 test run (full suite)
- **Issue:** 2 test fixtures in `schemas.test.ts` did not include `switchPositioning`/`recommendedCableLengthM` in BOM or input objects, causing `safeParse` to return `success: false`
- **Fix:** Added missing fields to both fixtures
- **Commit:** b0dc95c

## Commits

| Hash | Message |
|------|---------|
| 146eadc | feat(11-01): extend schemas with switchPositioning field and new BOM fields |
| b0dc95c | feat(11-01): refactor engine with switchOverheadU, cable length map, DAC_POSITIONING_INCOMPATIBLE violation |

## Self-Check: PASSED

- src/domain/schemas/input.ts: FOUND
- src/domain/schemas/bom.ts: FOUND
- src/domain/engine/sizing.ts: FOUND
- Commit 146eadc: FOUND
- Commit b0dc95c: FOUND
