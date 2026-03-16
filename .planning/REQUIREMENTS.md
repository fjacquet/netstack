# Requirements: NetStack

**Defined:** 2026-03-16
**Core Value:** Answer "How many boxes and cables do I need to order?" instantly and accurately for any Dell SONiC Leaf-Spine deployment.

## v1 Requirements

### Sizing Engine

- [ ] **SIZE-01**: User can input total server count, servers per rack, and connectivity type (25G/100G)
- [ ] **SIZE-02**: Engine calculates rack count as `ceil(total_servers / servers_per_rack)`
- [ ] **SIZE-03**: Engine calculates leaf switches as `2 × N_racks` (redundant ToR pair per rack)
- [ ] **SIZE-04**: Engine auto-scales spine switches based on leaf count and S5232F-ON 32-port capacity
- [ ] **SIZE-05**: Engine calculates OOB switches (S3248T-ON) as `1 × N_racks` with port saturation alert when ports > 48
- [ ] **SIZE-06**: Engine is a pure function: `(SizingInput) => NetworkBillOfMaterial` with no side effects
- [ ] **SIZE-07**: Engine validates all physical constraints via Zod schemas (port counts, cable compatibility)

### BOM Output

- [ ] **BOM-01**: BOM displays switch quantities per model (S5248F-ON, S5232F-ON, S3248T-ON)
- [ ] **BOM-02**: BOM displays oversubscription ratio per tier and validates against thresholds
- [ ] **BOM-03**: User can select cable type (DAC/AOC/fiber) and engine calculates cable quantities
- [ ] **BOM-04**: BOM displays port utilization (used vs available) per switch model

### Hardware Catalog

- [ ] **CAT-01**: Default hardware catalog includes S5248F-ON, S5232F-ON, S3248T-ON with full specs (ports, speeds, power)
- [ ] **CAT-02**: Hardware specs defined in TypeScript constants as source of truth
- [ ] **CAT-03**: JSON override file allows adding/modifying switch models at runtime without code changes

### Visualization

- [ ] **VIZ-01**: Auto-generated Leaf-Spine topology diagram using @xyflow/react with deterministic layout
- [ ] **VIZ-02**: Rack elevation view showing physical device placement per rack (custom SVG)
- [ ] **VIZ-03**: Visual port saturation alerts when OOB or leaf ports approach/exceed capacity

### Export

- [ ] **EXP-01**: User can export BOM as CSV file
- [ ] **EXP-02**: User can export formatted PDF report with BOM summary and diagrams
- [ ] **EXP-03**: Print-friendly CSS stylesheet for browser printing

### UX / Theme

- [ ] **UX-01**: Light/dark mode toggle with system preference detection
- [ ] **UX-02**: Internationalization support for FR, EN, DE, IT with language switcher
- [ ] **UX-03**: Responsive layout for tablet and desktop viewports

### Documentation

- [ ] **DOC-01**: Architecture Reference Document (ARD) — system design for developers
- [ ] **DOC-02**: Product Requirements Document (PRD) — formal product specification
- [ ] **DOC-03**: User Guide — end-user documentation for using the tool
- [ ] **DOC-04**: Changelog — version history with notable changes

## v2 Requirements

### Persistence

- **PERS-01**: Save/load configurations via browser localStorage
- **PERS-02**: Named configuration profiles
- **PERS-03**: JSON file import/export for sharing configurations

### Export

- **EXP-04**: JSON export for machine-readable BOM (procurement tool integration)

### Advanced Sizing

- **ADV-01**: Growth scenario projector (what-if analysis for scaling)
- **ADV-02**: Multi-pod support when spine count exceeds single-pod capacity
- **ADV-03**: Power consumption estimation per rack

### Visualization

- **VIZ-04**: Topology port labels showing connection details
- **VIZ-05**: Interactive diagram (click node to see device details)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-site / multi-datacenter | Single site focus — complexity without clear v1 value |
| BGP/VLAN configuration | Physical sizing only, not network config |
| SONiC configuration generation | Separate tool, different domain |
| Real-time pricing / procurement | BOM is quantities only, pricing changes too fast |
| Mobile-optimized layout | Engineers use desktop/tablet, not phones for this |
| Backend / server-side | Pure client-side app, no user accounts needed |
| Multi-user collaboration | Single-user tool, share via export |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIZE-01 | — | Pending |
| SIZE-02 | — | Pending |
| SIZE-03 | — | Pending |
| SIZE-04 | — | Pending |
| SIZE-05 | — | Pending |
| SIZE-06 | — | Pending |
| SIZE-07 | — | Pending |
| BOM-01 | — | Pending |
| BOM-02 | — | Pending |
| BOM-03 | — | Pending |
| BOM-04 | — | Pending |
| CAT-01 | — | Pending |
| CAT-02 | — | Pending |
| CAT-03 | — | Pending |
| VIZ-01 | — | Pending |
| VIZ-02 | — | Pending |
| VIZ-03 | — | Pending |
| EXP-01 | — | Pending |
| EXP-02 | — | Pending |
| EXP-03 | — | Pending |
| UX-01 | — | Pending |
| UX-02 | — | Pending |
| UX-03 | — | Pending |
| DOC-01 | — | Pending |
| DOC-02 | — | Pending |
| DOC-03 | — | Pending |
| DOC-04 | — | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*
