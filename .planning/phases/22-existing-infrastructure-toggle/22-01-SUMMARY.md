---
phase: 22-existing-infrastructure-toggle
plan: 01
subsystem: domain
tags: [zod, zustand, brownfield, existing-infra, i18n, store-migration]

# Dependency graph
requires:
  - phase: 21-unified-ethernet-mode
    provides: Unified SizingInputSchema with topology discriminator, resultStore topology-aware dispatch
provides:
  - existingSpinesDeployed and existingCoreDeployed boolean fields on SizingInputSchema
  - existingCoreDeployed boolean field on ThreeTierSizingInputSchema
  - BOM post-processing in resultStore that zeros spine/core switch counts for brownfield
  - inputStore version 8 with backward-compatible migration
  - i18n keys for brownfield toggle labels and help text (EN, FR, DE, IT)
affects: [22-existing-infrastructure-toggle-02, ui-components, export]

# Tech tracking
tech-stack:
  added: []
  patterns: [BOM post-processing in resultStore (not engine), store version migration via spread defaults]

key-files:
  created: []
  modified:
    - src/domain/schemas/input.ts
    - src/domain/schemas/three-tier-input.ts
    - src/domain/schemas/converged-input.ts
    - src/store/resultStore.ts
    - src/store/inputStore.ts
    - src/store/convergedInputStore.ts
    - src/domain/engine/converged-sizing.ts
    - src/store/resultStore.test.ts
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json

key-decisions:
  - "Post-processing in resultStore, not engine -- keeps calculateBOM and calculateThreeTierBOM pure"
  - "Boolean fields default to false via Zod schema -- backward-compatible, no migration code needed"
  - "Cables and oversubscription ratios unaffected by toggle -- per ADR-0019 brownfield design"

patterns-established:
  - "BOM post-processing: engine computes full fabric, resultStore zeros purchase quantities for existing infra"
  - "Store version bump with spread-based migration: { ...DEFAULT_INPUT, ...oldInput } fills new fields"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 6min
completed: 2026-03-19
---

# Phase 22 Plan 01: Existing Infrastructure Toggle Summary

**Brownfield deployment toggles with BOM post-processing: existingSpinesDeployed/existingCoreDeployed zero switch counts while preserving cables and oversubscription ratios**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-19T04:22:04Z
- **Completed:** 2026-03-19T04:28:30Z
- **Tasks:** 2
- **Files modified:** 26

## Accomplishments
- Added existingSpinesDeployed and existingCoreDeployed boolean fields to all 3 input schemas (Ethernet, Three-Tier, Converged)
- Implemented BOM post-processing in resultStore that zeros spine/core switch counts when toggles are on, while preserving cable BOM and oversubscription ratios unchanged
- Bumped inputStore from version 7 to 8 with backward-compatible migration
- Added comprehensive INFRA test block verifying toggle behavior for both Clos and Three-Tier topologies
- Added i18n keys for toggle labels and help text in all 4 locales (EN, FR, DE, IT)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema, post-processing, store v8 migration, and tests** - `f370680` (feat)
2. **Task 2: i18n keys for existing infrastructure toggles** - `f2eabb0` (feat)

## Files Created/Modified
- `src/domain/schemas/input.ts` - Added existingSpinesDeployed and existingCoreDeployed boolean fields
- `src/domain/schemas/three-tier-input.ts` - Added existingCoreDeployed boolean field
- `src/domain/schemas/converged-input.ts` - Added existingSpinesDeployed and existingCoreDeployed boolean fields
- `src/store/resultStore.ts` - Post-processing logic: zeros spineSwitches/coreSwitches when toggles on
- `src/store/inputStore.ts` - Version 8, new defaults for brownfield booleans
- `src/store/convergedInputStore.ts` - New defaults for brownfield booleans
- `src/domain/engine/converged-sizing.ts` - Pass through brownfield fields in toEthernetInput and toThreeTierInput mappers
- `src/store/resultStore.test.ts` - New INFRA describe block with 7 tests
- `src/i18n/locales/{en,fr,de,it}/translation.json` - "infra" section with toggle labels and help text
- 16 additional test files updated with new boolean fields in SizingInput/ThreeTierSizingInput object literals

## Decisions Made
- Post-processing in resultStore, not engine -- keeps calculateBOM and calculateThreeTierBOM as pure functions computing full fabric
- Boolean fields default to false via Zod `.default(false)` -- backward-compatible, existing users see no change
- Cables and oversubscription ratios unaffected by toggle -- consistent with ADR-0019 brownfield design

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated converged-input schema and converged engine mappers**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** ConvergedSizingInputSchema and converged-sizing.ts mappers did not include new brownfield fields, causing TS2739 and TS2741 errors
- **Fix:** Added existingSpinesDeployed/existingCoreDeployed to ConvergedSizingInputSchema, convergedInputStore defaults, and toEthernetInput/toThreeTierInput mappers in converged-sizing.ts
- **Files modified:** src/domain/schemas/converged-input.ts, src/domain/engine/converged-sizing.ts, src/store/convergedInputStore.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** f370680 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Converged schema/engine needed the same fields for type consistency. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema fields and post-processing logic ready for UI integration in Plan 02
- i18n keys available for toggle labels in the input form
- All 542 tests pass, TypeScript clean

---
*Phase: 22-existing-infrastructure-toggle*
*Completed: 2026-03-19*

## Self-Check: PASSED

All files found, all commits verified, all acceptance criteria met.
