# Requirements: NetStack v2.0

**Defined:** 2026-03-18
**Core Value:** Answer "How many boxes and cables do I need?" instantly and accurately

> v1.1 requirements archived to `.planning/milestones/v1.1-REQUIREMENTS.md` (11/11 satisfied).

## v2.0 Requirements

### Fibre Channel Catalog

- [x] **FC-01**: Brocade Gen7 (64G) switch catalog with verified specs (G710, G720, G730, X7-4, X7-8)
- [x] **FC-02**: Brocade Gen8 (128G) switch catalog with verified specs (G820, X8-4, X8-8)
- [x] **FC-03**: Dynamic POD licensing modeled per switch (basePorts vs totalPorts, podLicenseUnit)
- [x] **FC-04**: 7850 FCIP extension switch in catalog

### FC Sizing Engine

- [x] **FC-05**: Dual-fabric SAN topology calculation (Fabric A + Fabric B, switch count always doubles)
- [x] **FC-06**: ISL (Inter-Switch Link) calculation based on host-to-storage fan-in ratio (max 7:1)
- [x] **FC-07**: FC optics BOM (SFP28 for 32G, SFP56 for 64G, SFP112 for 128G)
- [x] **FC-08**: FC oversubscription ratio reporting with severity thresholds

### FC User Interface

- [x] **FC-09**: Mode selector at app level (Ethernet OR Fibre Channel, mutually exclusive)
- [ ] **FC-10**: FC-specific input form (server count, HBA ports per server, FC speed, preferred generation)
- [ ] **FC-11**: FC BOM panel with switches, optics, ISL links, and POD license requirements
- [ ] **FC-12**: FC topology diagram with dual-fabric layout (Fabric A | Fabric B)

### FC Export

- [ ] **FC-13**: CSV export includes FC BOM (switches, optics, ISLs, POD licenses)
- [ ] **FC-14**: PDF report includes FC BOM summary, inputs, and dual-fabric topology

### Switch Positioning (Ethernet)

- [x] **POS-01**: Switch position selector (ToR / MoR / BoR) with ToR as default
- [x] **POS-02**: Rack elevation renders switches at correct U-position based on positioning
- [x] **POS-03**: Cable length calculations adjusted per switch position (MoR halves max run)
- [x] **POS-04**: DAC distance advisory updated to account for switch positioning

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mixed Ethernet + FC sizing | Mutually exclusive modes per GH #1 |
| NVMe-oF specific thresholds | Deferred — standard FC fan-in ratios sufficient for v2.0 |
| MoR shared switches across racks | v2.0 keeps per-rack model; shared MoR is v3.0 |
| FC rack elevation view | FC switches don't go in server racks; omit from rack view in v2.0 |
| G830 (unreleased Gen8) | Not publicly available yet |
| Save/load named configurations | Deferred to v3.0 |
| Multi-pod support | Deferred to v3.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FC-01 | Phase 8 | Complete |
| FC-02 | Phase 8 | Complete |
| FC-03 | Phase 8 | Complete |
| FC-04 | Phase 8 | Complete |
| FC-05 | Phase 10 | Complete |
| FC-06 | Phase 10 | Complete |
| FC-07 | Phase 10 | Complete |
| FC-08 | Phase 10 | Complete |
| FC-09 | Phase 9 | Complete |
| FC-10 | Phase 12 | Pending |
| FC-11 | Phase 12 | Pending |
| FC-12 | Phase 13 | Pending |
| FC-13 | Phase 14 | Pending |
| FC-14 | Phase 14 | Pending |
| POS-01 | Phase 11 | Complete |
| POS-02 | Phase 11 | Complete |
| POS-03 | Phase 11 | Complete |
| POS-04 | Phase 11 | Complete |

**Coverage:**

- v2.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after v2.0 roadmap creation (18/18 mapped)*
