---
phase: 05-engine-enhancements
plan: 02
subsystem: domain-engine
tags: [tdd, engine, schema, port-multipliers, active-uplinks, oversubscription]
dependency_graph:
  requires:
    - 05-01  # racks array schema migration
  provides:
    - portsPerServerFrontend field in SizingInput
    - portsPerServerBackend field in SizingInput
    - activeUplinksPerLeaf field in SizingInput
    - PORT-03 cable scaling formulas
    - UPLN-02 uplink/oversubscription formulas
  affects:
    - src/domain/schemas/input.ts
    - src/domain/engine/sizing.ts
    - src/store/inputStore.ts
tech_stack:
  added: []
  patterns:
    - Zod .default() for optional-with-default fields (backward-compatible schema evolution)
    - Runtime clamp pattern: min(userValue, modelMax) before using in formulas
    - TDD RED-GREEN cycle with makeInput helper pattern for test fixtures
key_files:
  created: []
  modified:
    - src/domain/schemas/input.ts
    - src/domain/engine/sizing.ts
    - src/domain/engine/sizing.test.ts
    - src/domain/schemas/schemas.test.ts
    - src/store/inputStore.ts
    - src/features/sizing/BOMPanel.test.tsx
    - src/features/topology/utils/buildTopologyGraph.test.ts
    - src/features/export/exportCsv.test.ts
    - src/features/export/exportPdf.test.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts
    - src/store/resultStore.test.ts
decisions:
  - activeUplinksPerLeaf uses effectiveUplinks (not spineSwitches) for oversubscription — ratio reflects actual configured uplinks, not spine topology
  - Zod .default() for new fields ensures backward compatibility without conditional checks in engine
  - Runtime clamp pattern keeps schema max at 8 (supports all models) while engine enforces model-specific limits
  - Oversubscription formula changed from spineSwitches-based to effectiveUplinks-based — semantically more accurate
  - Persist version bumped 3 to 4 with existing merge() spread pattern handling missing fields automatically
metrics:
  duration_minutes: 19
  completed_date: "2026-03-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 11
  tests_added: 21
  tests_total: 189
---

# Phase 05 Plan 02: Server Port Multipliers and Active Uplinks Summary

**One-liner:** PORT-03 cable scaling and UPLN-02 active uplink control with Zod defaults and runtime model clamp.

## What Was Built

Two new configurable fields added to `SizingInput` with corresponding engine formula updates:

**PORT-03 — Server port multipliers:**
- `portsPerServerFrontend` (0-8, default 1): scales `serverLeafCables = totalServers × portsPerServerFrontend`
- `portsPerServerBackend` (0-8, default 1): scales `serverOobCables = totalServers × portsPerServerBackend + leafSwitches`
- SFP28 transceiver count scales automatically with `serverLeafCables`

**UPLN-02 — Active uplinks per leaf:**
- `activeUplinksPerLeaf` (1-8, default 4): user-configured uplink count per leaf switch
- Runtime clamp: `effectiveUplinks = min(activeUplinksPerLeaf, LEAF.uplinkPorts)` prevents exceeding model physical ports
- `linksPerLeaf = min(spineSwitches, effectiveUplinks)` replaces previous `min(spineSwitches, LEAF.uplinkPorts)`
- `uplinkBandwidth = effectiveUplinks × uplinkSpeedGbE` — oversubscription now reflects configured uplinks
- QSFP28 transceiver count scales with `leafSpineCables` (unchanged formula, updated inputs)

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add port multiplier fields and update cable formulas | aadd3fa | input.ts, sizing.ts, sizing.test.ts, schemas.test.ts, inputStore.ts + 6 test fixtures |
| 2 | Add activeUplinksPerLeaf field and update uplink/oversubscription formulas | f693c3f | input.ts, sizing.ts, sizing.test.ts, schemas.test.ts, inputStore.ts + 6 test fixtures |

## Decisions Made

1. **effectiveUplinks-based oversubscription**: Changed from `spineSwitches × uplinkSpeed` to `effectiveUplinks × uplinkSpeed`. The ratio now reflects actual active uplinks configured by the user, not the number of spines in the topology. This is semantically more accurate — a 4-uplink leaf with 2 spines has 4× bandwidth available per leaf if all uplinks are active.

