---
phase: 14-fc-export
plan: "01"
subsystem: export
tags: [fc, csv, export, i18n, bom]
dependency_graph:
  requires:
    - src/domain/schemas/fc-bom.ts (FCNetworkBOM type)
    - src/domain/schemas/fc-input.ts (FCSizingInput type)
    - src/store/fcResultStore.ts (useFCResultStore)
    - src/features/export/exportCsv.ts (wrapCsvValue)
  provides:
    - src/features/export/exportFCCsv.ts (buildFCCsvString, downloadFCBomCsv)
    - Export tab visible in both Ethernet and FC modes
  affects:
    - src/App.tsx (export tab un-gated for both modes)
    - src/features/export/ExportTab.tsx (mode-aware)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for buildFCCsvString (11 test cases)
    - Mode-branching in ExportTab (mode prop, activeBom derivation)
    - i18n keys added to all 4 locales (fcCsvButton, fcPdfButton)
key_files:
  created:
    - src/features/export/exportFCCsv.ts
    - src/features/export/exportFCCsv.test.ts
  modified:
    - src/features/export/ExportTab.tsx
    - src/features/export/index.ts
    - src/App.tsx
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
decisions:
  - "ExportTab uses activeBom (mode-derived) for disabled/enabled state — avoids null checks on wrong store"
  - "FC PDF export stubbed in handlePdfExport for Plan 02 — branch exists, implementation deferred"
  - "All FC CSV rows use FC as Connectivity column value — matches plan requirement, never Ethernet or 25G"
  - "Export tab is un-gated in App.tsx (visible in both modes) — rackElevation stays Ethernet-only"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 9
requirements:
  - FC-13
---

# Phase 14 Plan 01: FC CSV Export and Mode-Aware Export Tab Summary

FC CSV export with dual-fabric BOM (Fabric A/B switches, optics, ISL cables, POD licenses) plus mode-aware ExportTab visible in both Ethernet and FC modes.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create exportFCCsv.ts and test file | b0dbb00 | exportFCCsv.ts, exportFCCsv.test.ts |
| 2 | Make ExportTab mode-aware, un-gate in App.tsx, add i18n keys | 0f87d6c | ExportTab.tsx, index.ts, App.tsx, 4x translation.json |

## What Was Built

**exportFCCsv.ts** provides two public functions:
- `buildFCCsvString(bom: FCNetworkBOM): string` — builds UTF-8 BOM + CRLF CSV with Fabric A section, Fabric B section, optics, ISL cables, conditional POD license row, fan-in note, and typed violation notes. All data rows have `FC` in the Connectivity column.
- `downloadFCBomCsv(bom: FCNetworkBOM): void` — triggers browser download as `netstack-fc-bom.csv`.

**ExportTab.tsx** now accepts `mode: 'ethernet' | 'fc'` prop and:
- Derives `activeBom` from mode (fcBom for FC, bom for Ethernet)
- Routes CSV export to `downloadFCBomCsv` in FC mode
- Stubs FC PDF branch for Plan 02
- Shows `fcCsvButton` / `fcPdfButton` labels in FC mode

**App.tsx** now renders the Export tab (TabsTrigger + TabsContent) for both modes, passing `mode` prop to `ExportTab`.

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- 11 new tests in exportFCCsv.test.ts — all pass
- 19 export tests total — all pass
- 386 total suite tests — all pass (no regressions)
- Pre-existing TypeScript errors in FCBOMPanel.test.tsx and FCTopologyTab.test.tsx (unrelated to this plan — switchPortsPerFabric/minStoragePorts missing in test mock objects from Phase 12/13)

## Self-Check: PASSED

- src/features/export/exportFCCsv.ts — FOUND
- src/features/export/exportFCCsv.test.ts — FOUND
- .planning/phases/14-fc-export/14-01-SUMMARY.md — FOUND
- Commit b0dbb00 — FOUND
- Commit 0f87d6c — FOUND
