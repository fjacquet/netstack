---
phase: 21-unified-ethernet-mode
plan: 01
subsystem: schemas, stores, ui
tags: [zod, zustand, i18n, topology, ethernet, three-tier]

# Dependency graph
requires:
  - phase: 18-three-tier-domain-engine
    provides: ThreeTierSizingInputSchema, calculateThreeTierBOM engine
  - phase: 19-three-tier-ui-converged
    provides: Converged engine with topology dispatch pattern
provides:
  - Unified SizingInputSchema with topology discriminator and three-tier model fields
  - Unified inputStore v7 with topology default and v6->v7 migration
  - Topology-aware resultStore dispatching to calculateBOM or calculateThreeTierBOM
  - 3-button ModeSelector (Ethernet, FC, Converged) with no three-tier mode
  - Topology selector i18n keys for all 4 locales
affects: [21-02, 22-existing-infrastructure, 23-configurations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified schema with topology discriminator instead of separate schemas per topology"
    - "Topology-aware store dispatch (resultStore switches engine based on input.topology)"
    - "Mode type reduction: 4 -> 3 values (three-tier absorbed into ethernet)"

key-files:
  created: []
  modified:
    - src/domain/schemas/input.ts
    - src/store/inputStore.ts
    - src/store/resultStore.ts
    - src/components/ModeSelector.tsx
    - src/components/TopBar.tsx
    - src/App.tsx
    - src/domain/engine/converged-sizing.ts
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json

key-decisions:
  - "Topology field added as first field in SizingInputSchema with default 'leaf-spine' for backward compatibility"
  - "Three-tier fields added with defaults to SizingInputSchema rather than using Zod discriminated union -- simpler migration"
  - "resultStore creates toThreeTierInput mapper function (same pattern as converged-sizing.ts)"
  - "Mode type reduced from 4 to 3 values -- three-tier is now a topology within Ethernet mode"
  - "mode.ethernet label changed from 'Spine-Leaf' to 'Ethernet' in all 4 locales"

patterns-established:
  - "Topology dispatch: check input.topology then call correct engine function"
  - "Store version migration: spread defaults fills missing fields automatically"

requirements-completed: [ETH-01, ETH-02]

# Metrics
duration: 9min
completed: 2026-03-19
---

# Phase 21 Plan 01: Unified Ethernet Mode Summary

**Unified SizingInputSchema with topology discriminator, topology-aware resultStore dispatch, and 3-button ModeSelector replacing the standalone three-tier mode**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-19T03:49:42Z
- **Completed:** 2026-03-19T03:59:31Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments
- SizingInputSchema extended with `topology` enum and all three-tier model fields (accessModel, aggregationModel, coreModel, uplink counts)
- inputStore bumped to version 7 with automatic migration from v6 (topology defaults to 'leaf-spine', three-tier fields filled via spread)
- resultStore now dispatches to `calculateBOM` or `calculateThreeTierBOM` based on `input.topology`
- ModeSelector reduced from 4 to 3 buttons (Ethernet, FC, Converged) -- three-tier is now a topology variant within Ethernet
- App.tsx routing simplified: no more ThreeTierSizingPage, ThreeTierTopologyTab, ThreeTierRackElevationTab branches
- mode.ethernet label updated from "Spine-Leaf" to "Ethernet" in all 4 locales with topology selector keys added

## Task Commits

Each task was committed atomically:

1. **Task 1: Unify SizingInputSchema with topology field and three-tier model fields** - `8958d1e` (feat)
2. **Task 2: Reduce mode type to 3 values, update ModeSelector, App, and i18n** - `e159da3` (feat)

## Files Created/Modified
- `src/domain/schemas/input.ts` - Added topology enum and three-tier model fields to SizingInputSchema
- `src/store/inputStore.ts` - Version 7 with topology default and three-tier field defaults
- `src/store/resultStore.ts` - Topology-aware dispatch with toThreeTierInput mapper and threeTierBom state
- `src/domain/engine/converged-sizing.ts` - Updated toEthernetInput to include new unified fields
- `src/features/sizing/BOMPanel.tsx` - Cast violations for type safety with union type
- `src/components/ModeSelector.tsx` - Reduced to 3 buttons, removed three-tier mode
- `src/components/TopBar.tsx` - Removed three-tier export branches and result store
- `src/App.tsx` - Removed three-tier routing, simplified ternaries
- `src/i18n/locales/*/translation.json` - Updated mode labels, added topology selector keys, added select*Model keys
- 13 test files updated with new SizingInput shape (topology + three-tier defaults)

## Decisions Made
- Added topology field as first field in the schema with `.default('leaf-spine')` for backward compatibility -- ensures existing Clos users see no change
- Used flat schema with grouped comments rather than Zod discriminated union -- simpler migration and avoids runtime validation complexity
- Reused the proven `toThreeTierInput` mapper pattern from converged-sizing.ts for the resultStore dispatch
- Removed standalone three-tier result store import from TopBar -- three-tier exports will be handled within the unified Ethernet export flow in Plan 02
- Orphaned localStorage key `netstack-three-tier-input` cleaned up during v6->v7 migration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated converged-sizing.ts toEthernetInput for expanded SizingInput type**
- **Found during:** Task 1 (schema expansion)
- **Issue:** toEthernetInput returned SizingInput but was missing the new fields (topology, three-tier models), causing TS2740
- **Fix:** Added topology, accessModel, activeUplinksPerAccess, aggregationModel, activeUplinksPerAggregation, coreModel to the returned object
- **Files modified:** src/domain/engine/converged-sizing.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 8958d1e (Task 1 commit)

**2. [Rule 3 - Blocking] Updated 13 test fixtures for expanded SizingInput type**
- **Found during:** Task 1 (schema expansion)
- **Issue:** All test files constructing SizingInput objects were missing the new required fields
- **Fix:** Added topology, accessModel, activeUplinksPerAccess, aggregationModel, activeUplinksPerAggregation, coreModel to all test fixtures
- **Files modified:** 13 test files across domain/engine, store, features/sizing, features/export, features/rack-elevation, features/topology
- **Verification:** All 536 tests pass
- **Committed in:** 8958d1e (Task 1 commit)

**3. [Rule 1 - Bug] Fixed BOMPanel violations type mismatch**
- **Found during:** Task 1 (resultStore type change)
- **Issue:** resultStore.violations is now `ConstraintViolation[] | ThreeTierConstraintViolation[]` but BOMPanel's ViolationAlert only accepts `ConstraintViolation`
- **Fix:** Added type cast `as ConstraintViolation[]` in the map call (safe because BOMPanel only renders when bom is non-null, meaning violations are always ConstraintViolation[])
- **Files modified:** src/features/sizing/BOMPanel.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 8958d1e (Task 1 commit)

**4. [Rule 3 - Blocking] Updated TopBar to match 3-value mode type**
- **Found during:** Task 2 (mode type reduction)
- **Issue:** TopBar had `'ethernet' | 'fc' | 'converged' | 'three-tier'` type and three-tier-specific export logic
- **Fix:** Changed TopBar props to 3-value type, removed three-tier export branches and standalone three-tier store import
- **Files modified:** src/components/TopBar.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** e159da3 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking)
**Impact on plan:** All auto-fixes necessary for type safety after schema expansion. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Unified schema, store, and mode selector are in place
- Plan 02 can now build the topology-aware InputForm with conditional field rendering based on input.topology
- The threeTier i18n keys and select*Model keys are already available for Plan 02's form work

---
*Phase: 21-unified-ethernet-mode*
*Completed: 2026-03-19*
