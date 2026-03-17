# Roadmap: NetStack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17)
- [ ] **v1.1 Enhancements** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Domain Engine (3/3 plans) — completed 2026-03-16
- [x] Phase 2: App Shell and Input Form (3/3 plans) — completed 2026-03-17
- [x] Phase 3: BOM Output and Metrics (2/2 plans) — completed 2026-03-17
- [x] Phase 4: Visualization, Export and Documentation (5/5 plans) — completed 2026-03-17

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Enhancements (Phases 5-7)

- [ ] **Phase 5: Engine Enhancements** — Extend the sizing engine to support per-rack server arrays, configurable server port counts, and selectable uplink counts
- [ ] **Phase 6: Input Configuration UI** — Surface all new v1.1 configuration options in the input form (rack list editor, port fields, uplink selector)
- [ ] **Phase 7: Rack Elevation Servers** — Render servers in the rack elevation view with U-height, fit validation, and capacity violation alerts

## Phase Details

### Phase 5: Engine Enhancements

**Goal**: The sizing engine correctly calculates BOM from per-rack server arrays, configurable server port counts, and a selectable uplink count per leaf switch.
**Depends on**: Nothing (pure domain layer, no UI)
**Requirements**: RACK-03, PORT-03, UPLN-02
**Success Criteria** (what must be TRUE):
  1. `calculateBOM` accepts a `racks` array (each element with a server count) and produces correct leaf, spine, OOB, and cable counts
  2. Cable and transceiver counts reflect frontend and backend port multipliers (e.g. 2 frontend ports doubles leaf-facing cables)
  3. Oversubscription ratio and leaf-spine cable count update when active uplink count changes from 1 to model maximum
  4. All existing 144 tests continue to pass; new unit tests cover all three engine extensions
**Plans**: TBD

### Phase 6: Input Configuration UI

**Goal**: Engineers can configure explicit rack count with per-rack server density, per-server frontend/backend port counts, and active uplink count directly in the input form.
**Depends on**: Phase 5
**Requirements**: RACK-01, RACK-02, PORT-01, PORT-02, UPLN-01
**Success Criteria** (what must be TRUE):
  1. User can set an explicit rack count and the form creates that many per-rack server count fields
  2. User can enter a different server count for each rack (variable density)
  3. User can set frontend (data) port count per server (0-8 range, default 1)
  4. User can set backend (OOB) port count per server (0-8 range, default 1)
  5. User can select active uplink count for leaf switches from 1 to the model's port maximum
**Plans**: TBD

### Phase 7: Rack Elevation Servers

**Goal**: The rack elevation view shows servers as device slots with correct U-heights, and alerts the user when a rack's total device U-height exceeds the rack's physical size.
**Depends on**: Phase 5, Phase 6
**Requirements**: ELEV-01, ELEV-02, ELEV-03
**Success Criteria** (what must be TRUE):
  1. Servers appear as labeled device items in the rack elevation view (not blank slots)
  2. User can configure server U-height (1U, 2U, 4U, 8U) and the rack renders the correct slot height per server
  3. When total device U-height (servers + switches) exceeds the rack's U capacity, a RACK_CAPACITY_EXCEEDED violation alert appears in the BOM panel
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Domain Engine | v1.0 | 3/3 | Complete | 2026-03-16 |
| 2. App Shell and Input Form | v1.0 | 3/3 | Complete | 2026-03-17 |
| 3. BOM Output and Metrics | v1.0 | 2/2 | Complete | 2026-03-17 |
| 4. Visualization, Export and Documentation | v1.0 | 5/5 | Complete | 2026-03-17 |
| 5. Engine Enhancements | v1.1 | 0/TBD | Not started | - |
| 6. Input Configuration UI | v1.1 | 0/TBD | Not started | - |
| 7. Rack Elevation Servers | v1.1 | 0/TBD | Not started | - |
