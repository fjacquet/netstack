# Roadmap: NetStack

## Overview

NetStack is built domain-first: the pure sizing engine is validated in isolation before any UI is placed on top of it. Once the engine produces correct BOMs, a thin React shell exposes inputs, then BOM output, then the final phase adds visualizations, export, and documentation.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Domain Engine** - Pure sizing logic and hardware catalog — no UI, fully testable in isolation (completed 2026-03-16)
- [x] **Phase 2: App Shell and Input Form** - Project scaffold, Zustand stores, and parameterized input form (completed 2026-03-17)
- [x] **Phase 3: BOM Output and Metrics** - Switch/cable quantities, oversubscription ratios, port saturation alerts (completed 2026-03-17)
- [ ] **Phase 4: Visualization, Export and Documentation** - Topology diagram, rack elevation, CSV/PDF/print export, ARD, PRD, user guide, changelog

## Phase Details

### Phase 1: Domain Engine

**Goal**: The sizing engine produces correct, validated BOMs from inputs before any UI exists
**Depends on**: Nothing (first phase)
**Requirements**: SIZE-02, SIZE-03, SIZE-04, SIZE-05, SIZE-06, SIZE-07, CAT-01, CAT-02, CAT-03
**Success Criteria** (what must be TRUE):

  1. Given server count and rack density, the engine returns accurate rack, leaf, spine, and OOB switch counts verified against manual calculations
  2. Spine count scales with leaf count (never hardcoded to 2) and the engine returns a typed constraint violation when leaf count exceeds S5232F-ON port capacity
  3. OOB port saturation produces a typed ConstraintViolation (not a UI string) when servers-per-rack + 2 exceeds 48
  4. Cable quantities are computed from link counts (not port sums), and a Vitest unit test confirms the formula for at least 3 rack configurations
  5. All three switch models (S5248F-ON, S5232F-ON, S3248T-ON) exist in the hardware catalog as typed TypeScript constants with correct port counts, speeds, and power specs
**Plans:** 3/3 plans complete
Plans:

- [x] 01-01-PLAN.md — Project scaffold, hardware catalog, and Zod schemas
- [x] 01-02-PLAN.md — Sizing engine implementation with TDD
- [x] 01-03-PLAN.md — Catalog JSON override merge with validation

### Phase 2: App Shell and Input Form

**Goal**: Engineers can open the app, enter sizing parameters, and see the engine running live in the browser
**Depends on**: Phase 1
**Requirements**: SIZE-01, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):

  1. User can enter total server count, servers per rack, and connectivity type (25G/100G) into an input form with inline Zod validation error messages
  2. Changing any input immediately triggers engine recalculation and the result is reflected in the UI without a page reload
  3. Light/dark mode toggle switches theme, and system preference is detected on first load
  4. Language switcher changes the UI language between FR, EN, DE, and IT without data loss
  5. Layout is usable on tablet-width viewports (768px+) and desktop viewports (1280px+)
  6. GitHub Actions workflow builds and deploys the app to GitHub Pages on push to main
**Plans:** 3/3 plans complete
Plans:

- [x] 02-01-PLAN.md — Project scaffold (React + Vite + shadcn/ui) and domain schema extension for leafModel
- [x] 02-02-PLAN.md — Zustand stores, i18n bootstrap with 4 locales, and ThemeProvider
- [x] 02-03-PLAN.md — App shell, input form, language/theme controls, CI/CD deployment

### Phase 3: BOM Output and Metrics

**Goal**: Engineers can read the complete BOM with oversubscription ratios, port utilization, and saturation alerts from a single panel
**Depends on**: Phase 2
**Requirements**: BOM-01, BOM-02, BOM-03, BOM-04
**Success Criteria** (what must be TRUE):

  1. BOM table displays per-model switch quantities grouped by category (Leaf, Spine, OOB) with S5248F-ON, S5232F-ON, and S3248T-ON rows
  2. Oversubscription ratio is displayed as "N:1" format with color coding: green for <=3:1, amber for 3:1-6:1, red for >6:1
  3. User can select cable type (DAC, AOC, fiber) and the BOM immediately reflects updated cable quantities and SKU category
  4. Port utilization (used vs. available) is shown per switch model, and OOB saturation triggers a visible alert badge when ports exceed 48
**Plans:** 2/2 plans complete
Plans:

- [ ] 03-01-PLAN.md — Install shadcn components (table, alert, tooltip, progress), extend alert/progress, add TooltipProvider, populate BOM i18n keys
- [ ] 03-02-PLAN.md — Build BOMPanel component with switches/cables tables, oversubscription badge, port utilization bars, violation alerts, and tests

### Phase 4: Visualization, Export and Documentation

**Goal**: Engineers can validate designs visually, export BOMs to procurement, and reference complete documentation
**Depends on**: Phase 3
**Requirements**: VIZ-01, VIZ-02, VIZ-03, EXP-01, EXP-02, EXP-03, DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):

  1. A Leaf-Spine topology diagram renders automatically with spines in the top row, leafs in the middle, and rack nodes at the bottom — deterministic layout (same inputs = same positions)
  2. Port saturation visual alerts appear on diagram nodes (OOB and leaf) when utilization approaches or exceeds capacity
  3. A rack elevation view renders for each rack, showing each switch device in correct U-slot positions, labeled by model and role
  4. The rack view updates automatically when sizing inputs change without manual refresh
  5. Clicking "Export CSV" downloads a BOM file that opens correctly in Excel/Google Sheets
  6. Clicking "Export PDF" generates a formatted report with BOM summary, sizing inputs, and topology diagram
  7. Print (Ctrl+P) renders a clean layout with no navigation chrome or broken page breaks
  8. ARD describes the four-layer architecture, data flow, and pure-function engine contract
  9. PRD formalizes all v1 requirements with acceptance criteria
  10. User Guide explains how to size a deployment, interpret the BOM, and export results
  11. Changelog records v1.0 as the first entry with delivered features
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Domain Engine | 3/3 | Complete    | 2026-03-16 |
| 2. App Shell and Input Form | 3/3 | Complete   | 2026-03-17 |
| 3. BOM Output and Metrics | 2/2 | Complete   | 2026-03-17 |
| 4. Visualization, Export and Documentation | 0/TBD | Not started | - |
