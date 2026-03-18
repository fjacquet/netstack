---
phase: 14-fc-export
plan: 02
subsystem: export
tags: [pdf, fc, react-pdf, bom, topology]
dependency_graph:
  requires: [14-01, 13-02]
  provides: [FC PDF export, FCBOMPage, FCInputsPage, FCTopologyPage, FCViolationsPage, FCNetStackDocument, generateFCPdfBlob]
  affects: [ExportTab, export/index]
tech_stack:
  added: []
  patterns: [lazy dynamic import of @react-pdf/renderer, dual-fabric PDF pages, FC violations discriminated union rendering]
key_files:
  created:
    - src/features/export/exportFCPdf.ts
    - src/features/export/exportFCPdf.test.ts
    - src/features/export/pdf/FCBOMPage.tsx
    - src/features/export/pdf/FCInputsPage.tsx
    - src/features/export/pdf/FCTopologyPage.tsx
    - src/features/export/pdf/FCViolationsPage.tsx
    - src/features/export/pdf/FCNetStackDocument.tsx
  modified:
    - src/features/export/ExportTab.tsx
    - src/features/export/index.ts
decisions:
  - "FC PDF export lazy-loads @react-pdf/renderer via dynamic import — same pattern as Ethernet PDF; no bundle cost at page load"
  - "FCTopologyPage accepts separate pngFabricA/pngFabricB props and renders placeholders independently when either PNG is absent"
  - "FCBOMPage uses 7:1 fan-in threshold (Broadcom FC standard) vs Ethernet 6:1 — matches FCBOMPanel.tsx severity logic"
  - "ExportTab handlePdfExport now wraps both modes in try/finally so setPdfGenerating(false) always fires in FC mode too"
metrics:
  duration_min: 4
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 9
---

# Phase 14 Plan 02: FC PDF Export Summary

**One-liner:** FC PDF export with five @react-pdf/renderer page components (BOM, inputs, dual-fabric topology, violations) wired into ExportTab via lazy-loaded generateFCPdfBlob.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create FC PDF page components and generateFCPdfBlob | 8b8a11e | exportFCPdf.ts, exportFCPdf.test.ts, FCBOMPage.tsx, FCInputsPage.tsx, FCTopologyPage.tsx, FCViolationsPage.tsx, FCNetStackDocument.tsx |
| 2 | Wire FC PDF export into ExportTab and update index | f47237c | ExportTab.tsx, index.ts |

## What Was Built

### FC PDF Page Components

**FCBOMPage** (`src/features/export/pdf/FCBOMPage.tsx`):
- Fan-in oversubscription block with 7:1 threshold (Optimal/Acceptable/Critical severity)
- Dual-fabric switches table (Fabric A + Fabric B rows with fcSwitchModel)
- Optics and cables table (FC SFP optics, ISL cables)
- Conditional POD licenses section when `podLicensesRequired > 0`
- Port utilization block (host, storage, ISL, switch capacity per fabric)

**FCInputsPage** (`src/features/export/pdf/FCInputsPage.tsx`):
- FC sizing parameters table with 9 rows: rack count, total servers, HBA ports, storage target ports, storage arrays, switch model, ISL ports per switch, preferred generation, rack size

**FCTopologyPage** (`src/features/export/pdf/FCTopologyPage.tsx`):
- Separate Fabric A and Fabric B image blocks
- Individual placeholder text per fabric when PNG is absent: "Fabric X diagram not available — open the FC Topology tab before exporting."

**FCViolationsPage** (`src/features/export/pdf/FCViolationsPage.tsx`):
- Renders FC_PORT_SATURATION, FC_OVERSUBSCRIPTION_EXCEEDED, FC_ISL_UNDERPROVISIONED
- Same amber/gold violation block style as Ethernet ViolationsPage

**FCNetStackDocument** (`src/features/export/pdf/FCNetStackDocument.tsx`):
- Wraps CoverPage (reused from Ethernet) + FCInputsPage + FCBOMPage + FCTopologyPage + conditional FCViolationsPage
- Document title: "NetStack — FC Sizing Report"

### Generator and Test

**exportFCPdf.ts**: `generateFCPdfBlob(bom, pngFabricA?, pngFabricB?): Promise<Blob>` using dynamic imports.

**exportFCPdf.test.ts**: 2 tests — without PNGs and with both fabric PNGs.

### ExportTab Wiring

- Added `generateFCPdfBlob` and `getLastFCTopologyPng` imports
- `handlePdfExport` FC branch captures both fabric PNGs and downloads `netstack-fc-report.pdf`
- Ethernet path unchanged; `setPdfGenerating`/`setPdfError` now properly wrap both modes in try/finally

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] handlePdfExport FC mode skipped try/catch/finally**
- **Found during:** Task 2
- **Issue:** The original stub returned early before `setPdfGenerating(true)` — FC export had no loading state or error handling
- **Fix:** Restructured `handlePdfExport` to set loading state before the mode branch; both branches share the same try/catch/finally
- **Files modified:** src/features/export/ExportTab.tsx
- **Commit:** f47237c

### Pre-existing Out-of-Scope Issues

The following TypeScript errors existed before this plan and were not introduced by these changes (verified via `git stash` + `tsc`):
- `src/features/sizing/FCBOMPanel.test.tsx`: `switchPortsPerFabric` optional type mismatch, `minStoragePorts` missing
- `src/features/topology/fc/FCTopologyTab.test.tsx`: `switchPortsPerFabric` missing in mock

These are deferred to a future test-fix plan.

## Verification

- `npx vitest run src/features/export/exportFCPdf.test.ts` — 2/2 PASS
- `npx vitest run src/features/export/` — 21/21 PASS
- `npx vitest run` — 388/388 PASS, 0 failures
- `npx tsc --noEmit` — 3 pre-existing errors in unrelated test files; 0 new errors introduced

## Self-Check: PASSED

Files created/exist:
- src/features/export/exportFCPdf.ts — FOUND
- src/features/export/exportFCPdf.test.ts — FOUND
- src/features/export/pdf/FCBOMPage.tsx — FOUND
- src/features/export/pdf/FCInputsPage.tsx — FOUND
- src/features/export/pdf/FCTopologyPage.tsx — FOUND
- src/features/export/pdf/FCViolationsPage.tsx — FOUND
- src/features/export/pdf/FCNetStackDocument.tsx — FOUND

Commits exist:
- 8b8a11e — feat(14-fc-export-02): create FC PDF page components and generateFCPdfBlob — FOUND
- f47237c — feat(14-fc-export-02): wire FC PDF export into ExportTab and update index — FOUND
