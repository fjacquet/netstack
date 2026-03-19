---
phase: 22-existing-infrastructure-toggle
plan: 02
subsystem: ui
tags: [react, zustand, brownfield, toggle, i18n, checkbox]

# Dependency graph
requires:
  - phase: 22-existing-infrastructure-toggle
    plan: 01
    provides: brownfield schema fields, resultStore post-processing, i18n keys
provides:
  - Topology-conditional existing infrastructure toggles in InputForm
  - "(existing)" labels on BOM panel switch rows when toggles active
  - Visual muting (opacity) for excluded switch rows
affects: [23-save-load-configurations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Topology-conditional checkbox toggle with data-testid for brownfield UI
    - Prop-drilling existingCoreDeployed to ThreeTierBOMContent sub-component
    - inputStore selector expansion for multi-field reads with useShallow

key-files:
  created: []
  modified:
    - src/features/sizing/InputForm.tsx
    - src/features/sizing/InputForm.test.tsx
    - src/features/sizing/BOMPanel.tsx
    - src/features/sizing/BOMPanel.test.tsx

key-decisions:
  - "Checkbox rendered as native input[type=checkbox] inside FormField for consistent form handling"
  - "BOM panel reads brownfield toggles from inputStore (not resultStore) for direct UI control"
  - "Added data-testid attributes for both toggles and labels for test targeting"

patterns-established:
  - "Brownfield toggle: checkbox in topology-conditional block, label in BOM panel with opacity muting"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 22 Plan 02: Existing Infrastructure UI Summary

**Topology-conditional brownfield toggles in InputForm with "(existing)" labels and visual muting in BOM panel**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T04:31:44Z
- **Completed:** 2026-03-19T04:35:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- InputForm shows "Spines already deployed" toggle only in Clos (leaf-spine) topology mode
- InputForm shows "Core switches already deployed" toggle only in Three-Tier topology mode
- BOM panel shows "(existing)" label and opacity-60 muting on spine/core rows when toggles are active
- Toggle state flows through inputStore watch subscription (no additional wiring needed)
- Reset handler clears both toggles to false
- All 548 tests pass with 4 new InputForm tests and 2 new BOMPanel tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add existing infrastructure toggles to InputForm** - `d9b4559` (feat)
2. **Task 2: Add "(existing)" labels to BOM panel** - `9d13742` (feat)

## Files Created/Modified
- `src/features/sizing/InputForm.tsx` - Added existingSpinesDeployed/existingCoreDeployed to FormValues, defaultValues, reset handler; added checkbox toggles in topology-conditional blocks
- `src/features/sizing/InputForm.test.tsx` - Added 4 test cases for toggle visibility per topology
- `src/features/sizing/BOMPanel.tsx` - Expanded inputStore selector for brownfield toggles; added "(existing)" labels with data-testid and opacity muting to spine/core rows; passed existingCoreDeployed prop to ThreeTierBOMContent
- `src/features/sizing/BOMPanel.test.tsx` - Added inputStore mock; added 2 test cases for "(existing)" label visibility

## Decisions Made
- Used native `input[type=checkbox]` inside FormField (consistent with shadcn/ui form pattern)
- BOM panel reads brownfield state from inputStore directly (not derived from resultStore BOM output)
- Added `data-testid` attributes on both toggles and labels for reliable test targeting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added inputStore mock to BOMPanel tests**
- **Found during:** Task 2 (BOMPanel test updates)
- **Issue:** BOMPanel.test.tsx did not mock useInputStore, which is now required for topology/brownfield selectors
- **Fix:** Added vi.mock for useInputStore with mockInputStore helper matching full InputState signature
- **Files modified:** src/features/sizing/BOMPanel.test.tsx
- **Verification:** All 12 BOMPanel tests pass
- **Committed in:** 9d13742 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for test correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 (existing infrastructure toggle) is complete
- All brownfield UI features are functional: schema, engine post-processing, i18n, InputForm toggles, BOM panel labels
- Ready for Phase 23 (save/load named configurations)

## Self-Check: PASSED

- All 4 modified files verified on disk
- Commit d9b4559 (Task 1) verified in git log
- Commit 9d13742 (Task 2) verified in git log
- SUMMARY.md created at expected path
- 548/548 tests pass, 0 type errors

---
*Phase: 22-existing-infrastructure-toggle*
*Completed: 2026-03-19*
