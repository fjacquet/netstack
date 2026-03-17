---
phase: 04-visualization-export-and-documentation
plan: 01
subsystem: ui
tags: [xyflow, react-pdf, html-to-image, shadcn, i18n, typescript, vitest]

requires:
  - phase: 03-bom-output-and-metrics
    provides: NetworkBOM, ConstraintViolation types, BOMPanel getProgressColor threshold pattern

provides:
  - "@xyflow/react, @react-pdf/renderer, html-to-image installed and importable"
  - "shadcn Popover and ScrollArea components in src/components/ui/"
  - "SwitchNodeData, RackNodeData, TopologyGraphResult type contracts"
  - "RackDevice type contract"
  - "CsvRow type contract"
  - "getSaturationLevel and getSaturationBorderClass helpers with 7 tests"
  - "topology.*, rack.*, export.* i18n namespaces in all 4 locales (EN, FR, DE, IT)"

affects:
  - 04-02-topology-diagram
  - 04-03-rack-elevation
  - 04-04-csv-export
  - 04-05-pdf-export

tech-stack:
  added:
    - "@xyflow/react ^12.10.1 — interactive topology graph"
    - "@react-pdf/renderer ^4.3.2 — PDF generation (must be lazy-loaded)"
    - "html-to-image ^1.11.13 — PNG/SVG capture of DOM elements"
    - "@radix-ui/react-popover — via shadcn popover"
    - "@radix-ui/react-scroll-area — via shadcn scroll-area"
  patterns:
    - "SaturationLevel discriminated union ('healthy' | 'warning' | 'saturated') mirrors BOMPanel getProgressColor thresholds"
    - "Empty barrel index.ts files act as stable import targets for Plans 02-05 to populate"
    - "Types inferred from usage context (not Zod schemas) for pure UI contracts (SwitchNodeData, RackDevice, CsvRow)"

key-files:
  created:
    - src/features/topology/types.ts
    - src/features/topology/index.ts
    - src/features/topology/utils/saturation.ts
    - src/features/topology/utils/saturation.test.ts
    - src/features/rack-elevation/types.ts
    - src/features/rack-elevation/index.ts
    - src/features/export/types.ts
    - src/features/export/index.ts
    - src/components/ui/popover.tsx
    - src/components/ui/scroll-area.tsx
  modified:
    - package.json
    - package-lock.json
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json

key-decisions:
  - "getSaturationBorderClass uses border- prefix (not bg-) — topology nodes use border colors to show saturation on node outline, not fill"
  - "Empty barrel index.ts files created for topology, rack-elevation, export — Plans 02-05 populate them without creating new barrel files"
  - "CsvRow.category typed as 'Switch' | 'Cable' | 'Transceiver' discriminated union — enables exhaustive switch in CSV generator"

patterns-established:
  - "Saturation thresholds: pct < 80 = healthy (green hsl 142), 80 <= pct < 100 = warning (amber hsl 38), pct >= 100 = saturated (destructive)"
  - "Feature barrel pattern: types.ts exported from index.ts, populated incrementally as feature plans execute"

requirements-completed: [VIZ-03]

duration: 4min
completed: 2026-03-17
---

# Phase 4 Plan 01: Foundation — Dependencies, Types, Saturation Helper, and i18n Summary

**@xyflow/react + @react-pdf/renderer installed, type contracts for topology/rack/export defined, saturation color helper TDD-tested at 80%/100% thresholds, and 48 i18n keys added across EN/FR/DE/IT**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T06:56:18Z
- **Completed:** 2026-03-17T07:00:14Z
- **Tasks:** 2 (+ TDD sub-commits)
- **Files modified:** 16

## Accomplishments

- Installed 3 new dependencies (@xyflow/react, @react-pdf/renderer, html-to-image) plus shadcn popover and scroll-area components
- Defined TypeScript type contracts for topology (SwitchNodeData, RackNodeData, TopologyGraphResult), rack elevation (RackDevice), and export (CsvRow) features
- Created saturation color helper via TDD: 7 tests cover healthy/warning/saturated thresholds and zero-division edge case
- Populated all 4 locale files (EN, FR, DE, IT) with topology, rack, and export namespace keys — 48 keys total

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and shadcn components, define type contracts** - `3a297fc` (feat)
2. **Task 2 RED: Failing tests for saturation helper** - `3f1d411` (test)
3. **Task 2 GREEN: Implement saturation helper** - `5a61c94` (feat)
4. **Task 2 i18n: Add Phase 4 locale keys** - `eb42600` (feat)

## Files Created/Modified

- `src/features/topology/types.ts` — SwitchNodeData, RackNodeData, TopologyGraphResult contracts
- `src/features/topology/index.ts` — Empty barrel (Plan 02 will populate)
- `src/features/topology/utils/saturation.ts` — getSaturationLevel, getSaturationBorderClass
- `src/features/topology/utils/saturation.test.ts` — 7 TDD test cases
- `src/features/rack-elevation/types.ts` — RackDevice contract
- `src/features/rack-elevation/index.ts` — Empty barrel (Plan 03 will populate)
- `src/features/export/types.ts` — CsvRow contract
- `src/features/export/index.ts` — Empty barrel (Plan 05 will populate)
- `src/components/ui/popover.tsx` — shadcn Popover, PopoverTrigger, PopoverContent
- `src/components/ui/scroll-area.tsx` — shadcn ScrollArea, ScrollBar
- `package.json` — Added @xyflow/react, @react-pdf/renderer, html-to-image
- `src/i18n/locales/en/translation.json` — topology, rack, export namespaces
- `src/i18n/locales/fr/translation.json` — topology, rack, export namespaces (French)
- `src/i18n/locales/de/translation.json` — topology, rack, export namespaces (German)
- `src/i18n/locales/it/translation.json` — topology, rack, export namespaces (Italian)

## Decisions Made

- `getSaturationBorderClass` uses `border-` prefix rather than `bg-` — topology nodes show saturation via border outline, not fill background
- Empty barrel `index.ts` files created immediately so Plans 02-05 can populate them without structural changes
- `CsvRow.category` typed as discriminated union `'Switch' | 'Cable' | 'Transceiver'` to enable exhaustive switch in the CSV generator

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all shadcn commands installed cleanly, TypeScript compiled without errors on first attempt, all 7 saturation tests passed in GREEN phase.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 02-05 can now proceed in parallel: type contracts are stable, shadcn components are installed, i18n keys are present
- Plan 02 (topology diagram) should import from `src/features/topology/types.ts` and populate `src/features/topology/index.ts`
- Plan 03 (rack elevation) should import from `src/features/rack-elevation/types.ts`
- Plan 04 (CSV export) can use CsvRow from `src/features/export/types.ts`
- Plan 05 (PDF export) can lazy-load @react-pdf/renderer as per CLAUDE.md requirement

---
*Phase: 04-visualization-export-and-documentation*
*Completed: 2026-03-17*