2. **Zod `.default()` for backward compatibility**: New fields use Zod `.default()` so omitting them from `safeParse()` input produces valid output with default values. The TypeScript output type has these as required, but Zod fills them in at parse time.

3. **Runtime clamp keeps schema flexible**: Schema max of 8 covers all current and near-future Dell leaf models (S5212F-ON max 3, S5248F-ON max 4). The engine clamps to the selected model's actual `uplinkPorts` at runtime — no schema-level per-model validation needed.

4. **Persist version 3→4**: The existing `{ ...DEFAULT_INPUT, ...oldInput }` merge spread pattern automatically handles migration — any persisted v3 object missing the three new fields gets the defaults filled in from `DEFAULT_INPUT`.

5. **makeInput() helper updated**: The test helper now includes all three new fields with their defaults, ensuring all existing tests remain backward compatible without modifications.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Fields] All external test fixtures missing new required fields**
- **Found during:** Task 1 GREEN phase (TypeScript compilation)
- **Issue:** Six test files (`BOMPanel.test.tsx`, `buildTopologyGraph.test.ts`, `exportCsv.test.ts`, `exportPdf.test.ts`, `buildRackDevices.test.ts`, `resultStore.test.ts`) had inline `SizingInput` objects missing the new `portsPerServerFrontend` and `portsPerServerBackend` fields (Task 1) and `activeUplinksPerLeaf` (Task 2)
- **Fix:** Added all three new fields with their default values to every inline input fixture in each affected test file
- **Files modified:** All 6 test files above
- **Commits:** aadd3fa (Task 1), f693c3f (Task 2)

**2. [Rule 1 - Bug] Oversubscription test expectations used old spineSwitches formula**
- **Found during:** Task 2 GREEN phase
- **Issue:** Three existing tests in `sizing.test.ts` expected oversubscription ratios calculated with `spineSwitches × uplinkSpeed` (old formula). With the new `effectiveUplinks × uplinkSpeed` formula and default `activeUplinksPerLeaf: 4`, the denominator changed from `2 × 100 = 200` to `4 × 100 = 400`, halving the ratios.
- **Fix:** Updated test comments and expected values to reflect the new semantically-correct formula. Example: "48 servers at 25G with 2 spines: 6.0" → "48 servers at 25G with S5248F-ON (4 uplinks): 3.0"
- **Files modified:** `src/domain/engine/sizing.test.ts`
- **Commit:** f693c3f

## Test Coverage Added

| Test Block | Tests | Requirement |
|-----------|-------|-------------|
| portsPerServerFrontend validation | 5 | PORT-03 |
| portsPerServerBackend validation | 5 | PORT-03 |
| activeUplinksPerLeaf validation | 5 | UPLN-02 |
| PORT-03: Server Port Multipliers | 7 | PORT-03 |
| UPLN-02: Active Uplinks Per Leaf | 8 | UPLN-02 |

**Total new tests: 30** (189 total suite, 159 pre-existing)

## Verification

- `npx vitest run`: 189 PASS, 0 FAIL
- `npx tsc --noEmit`: 0 errors
- `grep portsPerServerFrontend src/domain/engine/sizing.ts`: present (1 match)
- `grep activeUplinksPerLeaf src/domain/engine/sizing.ts`: present (2 matches)
- `grep effectiveUplinks src/domain/engine/sizing.ts`: present (5 matches including formula)
- sizing.test.ts: 707 lines (above 400 minimum)

## Self-Check: PASSED

- FOUND: src/domain/schemas/input.ts
- FOUND: src/domain/engine/sizing.ts
- FOUND: src/domain/engine/sizing.test.ts
- FOUND: .planning/phases/05-engine-enhancements/05-02-SUMMARY.md
- FOUND commit: aadd3fa (feat(05-02): add PORT-03 server port multipliers)
- FOUND commit: f693c3f (feat(05-02): add UPLN-02 activeUplinksPerLeaf)
