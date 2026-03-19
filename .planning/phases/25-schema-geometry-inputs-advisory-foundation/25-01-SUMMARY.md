---
phase: 25
plan: 01
subsystem: domain-schemas
tags: [geometry, advisory, catalog, migration, zod, typescript]
dependency_graph:
  requires: []
  provides:
    - geometry fields in SizingInputSchema (rackPitchMm, racksAdjacent, patchPanelDistanceM)
    - geometry fields in ThreeTierSizingInputSchema
    - geometry fields in ConvergedSizingInputSchema
    - AdvisorySchema discriminated union (PATCH_PANEL_RECOMMENDED)
    - advisories[] on NetworkBOMSchema and ThreeTierBOMSchema
    - computedDistanceM optional field on DAC_DISTANCE_ADVISORY variants
    - maxDistanceBySpeed on CABLE_CATALOG.DAC (25G=3m, 100G=5m)
    - DEFAULT_ETH_INPUT, DEFAULT_THREE_TIER_INPUT, DEFAULT_CONVERGED_INPUT in defaults.ts
    - inputStore v9 with geometry field persistence
    - toThreeTierInput passes geometry fields through
  affects:
    - src/domain/engine/sizing.ts (advisories: [] in return)
    - src/domain/engine/three-tier-sizing.ts (advisories: [] in return)
    - src/domain/engine/converged-sizing.ts (geometry fields passed through adapters)
    - all test fixtures using SizingInput or NetworkBOM/ThreeTierBOM types
tech_stack:
  added: []
  patterns:
    - Zod discriminated union for AdvisorySchema separate from ConstraintViolationSchema
    - Domain-layer defaults.ts as single source of truth for default input values
    - Store version migration pattern (v8 to v9) with spread-based field backfill
key_files:
  created:
    - src/domain/schemas/defaults.ts
  modified:
    - src/domain/schemas/input.ts
    - src/domain/schemas/bom.ts
    - src/domain/schemas/three-tier-input.ts
    - src/domain/schemas/three-tier-bom.ts
    - src/domain/schemas/converged-input.ts
    - src/domain/catalog/types.ts
    - src/domain/catalog/cables.ts
    - src/store/inputStore.ts
    - src/store/resultStore.ts
    - src/store/convergedInputStore.ts
    - src/domain/engine/sizing.ts
    - src/domain/engine/three-tier-sizing.ts
    - src/domain/engine/converged-sizing.ts
decisions:
  - advisories[] is a separate field from violations[] on BOM schemas — amber informational cards, not red blocking violations
  - DAC maxDistanceM changed from 5m to 3m (conservative 25G IEEE 802.3by limit); per-speed distances in maxDistanceBySpeed
  - Domain-layer defaults.ts eliminates duplicate DEFAULT_INPUT definitions across store and test files
  - inputStore v9 migration uses { ...DEFAULT_INPUT, ...oldInput } spread to backfill geometry fields automatically
metrics:
  duration: "~10 minutes"
  completed: "2026-03-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 24
---

# Phase 25 Plan 01: Schema, Geometry Inputs & Advisory Foundation Summary

**One-liner:** Zod schema additions for rack geometry (pitch, adjacency, patch panel distance), AdvisorySchema discriminated union with PATCH_PANEL_RECOMMENDED code, DAC catalog fix (25G=3m per IEEE 802.3by), and inputStore migration to v9.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Schema additions — geometry fields, AdvisorySchema, DAC catalog fix, defaults extraction | b19eef6 | schemas/input.ts, schemas/bom.ts, schemas/three-tier-bom.ts, catalog/cables.ts, schemas/defaults.ts |
| 2 | Store migration v8 to v9 and resultStore adapter update | b5a4e5b | store/inputStore.ts, store/resultStore.ts, store/convergedInputStore.ts |

## What Was Built

### Schema Additions

**Geometry fields** added to all three input schemas (SizingInputSchema, ThreeTierSizingInputSchema, ConvergedSizingInputSchema):
- `rackPitchMm`: integer 100–2000 mm, default 600 (centre-to-centre rack spacing)
- `racksAdjacent`: boolean, default true (all racks physically adjacent vs. separated)
- `patchPanelDistanceM`: number 0–100 m, default 1 (distance to patch panel when not adjacent)

**AdvisorySchema** — new discriminated union in `bom.ts`, separate from ConstraintViolationSchema:
- `PATCH_PANEL_RECOMMENDED` code with `computedDistanceM` and `dacLimitM` fields
- Amber-level informational advisory (non-blocking, unlike red violations)

**BOM schema updates:**
- `advisories: Advisory[]` added to NetworkBOMSchema and ThreeTierBOMSchema (default [])
- `computedDistanceM?: number` added to DAC_DISTANCE_ADVISORY violation variants in both schemas

