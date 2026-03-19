# Roadmap: NetStack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17)
- ✅ **v1.1 Enhancements** — Phases 5-7 (shipped 2026-03-18)
- ✅ **v2.0 FC SAN & Switch Positioning** — Phases 8-14 (shipped 2026-03-18)
- ✅ **v3.0 Converged Mode** — Phases 15-17 (shipped 2026-03-18)
- ✅ **v4.0 Three-Tier Topology** — Phases 18-20 (shipped 2026-03-19)
- 📋 **v5.0 Unified Ethernet & Configurations** — Phases 21-23 (planned)

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

### v5.0 Unified Ethernet & Configurations (In Progress)

**Milestone Goal:** Merge Spine-Leaf and Three-Tier into a single Ethernet mode with topology selector, add existing infrastructure toggle for brownfield deployments, and save/load named configurations.

- [x] **Phase 21: Unified Ethernet Mode** - Merge Spine-Leaf and Three-Tier into one Ethernet mode with Clos/3-tier topology selector (completed 2026-03-19)
- [ ] **Phase 22: Existing Infrastructure Toggle** - Brownfield support: exclude already-deployed switches from BOM
- [ ] **Phase 23: Save/Load Configurations** - Named profiles persisted to localStorage with full CRUD

## Phase Details

### Phase 21: Unified Ethernet Mode
**Goal**: Users see 3 modes (Ethernet, FC, Converged) and select Clos or Three-Tier topology within the Ethernet mode
**Depends on**: Phase 20 (v4.0 complete)
**Requirements**: ETH-01, ETH-02, ETH-03, ETH-04, ETH-05
**Success Criteria** (what must be TRUE):
  1. User sees exactly 3 mode buttons (Ethernet, FC, Converged) instead of 4
  2. User can switch between Clos and Three-Tier topology within Ethernet mode via a dropdown selector
  3. Ethernet input form shows leaf/spine fields when Clos is selected and access/aggr/core fields when Three-Tier is selected
  4. BOM panel, topology diagram, rack elevation, and export all render correctly for both Ethernet topologies
  5. No dead code remains from the standalone Three-Tier mode (stores, components, routes removed)
**Plans:** 2/2 plans complete
Plans:
- [x] 21-01-PLAN.md — Unify schema, stores, mode selector (3 buttons), i18n
- [x] 21-02-PLAN.md — Wire UI components for topology dispatch, delete dead code

### Phase 22: Existing Infrastructure Toggle
**Goal**: Users can indicate that core switches (3-tier) or spine switches (Clos) are already deployed, and the BOM adjusts accordingly
**Depends on**: Phase 21
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. In Three-Tier topology, user can toggle "Core switches already deployed" and the BOM excludes core switches from the count
  2. In Clos topology, user can toggle "Spines already deployed" and the BOM excludes spine switches from the count
  3. Cable BOM still includes cables connecting to existing switches (user still needs to order cables)
  4. Oversubscription ratios are calculated against the full fabric including existing switches (not just new equipment)
**Plans:** 1/2 plans executed
Plans:
- [ ] 22-01-PLAN.md — Schema fields, BOM post-processing, store v8 migration, i18n, tests
- [ ] 22-02-PLAN.md — UI toggles in InputForm, "(existing)" labels in BOM panel

### Phase 23: Save/Load Configurations
**Goal**: Users can save, load, list, and delete named input profiles that persist across browser sessions
**Depends on**: Phase 21
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, CFG-06
**Success Criteria** (what must be TRUE):
  1. User can save the current input state as a named profile and later load it to restore all inputs exactly
  2. User can see a list of saved profiles showing mode, topology, server count, and save date
  3. User can delete a saved profile from the list
  4. Saved profiles survive browser close/reopen (localStorage persistence)
  5. All configuration UI labels (save, load, delete, profile list) are translated in EN, FR, DE, and IT
**Plans**: TBD

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
| 22. Existing Infrastructure Toggle | 1/2 | In Progress|  | - |
| 23. Save/Load Configurations | v5.0 | 0/? | Not started | - |
