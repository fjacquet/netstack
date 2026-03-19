---
phase: 27-ui-i18n
plan: "01"
subsystem: ui-i18n
tags: [i18n, ui, advisory, geometry, accordion, bom]
dependency_graph:
  requires: [25-01, 26-02]
  provides: [PHYS-04]
  affects: [src/features/input, src/features/sizing, src/i18n]
tech_stack:
  added: []
  patterns: [amber-advisory-card, conditional-form-field, debounced-number-input]
key_files:
  created:
    - src/features/sizing/AdvisoryAlert.tsx
  modified:
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
    - src/features/input/EthInputAccordion.tsx
    - src/features/input/ConvergedInputAccordion.tsx
    - src/features/sizing/BOMPanel.tsx
decisions:
  - "patchPanelDistanceM field is conditionally rendered only when racksAdjacent is false, consistent with UX spec"
  - "racksAdjacent boolean flows through immediate-sync rest spread (not debounced), same pattern as existingSpinesDeployed"
  - "rackPitchMm and patchPanelDistanceM are added to debounced numeric branch, not immediate-sync"
  - "Advisory sections appear in both Clos (Section E) and Three-Tier (Section G) in BOMPanel"
metrics:
  duration: 4m28s
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_modified: 7
  files_created: 1
---

# Phase 27 Plan 01: UI i18n — Geometry Inputs and Advisory Cards Summary

Wire geometry inputs (rackPitchMm, racksAdjacent, patchPanelDistanceM) into Ethernet and Converged accordion forms, create amber AdvisoryAlert component for PATCH_PANEL_RECOMMENDED advisory, render advisories in BOMPanel, and add 9 i18n keys in EN/FR/DE/IT.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add i18n keys and create AdvisoryAlert component | fa79c9e | 5 files |
| 2 | Wire geometry fields into accordions and advisory rendering into BOMPanel | 8249328 | 3 files |

## What Was Built

### i18n Keys (4 locales × 9 keys = 36 new keys)

Under `sizing` namespace (6 keys per locale):
- `rackPitchMm` / `rackPitchMmHelp` — rack pitch number input
- `racksAdjacent` / `racksAdjacentHelp` — adjacent racks checkbox
- `patchPanelDistanceM` / `patchPanelDistanceMHelp` — conditional patch panel distance

Under `bom` namespace (3 keys per locale):
- `advisoriesHeading` — section heading for advisory cards
- `advisoryPatchPanelTitle` — patch panel advisory card title
- `advisoryPatchPanelBody` — patch panel advisory body with `{{computedDistanceM}}` and `{{dacLimitM}}` interpolation

### AdvisoryAlert Component

Created `/Users/fjacquet/Projects/network-sizer/src/features/sizing/AdvisoryAlert.tsx`:
- Named export `AdvisoryAlert({ a: Advisory })`
- Handles `PATCH_PANEL_RECOMMENDED` code with `variant="warning"` (amber) Alert
- Uses `AlertTriangle` icon from lucide-react
- Returns `null` for unknown codes (future-proof)

### EthInputAccordion.tsx

- Extended `FormValues` interface with `rackPitchMm: number`, `racksAdjacent: boolean`, `patchPanelDistanceM: number`
- Extended `defaultValues` from `input.rackPitchMm`, `input.racksAdjacent`, `input.patchPanelDistanceM`
- Added `watchedRacksAdjacent = form.watch('racksAdjacent')`
- Added `rackPitchMm` and `patchPanelDistanceM` to debounced numeric branch
- Added `rackPitchMm: _rpm, patchPanelDistanceM: _ppd` to immediate-sync exclusion list
- Added 3 FormFields in rack-config section:
  - `data-testid="rack-pitch-mm"` number input
  - `data-testid="racks-adjacent-toggle"` checkbox
  - `data-testid="patch-panel-distance"` conditional number input (only when `!watchedRacksAdjacent`)

### ConvergedInputAccordion.tsx

Same pattern as EthInputAccordion applied to converged form.

### BOMPanel.tsx

- Added `import { AdvisoryAlert } from './AdvisoryAlert'`
- Added Section E (Advisories) in Clos branch after Section D (Violations)
- Added Section G (Advisories) in ThreeTierBOMContent after Section F (Violations)
- Both sections use `(bom.advisories ?? []).map((a, i) => <AdvisoryAlert key={...} a={a} />)`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

```
rackPitchMm in all 4 locale files: PASS (2 matches each — key + help key)
advisoriesHeading in all 4 locale files: PASS
AdvisoryAlert appearances in BOMPanel: 3 (import + 2 renders)
Geometry fields in EthInputAccordion: 20 references
npx tsc --noEmit: PASS (0 errors)
npx vitest run: PASS (616 tests, 0 failures)
```

## Self-Check: PASSED

- AdvisoryAlert.tsx: FOUND
- 27-01-SUMMARY.md: FOUND
- Commit fa79c9e: FOUND
- Commit 8249328: FOUND
