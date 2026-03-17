# Changelog

All notable changes to NetStack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-03-17

### Added

- Pure sizing engine: `calculateBOM(SizingInput) -> NetworkBOM` with rack, leaf, spine, OOB, and cable calculations
- Hardware catalog: 5 Dell PowerSwitch models (S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON) with verified port counts and power specs
- JSON override for custom switch models at runtime via `mergeCatalog()` (fails fast on invalid entry)
- Constraint violations as typed discriminated unions: `OOB_PORT_SATURATION`, `SPINE_CAPACITY_EXCEEDED`, `DAC_DISTANCE_ADVISORY`
- Zod v4 schemas as the single source of truth for all TypeScript types (`SizingInput`, `NetworkBOM`, `ConstraintViolation`)
- Input form with live recalculation (no submit button) — results update on every keystroke
- Leaf switch model selector (S5248F-ON, S5224F-ON, S5212F-ON) with spine auto-calculated
- Cable type selector (DAC, AOC, Fiber) with per-type cable and transceiver quantities
- Bill of Materials panel with oversubscription badge (green <= 3:1, amber <= 6:1, red > 6:1)
- Switch quantities table with per-model port utilization progress bar
- Cable quantities table with VLT interconnect cables and transceiver line items for fiber
- Constraint violation alert cards (OOB saturation, spine capacity, DAC distance)
- Interactive topology diagram (@xyflow/react) with deterministic 3-tier layout (spines top, leaf pairs middle, racks bottom)
- Custom node types: leaf (blue), spine (purple), OOB (gray) with saturation border glow
- VLT interconnect edges between leaf pairs in the same rack
- Topology controls: Fit View, Reset Layout, Legend toggle
- Rack elevation view with U-slot numbering and drag-to-reorder device placement
- CSV export with UTF-8 BOM for Excel compatibility; includes switches, cables, and transceivers
- PDF report (lazy-loaded @react-pdf/renderer) with BOM summary, sizing inputs, and constraint alerts
- Print stylesheet (Ctrl+P) with clean layout — navigation controls hidden automatically
- Light/dark mode with system preference detection and localStorage persistence
- Internationalization: EN, FR, DE, IT via react-i18next with synchronous JSON imports
- Language switcher with localStorage persistence
- Responsive layout: side-by-side at 1280px+, stacked below 1280px (Tailwind xl: breakpoint)
- Zustand input store persisted to localStorage; result store derived via module-level subscription
- GitHub Pages deployment via GitHub Actions CI/CD pipeline
- Architecture Decision Records: ADR-0001 through ADR-0008
- Product Requirements Document (PRD) with all 28 v1 requirements and acceptance criteria
- User Guide with end-user documentation for all 4 tabs
