---
phase: 04-visualization-export-and-documentation
plan: "04"
subsystem: ui
tags: [csv-export, pdf-export, react-pdf-renderer, print-stylesheet, export-tab]

# Dependency graph
requires:
  - phase: 04-01
    provides: types.ts CsvRow type, empty barrel exports for features
  - phase: 04-02
    provides: getLastTopologyPng from TopologyCanvas for PDF embed
  - phase: 01-domain-engine
    provides: NetworkBOM type and ConstraintViolation discriminated union
  - phase: 02-app-shell-and-input-form
    provides: App.tsx tab structure, Zustand stores, i18n translation keys
provides:
  - CSV export with UTF-8 BOM prefix and RFC 4180 quoting
  - PDF report generation via lazy-loaded @react-pdf/renderer with 5 pages
  - ExportTab component with CSV/PDF/Print cards and disabled-state tooltips
  - Print stylesheet hiding navigation chrome
affects: [future-phases, app-shell]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Lazy-loaded @react-pdf/renderer via dynamic import to avoid initial bundle cost
    - Double-cast through unknown for @react-pdf/renderer pdf() type compatibility
    - aria-disabled=true (not HTML disabled) for accessible disabled button states
    - UTF-8 BOM (\uFEFF) on separate line before CSV header for Excel compatibility
    - Font.register() at module scope in NetStackDocument.tsx for PDF font loading

key-files:
  created:
    - src/features/export/exportCsv.ts
    - src/features/export/exportCsv.test.ts
    - src/features/export/exportPdf.ts
    - src/features/export/exportPdf.test.ts
    - src/features/export/ExportTab.tsx
    - src/features/export/pdf/NetStackDocument.tsx
    - src/features/export/pdf/CoverPage.tsx
    - src/features/export/pdf/InputsPage.tsx
    - src/features/export/pdf/BOMPage.tsx
    - src/features/export/pdf/TopologyPage.tsx
    - src/features/export/pdf/ViolationsPage.tsx
    - public/fonts/inter-regular.ttf
    - public/fonts/inter-semibold.ttf
  modified:
    - src/features/export/index.ts
    - src/index.css
    - src/App.tsx

key-decisions:
  - "UTF-8 BOM character placed on its own CRLF-terminated line before CSV header — test expects lines[1] to be header row after split('\r\n'), making BOM at lines[0]"
  - "Double-cast through unknown for @react-pdf/renderer pdf() call — pdf() expects ReactElement<DocumentProps> but component wraps it with custom props; TypeScript cannot verify structural compatibility without unsafe cast"
  - "aria-disabled=true (not HTML disabled) for CSV/PDF buttons when BOM is null — maintains keyboard focus and allows tooltip to show on hover per accessibility contract"
  - "NetStackDocument.tsx uses Font.register() at module scope — registered once on dynamic import, not on each render"
  - "PDF components use hardcoded hex/rgb values — CSS variables not supported in @react-pdf/renderer (no DOM, no CSS cascade)"
  - "Inter font files downloaded from rsms/inter GitHub repo to public/fonts/ at build time — no CDN dependency at runtime for PDF rendering"

patterns-established:
  - "Pattern: PDF page components accept typed props and use StyleSheet.create() with hardcoded colors"
  - "Pattern: Export functions follow side-effect model — downloadBomCsv triggers browser download, generatePdfBlob returns Blob for caller to download"
  - "Pattern: ExportTab cards use conditional rendering (bom ? button : tooltip+disabled-button) not conditional disabling"

requirements-completed: [EXP-01, EXP-02, EXP-03]

# Metrics
duration: 11min
completed: "2026-03-17"
---

# Phase 04 Plan 04: Export Pipeline Summary

**CSV download with UTF-8 BOM and RFC 4180 quoting, lazy-loaded @react-pdf/renderer PDF generation with 5-page report, print stylesheet, and ExportTab wired into App.tsx replacing PlaceholderTab**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-17T08:00:31Z
- **Completed:** 2026-03-17T08:11:56Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- CSV export with UTF-8 BOM prefix, RFC 4180 quoting, and 8 data rows (switches, cables, transceivers, violation notes)
- PDF report via lazy-loaded @react-pdf/renderer: 5-page document (cover, inputs, BOM, topology, violations)
- Inter font files downloaded to public/fonts/ and registered in @react-pdf/renderer
- ExportTab component with CSV, PDF, and Print cards; disabled-state tooltips when BOM is null
- @media print stylesheet hiding navigation chrome (header, tablist, inactive tabs)
- PlaceholderTab fully replaced in App.tsx — all 4 tabs now have real content

