# Roadmap: NetStack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17)
- ✅ **v1.1 Enhancements** — Phases 5-7 (shipped 2026-03-18)
- ✅ **v2.0 FC SAN & Switch Positioning** — Phases 8-14 (shipped 2026-03-18)
- ✅ **v3.0 Converged Mode** — Phases 15-17 (shipped 2026-03-18)
- **v4.0 Three-Tier Topology** — Phases 18-20 (in progress)

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

### v4.0 Three-Tier Topology (In Progress)

**Milestone Goal:** Add Core/Aggregation/Access (3-tier) topology as a standalone mode and as a topology option within Converged mode, with dedicated sizing engine, BOM output, topology diagram, and export.

- [x] **Phase 18: Three-Tier Domain & Engine** - Z-series catalog, tier role mapping, topology selector, and complete 3-tier sizing engine (completed 2026-03-18)
- [x] **Phase 19: Three-Tier UI & Converged Integration** - Standalone mode, converged topology selector, input form, BOM panel, topology diagram, rack elevation (completed 2026-03-18)
- [x] **Phase 20: Three-Tier Export & i18n** - CSV/PDF export with 3-tier sections and i18n labels for all 4 locales (completed 2026-03-18)

## Phase Details

### Phase 18: Three-Tier Domain & Engine
**Goal**: Users can compute a correct 3-tier BOM from the engine with access/aggregation/core switches, inter-tier cables, and per-boundary oversubscription
**Depends on**: Phase 17 (existing Ethernet engine and catalog infrastructure)
**Requirements**: TIER-01, TIER-02, TENG-01, TENG-02, TENG-03, TENG-04, TENG-05, TENG-06, TENG-07
**Success Criteria** (what must be TRUE):
  1. Z-series switches (Z9264F-ON, Z9332F-ON, Z9432F-ON) appear in the hardware catalog with verified port counts and power specs
  2. Each switch model in the catalog has a `tier` field that restricts it to valid roles (access, aggregation, core), and the user can select models independently per tier
  3. Calling the 3-tier engine with a server count produces the correct number of access (2 per rack), aggregation (formula-based, min 2), and core (formula-based, min 2) switches
  4. The engine output includes oversubscription ratios at each tier boundary (access-to-aggregation and aggregation-to-core)
  5. The engine produces a cable BOM with server-to-access, access-to-aggregation, and aggregation-to-core cable counts
**Plans:** 3/3 plans complete
Plans:
- [x] 18-01-PLAN.md — Catalog extension (Z-series + tier field) and three-tier schemas
- [x] 18-02-PLAN.md — Three-tier sizing engine (calculateThreeTierBOM) with TDD
- [x] 18-03-PLAN.md — Converged engine topology selector integration

### Phase 19: Three-Tier UI & Converged Integration
**Goal**: Users can interact with 3-tier topology through a standalone mode and as the Ethernet portion of Converged mode, with full input controls, BOM display, topology visualization, and rack elevation
**Depends on**: Phase 18
**Requirements**: TUI-01, TUI-02, TUI-03, TUI-04, TUI-05, TUI-06
**Success Criteria** (what must be TRUE):
  1. A "Three-Tier" button appears as the 4th option in the mode selector, and clicking it loads a dedicated 3-tier sizing page
  2. In Converged mode, a topology selector lets the user choose between Clos (leaf-spine) and 3-tier for the Ethernet portion
  3. The 3-tier input form presents access/aggregation/core model selectors with uplink counts per tier, and the BOM panel displays results grouped by access/aggregation/core (not leaf/spine)
  4. A hierarchical topology diagram renders a tree layout with core at the top, aggregation in the middle, access at the bottom, and racks below access
  5. Rack elevation shows server racks with access switches (ToR) and separate aggregation/core network racks
**Plans:** 3/3 plans complete
Plans:
- [x] 19-01-PLAN.md — Standalone mode: stores, i18n, input form, BOM panel, mode selector
- [x] 19-02-PLAN.md — Visualization: topology graph builder, topology tab, rack elevation
- [x] 19-03-PLAN.md — Converged integration: topology selector, replace placeholder guards

### Phase 20: Three-Tier Export & i18n
**Goal**: Users can export 3-tier designs to CSV and PDF with properly labeled sections, and all 3-tier labels are translated in EN/FR/DE/IT
**Depends on**: Phase 19
**Requirements**: TEXP-01, TEXP-02, TEXP-03
**Success Criteria** (what must be TRUE):
  1. CSV export produces rows grouped into access, aggregation, and core sections (mirroring the BOM panel structure)
  2. PDF export includes 3-tier BOM tables and a topology page showing the hierarchical diagram
  3. All 3-tier mode labels (mode name, tier names, BOM headings, export headers) appear correctly in EN, FR, DE, and IT
**Plans:** 2/2 plans complete
Plans:
- [ ] 20-01-PLAN.md — Three-tier CSV/PDF export (standalone + converged) and TopBar wiring
- [ ] 20-02-PLAN.md — Three-tier export i18n keys for all 4 locales

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
| 20. Three-Tier Export & i18n | 2/2 | Complete   | 2026-03-18 | - |
