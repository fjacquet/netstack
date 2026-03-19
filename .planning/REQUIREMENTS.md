# Requirements: NetStack v5.0

**Defined:** 2026-03-19
**Core Value:** Answer "How many boxes and cables do I need?" instantly and accurately

> v4.0 requirements archived to `.planning/milestones/v4.0-REQUIREMENTS.md` (18/18 satisfied).

## v5.0 Requirements

### Unified Ethernet Mode

- [x] **ETH-01**: Spine-Leaf and Three-Tier merged into a single "Ethernet" mode with topology selector dropdown
- [x] **ETH-02**: ModeSelector shows 3 buttons (Ethernet, FC, Converged) instead of 4
- [x] **ETH-03**: Ethernet input form conditionally renders Clos fields (leaf/spine) or 3-tier fields (access/aggr/core) based on topology
- [x] **ETH-04**: Ethernet BOM panel, topology diagram, rack elevation, and export switch based on topology
- [x] **ETH-05**: Standalone Three-Tier mode and its dedicated stores removed (dead code cleanup)

### Existing Infrastructure

- [ ] **INFRA-01**: 3-tier mode has "Core switches already deployed" toggle — BOM excludes core switches when enabled
- [ ] **INFRA-02**: Clos mode has "Spines already deployed" toggle — BOM excludes spine switches when enabled
- [ ] **INFRA-03**: Cable BOM still includes inter-tier cables to existing switches (user needs cables)
- [ ] **INFRA-04**: Oversubscription ratios calculated against full fabric (existing + new)

### Save/Load Configurations

- [ ] **CFG-01**: User can save current input state as a named profile
- [ ] **CFG-02**: User can load a saved profile, restoring all inputs
- [ ] **CFG-03**: User can list saved profiles with summary (mode, topology, server count, date)
- [ ] **CFG-04**: User can delete a saved profile
- [ ] **CFG-05**: Profiles persist in localStorage across browser sessions
- [ ] **CFG-06**: i18n labels for all configuration features in EN/FR/DE/IT

## Future Requirements

- **PERS-02**: JSON export
- **SCALE-01**: Multi-pod support for large deployments
- Power budget calculation per rack
- Weight/cooling estimates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud sync / user accounts | Pure client-side, no backend (ADR-0002) |
| Profile import from file | v5.0+ — save/load is localStorage first |
| Brownfield server inventory | Existing infra toggle is switches only, not servers |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ETH-01 | Phase 21 | Complete |
| ETH-02 | Phase 21 | Complete |
| ETH-03 | Phase 21 | Complete |
| ETH-04 | Phase 21 | Complete |
| ETH-05 | Phase 21 | Complete |
| INFRA-01 | Phase 22 | Pending |
| INFRA-02 | Phase 22 | Pending |
| INFRA-03 | Phase 22 | Pending |
| INFRA-04 | Phase 22 | Pending |
| CFG-01 | Phase 23 | Pending |
| CFG-02 | Phase 23 | Pending |
| CFG-03 | Phase 23 | Pending |
| CFG-04 | Phase 23 | Pending |
| CFG-05 | Phase 23 | Pending |
| CFG-06 | Phase 23 | Pending |

**Coverage:**
- v5.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
