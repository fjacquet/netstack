---
phase: 05-engine-enhancements
plan: 01
subsystem: domain-engine
tags: [schema, engine, tdd, rack-array, breaking-change, zustand-migration]
dependency_graph:
  requires: []
  provides: [SizingInputSchema-racks-array, calculateBOM-racks-array, inputStore-v3]
  affects: [InputForm, BOMPanel, buildRackDevices, buildTopologyGraph, InputsPage, exportCsv, exportPdf, resultStore]
tech_stack:
  added: []
  patterns:
    - racks array input shape replaces scalar totalServers/serversPerRack
    - maxServersPerRack derived via Math.max spread for worst-case OOB/oversubscription
    - Zustand persist v3 with explicit v2→v3 merge migration
    - makeInput() test helper pattern for reduced test boilerplate
key_files:
  created: []
  modified:
    - src/domain/schemas/input.ts
    - src/domain/engine/sizing.ts
    - src/domain/engine/sizing.test.ts
    - src/domain/schemas/schemas.test.ts
    - src/store/inputStore.ts
    - src/store/resultStore.test.ts
    - src/features/sizing/BOMPanel.tsx
    - src/features/sizing/BOMPanel.test.tsx
    - src/features/sizing/InputForm.tsx
    - src/features/export/exportCsv.test.ts
    - src/features/export/exportPdf.test.ts
    - src/features/export/pdf/InputsPage.tsx
    - src/features/rack-elevation/utils/buildRackDevices.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts
    - src/features/topology/utils/buildTopologyGraph.ts
    - src/features/topology/utils/buildTopologyGraph.test.ts
decisions:
  - "racks array replaces totalServers/serversPerRack — foundational RACK-03 schema change enabling per-rack density"
  - "maxServersPerRack = Math.max(...racks.map(r => r.serverCount)) for OOB and oversubscription worst-case"
  - "InputForm bridges UI (totalServers+rackCount) to racks array via toRacksArray() helper — full per-rack UI is a future enhancement"
  - "Persist version bumped 2→3 with merge() migrating v2 scalar format to v3 racks array seamlessly"
  - "buildRackDevices uses racks[rackIndex].serverCount for per-rack accurate port utilization"
  - "buildTopologyGraph uses racks[ri]?.serverCount ?? 0 for per-rack node data"
metrics:
  duration_min: 9
  completed_date: "2026-03-17"
  tasks_completed: 2
  files_modified: 16
requirements:
  - RACK-03
---

# Phase 05 Plan 01: Racks Array Schema Migration Summary

SizingInput migrated from scalar `totalServers`/`serversPerRack` to a `racks: Array<{serverCount}>` shape; engine derives all totals from the array, all 159 tests pass, and Zustand store migrates v2 localStorage data to v3 format.

## What Was Built

### Task 1: SizingInput racks array schema + engine + all test migrations

**Schema change (src/domain/schemas/input.ts):**

- Removed `totalServers: z.number().int().min(1).max(10_000)`
- Removed `serversPerRack: z.number().int().min(1).max(48)`
- Added `racks: z.array(z.object({ serverCount: z.number().int().min(0).max(500) })).min(1).max(200)`
- Added exported `RackConfig` type and `RackConfigSchema`

**Engine change (src/domain/engine/sizing.ts):**

- `const racks = input.racks.length` — rack count from array length
- `const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0)` — server total from sum
- `const maxServersPerRack = Math.max(...input.racks.map(r => r.serverCount))` — worst-case rack
- OOB saturation uses `maxServersPerRack + 2` (worst-case rack determines port requirements)
- Oversubscription uses `maxServersPerRack * LEAF.downlinkSpeedGbE / uplinkBandwidth`

**Test migrations (TDD RED → GREEN):**

- All 30+ sizing engine tests migrated to `makeInput()` helper with racks array format
- Schema tests updated with new valid/invalid cases for racks array boundaries
- New variable-density tests: `[10, 20, 30]` racks, OOB worst-case, schema min/max validation

**Feature file updates (Rule 3 - blocking TypeScript errors):**

- `buildRackDevices.ts` — uses `bom.input.racks[rackIndex]?.serverCount ?? 0` for per-rack port utilization
- `buildTopologyGraph.ts` — uses `bom.input.racks[ri]?.serverCount ?? 0` per rack
- `BOMPanel.tsx` — computes `maxServersPerRack` for port utilization display
- `InputForm.tsx` — refactored to UI bridge: `totalServers` + `rackCount` → `toRacksArray()` → racks array
- `InputsPage.tsx` — displays rack count, total servers, max servers per rack in PDF

### Task 2: inputStore defaults and persist migration

- `DEFAULT_INPUT` updated: `{ racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }] }`
  (equivalent to old `{ totalServers: 48, serversPerRack: 16 }`)
- Persist `version` bumped from `2` to `3`
- `merge()` handles v2→v3 migration: detects `totalServers`+`serversPerRack` scalar format, converts to uniform racks array
- `merge()` handles v3 format: detects `racks` array, merges with defaults normally

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] buildTopologyGraph.ts used old scalar fields**

- **Found during:** Task 1 TypeScript check
- **Issue:** `bom.input.serversPerRack` and `bom.input.totalServers` no longer exist
- **Fix:** Replaced with `bom.input.racks[ri]?.serverCount ?? 0` for per-rack accuracy
- **Files modified:** `src/features/topology/utils/buildTopologyGraph.ts`
- **Commit:** f01b309

**2. [Rule 3 - Blocking] InputForm.tsx referenced old scalar schema fields**

- **Found during:** Task 1 TypeScript check
- **Issue:** Form used `name="totalServers"` and `name="serversPerRack"` which no longer exist in SizingInputSchema
- **Fix:** Created `FormValues` bridge interface with `totalServers`+`rackCount` UI fields mapped to racks array via `toRacksArray()` helper. Removed zodResolver dependency (uses custom FormValues type instead).
- **Files modified:** `src/features/sizing/InputForm.tsx`
- **Commit:** f01b309

**3. [Rule 3 - Blocking] BOMPanel.tsx, InputsPage.tsx, buildRackDevices.ts used old scalar fields**

- **Found during:** Task 1 TypeScript check
- **Issue:** All three files accessed `bom.input.serversPerRack` which no longer exists
- **Fix:** Each uses `maxServersPerRack` or `racks[rackIndex].serverCount` derivation as appropriate
- **Files modified:** `src/features/sizing/BOMPanel.tsx`, `src/features/export/pdf/InputsPage.tsx`, `src/features/rack-elevation/utils/buildRackDevices.ts`
- **Commit:** f01b309

**Scope note:** InputForm received a significant simplification as a side effect — it no longer uses `zodResolver(SizingInputSchema)` directly because the form values don't match the schema (UI uses totalServers+rackCount, schema expects racks array). This is a clean separation that avoids a misleading validation mismatch. Full per-rack UI input is deferred to a future plan.

## Verification Results

- `rtk vitest run`: PASS (159) FAIL (0)
- `rtk tsc`: TypeScript compilation completed (0 errors)
- `grep -c "racks.*z.array" src/domain/schemas/input.ts`: 1 (racks array in schema)
- `grep -c "totalServers.*z.number" src/domain/schemas/input.ts`: 0 (scalar removed)
- `grep -c "input.racks" src/domain/engine/sizing.ts`: multiple (racks array used throughout)

## Self-Check: PASSED

All files exist on disk. Both task commits verified in git history.

- f01b309: feat(05-01): evolve SizingInput to racks array
- 7a192b0: feat(05-01): update inputStore defaults and persist migration
