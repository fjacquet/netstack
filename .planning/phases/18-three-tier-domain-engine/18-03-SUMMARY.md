---
phase: 18-three-tier-domain-engine
plan: 03
subsystem: engine
tags: [zod, three-tier, topology, converged, sizing-engine, dell]

# Dependency graph
requires:
  - phase: 18-01
    provides: ThreeTierSizingInputSchema, ThreeTierBOMSchema, Z-series catalog entries
  - phase: 18-02
    provides: calculateThreeTierBOM pure function (implemented as Rule 3 deviation)
provides:
  - topology enum ('leaf-spine' | 'three-tier') in ConvergedSizingInputSchema
  - topology-aware calculateConvergedBOM branching to Clos or three-tier engine
  - nullable ethernetBom and threeTierBom in ConvergedBOMSchema
  - toThreeTierInput adapter function
  - 3-tier model selectors in converged input (accessModel, aggregationModel, coreModel)
affects: [19-three-tier-ui, 20-three-tier-export-i18n]

# Tech tracking
tech-stack:
  added: []
  patterns: [topology branching in converged engine, nullable sub-BOMs for exclusive topologies]

key-files:
  created:
    - src/domain/engine/three-tier-sizing.ts
    - src/domain/engine/three-tier-sizing.test.ts
  modified:
    - src/domain/schemas/converged-input.ts
    - src/domain/schemas/converged-bom.ts
    - src/domain/engine/converged-sizing.ts
    - src/domain/engine/converged-sizing.test.ts
    - src/domain/schemas/converged-input.test.ts
    - src/store/convergedInputStore.ts
    - src/store/convergedResultStore.ts
    - src/features/sizing/converged/ConvergedBOMPanel.tsx
    - src/features/rack-elevation/ConvergedRackElevationTab.tsx
    - src/features/topology/converged/ConvergedTopologyTab.tsx
    - src/features/export/exportConvergedCsv.ts
    - src/features/export/exportConvergedCsv.test.ts
    - src/features/export/exportConvergedPdf.test.ts
    - src/features/export/pdf/ConvergedNetStackDocument.tsx

key-decisions:
  - "activeUplinksPerLeaf reused as activeUplinksPerAccess in toThreeTierInput adapter -- same purpose, no new field needed"
  - "ethernetBom made nullable (was non-null) -- all UI consumers get null guards for three-tier mode"
  - "UI components fall back to empty/placeholder state when ethernetBom is null (three-tier rendering deferred to phase 19)"

patterns-established:
  - "Topology branching: converged engine uses topology field to select sub-engine, producing exactly one of ethernetBom/threeTierBom"
  - "Null guard pattern: UI components check ethernetBom before rendering, show placeholder for three-tier"

requirements-completed: [TENG-01]

# Metrics
duration: 11min
completed: 2026-03-18
---

# Phase 18 Plan 03: Converged Integration Summary

**Topology-aware converged engine branching to Clos or three-tier with nullable sub-BOMs, updated schemas, and 42 new tests**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-18T21:42:32Z
- **Completed:** 2026-03-18T21:53:28Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Topology selector ('leaf-spine' | 'three-tier') added to ConvergedSizingInputSchema with 'leaf-spine' default (backward compatible)
- Converged engine branches on topology: calculateBOM for leaf-spine, calculateThreeTierBOM for three-tier
- ConvergedBOMSchema has nullable ethernetBom + threeTierBom + topology echo + three-way violation union
- All 514 tests pass with zero regressions (27 converged engine + 15 schema + 43 three-tier engine)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add topology selector to converged schemas** - `dba7e85` (feat)
2. **Task 2 RED: Failing topology tests** - `cddd109` (test)
3. **Task 2 GREEN: Implement topology branching** - `fceec52` (feat)

_Prerequisite deviation: `d9e8c77` (feat) -- calculateThreeTierBOM engine (Rule 3: blocking dependency from plan 18-02)_

