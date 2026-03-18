---
phase: 18-three-tier-domain-engine
plan: 02
subsystem: engine
tags: [three-tier, sizing-engine, tdd, dell-z-series, oversubscription, cable-bom]

# Dependency graph
requires:
  - phase: 18-three-tier-domain-engine-01
    provides: "9-model SWITCH_CATALOG with Z-series, ThreeTierSizingInputSchema, ThreeTierBOMSchema"
provides:
  - "calculateThreeTierBOM pure function for Core/Aggregation/Access topology sizing"
  - "43 test cases covering TENG-02 through TENG-06 requirements"
  - "Symmetric port handling for Z-series models (uplinkPorts=0)"
  - "Per-boundary oversubscription ratios (access-to-aggr, aggr-to-core)"
  - "Cable BOM: server-access, access-aggr, aggr-core, OOB, VLT"
  - "5 typed constraint violations: AGGREGATION/CORE_CAPACITY, OOB, DAC, RACK"
affects: [18-03-PLAN, 19-three-tier-ui, 20-three-tier-export]

# Tech tracking
tech-stack:
  added: []
  patterns: ["symmetric port logic: effectiveUplinks = min(user, uplinkPorts > 0 ? uplinkPorts : downlinkPorts)", "per-boundary oversubscription: access-to-aggr and aggr-to-core as separate ratios", "SwitchSpec cast for uniform optional field access across catalog union types"]

key-files:
  created:
    - src/domain/engine/three-tier-sizing.ts
    - src/domain/engine/three-tier-sizing.test.ts
  modified: []

key-decisions:
  - "SwitchSpec cast for catalog lookups -- avoids TS narrowing issues with optional fields across union types"
  - "Core downlinks = total ports (no upstream) -- core switches have no uplink tier"
  - "Access switch uHeight from catalog for RACK_CAPACITY_EXCEEDED -- Z9264F-ON is 2U vs 1U for S-series"
  - "Aggregation oversubscription uses same-speed cancellation when both sides of the boundary are identical port speed"

patterns-established:
  - "Symmetric port logic: uplinkPorts > 0 ? uplinkPorts : downlinkPorts for max uplink computation"
  - "Per-boundary oversubscription as separate named fields (not a single ratio)"
  - "SwitchSpec type annotation on catalog lookups for uniform optional field access"

requirements-completed: [TENG-02, TENG-03, TENG-04, TENG-05, TENG-06]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 18 Plan 02: Three-Tier Sizing Engine Summary

**calculateThreeTierBOM pure function with 43 TDD tests covering access/aggregation/core switch formulas, per-boundary oversubscription, cable BOM, and Z-series symmetric port handling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T21:42:44Z
- **Completed:** 2026-03-18T21:46:52Z
- **Tasks:** 1 (TDD: tests + implementation committed together)
- **Files modified:** 2

## Accomplishments
- Implemented `calculateThreeTierBOM()` pure function computing complete Bill of Materials for Core/Aggregation/Access topology
- 43 test cases covering all TENG requirements: access (2/rack), aggregation (ceil formula, min 2), core (ceil formula, min 2), oversubscription ratios, cable counts
- Symmetric port handling for Z-series (uplinkPorts=0): engine computes effective splits from user-specified uplink counts
- Per-boundary oversubscription ratios: access-to-aggr and aggr-to-core computed from bandwidth ratios
- Cable BOM: server-access, access-aggr, aggr-core, OOB, and VLT cables derived from link model
- Transceivers: SFP28 (25G), QSFP28 (100G), QSFP56-DD (400G) counts for fiber, 0 for DAC/AOC
- 5 typed constraint violations: AGGREGATION_CAPACITY_EXCEEDED, CORE_CAPACITY_EXCEEDED, OOB_PORT_SATURATION, DAC_DISTANCE_ADVISORY, RACK_CAPACITY_EXCEEDED
- All 496 tests pass (453 existing + 43 new) with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement calculateThreeTierBOM with TDD test suite** - `d9e8c77` (feat)

## Files Created/Modified
- `src/domain/engine/three-tier-sizing.ts` - Pure sizing engine function (220 lines) with catalog lookups, symmetric port logic, switch count formulas, cable BOM, oversubscription, transceivers, constraint violations
- `src/domain/engine/three-tier-sizing.test.ts` - 43 test cases (522 lines) covering all TENG requirements with makeInput helper

## Decisions Made
- **SwitchSpec cast on catalog lookups:** Used `const ACCESS: SwitchSpec = SWITCH_CATALOG[input.accessModel]` to avoid TypeScript narrowing issues when accessing optional fields (`uplinkSpeedGbE`, `uHeight`) across the catalog union type. This is safe because all catalog entries implement SwitchSpec.
- **Core has no upstream:** Core switches use all `downlinkPorts` as downlinks since there is no uplink tier above core. No effective uplink computation needed for core.
- **Access switch uHeight for rack overhead:** The RACK_CAPACITY_EXCEEDED check uses `ACCESS.uHeight ?? 1` for per-rack overhead, correctly accounting for Z9264F-ON (2U) vs S-series (1U default).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors (60 total) in converged domain files (`ConvergedBOMPanel.tsx`, `ConvergedRackElevationTab.tsx`, etc.) related to converged-input/converged-bom schema changes in progress. These are out of scope for plan 18-02 and do not affect the three-tier engine. Zero TS errors in three-tier files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Three-tier sizing engine is complete and tested, ready for Plan 03 (store & converged integration)
- `calculateThreeTierBOM()` is exported and can be wired into a Zustand store
- All 5 TENG requirements (02-06) validated with 43 test cases
- ThreeTierBOM output shape matches the schema from Plan 01

## Self-Check: PASSED

All 2 files verified present. Commit d9e8c77 verified in git log.

---
*Phase: 18-three-tier-domain-engine*
*Plan: 02*
*Completed: 2026-03-18*
