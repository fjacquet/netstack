# Roadmap: NetStack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17)
- ✅ **v1.1 Enhancements** — Phases 5-7 (shipped 2026-03-18)
- ✅ **v2.0 FC SAN & Switch Positioning** — Phases 8-14 (shipped 2026-03-18)
- 🚧 **v3.0 Converged Mode** — Phases 15-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Domain Engine (3/3 plans) — completed 2026-03-16
- [x] Phase 2: App Shell and Input Form (3/3 plans) — completed 2026-03-17
- [x] Phase 3: BOM Output and Metrics (2/2 plans) — completed 2026-03-17
- [x] Phase 4: Visualization, Export and Documentation (5/5 plans) — completed 2026-03-17

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Enhancements (Phases 5-7) — SHIPPED 2026-03-18</summary>

- [x] Phase 5: Engine Enhancements — racks array, port multipliers, active uplinks (2/2 plans, completed 2026-03-17)
- [x] Phase 6: Input Configuration UI — per-rack editor, port inputs, uplink selector (2/2 plans, completed 2026-03-17)
- [x] Phase 7: Rack Elevation Servers — server slots, U-height, capacity violations (3/3 plans, completed 2026-03-18)

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 FC SAN & Switch Positioning (Phases 8-14) — SHIPPED 2026-03-18</summary>

- [x] Phase 8: FC Catalog and Schema Foundation — Brocade switch catalog, POD licensing, FC schemas (2/2 plans, completed 2026-03-18)
- [x] Phase 9: Mode Store Isolation — Separate FC stores, no cross-mode contamination (2/2 plans, completed 2026-03-18)
- [x] Phase 10: FC Sizing Engine — `calculateFCBOM()` pure function, dual-fabric, ISL formula, violations (2/2 plans, completed 2026-03-18)
- [x] Phase 11: Switch Positioning (Ethernet) — ToR/MoR/BoR selector, cable advisory, rack elevation (3/3 plans, completed 2026-03-18)
- [x] Phase 12: FC Input and BOM UI — mode selector, FC input form, FC BOM panel (3/3 plans, completed 2026-03-18)
- [x] Phase 13: FC Topology Diagram — dual-fabric ReactFlow, Fabric A blue / Fabric B orange (2/2 plans, completed 2026-03-18)
- [x] Phase 14: FC Export — CSV/PDF extended with FC BOM sections, header export buttons (2/2 plans, completed 2026-03-18)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

### v3.0 Converged Mode (In Progress)

**Milestone Goal:** Add a third "Converged" sizing mode that combines Ethernet leaf-spine + FC SAN in a single BOM per server: 1 OOB port, 1-4 Ethernet frontend ports, 0-2 FC backend ports.

- [x] **Phase 15: Converged Domain & Store** - Converged schema, composed engine, combined violations (completed 2026-03-18)
- [x] **Phase 16: Converged UI** - Unified input form, combined BOM panel, topology, rack elevation (completed 2026-03-18)
- [ ] **Phase 17: Converged Export & i18n** - Combined CSV/PDF export, all 4 locales

## Phase Details

### Phase 15: Converged Domain & Store
**Goal**: Users can compute a combined Ethernet+FC BOM from a single converged input
**Depends on**: Phase 14 (v2.0 complete — both Ethernet and FC engines exist)
**Requirements**: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05
**Plans:** 2/2 plans complete
Plans:
- [x] 15-01-PLAN.md — Converged schemas (input + BOM) and TDD engine composing calculateBOM + calculateFCBOM
- [x] 15-02-PLAN.md — Converged Zustand stores and mode selector wiring (third "Converged" button)
**Success Criteria** (what must be TRUE):
  1. User can select "Converged" as a third mode alongside Ethernet and FC in the mode selector
  2. User can specify 1-4 Ethernet frontend ports and 0-2 FC HBA ports per server in converged mode
  3. Converged engine produces a combined BOM containing both Ethernet switch counts and FC switch counts from a single input
  4. Setting FC HBA ports to 0 produces an Ethernet-only BOM with no FC switches and no FC violations
  5. Violations from both Ethernet and FC engines appear in a single combined violations array

### Phase 16: Converged UI
**Goal**: Users can configure and view converged sizing results through a unified interface
**Depends on**: Phase 15
**Requirements**: CONV-06, CONV-07, CONV-08, CONV-09
**Plans:** 3/3 plans complete
Plans:
- [ ] 16-01-PLAN.md — Converged input form + sizing page + App.tsx wiring (CONV-06)
- [ ] 16-02-PLAN.md — Combined BOM panel with Ethernet + FC sub-BOMs (CONV-07)
- [ ] 16-03-PLAN.md — Converged topology view + rack elevation with FC racks (CONV-08, CONV-09)
**Success Criteria** (what must be TRUE):
  1. Converged input form shows shared rack config at the top with separate Ethernet and FC sections in one form
  2. Combined BOM panel displays Ethernet switches, FC switches, and total cable counts together
  3. Topology view renders Ethernet leaf-spine diagram plus FC Fabric A and Fabric B diagrams
  4. Rack elevation shows server racks with 3U Ethernet switch overhead and separate FC network racks

### Phase 17: Converged Export & i18n
**Goal**: Users can export converged sizing results and use the app in all four languages
**Depends on**: Phase 16
**Requirements**: CONV-10, CONV-11, CONV-12
**Plans:** 1/2 plans executed
Plans:
- [ ] 17-01-PLAN.md — Converged CSV + PDF export functions and TopBar wiring (CONV-10, CONV-11)
- [ ] 17-02-PLAN.md — Converged export i18n keys in all 4 locales (CONV-12)
**Success Criteria** (what must be TRUE):
  1. CSV export produces a single file with Ethernet section and FC section under one header
  2. PDF export generates one document combining Ethernet and FC pages
  3. All converged-mode labels (mode name, section headers, BOM fields) appear correctly in EN, FR, DE, and IT

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
| 16. Converged UI | 3/3 | Complete    | 2026-03-18 | - |
| 17. Converged Export & i18n | 1/2 | In Progress|  | - |
