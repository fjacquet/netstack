# Changelog

All notable changes to NetStack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [5.0.0] - 2026-03-19

### Added
- **Dedicated Input Page** — Full-page accordion form at `/#/input`, replacing the 320px sidebar. Sections collapse/expand with Rack Config open by default. All 3 modes get the accordion treatment: Ethernet (Rack Config / Switch Selection / Advanced), FC (Rack Config / Fabric Config / Advanced), Converged (Rack Config / Ethernet Switches / FC Fabric / Advanced).
- **URL-based navigation** — React Router (HashRouter) replaces tab-based navigation. All views are deep-linkable: `/#/` Results, `/#/input` Configure, `/#/topology` Topology, `/#/rack` Rack Elevation. Browser back/forward works across all views.
- **Nav strip** — Configure Inputs, Results, Topology, and Rack Elevation as NavLinks with active-route highlighting, replacing the old Tabs component.
- **Saved Configurations** — Save and load named input profiles persisted to localStorage. Profiles capture mode, topology, server count, and all input fields. CRUD via a slide-down ProfileManager panel accessible from the top bar folder icon (CFG-01 through CFG-06).
- **Existing Infrastructure toggles** — "Spines already deployed" (Clos) and "Core switches already deployed" (Three-Tier) brownfield toggles. BOM excludes already-deployed switches while preserving all cable quantities and oversubscription calculations (INFRA-01 through INFRA-04).
- **Unified Ethernet mode** — Spine-Leaf (Clos) and Three-Tier topologies merged into a single Ethernet mode with a topology selector dropdown. ModeSelector now shows 3 buttons: Ethernet, Fibre Channel, Converged (ETH-01 through ETH-05).
- **Three-Tier Ethernet topology** — Access / Aggregation / Core sizing with Dell Z-series switches (Z9264F-ON, Z9332F-ON, Z9432F-ON). Dedicated engine `calculateThreeTierBOM()` with 43 unit tests.
- Hardware catalog: 3 Dell Z-series switches (Z9264F-ON Aggregation, Z9332F-ON Core, Z9432F-ON Core) for Three-Tier topology.
- Architecture Decision Records: ADR-0018 through ADR-0022 (Unified Ethernet, Brownfield Toggle, Named Configurations, React Router, Accordion Input Page).
- i18n labels for all v5.0 features in EN, FR, DE, IT.

### Changed
- Mode selector reduced from 4 to 3 buttons — Three-Tier absorbed into Ethernet mode (topology selector within Ethernet).
- `inputStore` bumped to version 8 with topology field, brownfield toggle fields, and automatic migration from v6/v7.
- Brownfield post-processing in `resultStore` (not engine) — keeps `calculateBOM` / `calculateThreeTierBOM` pure.
- Standalone Three-Tier mode (stores, dedicated page, components) removed — dead code cleanup.
- `InputForm.tsx` and `SizingPage.tsx` replaced by `InputPage.tsx` + accordion components and `ResultsPage.tsx`.

## [4.0.0] - 2026-03-19

### Added
- **Three-Tier Ethernet topology** — Access / Aggregation / Core switch sizing as a fourth mode (later merged into Ethernet in v5.0).
- `calculateThreeTierBOM()` pure engine function with 43 unit tests (TDD red → green).
- Three-Tier BOM panel, topology diagram, rack elevation, and CSV / PDF export.
- Three-Tier i18n labels in EN, FR, DE, IT.
- Hardware catalog: Dell Z9264F-ON (aggregation), Z9332F-ON (core), Z9432F-ON (core).
- Architecture Decision Records through ADR-0017.

## [3.0.0] - 2026-03-18

### Added
- **Converged mode** — Unified sizing of Ethernet + Fibre Channel from a single input form. FC is optional (set HBA ports to 0 for Ethernet-only output).
- `calculateConvergedBOM()` engine composes `calculateBOM()` + `calculateFCBOM()` — zero logic duplication.
- Converged BOM panel, dual topology diagrams (Ethernet + FC), rack elevation, and CSV / PDF export.
- Converged i18n labels in EN, FR, DE, IT.

## [2.1.0] - 2026-03-18

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