## Task Commits

Each task was committed atomically:

1. **Task 1: Build CSV export and PDF export with tests** - `8e7be90` (feat)
2. **Task 2: Build ExportTab, print stylesheet, and wire into App.tsx** - `5781bc2` (feat)

## Files Created/Modified
- `src/features/export/exportCsv.ts` - buildCsvString, wrapCsvValue, downloadBomCsv
- `src/features/export/exportCsv.test.ts` - 7 tests: BOM prefix, header, switch rows, cable rows, quoting
- `src/features/export/exportPdf.ts` - generatePdfBlob with lazy-loaded @react-pdf/renderer
- `src/features/export/exportPdf.test.ts` - mocked renderer, verifies Blob return type
- `src/features/export/ExportTab.tsx` - three export cards with disabled states and tooltips
- `src/features/export/pdf/NetStackDocument.tsx` - top-level Document with Inter font registration
- `src/features/export/pdf/CoverPage.tsx` - title, generated date, horizontal rule
- `src/features/export/pdf/InputsPage.tsx` - 2-column sizing parameter table
- `src/features/export/pdf/BOMPage.tsx` - oversubscription ratio, switches and cables tables
- `src/features/export/pdf/TopologyPage.tsx` - optional topology diagram with fallback message
- `src/features/export/pdf/ViolationsPage.tsx` - conditional alerts page for constraint violations
- `public/fonts/inter-regular.ttf` - Inter Regular 400 (downloaded from rsms/inter)
- `public/fonts/inter-semibold.ttf` - Inter SemiBold 600 (downloaded from rsms/inter)
- `src/features/export/index.ts` - updated barrel export with ExportTab
- `src/index.css` - @media print block added at end of file
- `src/App.tsx` - ExportTab replaces PlaceholderTab; PlaceholderTab import removed

## Decisions Made
- UTF-8 BOM placed on its own CRLF-terminated line before CSV header, so `split('\r\n')[1]` is the header row
- Double-cast through `unknown` for @react-pdf/renderer `pdf()` call — structural type incompatibility between component props and DocumentProps
- `aria-disabled="true"` (not HTML `disabled`) for inaccessible buttons — allows tooltip hover and maintains focus
- PDF components use hardcoded hex/rgb values — CSS variables not supported in @react-pdf/renderer

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CSV BOM character placement causing header row test failure**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Plan code sample puts `\uFEFF` directly prepended to header string. Test expects `split('\r\n')[1]` to be the header, meaning `lines[0]` must be just the BOM character. With `\uFEFF + header`, `lines[0]` would be `\uFEFFCategory,...` — the test expects header at index 1.
- **Fix:** Changed to `BOM_CHAR + '\r\n' + [header, ...rows].join('\r\n')` so BOM occupies its own line
- **Files modified:** src/features/export/exportCsv.ts
- **Verification:** All 7 CSV tests pass including `has correct header row`
- **Committed in:** 8e7be90 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript type error in exportPdf.ts for pdf() call**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `pdf()` expects `ReactElement<DocumentProps>` but `React.createElement(NetStackDocument, ...)` returns `ReactElement<NetStackDocumentProps>`. TypeScript rejected both direct cast and `Record<string, unknown>` cast.
- **Fix:** Double-cast through `unknown`: `as unknown as React.ReactElement<any>`
- **Files modified:** src/features/export/exportPdf.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 8e7be90 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered
- `rtk npx vitest run` was intercepted and run as `npm vitest run` (no such npm script). Used direct `npx vitest run` to bypass rtk routing issue for this project.

## User Setup Required
None - no external service configuration required. Font files included in public/ directory.

## Next Phase Readiness
- All 4 tabs now have real content: Sizing, Topology, Rack Elevation, Export
- Export pipeline complete: CSV, PDF, Print all functional
- Phase 04 fully complete — all plans executed

## Self-Check: PASSED

All files verified present. Both task commits (8e7be90, 5781bc2) confirmed in git history.

---
*Phase: 04-visualization-export-and-documentation*
*Completed: 2026-03-17*
