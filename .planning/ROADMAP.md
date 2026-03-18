# Roadmap: NetStack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17)
- ✅ **v1.1 Enhancements** — Phases 5-7 (shipped 2026-03-18) — Full details: `.planning/milestones/v1.1-ROADMAP.md`
- 📋 **v2.0 FC SAN & Switch Positioning** — Phases 8-14 (planned)

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

### 📋 v2.0 FC SAN & Switch Positioning (Planned)

**Milestone Goal:** Add Fibre Channel SAN sizing with Brocade Gen7/Gen8 switches and dual-fabric topology, plus ToR/MoR/BoR switch positioning awareness for Ethernet mode. Zero new npm dependencies. Strict domain isolation: FC and Ethernet are parallel, never coupled.

- [x] **Phase 8: FC Catalog and Schema Foundation** — Brocade switch catalog, POD licensing model, FC schemas (completed 2026-03-18)
- [x] **Phase 9: Mode Store Isolation** — Separate FC stores, mode selector architecture, no cross-mode state contamination (completed 2026-03-18)
- [x] **Phase 10: FC Sizing Engine** — Pure calculateFCBOM() function, dual-fabric, ISL formula, violations (completed 2026-03-18)
- [ ] **Phase 11: Switch Positioning (Ethernet)** — ToR/MoR/BoR selector, cable length advisory, rack elevation U-position
- [ ] **Phase 12: FC Input and BOM UI** — Mode selector toggle, FC input form, FC BOM panel
- [ ] **Phase 13: FC Topology Diagram** — Dual-fabric ReactFlow view, Fabric A blue / Fabric B orange
- [ ] **Phase 14: FC Export** — CSV and PDF extended with FC BOM sections, i18n keys

## Phase Details

### Phase 8: FC Catalog and Schema Foundation

**Goal**: FC hardware specifications and type system exist as pure TypeScript — verified by unit tests before any UI is written
**Depends on**: Phase 7 (project foundation established)
**Requirements**: FC-01, FC-02, FC-03, FC-04
**Success Criteria** (what must be TRUE):

  1. All 9 Brocade switch models (G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8) exist in FC_SWITCH_CATALOG with correct port counts, speeds, and form factors
  2. Every switch entry models both basePorts and totalPorts with a podLicenseUnit increment, reflecting the real POD licensing model
  3. FCSizingInputSchema and FCNetworkBOMSchema are defined with Zod v4 and all TypeScript types are derived via z.infer — no separately declared types
  4. FC_OPTICS_CATALOG contains SFP28 (32G), SFP56 (64G), and SFP112 (128G) entries with a protocol discriminant that prevents Ethernet optics from mixing into FC BOM output
  5. Unit tests cover all catalog entries with typed assertions — a wrong port count fails a test, not a code review
**Plans**: 2 plans

Plans:

- [ ] 08-01-PLAN.md — FCSwitchSpec/FCOpticsSpec interfaces and FC_SWITCH_CATALOG/FC_OPTICS_CATALOG catalog constants with TDD tests
- [ ] 08-02-PLAN.md — FCSizingInputSchema and FCNetworkBOMSchema Zod schemas with TDD tests

### Phase 9: Mode Store Isolation

**Goal**: Ethernet and FC stores occupy separate localStorage keys with independent schemas — switching modes never corrupts the other mode's persisted data
**Depends on**: Phase 8
**Requirements**: FC-09
**Success Criteria** (what must be TRUE):

  1. fcInputStore persists to key `netstack-fc-input` (v1) and fcResultStore is derived from it — neither key appears in the Ethernet store's schema
  2. A Vitest test confirms that mutating fcInputStore leaves the Ethernet inputStore state byte-for-byte unchanged, and vice versa
  3. Mode state (ethernet vs fc) is documented as ephemeral component state — not persisted to localStorage — preventing stale mode on reload
  4. The store layer compiles cleanly with TypeScript strict mode and no cross-domain imports between fc* and Ethernet stores
**Plans**: 2 plans

Plans:

- [ ] 09-01-PLAN.md — FC sizing engine stub + test scaffolding (RED phase): fc-sizing.ts, fcInputStore.test.ts, fcResultStore.test.ts, store-isolation.test.ts
- [ ] 09-02-PLAN.md — FC store implementations (GREEN phase): fcInputStore.ts and fcResultStore.ts turn all 11 isolation tests green

### Phase 10: FC Sizing Engine

**Goal**: calculateFCBOM() is a verified pure function that produces correct dual-fabric BOM output for any valid FC input — fully tested before any UI consumes it
**Depends on**: Phase 9
**Requirements**: FC-05, FC-06, FC-07, FC-08
**Success Criteria** (what must be TRUE):

  1. Given any server count and HBA configuration, the engine returns switch counts for both Fabric A and Fabric B (always equal, always doubled)
  2. ISL count is calculated from the host-to-storage fan-in ratio (Broadcom 7:1 default), not from the Ethernet uplink multiplier formula
  3. The FC BOM output includes podLicensesRequired as a first-class field (not a footnote) whenever the switch's basePorts is less than the ports required
  4. FCNetworkBOM.fcOversubscriptionRatio is always present with a severity classification (ok, warning, critical) matching Broadcom thresholds
  5. FC constraint violations (FC_PORT_SATURATION, FC_OVERSUBSCRIPTION_EXCEEDED, FC_ISL_UNDERPROVISIONED) fire at the correct thresholds and are typed discriminated unions
