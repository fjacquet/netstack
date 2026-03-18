# Changelog

All notable changes to NetStack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Progressive Web App (PWA) with offline support via vite-plugin-pwa + Workbox
- Service worker precaches all app assets for full offline functionality
- ReloadPrompt component notifies users when updates are available (i18n in all 4 languages)
- Installable from browser as standalone app (display: standalone, maskable icons)
- Release workflow (.github/workflows/release.yml) creates offline zip/tar.gz packages on tag push
- Portable offline build with relative asset paths (NETSTACK_BASE env var)

## [2.0.0] - 2026-03-18

### Added
- **Fibre Channel SAN sizing** — 9 Brocade/Broadcom switch models (G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8)
- Dual-fabric architecture — Fabric A and Fabric B sized independently, always redundant
- FC sizing engine: `calculateFCBOM()` pure function with ISL formula (7:1 Broadcom fan-in threshold)
- FC input form — HBA ports, storage targets, switch model selector, generation preference (Gen 7 64G / Gen 8 128G)
- FC BOM panel — per-fabric switch counts, ISL cables, SFP optics, POD licenses, oversubscription ratio
- FC topology diagram — dual-fabric ReactFlow canvases (Fabric A blue, Fabric B orange)
- FC CSV and PDF export with dedicated Fabric A/B sections and Protocol: FC column
- **Switch positioning** — ToR / MoR / BoR selector for Ethernet mode
- Cable length advisory adjusted by switch position
- DAC incompatibility violation for MoR/BoR with DAC cables
- Mode selector in top bar (Spine-Leaf / Fibre Channel)
- Architecture Decision Records: ADR-0009 through ADR-0016

### Changed
- Spine minimum reduced from 4 to 2 (ADR-0011)
- Export buttons moved to header — always accessible, no dedicated tab
- FC optics exported with Protocol: FC column to prevent procurement confusion

## [1.1.0] - 2026-03-18

### Added
- Per-rack server count configuration (variable density across racks)
- Explicit rack count field (not just derived from total servers)
- Frontend and backend port count per server (1-2 data ports, 0-2 storage ports)
- Active uplinks per leaf switch selector (1 to model maximum)
- Server U-height selector (1U, 2U, 4U, 8U)
- Rack capacity exceeded constraint violation (RACK_CAPACITY_EXCEEDED)
- Servers visible in rack elevation view with proportional U-height
- Spine switch model selector
- Border leaf switch model selector with configurable count

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
