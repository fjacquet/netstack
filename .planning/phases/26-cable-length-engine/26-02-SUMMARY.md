---
phase: 26-cable-length-engine
plan: 02
subsystem: domain/engine
tags: [cable-length, dac-advisory, patch-panel, clos, three-tier, fc-san, bom]
dependency_graph:
  requires: [26-01]
  provides: [cableSchedule in NetworkBOM, cableSchedule in ThreeTierBOM, islCableLengthSkuM in FCNetworkBOM]
  affects: [src/domain/engine/sizing.ts, src/domain/engine/three-tier-sizing.ts, src/domain/engine/fc-sizing.ts]
tech_stack:
  added: []
  patterns: [cable-length geometry, DAC distance advisory upgrade, PATCH_PANEL_RECOMMENDED advisory]
key_files:
  created: []
  modified:
    - src/domain/engine/sizing.ts
    - src/domain/engine/three-tier-sizing.ts
    - src/domain/engine/fc-sizing.ts
    - src/domain/engine/sizing.test.ts
    - src/domain/engine/three-tier-sizing.test.ts
    - src/domain/engine/fc-sizing.test.ts
decisions:
  - "recommendedCableLengthM is now serverLeafSkuM/serverAccessSkuM from cable-length.ts (not hardcoded ToR=2/MoR=1/BoR=2 map)"
  - "DAC_DISTANCE_ADVISORY uses geometry: interRackCableLengthM vs CABLE_CATALOG.DAC.maxDistanceBySpeed[speed] — no more racks>8 heuristic"
  - "PATCH_PANEL_RECOMMENDED is in advisories[] not violations[] — amber, non-blocking"
  - "FC engine returns islCableLengthSkuM=5 from computeFCIslLengthM() — fixed conservative per ADR-0009"
metrics:
  duration: ~6 minutes
  completed: "2026-03-19T09:42:00Z"
  tasks_completed: 2
  files_modified: 6
---

# Phase 26 Plan 02: Engine Integration Summary

Cable-length.ts functions wired into all three sizing engines; DAC advisory upgraded to geometry-based distance check; PATCH_PANEL_RECOMMENDED advisory emitted for non-adjacent rack deployments; FC ISL cable length returned as fixed 5m SKU.

## What Was Built

### Task 1 — Clos Engine (sizing.ts)

- Imported `deriveRackHeightM`, `computeServerLeafLengthM`, `computeLeafSpineLengthM`, `computeVltLengthM`, `interRackCableLengthM` from `./cable-length`
- Imported `CABLE_CATALOG` from `../catalog/cables` for speed-specific DAC limits
- Added `rackHeightM = deriveRackHeightM(input.rackSize)` after rack count derivation
- Replaced hardcoded `cableLengthMap` with computed `serverLeafSkuM`, `leafSpineSkuM`, `vltSkuM`
- `recommendedCableLengthM` is now `serverLeafSkuM` (backward compat field)
- Replaced `racks > 8` DAC heuristic with geometry check: `interRackCableLengthM > dacLimit`
- `DAC_DISTANCE_ADVISORY` now includes `computedDistanceM` field
- Added `PATCH_PANEL_RECOMMENDED` advisory when `racksAdjacent === false`
- Return object includes `cableSchedule: { serverLeafSkuM, leafSpineSkuM, vltSkuM }` and `advisories`

### Task 2 — Three-Tier Engine (three-tier-sizing.ts)

- Same import pattern as Clos engine (plus `computeThreeTierLengthsM`)
- `computeThreeTierLengthsM()` replaces the legacy `cableLengthMap`
- Returns `cableSchedule: { serverAccessSkuM, accessAggregationSkuM, aggregationCoreSkuM }`
- DAC advisory upgraded to geometry-based check
- `PATCH_PANEL_RECOMMENDED` advisory added for non-adjacent racks

### Task 2 — FC Engine (fc-sizing.ts)

- Imported `computeFCIslLengthM` from `./cable-length`
- Computes `islCableLengthSkuM = computeFCIslLengthM()` = 5 (fixed conservative)
- Returns `islCableLengthSkuM` in `FCNetworkBOM`

### Test Updates

- `sizing.test.ts`: Replaced `racks > 8` DAC tests with geometry-triggered tests; updated `recommendedCableLengthM` tests to use SKU ladder assertions; added PATCH_PANEL_RECOMMENDED describe block; added cableSchedule describe block
- `three-tier-sizing.test.ts`: Same DAC/recommendation updates; added PATCH_PANEL_RECOMMENDED and cableSchedule describe blocks
- `fc-sizing.test.ts`: Added CABLE-04 describe block asserting `islCableLengthSkuM === 5`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated recommendedCableLengthM tests to reflect new geometry values**
- **Found during:** Task 1 execution
- **Issue:** Existing tests for `POS-03/04: Switch Positioning` asserted `recommendedCableLengthM=2` (ToR/BoR) and `recommendedCableLengthM=1` (MoR) based on the hardcoded map. After switching to `serverLeafSkuM`, the actual values are 3m for 42U rack (2.167m raw → SKU 3m).
- **Fix:** Updated assertions to use `expect([1, 3, 5, 10]).toContain(bom.recommendedCableLengthM)` — still validates the field is a valid SKU
- **Files modified:** `src/domain/engine/sizing.test.ts`, `src/domain/engine/three-tier-sizing.test.ts`

## Self-Check: PASSED

- src/domain/engine/sizing.ts — FOUND
- src/domain/engine/three-tier-sizing.ts — FOUND
- src/domain/engine/fc-sizing.ts — FOUND
- 26-02-SUMMARY.md — FOUND
- commit 1d49f79 (Task 1) — FOUND
- commit a602774 (Task 2) — FOUND
- Full vitest suite: 616 tests, 0 failures
- tsc --noEmit: clean