## Files Created/Modified
- `src/domain/schemas/converged-input.ts` - Added topology enum, 3-tier model selectors
- `src/domain/schemas/converged-bom.ts` - Added nullable ethernetBom/threeTierBom, topology echo, ThreeTierConstraintViolationSchema in union
- `src/domain/engine/converged-sizing.ts` - Topology branching, toThreeTierInput adapter
- `src/domain/engine/converged-sizing.test.ts` - 8 new topology tests + updated existing tests for nullable ethernetBom
- `src/domain/schemas/converged-input.test.ts` - 10 new tests for topology field and 3-tier model selectors
- `src/domain/engine/three-tier-sizing.ts` - calculateThreeTierBOM pure function (Rule 3 deviation)
- `src/domain/engine/three-tier-sizing.test.ts` - 43 test cases for three-tier engine
- `src/store/convergedInputStore.ts` - Added topology and 3-tier defaults
- `src/store/convergedResultStore.ts` - Updated violation type union
- `src/features/sizing/converged/ConvergedBOMPanel.tsx` - Null guard for ethernetBom
- `src/features/rack-elevation/ConvergedRackElevationTab.tsx` - Null guard for ethernetBom
- `src/features/topology/converged/ConvergedTopologyTab.tsx` - Null guard for ethernetBom
- `src/features/export/exportConvergedCsv.ts` - Null guard for ethernetBom
- `src/features/export/exportConvergedCsv.test.ts` - Added topology/threeTierBom to mock data
- `src/features/export/exportConvergedPdf.test.ts` - Added topology/threeTierBom to mock data
- `src/features/export/pdf/ConvergedNetStackDocument.tsx` - Conditional render for ethernetBom

## Decisions Made
- **activeUplinksPerLeaf reused as activeUplinksPerAccess:** The converged input's `activeUplinksPerLeaf` serves the same purpose as the three-tier input's `activeUplinksPerAccess` (uplinks from ToR switches to the next tier). No new field needed.
- **ethernetBom made nullable:** Previously non-null, now null when topology='three-tier'. All UI consumers receive null guards. Three-tier-specific UI rendering deferred to phase 19.
- **UI placeholder for three-tier:** Components show empty/placeholder state when ethernetBom is null. Full three-tier BOM panel, topology diagram, and rack elevation will be built in phase 19.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Implemented calculateThreeTierBOM engine (plan 18-02 dependency)**
- **Found during:** Plan initialization
- **Issue:** Plan 18-03 depends on plan 18-02 which had not been executed. The `calculateThreeTierBOM` function did not exist.
- **Fix:** Implemented the full three-tier sizing engine with 43 test cases covering all TENG requirements (TENG-02 through TENG-06).
- **Files created:** `src/domain/engine/three-tier-sizing.ts`, `src/domain/engine/three-tier-sizing.test.ts`
- **Verification:** All 43 tests pass, TSC clean
- **Committed in:** `d9e8c77`

**2. [Rule 1 - Bug] Added null guards to UI consumers after making ethernetBom nullable**
- **Found during:** Task 1 (schema changes)
- **Issue:** Making ethernetBom nullable caused 61 TypeScript errors in 11 files (UI components, stores, export functions, tests)
- **Fix:** Added null guards/early returns in UI components, updated mock data in test files, updated store types
- **Files modified:** 9 files (stores, UI components, export files)
- **Verification:** TSC clean (0 errors)
- **Committed in:** `dba7e85` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking dependency, 1 bug from current changes)
**Impact on plan:** Rule 3 deviation was necessary -- plan 18-02 hadn't been executed. Rule 1 fixes were direct consequences of making ethernetBom nullable. No scope creep.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Converged engine fully supports both topology modes
- Three-tier BOM is computed correctly via calculateThreeTierBOM
- UI needs three-tier-specific rendering components (phase 19)
- Export functions need three-tier CSV/PDF rows (phase 20)
- i18n keys needed for three-tier labels (phase 20)

## Self-Check: PASSED

All files verified present, all commits verified in git log. 514 tests pass, TypeScript compiles cleanly.

---
*Phase: 18-three-tier-domain-engine*
*Completed: 2026-03-18*
