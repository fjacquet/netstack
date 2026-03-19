# Milestones

## v6.0 Physical Planning (Shipped: 2026-03-19)

**Phases completed:** 4 phases, 6 plans, 3 tasks

**Key accomplishments:**

- (none recorded)

---

## v5.0 Unified Ethernet & Configurations (Shipped: 2026-03-19)

**Phases completed:** 4 phases (21-24), 8 plans | 15/15 requirements satisfied | 552 tests
**Timeline:** 1 day (2026-03-19)

**Key accomplishments:**

- Unified Ethernet mode — Clos (Spine-Leaf) and Three-Tier merged into a single mode with topology selector; ModeSelector reduced from 4 to 3 buttons
- Brownfield toggles — "Spines already deployed" (Clos) and "Core switches already deployed" (Three-Tier); BOM excludes existing switches, preserves cable quantities and oversubscription calculations
- Named configuration profiles — save/load/delete/list input profiles persisted to localStorage; ProfileManager slide-down panel in TopBar
- Dedicated full-page accordion input form at `/#/input` for all 3 modes; sections: Rack Config / Switch Selection / Advanced (Ethernet), Rack Config / Fabric Config / Advanced (FC), Rack Config / Ethernet Switches / FC Fabric / Advanced (Converged)
- React Router (HashRouter) — all views deep-linkable (`/#/`, `/#/input`, `/#/topology`, `/#/rack`); browser back/forward works; nav strip replaces Tabs
- Architecture Decision Records: ADR-0018 through ADR-0022

---

## v4.0 Three-Tier Topology (Shipped: 2026-03-19)

**Phases completed:** 3 phases, 8 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v4.0 Three-Tier Topology (In Progress)

**Phases planned:** 3 phases (18-20), 18 requirements

**Target features:**

- Core/Aggregation/Access (3-tier) topology as standalone mode and Converged option
- Z-series switches (Z9264F-ON, Z9332F-ON, Z9432F-ON) in hardware catalog
- 3-tier sizing engine with per-boundary oversubscription
- Hierarchical topology diagram (tree layout)
- CSV/PDF export with 3-tier sections
- i18n labels for all 4 locales

---

## v3.0 Converged Mode (Shipped: 2026-03-18)

**Phases completed:** 3 phases, 7 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v2.0 FC SAN and Switch Positioning (Shipped: 2026-03-18)

**Phases completed:** 7 phases (8-14), 16 plans | 165 commits | ~15,000 LOC TypeScript | 388 tests
**Timeline:** 1 day (2026-03-18)

**Key accomplishments:**

- Fibre Channel SAN sizing engine with 9 Brocade switch models (Gen 7 64G + Gen 8 128G)
- Dual-fabric architecture (Fabric A + Fabric B), always redundant
- POD licensing model with basePorts and podLicenseUnit per switch
- ISL calculation with 7:1 Broadcom fan-in threshold
- FC topology diagram with dual-fabric ReactFlow canvases
- FC CSV and PDF export with Protocol: FC column
- Switch positioning selector (ToR / MoR / BoR) for Ethernet mode
- Mode selector in top bar (Spine-Leaf / Fibre Channel)
- Architecture Decision Records: ADR-0009 through ADR-0016

---

## v1.1 Enhancements (Shipped: 2026-03-18)

**Phases completed:** 3 phases (5-7), 8 plans | 11 requirements satisfied
**Timeline:** 1 day (2026-03-18)

**Key accomplishments:**

- Per-rack server count configuration (variable density)
- Frontend/backend port count per server
- Active uplinks per leaf switch selector
- Server U-height (1U/2U/4U/8U) with rack capacity exceeded violation
- Servers visible in rack elevation with proportional height
- Spine and border leaf switch model selectors

---

## v1.0 MVP (Shipped: 2026-03-17)

**Phases completed:** 4 phases, 13 plans | 50 commits | 6,990 LOC TypeScript | 144 tests
**Timeline:** 2 days (2026-03-16 -> 2026-03-17)

**Key accomplishments:**

- Pure sizing engine (`calculateBOM`) with rack/leaf/spine/OOB/cable/transceiver/VLT calculations
- Live input form with Zod validation, selectable leaf/spine/border leaf models, rack sizes (24U/42U/50U)
- Interactive topology diagram (@xyflow/react) with rack-based column layout and saturation border coloring
- Rack elevation view with server + network racks, U-slot numbering, HTML5 drag-to-reorder
- Export pipeline: CSV (UTF-8 BOM), PDF (Helvetica via @react-pdf/renderer), print stylesheet (force light, auto-fit)
- Full i18n (EN/FR/DE/IT), light/dark with system preference detection, responsive layout (768px+/1280px+)
- 8 Architecture Decision Records, PRD, User Guide, Changelog
- GitHub Pages deployment via GitHub Actions

---
