---
phase: 18-three-tier-domain-engine
plan: 01
subsystem: catalog, schemas
tags: [dell-z-series, zod, three-tier, switch-catalog, typescript]

# Dependency graph
requires:
  - phase: 15-converged-domain-store
    provides: "Existing SWITCH_CATALOG with 6 S-series models and SwitchSpec interface"
provides:
  - "9-model SWITCH_CATALOG with Z9264F-ON, Z9332F-ON, Z9432F-ON"
  - "SwitchSpec with optional tier and uHeight fields for 3-tier role mapping"
  - "ThreeTierSizingInputSchema with independent access/aggregation/core model selectors"
  - "ThreeTierBOMSchema with per-tier counts, inter-tier cables, and dual oversubscription ratios"
  - "ThreeTierConstraintViolationSchema with 5 typed violations"
affects: [18-02-PLAN, 18-03-PLAN, 19-three-tier-ui, 20-three-tier-export]

# Tech tracking
tech-stack:
  added: []
  patterns: ["symmetric switch with uplinkPorts=0 and logical port splitting", "optional tier field for multi-topology role mapping"]

key-files:
  created:
    - src/domain/schemas/three-tier-input.ts
    - src/domain/schemas/three-tier-bom.ts
  modified:
    - src/domain/catalog/types.ts
    - src/domain/catalog/hardware.ts
    - src/domain/schemas/catalog.ts
    - src/domain/catalog/hardware.test.ts

key-decisions:
  - "tier field is optional and additive -- does not replace existing role field"
  - "Z-series uplinkPorts=0 because port split is logical, not physical -- engine computes from user input"
  - "Separate ThreeTierConstraintViolationSchema -- not mixed with Ethernet violations"

patterns-established:
  - "Symmetric switch pattern: uplinkPorts=0 with downlinkPorts representing total configurable ports"
  - "Multi-topology role mapping: optional tier[] field alongside existing role field"
  - "Per-boundary oversubscription: accessToAggr and aggrToCore as separate required fields"

requirements-completed: [TIER-01, TIER-02, TENG-01, TENG-07]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 18 Plan 01: Catalog & Schema Foundation Summary

**Z-series switches (Z9264F-ON, Z9332F-ON, Z9432F-ON) added to 9-model catalog with tier/uHeight fields, plus ThreeTierSizingInput and ThreeTierBOM Zod schemas**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T21:35:49Z
- **Completed:** 2026-03-18T21:39:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended SwitchSpec interface with optional `tier` and `uHeight` fields for 3-tier topology role mapping
- Added 3 Dell Z-series switches to SWITCH_CATALOG (Z9264F-ON 64x100G, Z9332F-ON 32x400G, Z9432F-ON 32x400G) bringing total to 9 models
- Created ThreeTierSizingInputSchema with independent model selectors per tier (TENG-07) and per-tier uplink counts
- Created ThreeTierBOMSchema with per-tier switch counts, inter-tier cable counts (TENG-06 shape), dual oversubscription ratios (TENG-05), and 5 typed constraint violations
- All 453 existing tests pass with zero regressions; 61 catalog tests including new Z-series assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SwitchSpec with tier/uHeight fields and add Z-series catalog entries** - `a862e75` (feat)
2. **Task 2: Create ThreeTierSizingInputSchema and ThreeTierBOMSchema** - `34bf1c8` (feat)

## Files Created/Modified
- `src/domain/catalog/types.ts` - Added optional `tier` and `uHeight` fields to SwitchSpec interface
- `src/domain/catalog/hardware.ts` - Added tier to S-series, added 3 Z-series entries (9 total models)
- `src/domain/schemas/catalog.ts` - Added tier and uHeight fields to SwitchSpecSchema
- `src/domain/catalog/hardware.test.ts` - Updated to 61 tests: model count 9, Z-series specs, OOB no-tier
- `src/domain/schemas/three-tier-input.ts` - ThreeTierSizingInputSchema with access/aggregation/core model selectors
- `src/domain/schemas/three-tier-bom.ts` - ThreeTierBOMSchema with per-tier counts, inter-tier cables, dual oversubscription

## Decisions Made
- **tier field is additive:** The `tier` field is optional and does not replace the existing `role` field. `role` controls Clos behavior, `tier` controls 3-tier behavior. S3248T-ON (OOB) has no tier.
- **Z-series uplinkPorts=0:** For symmetric switches (Z9264F-ON, Z9332F-ON, Z9432F-ON), `downlinkPorts` represents total configurable ports and `uplinkPorts=0` because the uplink/downlink split is logical, not physical. The engine will compute effective splits from user-specified uplink counts.
- **Separate violation schema:** ThreeTierConstraintViolationSchema is independent from Ethernet ConstraintViolationSchema, following the parallel domain pattern established by FC SAN.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Catalog and schema foundation is complete for Plan 02 (three-tier sizing engine)
- ThreeTierSizingInputSchema provides the input contract for `calculateThreeTierBOM()`
- ThreeTierBOMSchema provides the output contract
- All 9 switch models are available with tier mappings for engine lookups

## Self-Check: PASSED

All 6 files verified present. Both commits (a862e75, 34bf1c8) verified in git log.

---
*Phase: 18-three-tier-domain-engine*
*Plan: 01*
*Completed: 2026-03-18*
