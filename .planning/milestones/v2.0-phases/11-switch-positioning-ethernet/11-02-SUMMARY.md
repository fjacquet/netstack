---
phase: 11-switch-positioning-ethernet
plan: "02"
subsystem: ui
tags: [react, zustand, i18n, react-hook-form, bom, rack-elevation]

# Dependency graph
requires:
  - phase: 11-01
    provides: switchPositioning domain field, DAC_POSITIONING_INCOMPATIBLE violation type, recommendedCableLengthM in NetworkBOM

provides:
  - inputStore v6 with switchPositioning persisted to localStorage
  - InputForm Physical section with ToR/MoR/BoR Select field
  - BOMPanel DAC_POSITIONING_INCOMPATIBLE destructive Alert
  - BOMPanel cableLengthAdvisory paragraph below cables table
  - 10 new i18n keys in en/fr/de/it locales
  - buildPositioningRackDevices utility for MoR/BoR positioning rack
  - positioning-aware buildRackDevices (MoR/BoR omit leaf switches from server racks)

affects:
  - rack-elevation feature (uses positioning-aware buildRackDevices)
  - export feature (BOM now includes switchPositioning + recommendedCableLengthM)
  - topology feature (leaf placement differs for MoR/BoR)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FormValues interface + defaultValues + form.reset() updated together when adding new form fields
    - switchPositioning flows through form.watch rest spread — not in exclusion list
    - buildPositioningRackDevices separate util for MoR/BoR dedicated rack, not co-located in buildRackDevices

key-files:
  created:
    - src/features/rack-elevation/utils/buildPositioningRackDevices.ts
  modified:
    - src/store/inputStore.ts
    - src/features/sizing/InputForm.tsx
    - src/features/sizing/BOMPanel.tsx
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
    - src/features/rack-elevation/utils/buildRackDevices.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts

key-decisions:
  - "inputStore version bumped to 6; existing merge spread { ...DEFAULT_INPUT, ...oldInput } handles switchPositioning migration without a new migration branch"
  - "buildPositioningRackDevices created as separate utility (not inline in buildRackDevices) — positioning rack is architecturally distinct from server rack"
  - "buildRackDevices made positioning-aware: MoR/BoR omit leaf devices from server racks (servers start at U2 instead of U4)"

patterns-established:
  - "Pattern 1: New Select form field requires updates to FormValues, defaultValues, form.reset(), and i18n in one atomic task"
  - "Pattern 2: ViolationAlert function uses if-chain pattern — new violation types added after RACK_CAPACITY_EXCEEDED case"

requirements-completed:
  - POS-01
  - POS-03
  - POS-04

# Metrics
duration: 15min
completed: 2026-03-18
---

# Phase 11 Plan 02: Switch Positioning UI Summary

**ToR/MoR/BoR selector wired into Zustand store v6, InputForm Physical section, BOMPanel violation/advisory, and 40 new i18n strings across 4 locales**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T11:22:00Z
- **Completed:** 2026-03-18T11:37:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- inputStore persists switchPositioning in localStorage with version 6
- Users can select ToR/MoR/BoR in the Physical section of InputForm
- BOMPanel shows DAC_POSITIONING_INCOMPATIBLE as destructive Alert when triggered
- BOMPanel shows cable length advisory text below cables table when recommendedCableLengthM > 0
- All 4 locale files have 10 new translation keys (sizing.switchPositioning, sizing.selectSwitchPositioning, sizing.positionToR, sizing.positionMoR, sizing.positionBoR, sizing.positioningHelp, bom.violationDacPositioningTitle, bom.violationDacPositioningBody, bom.cableLengthAdvisory, rack.positioningRack)
- buildRackDevices now positioning-aware: MoR/BoR racks omit leaf switches (moved to positioning rack)
- buildPositioningRackDevices utility created for dedicated positioning rack

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump inputStore to v6** - `4321235` (feat)
2. **Task 2: Wire switchPositioning into InputForm, BOMPanel, i18n, rack elevation** - `9a56352` (feat)

## Files Created/Modified
- `src/store/inputStore.ts` - version bumped to 6; JSDoc updated
- `src/features/sizing/InputForm.tsx` - switchPositioning FormField in Physical section, FormValues/defaultValues/form.reset updated
- `src/features/sizing/BOMPanel.tsx` - DAC_POSITIONING_INCOMPATIBLE Alert case, cableLengthAdvisory paragraph
- `src/i18n/locales/en/translation.json` - 10 new keys added
- `src/i18n/locales/fr/translation.json` - 10 new keys added
- `src/i18n/locales/de/translation.json` - 10 new keys added
- `src/i18n/locales/it/translation.json` - 10 new keys added
- `src/features/rack-elevation/utils/buildRackDevices.ts` - positioning-aware: MoR/BoR omit leaf from server rack
- `src/features/rack-elevation/utils/buildPositioningRackDevices.ts` - NEW: positioning rack leaf devices
- `src/features/rack-elevation/utils/buildRackDevices.test.ts` - committed pre-existing unstaged test additions from 11-01

## Decisions Made
- inputStore v6 uses the existing merge spread without a new migration branch — `{ ...DEFAULT_INPUT, ...oldInput }` fills in switchPositioning: 'ToR' for old persisted data automatically
- buildPositioningRackDevices created as a separate utility file, not embedded in buildRackDevices — positioning rack is a distinct architectural concept
- buildRackDevices made positioning-aware (MoR/BoR: servers start at U2, ToR: U4) — required to make rack elevation correct for non-ToR deployments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing buildPositioningRackDevices.ts**
- **Found during:** Task 2 (TypeScript check after i18n/form changes)
- **Issue:** `buildRackDevices.test.ts` had uncommitted changes from plan 11-01 that imported `./buildPositioningRackDevices` — this file was never created, causing TS2307 compile error
- **Fix:** Created `buildPositioningRackDevices.ts` implementing the function based on test expectations (2 leaf devices per rack); also made `buildRackDevices` positioning-aware to pass the MoR/BoR server rack test cases
- **Files modified:** `src/features/rack-elevation/utils/buildPositioningRackDevices.ts` (created), `src/features/rack-elevation/utils/buildRackDevices.ts` (modified), `src/features/rack-elevation/utils/buildRackDevices.test.ts` (staged uncommitted changes)
- **Verification:** `tsc --noEmit` clean, 335/335 vitest tests pass
- **Committed in:** `9a56352` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking missing file)
**Impact on plan:** Auto-fix was necessary to unblock TypeScript compilation. The buildPositioningRackDevices implementation follows the test specification from 11-01. No scope creep.

## Issues Encountered
- buildRackDevices.test.ts had 117 lines of uncommitted changes from plan 11-01 referencing a non-existent module — identified during tsc verification of Task 2

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- switchPositioning UI fully wired end-to-end through store, form, BOM panel, and rack elevation
- DAC_POSITIONING_INCOMPATIBLE violation and cableLengthAdvisory visible to users
- buildPositioningRackDevices ready for use in the rack elevation component when MoR/BoR layout is wired into RackElevation view
- Phase 12 (topology or rack elevation positioning visualization) can consume these utilities

---
*Phase: 11-switch-positioning-ethernet*
*Completed: 2026-03-18*
