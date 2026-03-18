---
phase: 20-three-tier-export-i18n
plan: 01
subsystem: export
tags: [csv, pdf, react-pdf, three-tier, export, converged]

# Dependency graph
requires:
  - phase: 18-three-tier-domain
    provides: ThreeTierBOM schema, ThreeTierSizingInput schema, ThreeTierConstraintViolation discriminated union
  - phase: 19-three-tier-ui
    provides: useThreeTierResultStore, ThreeTierTopologyTab, 4-mode TopBar
  - phase: 17-converged-export-i18n
    provides: Converged CSV/PDF export pattern, ConvergedNetStackDocument
provides:
  - Three-tier standalone CSV export (buildThreeTierCsvRows, buildThreeTierCsvString, downloadThreeTierBomCsv)
  - Three-tier standalone PDF export (generateThreeTierPdfBlob, ThreeTierNetStackDocument)
  - Three-tier PDF pages (ThreeTierBOMPage, ThreeTierInputsPage, ThreeTierViolationsPage)
  - Converged CSV/PDF three-tier integration (topology=three-tier uses three-tier rows)
  - TopBar three-tier export dispatch (mode=three-tier branches for CSV and PDF)
affects: [20-three-tier-export-i18n]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-tier PDF dual-oversubscription display, ThreeTierViolationsPage separate from Ethernet ViolationsPage]

key-files:
  created:
    - src/features/export/exportThreeTierCsv.ts
    - src/features/export/exportThreeTierCsv.test.ts
    - src/features/export/exportThreeTierPdf.ts
    - src/features/export/exportThreeTierPdf.test.ts
    - src/features/export/pdf/ThreeTierBOMPage.tsx
    - src/features/export/pdf/ThreeTierInputsPage.tsx
    - src/features/export/pdf/ThreeTierNetStackDocument.tsx
    - src/features/export/pdf/ThreeTierViolationsPage.tsx
  modified:
    - src/features/export/exportConvergedCsv.ts
    - src/features/export/pdf/ConvergedNetStackDocument.tsx
    - src/features/export/index.ts
    - src/components/TopBar.tsx

key-decisions:
  - "ThreeTierViolationsPage separate from Ethernet ViolationsPage -- different discriminated union types cannot share renderer"
  - "Dual oversubscription display: access-aggr and aggr-to-core shown side-by-side with green/amber/red thresholds (3/5)"
  - "Converged CSV uses dynamic section label (Three-Tier vs Ethernet) based on which BOM is present"

patterns-established:
  - "Three-tier export pattern: parallel to Ethernet export with tier-specific CSV rows and PDF pages"
  - "ThreeTierViolationsPage: maps 5 violation codes to human-readable messages (AGGREGATION_CAPACITY_EXCEEDED, CORE_CAPACITY_EXCEEDED, OOB_PORT_SATURATION, DAC_DISTANCE_ADVISORY, RACK_CAPACITY_EXCEEDED)"

requirements-completed: [TEXP-01, TEXP-02]

# Metrics
duration: 6min
completed: 2026-03-18
---

# Phase 20 Plan 01: Three-Tier Export Summary

**Three-tier CSV/PDF export with 7-column BOM rows, dual-oversubscription PDF pages, converged mode integration, and TopBar wiring for standalone + converged three-tier downloads**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-18T22:45:58Z
- **Completed:** 2026-03-18T22:52:02Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Three-tier standalone CSV export with 7-column rows for access/aggregation/core switches, inter-tier cables, SFP28/QSFP28/QSFP56-DD transceivers, and 5 violation types
- Three-tier standalone PDF export with multi-page document: cover, inputs, BOM (dual oversubscription), topology, and violations
- Converged mode CSV/PDF conditionally uses three-tier BOM data when topology=three-tier
- TopBar dispatches to three-tier export functions in mode=three-tier with proper null guards

## Task Commits

Each task was committed atomically:

1. **Task 1: Three-tier standalone CSV export with TDD** - `bdc45a0` (feat)
2. **Task 2: Three-tier PDF export, converged integration, TopBar wiring** - `43d4288` (feat)

_Note: Task 1 used TDD (RED/GREEN phases)._

## Files Created/Modified

- `src/features/export/exportThreeTierCsv.ts` - buildThreeTierCsvRows, buildThreeTierCsvString, downloadThreeTierBomCsv
- `src/features/export/exportThreeTierCsv.test.ts` - 20 tests covering all CSV rows, violations, download trigger
- `src/features/export/exportThreeTierPdf.ts` - generateThreeTierPdfBlob with lazy-loaded @react-pdf/renderer
- `src/features/export/exportThreeTierPdf.test.ts` - 2 tests: blob generation with/without topology PNG
- `src/features/export/pdf/ThreeTierBOMPage.tsx` - BOM page with dual oversubscription ratios, switch/cable/transceiver tables
- `src/features/export/pdf/ThreeTierInputsPage.tsx` - Sizing parameters page for three-tier input display
- `src/features/export/pdf/ThreeTierNetStackDocument.tsx` - Document component assembling cover + inputs + BOM + topology + violations
- `src/features/export/pdf/ThreeTierViolationsPage.tsx` - Violations page for 5 three-tier constraint violation types
- `src/features/export/exportConvergedCsv.ts` - Updated to use buildThreeTierCsvRows when threeTierBom present
- `src/features/export/pdf/ConvergedNetStackDocument.tsx` - Conditional three-tier pages alongside Ethernet pages
- `src/features/export/index.ts` - Barrel exports for all new three-tier functions
- `src/components/TopBar.tsx` - mode=three-tier branches in handleCsv/handlePdf, useThreeTierResultStore

## Decisions Made

- **ThreeTierViolationsPage separate from ViolationsPage:** Ethernet ViolationsPage expects `ConstraintViolation[]` (Ethernet-specific discriminated union). Three-tier violations have different codes (AGGREGATION_CAPACITY_EXCEEDED, CORE_CAPACITY_EXCEEDED, RACK_CAPACITY_EXCEEDED) that cannot be rendered by the Ethernet violations page. Created a dedicated ThreeTierViolationsPage.
- **Dual oversubscription display:** ThreeTierBOMPage shows access-to-aggr and aggr-to-core ratios side-by-side with severity thresholds: green <= 3:1, amber 3-5:1, red > 5:1 (per Phase 19-01 decision).
- **Dynamic section labels in converged CSV:** When converged mode uses three-tier topology, the CSV section separator says "Section,Three-Tier" instead of "Section,Ethernet".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created ThreeTierViolationsPage for three-tier violations**
- **Found during:** Task 2 (PDF document component)
- **Issue:** Plan noted "check ViolationsPage props first" -- ViolationsPage expects Ethernet `ConstraintViolation[]` which is a different discriminated union than `ThreeTierConstraintViolation[]`
- **Fix:** Created ThreeTierViolationsPage.tsx mapping 5 three-tier violation codes to human-readable messages
- **Files modified:** src/features/export/pdf/ThreeTierViolationsPage.tsx
- **Verification:** TSC clean, all tests pass
- **Committed in:** 43d4288 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correct violation rendering. Plan anticipated this possibility. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Three-tier export complete for standalone and converged modes
- Ready for Phase 20 Plan 02 (i18n keys for three-tier export labels)
- No blockers

## Self-Check: PASSED

All 8 created files verified present. Both task commits (bdc45a0, 43d4288) verified in git log. 536 tests pass, TSC clean.

---
*Phase: 20-three-tier-export-i18n*
*Completed: 2026-03-18*
