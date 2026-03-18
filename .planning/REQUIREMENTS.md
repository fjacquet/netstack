# Requirements: NetStack v4.0

**Defined:** 2026-03-18
**Core Value:** Answer "How many boxes and cables do I need?" instantly and accurately

> v3.0 requirements archived to `.planning/milestones/v3.0-REQUIREMENTS.md` (12/12 satisfied).

## v4.0 Requirements

### Three-Tier Catalog

- [x] **TIER-01**: Z-series switches added to hardware catalog (Z9264F-ON, Z9332F-ON, Z9432F-ON) with verified specs
- [x] **TIER-02**: Switch catalog has a `tier` field mapping each model to valid roles (access, aggregation, core)

### Three-Tier Engine

- [x] **TENG-01**: Topology selector in input schema: "leaf-spine" (Clos) vs "three-tier" (Core/Aggregation/Access)
- [ ] **TENG-02**: Access switches = 2 per rack (redundant pair, same formula as leaf switches)
- [ ] **TENG-03**: Aggregation switches = ceil(accessSwitches × uplinksPerAccess / aggrDownlinks), min 2 for redundancy
- [ ] **TENG-04**: Core switches = ceil(aggrSwitches × uplinksPerAggr / coreDownlinks), min 2 for redundancy
- [ ] **TENG-05**: Oversubscription calculated at each tier boundary (access→aggr, aggr→core)
- [ ] **TENG-06**: Cable BOM: server-access + access-aggr + aggr-core cables with correct inter-tier counts
- [x] **TENG-07**: User can select access/aggregation/core switch models independently

### Three-Tier UI

- [ ] **TUI-01**: Three-Tier standalone mode as 4th button in mode selector
- [ ] **TUI-02**: Topology selector in Converged mode to pick Clos or 3-tier for Ethernet portion
- [ ] **TUI-03**: Three-tier input form with access/aggregation/core model selectors + uplink counts per tier
- [ ] **TUI-04**: BOM panel adapted for 3-tier breakdown (access/aggr/core instead of leaf/spine)
- [ ] **TUI-05**: Hierarchical topology diagram (tree layout: core → aggr → access → racks)
- [ ] **TUI-06**: Rack elevation for 3-tier: server racks (access switches) + aggregation/core network racks

### Three-Tier Export

- [ ] **TEXP-01**: CSV export with 3-tier sections (access/aggregation/core)
- [ ] **TEXP-02**: PDF export with 3-tier BOM and topology pages
- [ ] **TEXP-03**: i18n labels for 3-tier mode in all 4 locales (EN/FR/DE/IT)

## Future Requirements

### Persistence & Export

- **PERS-01**: Save/load named configurations
- **PERS-02**: JSON export

### Scale

- **SCALE-01**: Multi-pod support for large deployments

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mixed Clos + 3-tier in same design | Topologies are mutually exclusive for Ethernet portion |
| STP domain limit enforcement (100 switches) | Advisory only — engine doesn't enforce protocol limits |
| Non-Dell switch vendors | Dell-only catalog per ADR-0001; JSON override for custom models |
| VPC/MLAG configuration | Physical sizing only, not logical configuration |
| Bandwidth engineering per flow | Aggregate oversubscription only, not per-flow analysis |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIER-01 | Phase 18 | Complete |
| TIER-02 | Phase 18 | Complete |
| TENG-01 | Phase 18 | Complete |
| TENG-02 | Phase 18 | Pending |
| TENG-03 | Phase 18 | Pending |
| TENG-04 | Phase 18 | Pending |
| TENG-05 | Phase 18 | Pending |
| TENG-06 | Phase 18 | Pending |
| TENG-07 | Phase 18 | Complete |
| TUI-01 | Phase 19 | Pending |
| TUI-02 | Phase 19 | Pending |
| TUI-03 | Phase 19 | Pending |
| TUI-04 | Phase 19 | Pending |
| TUI-05 | Phase 19 | Pending |
| TUI-06 | Phase 19 | Pending |
| TEXP-01 | Phase 20 | Pending |
| TEXP-02 | Phase 20 | Pending |
| TEXP-03 | Phase 20 | Pending |

**Coverage:**
- v4.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial definition*
