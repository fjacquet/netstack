---
phase: 12-fc-input-and-bom-ui
plan: 02
subsystem: ui
tags: [react, fc, bom, i18n, vitest, zustand, cva, tailwind]

requires:
  - phase: 12-01
    provides: FCInputForm, FCSizingPage skeleton with placeholder, fcResultStore

provides:
  - FCBOMPanel component with Fabric A/B switch counts, ISL cables, FC optics, POD licenses, fan-in severity badge, violation Alerts
  - fc.* and fcbom.* i18n keys in all 4 locales (en, fr, de, it)
  - FCSizingPage wired — placeholder div replaced with FCBOMPanel
  - Complete FC sizing user journey: user enters FC inputs -> sees full FC BOM

affects:
  - phase-13-fc-topology (topology diagram reads from same fcResultStore)
  - phase-14-export (PDF export needs FCBOMPanel data shape)

tech-stack:
  added: []
  patterns:
    - FCViolationAlert inner function pattern — FC-specific discriminated union rendering, separate from Ethernet ViolationAlert
    - getFCSeverity with 7:1 FC threshold — Broadcom Gen7 fan-in max is 7:1 (Ethernet uses 6:1)
    - POD licenses as top-level TableRow — never hidden in tooltip or footnote
    - FC domain isolation — zero imports from resultStore, bom.ts, or BOMPanel.tsx in FC subtree

key-files:
  created:
    - src/features/sizing/fc/FCBOMPanel.tsx
    - src/features/sizing/FCBOMPanel.test.tsx
  modified:
    - src/features/sizing/fc/FCSizingPage.tsx
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json

key-decisions:
  - "FCViolationAlert renders FC_ISL_UNDERPROVISIONED with variant=warning (AlertTriangle), not destructive — ISL underprovisioning is advisory not critical"
  - "Fan-in test uses podLicensesRequired=7 to avoid ambiguity with fabricASwitches/fabricBSwitches default value of 2"
  - "POD license test uses getAllByText('/7/') rather than getByText('7') to handle fanInRatio=3.5:1 coexistence"

patterns-established:
  - "FC isolation: every FC component imports ONLY from @/store/fcResultStore and @/domain/schemas/fc-bom — never from Ethernet counterparts"
  - "Fan-in severity: getFCSeverity uses <= 7 threshold for FC (Broadcom standard), not <= 6 used by Ethernet"

requirements-completed: [FC-11]

duration: 15min
completed: 2026-03-18
---

# Phase 12 Plan 02: FC BOM UI Summary

**FCBOMPanel with per-fabric switch counts, POD license top-level row, fan-in severity badge (7:1 threshold), violation Alerts for all 3 FC error codes, and complete i18n coverage across 4 locales**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T14:15:00Z
- **Completed:** 2026-03-18T14:30:00Z
- **Tasks:** 3 (Task 0: test stub, Task 1: i18n, Task 2: component + wiring)
- **Files modified:** 7

## Accomplishments
- FCBOMPanel displays Fabric A and Fabric B switch counts as distinct labeled table rows
- POD licenses rendered as first-class visible TableRow — not a tooltip or footnote
- Fan-in severity badge uses FC 7:1 Broadcom threshold (distinct from Ethernet 6:1)
- All 3 FC violation types (FC_PORT_SATURATION, FC_OVERSUBSCRIPTION_EXCEEDED, FC_ISL_UNDERPROVISIONED) render as Alerts with role=alert
- Empty state card rendered when bom is null
- All 4 locales (en, fr, de, it) populated with fc.* (11 keys) and fcbom.* (19 keys)
- FCSizingPage placeholder div replaced with FCBOMPanel — FC user journey complete
- Full test suite: 355 tests green; tsc clean

## Task Commits

Each task was committed atomically:

1. **Task 0: FCBOMPanel.test.tsx Wave 0 stub** - `7eb9dc3` (test)
2. **Task 1: fc.* + fcbom.* i18n keys (4 locales)** - `5df24b7` (feat)
3. **Task 2: FCBOMPanel implementation + FCSizingPage wiring** - `d6dd033` (feat)

## Files Created/Modified
- `src/features/sizing/fc/FCBOMPanel.tsx` - FC BOM display panel wired to useFCResultStore; zero Ethernet domain imports
- `src/features/sizing/FCBOMPanel.test.tsx` - 11 tests covering all BOM fields and all 3 violation types
- `src/features/sizing/fc/FCSizingPage.tsx` - Wires FCBOMPanel in place of placeholder div
- `src/i18n/locales/en/translation.json` - Added fc.* and fcbom.* key groups
- `src/i18n/locales/fr/translation.json` - Added French fc.* and fcbom.* keys
- `src/i18n/locales/de/translation.json` - Added German fc.* and fcbom.* keys
- `src/i18n/locales/it/translation.json` - Added Italian fc.* and fcbom.* keys

## Decisions Made
- FC_ISL_UNDERPROVISIONED uses `variant="warning"` with AlertTriangle (not destructive) — this is advisory, not a hard failure
- POD license test uses a unique value (7) that avoids collision with other numeric BOM fields in the DOM
- Fan-in threshold at <= 7 for FC acceptable range — follows Broadcom Gen7 specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Test for `podLicensesRequired` required two adjustments: first using a value of 5 collided with `3.5` in the fanInRatio badge (regex /5/), then using `getAllByText` with value 7 worked cleanly since 7 doesn't appear elsewhere in the default BOM state.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FC sizing user journey complete: FCInputForm (12-01) + FCBOMPanel (12-02) both wired and tested
- FC topology diagram (Phase 13) can now proceed — fcResultStore provides the BOM data
- FC export (Phase 14) has the FCBOMPanel data shape confirmed

---
*Phase: 12-fc-input-and-bom-ui*
*Completed: 2026-03-18*