### Catalog Fix (DAC-03)

`CABLE_CATALOG.DAC` corrected per IEEE standards:
- `maxDistanceM: 3` (was 5) — conservative 25G SFP28 limit (IEEE 802.3by)
- `maxDistanceBySpeed: { 25: 3, 100: 5 }` — per-speed limits (100G QSFP28 per IEEE 802.3bj)

### Defaults Extraction

New `src/domain/schemas/defaults.ts` provides:
- `DEFAULT_ETH_INPUT` — canonical Ethernet (Clos) default with all geometry fields
- `DEFAULT_THREE_TIER_INPUT` — canonical Three-Tier default
- `DEFAULT_CONVERGED_INPUT` — canonical Converged default

### Store Migration v9

- `inputStore` bumped from version 8 to 9; imports `DEFAULT_ETH_INPUT` from domain layer
- Migration comment documents v8→v9 geometry field additions
- `toThreeTierInput` in `resultStore.ts` passes all three geometry fields through
- `convergedInputStore` `DEFAULT_CONVERGED_INPUT` includes geometry fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Engine return values missing advisories field**
- **Found during:** Task 1 — TypeScript error after adding `advisories` to BOM schemas
- **Issue:** `sizing.ts` and `three-tier-sizing.ts` engines returned objects without `advisories` field, causing TS2741 errors
- **Fix:** Added `advisories: []` to both engine return values
- **Files modified:** `src/domain/engine/sizing.ts`, `src/domain/engine/three-tier-sizing.ts`
- **Commit:** b19eef6

**2. [Rule 1 - Bug] converged-sizing.ts adapters missing geometry fields**
- **Found during:** Task 1 — TypeScript errors in converged engine adapter functions
- **Issue:** `toEthernetInput` and `toThreeTierInput` in `converged-sizing.ts` did not pass geometry fields
- **Fix:** Added geometry field pass-through in both adapter functions
- **Files modified:** `src/domain/engine/converged-sizing.ts`
- **Commit:** b19eef6

**3. [Rule 1 - Bug] convergedInputStore missing geometry fields in DEFAULT_CONVERGED_INPUT**
- **Found during:** Task 1 — TypeScript errors in `convergedInputStore.ts`
- **Issue:** `convergedInputStore` DEFAULT_CONVERGED_INPUT inline object missing geometry fields
- **Fix:** Added `rackPitchMm: 600, racksAdjacent: true, patchPanelDistanceM: 1` to `convergedInputStore.ts`
- **Files modified:** `src/store/convergedInputStore.ts`
- **Commit:** b5a4e5b

**4. [Rule 1 - Bug] 26 test fixture objects missing geometry or advisories fields**
- **Found during:** Task 1 — 32 TypeScript errors after schema additions
- **Issue:** All test files using hard-coded `SizingInput`, `NetworkBOM`, or `ThreeTierBOM` objects were missing the new required fields
- **Fix:** Added geometry fields to all `SizingInput` fixtures and `advisories: []` to all BOM fixtures across 15 test files
- **Files modified:** All `*.test.ts(x)` files listed in key_files.modified above
- **Commit:** b19eef6

## Verification Results

- Full test suite: 569 PASS, 0 FAIL
- TypeScript: 0 errors
- `grep -c "rackPitchMm" src/domain/schemas/input.ts` returns 1
- `grep -c "rackPitchMm" src/domain/schemas/three-tier-input.ts` returns 1
- `grep -c "rackPitchMm" src/domain/schemas/converged-input.ts` returns 1
- `grep "AdvisorySchema" src/domain/schemas/bom.ts` matches definition + type export
- `grep "PATCH_PANEL_RECOMMENDED" src/domain/schemas/bom.ts` matches 1 line
- `grep "advisories" src/domain/schemas/bom.ts` matches field definition
- `grep "advisories" src/domain/schemas/three-tier-bom.ts` matches field definition
- `grep "maxDistanceBySpeed" src/domain/catalog/cables.ts` confirms DAC catalog fix
- `grep "maxDistanceM: 3" src/domain/catalog/cables.ts` confirms conservative value
- `defaults.ts` exists with DEFAULT_ETH_INPUT, DEFAULT_THREE_TIER_INPUT, DEFAULT_CONVERGED_INPUT
- `grep "version: 9" src/store/inputStore.ts` returns 1
- `grep "DEFAULT_ETH_INPUT" src/store/inputStore.ts` returns 2 (import + assignment)
- `grep "v8 to v9" src/store/inputStore.ts` returns 1 (migration comment)
- `grep "rackPitchMm" src/store/resultStore.ts` returns 1

## Self-Check: PASSED

All committed files verified to exist and contain expected content. Test suite and type check pass cleanly.
