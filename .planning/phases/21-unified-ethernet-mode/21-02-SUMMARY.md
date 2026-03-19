---
phase: 21-unified-ethernet-mode
plan: 02
subsystem: ui, stores, export
tags: [react, zustand, topology, ethernet, three-tier, dead-code-removal]

# Dependency graph
requires:
  - phase: 21-unified-ethernet-mode
    plan: 01
    provides: Unified SizingInputSchema with topology discriminator, topology-aware resultStore
provides:
  - Topology-aware InputForm with conditional Clos/Three-Tier fields
  - Topology-aware BOMPanel rendering correct BOM data for both topologies
  - Topology-aware TopologyTab dispatching to Clos canvas or ThreeTierTopologyTab
  - Topology-aware RackElevationTab building correct device lists for both topologies
  - Topology-aware TopBar export (CSV/PDF) dispatching to correct format
  - Zero standalone three-tier dead code (6 files deleted)
affects: [22-existing-infrastructure, 23-configurations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Topology dispatch: check input.topology then render/build correct component"
    - "Inline topology-aware BOM rendering via ThreeTierBOMContent component"
    - "Unified RackElevationTab with dual device builder dispatch"

key-files:
  created: []
  modified:
    - src/features/sizing/InputForm.tsx
    - src/features/sizing/BOMPanel.tsx
    - src/features/topology/TopologyTab.tsx
    - src/features/rack-elevation/RackElevationTab.tsx
    - src/components/TopBar.tsx
    - src/features/topology/three-tier/ThreeTierTopologyTab.tsx
    - src/features/topology/index.ts
    - src/features/rack-elevation/index.ts
  deleted:
    - src/store/threeTierInputStore.ts
    - src/store/threeTierResultStore.ts
    - src/features/sizing/three-tier/ThreeTierInputForm.tsx
    - src/features/sizing/three-tier/ThreeTierBOMPanel.tsx
    - src/features/sizing/three-tier/ThreeTierSizingPage.tsx
    - src/features/rack-elevation/ThreeTierRackElevationTab.tsx

key-decisions:
  - "Inlined ThreeTierBOMContent as local component in BOMPanel.tsx rather than importing ThreeTierBOMPanel -- avoids dependency on deleted file"
  - "RackElevationTab uses SelectGroup with labels for server/network rack categories in both topologies"
  - "ThreeTierTopologyTab kept as internal component (imported directly by TopologyTab, removed from barrel export)"
  - "TopBar CSV/PDF dispatch checks topology within ethernet mode rather than separate mode branch"

patterns-established:
  - "Topology-aware conditional rendering: check topology from inputStore then dispatch to correct UI"
  - "Dead code removal: delete standalone files after functionality merged into unified components"

requirements-completed: [ETH-03, ETH-04, ETH-05]

# Metrics
duration: 7min
completed: 2026-03-19
---

# Phase 21 Plan 02: Unified Ethernet UI Summary

**Topology-aware UI wiring for InputForm, BOMPanel, TopologyTab, RackElevationTab, and TopBar export with 6 standalone three-tier files deleted**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-19T04:02:24Z
- **Completed:** 2026-03-19T04:09:25Z
- **Tasks:** 2
- **Files modified:** 14 (8 modified, 6 deleted)

## Accomplishments
- InputForm now shows topology selector dropdown with conditional Clos (leaf/spine/uplinks) or Three-Tier (access/aggregation/core/uplinks) fields
- BOMPanel renders correct BOM data based on selected topology -- Clos oversubscription/switches/cables/violations or Three-Tier multi-tier oversubscription/switches/cables/optics/violations
- TopologyTab dispatches to Clos canvas or ThreeTierTopologyTab based on input.topology
- RackElevationTab dispatches to Clos or Three-Tier device builders for both server and network racks
- TopBar CSV/PDF export dispatches to correct generator based on topology within ethernet mode
- Deleted 6 standalone three-tier files: two stores, three UI components, one rack tab
- ThreeTierTopologyTab updated to read from unified resultStore.threeTierBom instead of deleted threeTierResultStore

## Task Commits

Each task was committed atomically:

1. **Task 1: Unify InputForm with topology selector and conditional fields, update BOMPanel** - `88b3e24` (feat)
2. **Task 2: Wire TopologyTab, RackElevationTab, TopBar exports for topology dispatch, then delete dead code** - `93145c3` (feat)

## Files Created/Modified
- `src/features/sizing/InputForm.tsx` - Added topology selector, conditional Clos/Three-Tier field blocks, three-tier model constants
- `src/features/sizing/BOMPanel.tsx` - Added topology-aware rendering with inline ThreeTierBOMContent component
- `src/features/topology/TopologyTab.tsx` - Topology dispatch to Clos canvas or ThreeTierTopologyTab
- `src/features/rack-elevation/RackElevationTab.tsx` - Topology-aware device building with dual builder dispatch
- `src/components/TopBar.tsx` - Topology-aware CSV/PDF export dispatch within ethernet mode
- `src/features/topology/three-tier/ThreeTierTopologyTab.tsx` - Updated store import from threeTierResultStore to unified resultStore
- `src/features/topology/index.ts` - Removed ThreeTierTopologyTab barrel export
- `src/features/rack-elevation/index.ts` - Removed ThreeTierRackElevationTab barrel export
- `src/store/threeTierInputStore.ts` - DELETED (functionality merged into unified inputStore)
- `src/store/threeTierResultStore.ts` - DELETED (functionality merged into unified resultStore)
- `src/features/sizing/three-tier/ThreeTierInputForm.tsx` - DELETED (fields merged into InputForm)
- `src/features/sizing/three-tier/ThreeTierBOMPanel.tsx` - DELETED (rendering merged into BOMPanel)
- `src/features/sizing/three-tier/ThreeTierSizingPage.tsx` - DELETED (no longer needed -- App.tsx routes to unified page)
- `src/features/rack-elevation/ThreeTierRackElevationTab.tsx` - DELETED (logic merged into RackElevationTab)

## Decisions Made
- Inlined ThreeTierBOMContent as a local component within BOMPanel.tsx rather than keeping ThreeTierBOMPanel as a separate import -- cleaner since the standalone file was being deleted anyway
- Used SelectGroup with labels in unified RackElevationTab for server/network rack categories -- consistent with the standalone ThreeTierRackElevationTab's grouped selector pattern
- Kept ThreeTierTopologyTab.tsx as an internal component in topology/three-tier/ -- only imported directly by TopologyTab, removed from barrel export since App.tsx no longer routes to it
- TopBar export dispatch checks topology within the ethernet mode branch rather than having a separate mode value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21 (Unified Ethernet Mode) is now complete -- all 2 plans executed
- The unified Ethernet mode with topology selector is fully functional
- Ready for Phase 22 (Existing Infrastructure) and Phase 23 (Configurations)
- All three-tier functionality is preserved but accessed through the unified Ethernet mode
- 536 tests pass, TypeScript compiles cleanly, no dead code remains

## Self-Check: PASSED

All files verified (6 created/modified exist, 6 deleted confirmed absent). Both commits (88b3e24, 93145c3) found in git log.

---
*Phase: 21-unified-ethernet-mode*
*Completed: 2026-03-19*