**Plans**: 2 plans

Plans:

- [ ] 10-01-PLAN.md — Write failing test suite for calculateFCBOM() (TDD RED phase)
- [ ] 10-02-PLAN.md — Implement calculateFCBOM() to pass all tests (TDD GREEN phase)

### Phase 11: Switch Positioning (Ethernet)

**Goal**: Ethernet mode users can select ToR, MoR, or BoR switch placement and see accurate cable length advisories and correct rack elevation rendering
**Depends on**: Phase 7
**Requirements**: POS-01, POS-02, POS-03, POS-04
**Success Criteria** (what must be TRUE):

  1. A switch position selector (ToR / MoR / BoR) appears in the Ethernet input form with ToR as the default, and the selection persists across page reloads
  2. Rack elevation renders switches at the correct U-position: ToR switches appear at the top of the server rack, MoR/BoR switches appear in a separate dedicated network rack column
  3. Estimated cable run length in the BOM updates based on switch position (MoR and BoR produce longer estimated runs than ToR)
  4. A DAC_POSITIONING_INCOMPATIBLE violation fires when DAC cables are selected with MoR or BoR positioning, because DAC cables cannot span the longer runs
**Plans**: 3 plans

Plans:

- [ ] 11-01-PLAN.md — Domain layer: switchPositioning schema field, DAC_POSITIONING_INCOMPATIBLE violation, switchOverheadU engine refactor, 8 new tests
- [ ] 11-02-PLAN.md — Store + UI: inputStore v6, InputForm positioning selector, BOMPanel cable advisory and violation, 10 i18n keys (all 4 locales)
- [ ] 11-03-PLAN.md — Rack elevation: positioning-aware buildRackDevices, new buildPositioningRackDevices, RackElevationTab positioning rack option

### Phase 12: FC Input and BOM UI

**Goal**: Users can switch to Fibre Channel mode, enter FC sizing inputs, and see a complete FC BOM with per-fabric counts and POD license requirements
**Depends on**: Phase 10
**Requirements**: FC-10, FC-11
**Success Criteria** (what must be TRUE):

  1. A mode selector toggle at the app level switches between Ethernet and Fibre Channel views — only one subtree renders at a time, never both simultaneously
  2. In FC mode, a dedicated input form accepts HBA ports per server, storage target ports, FC switch model selection, and preferred generation
  3. The FC BOM panel displays per-fabric switch counts (Fabric A and Fabric B separately), ISL cable count, SFP optics quantities, and fan-in oversubscription ratio
  4. POD license requirement appears as a top-level line item in the FC BOM panel — not hidden in a tooltip or footnote — with the license unit count clearly labeled
  5. FC constraint violation banners (FC_PORT_SATURATION, FC_OVERSUBSCRIPTION_EXCEEDED) render in the FC BOM panel using the same Alert component pattern as Ethernet violations
**Plans**: TBD

### Phase 13: FC Topology Diagram

**Goal**: FC mode users see a dual-fabric topology diagram where Fabric A and Fabric B are visually independent, color-coded, and structurally isolated
**Depends on**: Phase 12
**Requirements**: FC-12
**Success Criteria** (what must be TRUE):

  1. The FC topology tab renders two independent ReactFlow canvas instances — one for Fabric A (blue) and one for Fabric B (orange) — each wrapped in its own ReactFlowProvider
  2. No edges cross between Fabric A nodes and Fabric B nodes in the rendered diagram — cross-fabric edges are architecturally impossible in buildFCTopologyGraph output
  3. The FC topology view is accessible via the existing tab navigation and does not break the Ethernet topology tab
  4. The diagram correctly reflects the switch count and ISL link count from the current FC BOM output
**Plans**: TBD

### Phase 14: FC Export

**Goal**: CSV and PDF exports include complete FC BOM data — switches, optics, ISLs, and POD licenses — clearly separated from Ethernet BOM sections
**Depends on**: Phase 13
**Requirements**: FC-13, FC-14
**Success Criteria** (what must be TRUE):

  1. In FC mode, CSV export contains dedicated Fabric A and Fabric B sections with switch, optic, ISL, and POD license rows — none of these rows appear in an Ethernet mode export
  2. In FC mode, the PDF report includes an FC BOM page with dual-fabric totals, switch model, port utilization, and oversubscription ratio
  3. FC optics appear in the export with a Protocol column value of "FC" (not "Ethernet") — preventing procurement confusion between SFP28 FC and SFP28 Ethernet transceivers
  4. All FC export labels (switch names, optic types, violation messages) are present in all four i18n locales (FR, EN, DE, IT)
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
| 9. Mode Store Isolation | 2/2 | Complete   | 2026-03-18 | - |
| 10. FC Sizing Engine | 2/2 | Complete    | 2026-03-18 | - |
| 11. Switch Positioning (Ethernet) | 1/3 | In Progress|  | - |
| 12. FC Input and BOM UI | v2.0 | 0/? | Not started | - |
| 13. FC Topology Diagram | v2.0 | 0/? | Not started | - |
| 14. FC Export | v2.0 | 0/? | Not started | - |
