# Roadmap: NetStack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17)
- ✅ **v1.1 Enhancements** — Phases 5-7 (shipped 2026-03-18)
- ✅ **v2.0 FC SAN & Switch Positioning** — Phases 8-14 (shipped 2026-03-18)
- ✅ **v3.0 Converged Mode** — Phases 15-17 (shipped 2026-03-18)
- ✅ **v4.0 Three-Tier Topology** — Phases 18-20 (shipped 2026-03-19)
- ✅ **v5.0 Unified Ethernet & Configurations** — Phases 21-24 (shipped 2026-03-19)
- 📋 **v6.0 Physical Planning** — Phases 25-28 (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Domain Engine (3/3 plans) — completed 2026-03-16
- [x] Phase 2: App Shell and Input Form (3/3 plans) — completed 2026-03-17
- [x] Phase 3: BOM Output and Metrics (2/2 plans) — completed 2026-03-17
- [x] Phase 4: Visualization, Export and Documentation (5/5 plans) — completed 2026-03-17

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Enhancements (Phases 5-7) — SHIPPED 2026-03-18</summary>

- [x] Phase 5: Engine Enhancements — racks array, port multipliers, active uplinks (2/2 plans, completed 2026-03-17)
- [x] Phase 6: Input Configuration UI — per-rack editor, port inputs, uplink selector (2/2 plans, completed 2026-03-17)
- [x] Phase 7: Rack Elevation Servers — server slots, U-height, capacity violations (3/3 plans, completed 2026-03-18)

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v2.0 FC SAN & Switch Positioning (Phases 8-14) — SHIPPED 2026-03-18</summary>

- [x] Phase 8: FC Catalog and Schema Foundation — Brocade switch catalog, POD licensing, FC schemas (2/2 plans, completed 2026-03-18)
- [x] Phase 9: Mode Store Isolation — Separate FC stores, no cross-mode contamination (2/2 plans, completed 2026-03-18)
- [x] Phase 10: FC Sizing Engine — `calculateFCBOM()` pure function, dual-fabric, ISL formula, violations (2/2 plans, completed 2026-03-18)
- [x] Phase 11: Switch Positioning (Ethernet) — ToR/MoR/BoR selector, cable advisory, rack elevation (3/3 plans, completed 2026-03-18)
- [x] Phase 12: FC Input and BOM UI — mode selector, FC input form, FC BOM panel (3/3 plans, completed 2026-03-18)
- [x] Phase 13: FC Topology Diagram — dual-fabric ReactFlow, Fabric A blue / Fabric B orange (2/2 plans, completed 2026-03-18)
- [x] Phase 14: FC Export — CSV/PDF extended with FC BOM sections, header export buttons (2/2 plans, completed 2026-03-18)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>v3.0 Converged Mode (Phases 15-17) — SHIPPED 2026-03-18</summary>

- [x] Phase 15: Converged Domain & Store — schema, composed engine, stores, mode selector (2/2 plans, completed 2026-03-18)
- [x] Phase 16: Converged UI — input form, BOM panel, topology, rack elevation (3/3 plans, completed 2026-03-18)
- [x] Phase 17: Converged Export & i18n — CSV/PDF export, 4 locales (2/2 plans, completed 2026-03-18)

Full details: `.planning/milestones/v3.0-ROADMAP.md`

</details>

<details>
<summary>v4.0 Three-Tier Topology (Phases 18-20) — SHIPPED 2026-03-19</summary>

- [x] Phase 18: Three-Tier Domain & Engine — Z-series catalog, tier field, topology selector, TDD engine (3/3 plans, completed 2026-03-18)
- [x] Phase 19: Three-Tier UI & Converged Integration — 4th mode, converged topology selector, input/BOM/topology/rack (3/3 plans, completed 2026-03-18)
- [x] Phase 20: Three-Tier Export & i18n — CSV/PDF export, 4 locales (2/2 plans, completed 2026-03-19)

Full details: `.planning/milestones/v4.0-ROADMAP.md`

</details>

<details>
<summary>v5.0 Unified Ethernet & Configurations (Phases 21-24) — SHIPPED 2026-03-19</summary>

- [x] Phase 21: Unified Ethernet Mode (2/2 plans) — completed 2026-03-19
- [x] Phase 22: Existing Infrastructure Toggle (2/2 plans) — completed 2026-03-19
- [x] Phase 23: Save/Load Configurations (2/2 plans) — completed 2026-03-19
- [x] Phase 24: Dedicated Input Page with Accordion Sections (2/2 plans) — completed 2026-03-19

Full details: `.planning/milestones/v5.0-ROADMAP.md`

</details>

### v6.0 Physical Planning (Phases 25-28)

**Milestone Goal:** Extend NetStack from "how many boxes" to "how do I physically install them" — cable length schedule per link type, rack geometry inputs, upgraded DAC distance advisory with computed lengths, and export of the cable schedule.

- [x] **Phase 25: Schema, Geometry Inputs & Advisory Foundation** — New advisories[] output type, store migration, geometry input fields (rack pitch, adjacency), DAC catalog fix (completed 2026-03-19)
- [ ] **Phase 26: Cable Length Engine** — Pure domain functions computing cable lengths per link type across all modes; upgraded DAC advisory with real distance; non-adjacent patch panel advisory
- [ ] **Phase 27: UI & i18n** — Wire geometry inputs into accordion form, render advisory cards (amber), i18n for all new labels in EN/FR/DE/IT
- [ ] **Phase 28: Export** — CSV cable schedule rows and PDF cable schedule section

## Phase Details

### Phase 25: Schema, Geometry Inputs & Advisory Foundation
**Goal**: New input fields and output types are defined and stored; existing data migrates cleanly; DAC catalog is corrected
**Depends on**: Phase 24
**Requirements**: PHYS-01, PHYS-02, PHYS-03, DAC-03, RACK-01, RACK-02, RACK-03
**Success Criteria** (what must be TRUE):
  1. BOM output contains an `advisories[]` array distinct from `violations[]`; existing violation rendering is unaffected
  2. User can set rack pitch (mm) via an optional input field; field defaults to 600mm and persists across reloads
  3. User can toggle "all racks adjacent" (defaults to true); when false, a distance-to-patch-panel field appears
  4. Saved profiles and localStorage state from before v6.0 load without errors after migration to store version 9
  5. DAC catalog correctly uses 3m limit for 25G SFP28 links and 5m limit for 100G QSFP28 links (not a flat 5m for all)
**Plans**: 2 plans

Plans:
- [x] 25-01: Zod schema additions (advisories[], geometry inputs), store migration v9, DAC catalog fix
- [x] 25-02: Profile normalisation against current schema on load

### Phase 26: Cable Length Engine
**Goal**: Pure domain functions compute cable lengths for every link type in all modes and produce correct advisory output
**Depends on**: Phase 25
**Requirements**: CABLE-01, CABLE-02, CABLE-03, CABLE-04, CABLE-05, CABLE-06, DAC-01, DAC-02, RACK-04
**Success Criteria** (what must be TRUE):
  1. BOM shows a per-link-type cable length (server→leaf, leaf→spine, VLT) for Clos mode, derived from rack pitch, rack height, and switch position
  2. BOM shows three distinct cable lengths (server→access, access→aggregation, aggregation→core) for Three-Tier mode
  3. BOM shows estimated ISL cable length for FC SAN mode
  4. All reported cable lengths map to the nearest standard SKU (1m / 3m / 5m / 10m) with a 15% slack buffer applied before rounding up
  5. DAC advisory card shows the computed cable path length alongside the applicable speed-specific DAC spec limit (3m @ 25G, 5m @ 100G)
  6. Non-adjacent rack mode shows an amber advisory recommending patch panels (not a red violation)
**Plans**: TBD

Plans:
- [ ] 26-01: Cable length formula library (TDD RED→GREEN) — geometry helpers, SKU ladder, per-mode link length functions
- [ ] 26-02: Engine integration — wire cable length output into NetworkBOM / FCBOM / ConvergedBOM; DAC advisory upgrade

### Phase 27: UI & i18n
**Goal**: All new geometry inputs are visible and usable in the accordion input form; advisory cards render in amber; all labels are translated
**Depends on**: Phase 26
**Requirements**: PHYS-04
**Success Criteria** (what must be TRUE):
  1. Rack pitch and adjacency toggle fields appear in the Rack Config accordion section for all three modes
  2. Advisory cards display in amber (distinct from red violation cards) wherever advisories[] is non-empty
  3. All new input labels and advisory messages display correctly in EN, FR, DE, and IT without fallback keys
**Plans**: TBD

Plans:
- [ ] 27-01: Accordion form wiring (geometry fields) + advisory card component (amber) + i18n keys EN/FR/DE/IT

### Phase 28: Export
**Goal**: CSV and PDF exports include a complete cable schedule section
**Depends on**: Phase 27
**Requirements**: EXP-05, EXP-06
**Success Criteria** (what must be TRUE):
  1. Exported CSV contains cable schedule rows with columns: link type, quantity, computed length, and standard SKU
  2. Exported PDF contains a cable schedule section with the same data, formatted consistently with existing BOM pages
**Plans**: TBD

Plans:
- [ ] 28-01: CSV cable schedule rows + PDF cable schedule section

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Domain Engine | v1.0 | 3/3 | Complete | 2026-03-16 |
| 2. App Shell and Input Form | v1.0 | 3/3 | Complete | 2026-03-17 |
| 3. BOM Output and Metrics | v1.0 | 2/2 | Complete | 2026-03-17 |
| 4. Visualization, Export and Documentation | v1.0 | 5/5 | Complete | 2026-03-17 |
| 5. Engine Enhancements | v1.1 | 2/2 | Complete | 2026-03-17 |
| 6. Input Configuration UI | v1.1 | 2/2 | Complete | 2026-03-17 |
| 7. Rack Elevation Servers | v1.1 | 3/3 | Complete | 2026-03-18 |
| 8. FC Catalog and Schema Foundation | v2.0 | 2/2 | Complete | 2026-03-18 |
| 9. Mode Store Isolation | v2.0 | 2/2 | Complete | 2026-03-18 |
| 10. FC Sizing Engine | v2.0 | 2/2 | Complete | 2026-03-18 |
| 11. Switch Positioning (Ethernet) | v2.0 | 3/3 | Complete | 2026-03-18 |
| 12. FC Input and BOM UI | v2.0 | 3/3 | Complete | 2026-03-18 |
| 13. FC Topology Diagram | v2.0 | 2/2 | Complete | 2026-03-18 |
| 14. FC Export | v2.0 | 2/2 | Complete | 2026-03-18 |
| 15. Converged Domain & Store | v3.0 | 2/2 | Complete | 2026-03-18 |
| 16. Converged UI | v3.0 | 3/3 | Complete | 2026-03-18 |
| 17. Converged Export & i18n | v3.0 | 2/2 | Complete | 2026-03-18 |
| 18. Three-Tier Domain & Engine | v4.0 | 3/3 | Complete | 2026-03-18 |
| 19. Three-Tier UI & Converged Integration | v4.0 | 3/3 | Complete | 2026-03-18 |
| 20. Three-Tier Export & i18n | v4.0 | 2/2 | Complete | 2026-03-19 |
| 21. Unified Ethernet Mode | v5.0 | 2/2 | Complete | 2026-03-19 |
| 22. Existing Infrastructure Toggle | v5.0 | 2/2 | Complete | 2026-03-19 |
| 23. Save/Load Configurations | v5.0 | 2/2 | Complete | 2026-03-19 |
| 24. Dedicated Input Page | v5.0 | 2/2 | Complete | 2026-03-19 |
| 25. Schema, Geometry Inputs & Advisory Foundation | v6.0 | 2/2 | Complete | 2026-03-19 |
| 26. Cable Length Engine | v6.0 | 0/2 | Not started | - |
| 27. UI & i18n | v6.0 | 0/1 | Not started | - |
| 28. Export | v6.0 | 0/1 | Not started | - |
